import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { escrowTransactions, tbankOrders, type EscrowTransaction, type TbankOrder } from '@escort/db';
import { TbankEscrowService } from './tbank-escrow.service';
import { EscrowService } from './escrow.service';
import { BookingsService } from '../bookings/bookings.service';
import { ModelsService } from '../models/models.service';
import { UsersService } from '../users/users.service';
import { TelegramNotifyService } from '../notifications/telegram-notify.service';
import { TbankClientService } from './tbank/tbank-client.service';

const ESCROW_ID = '44444444-4444-4444-8444-444444444444';
const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const MODEL_ID = '33333333-3333-4333-8333-333333333333';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';

function baseTbankEscrow(overrides: Partial<EscrowTransaction> = {}): EscrowTransaction {
  return {
    id: ESCROW_ID,
    bookingId: BOOKING_ID,
    paymentProvider: 'tbank',
    status: 'funded',
    amountHeld: '1000.00',
    currency: 'RUB',
    ...overrides,
  } as EscrowTransaction;
}

function baseOrder(overrides: Partial<TbankOrder> = {}): TbankOrder {
  return { id: 'order-1', escrowTransactionId: ESCROW_ID, tbankPaymentId: 'pay-1' } as TbankOrder;
}

/** db mock: select().from(tbankOrders).where().limit() -> [order]; update().set().where() resolves. */
function makeDb(order: TbankOrder | null) {
  return {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(order ? [order] : []),
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
    }),
  };
}

describe('TbankEscrowService — manager ownership on release/refund', () => {
  let service: TbankEscrowService;
  let escrowService: { findById: jest.Mock; release: jest.Mock; refund: jest.Mock };
  let bookings: { findById: jest.Mock; transitionState: jest.Mock };
  let models: { findById: jest.Mock };
  let tbankClient: { confirm: jest.Mock; cancel: jest.Mock };

  beforeEach(async () => {
    escrowService = {
      findById: jest.fn().mockResolvedValue(baseTbankEscrow()),
      release: jest.fn().mockResolvedValue(baseTbankEscrow({ status: 'released' })),
      refund: jest.fn().mockResolvedValue(baseTbankEscrow({ status: 'refunded' })),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue({ id: BOOKING_ID, modelId: MODEL_ID, clientId: CLIENT_ID }),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };
    models = { findById: jest.fn().mockResolvedValue(null) };
    tbankClient = { confirm: jest.fn().mockResolvedValue(undefined), cancel: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TbankEscrowService,
        { provide: EscrowService, useValue: escrowService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: BookingsService, useValue: bookings },
        { provide: ModelsService, useValue: models },
        { provide: UsersService, useValue: { getNotifiableTelegramId: jest.fn().mockResolvedValue(null) } },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
        { provide: TbankClientService, useValue: tbankClient },
        { provide: 'DRIZZLE', useValue: makeDb(baseOrder()) },
      ],
    }).compile();
    service = moduleRef.get(TbankEscrowService);
  });

  describe('release', () => {
    it('throws Forbidden when a manager tries to release escrow for a model they do not manage', async () => {
      models.findById.mockResolvedValue({ managerId: 'someone-else' });
      await expect(service.release(CLIENT_ID, 'manager', ESCROW_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(tbankClient.confirm).not.toHaveBeenCalled();
    });

    it('allows the assigned manager to release escrow for their own model', async () => {
      models.findById.mockResolvedValue({ managerId: CLIENT_ID });
      await service.release(CLIENT_ID, 'manager', ESCROW_ID);
      expect(tbankClient.confirm).toHaveBeenCalledWith({ PaymentId: 'pay-1' });
    });

    it('allows admin unconditionally, without checking model ownership', async () => {
      await service.release(CLIENT_ID, 'admin', ESCROW_ID);
      expect(tbankClient.confirm).toHaveBeenCalledWith({ PaymentId: 'pay-1' });
      expect(models.findById).not.toHaveBeenCalled();
    });
  });

  describe('refund', () => {
    it('throws Forbidden when a manager tries to refund escrow for a model they do not manage', async () => {
      models.findById.mockResolvedValue({ managerId: 'someone-else' });
      await expect(service.refund(CLIENT_ID, 'manager', ESCROW_ID)).rejects.toBeInstanceOf(ForbiddenException);
      expect(tbankClient.cancel).not.toHaveBeenCalled();
    });

    it('allows the assigned manager to refund escrow for their own model', async () => {
      models.findById.mockResolvedValue({ managerId: CLIENT_ID });
      await service.refund(CLIENT_ID, 'manager', ESCROW_ID);
      expect(tbankClient.cancel).toHaveBeenCalledWith({ PaymentId: 'pay-1' });
    });
  });
});

describe('TbankEscrowService webhook payment binding and recovery', () => {
  const TERMINAL = 'fixture-terminal';
  const PAYMENT = 'fixture-payment';

  function harness(orderOverrides: Partial<TbankOrder> = {}, escrowOverrides: Partial<EscrowTransaction> = {}) {
    const state = {
      order: {
        id: ESCROW_ID, tbankOrderId: ESCROW_ID, escrowTransactionId: ESCROW_ID,
        terminalKey: TERMINAL, tbankPaymentId: PAYMENT, status: 'NEW', ...orderOverrides,
      } as TbankOrder,
      escrow: baseTbankEscrow({ status: 'pending_funding', ...escrowOverrides }),
      booking: { id: BOOKING_ID, status: 'confirmed', clientId: CLIENT_ID },
    };
    const writes: Array<{ table: unknown; value: unknown }> = [];
    const locks: string[] = [];
    let queue = Promise.resolve();
    const db = {
      transaction: jest.fn((fn: (tx: any) => Promise<unknown>) => {
        const pending = queue.then(async () => {
          const draft = { order: { ...state.order }, escrow: { ...state.escrow } };
          const pendingWrites: typeof writes = [];
          const tx = {
            select: () => ({ from: (table: unknown) => ({
              where: () => ({ limit: () => ({ for: async (mode: string) => {
                locks.push(mode);
                return [{ ...(table === tbankOrders ? draft.order : draft.escrow) }];
              } }) }),
            }) }),
            update: (table: unknown) => ({ set: (value: object) => ({ where: async () => {
              Object.assign(table === tbankOrders ? draft.order : draft.escrow, value);
              pendingWrites.push({ table, value });
            } }) }),
          };
          const result = await fn(tx);
          state.order = draft.order; state.escrow = draft.escrow;
          writes.push(...pendingWrites);
          return result;
        });
        queue = pending.then(() => undefined, () => undefined);
        return pending;
      }),
    };
    const bookings = {
      findById: jest.fn(async () => ({ ...state.booking })),
      transitionState: jest.fn(async (_id: string, target: string) => {
        const allowed: Record<string, string[]> = {
          confirmed: ['pending_payment'], pending_payment: ['escrow_funded'],
          escrow_funded: ['completed'], in_progress: ['completed'], completed: [],
        };
        if (!allowed[state.booking.status]?.includes(target)) throw new ConflictException('Concurrent state changed');
        state.booking.status = target;
        return { ...state.booking };
      }),
    };
    const client = { verifyToken: jest.fn(() => true), confirm: jest.fn(), cancel: jest.fn() };
    const notifications = { notifyMany: jest.fn().mockResolvedValue(undefined) };
    const service = new TbankEscrowService({} as any,
      { get: (key: string) => key === 'TBANK_TERMINAL_KEY' ? TERMINAL : undefined } as any,
      bookings as any, {} as any, { getNotifiableTelegramId: jest.fn().mockResolvedValue(null) } as any,
      notifications as any, client as any, db);
    const payload = (overrides: Record<string, unknown> = {}) => ({
      TerminalKey: TERMINAL, OrderId: ESCROW_ID, Success: true, Status: 'AUTHORIZED',
      PaymentId: PAYMENT, Amount: 100000, Token: 'signed-fixture', ...overrides,
    } as any);
    return { service, state, db, writes, locks, bookings, client, notifications, payload };
  }

  it('rejects a bad signature before reading or writing the database', async () => {
    const h = harness(); h.client.verifyToken.mockReturnValue(false);
    await expect(h.service.handleWebhook(h.payload())).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.db.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { TerminalKey: 'another-terminal' }, { PaymentId: 'another-payment' },
    { Amount: 99999 }, { Success: false },
  ])('rejects a signed notification for wrong payment data: %p', async (invalid) => {
    const h = harness();
    await expect(h.service.handleWebhook(h.payload(invalid))).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.writes).toEqual([]);
    expect(h.bookings.transitionState).not.toHaveBeenCalled();
    expect(h.state.order.tbankPaymentId).toBe(PAYMENT);
  });

  it.each([NaN, 1.5, -1, 100001])('rejects a malformed or oversized amount %p without writes', async (amount) => {
    const h = harness();
    await expect(h.service.handleWebhook(h.payload({ Amount: amount }))).rejects.toBeInstanceOf(BadRequestException);
    expect(h.writes).toEqual([]);
  });

  it('rejects a stored terminal mismatch even if the incoming signature is valid', async () => {
    const h = harness({ terminalKey: 'previous-terminal' });
    await expect(h.service.handleWebhook(h.payload())).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.writes).toEqual([]);
  });

  it('locks order and escrow, funds once, and reconciles the booking', async () => {
    const h = harness();
    await h.service.handleWebhook(h.payload());
    expect(h.locks).toEqual(['update', 'update']);
    expect(h.state.order.status).toBe('AUTHORIZED');
    expect(h.state.escrow.status).toBe('funded');
    expect(h.state.booking.status).toBe('escrow_funded');
    expect(h.writes.filter((w) => w.table === escrowTransactions)).toHaveLength(1);
    await h.service.handleWebhook(h.payload());
    expect(h.writes.filter((w) => w.table === escrowTransactions)).toHaveLength(1);
    expect(h.bookings.transitionState).toHaveBeenCalledTimes(2);
    expect(h.client.confirm).not.toHaveBeenCalled();
    expect(h.client.cancel).not.toHaveBeenCalled();
  });

  it('retries booking reconciliation after a post-commit failure on the same bank status', async () => {
    const h = harness();
    h.bookings.transitionState.mockRejectedValueOnce(new Error('database temporarily unavailable'));
    await expect(h.service.handleWebhook(h.payload())).rejects.toThrow('database temporarily unavailable');
    expect(h.state.order.status).toBe('AUTHORIZED');
    expect(h.state.escrow.status).toBe('funded');
    expect(h.state.booking.status).toBe('confirmed');
    await h.service.handleWebhook(h.payload());
    expect(h.state.booking.status).toBe('escrow_funded');
    expect(h.writes.filter((w) => w.table === escrowTransactions)).toHaveLength(1);
  });

  it('repairs the older checkpoint-before-funding failure case', async () => {
    const h = harness({ status: 'AUTHORIZED' });
    await h.service.handleWebhook(h.payload());
    expect(h.state.escrow.status).toBe('funded');
    expect(h.state.booking.status).toBe('escrow_funded');
  });

  it.each(['CONFIRMED', 'REFUNDED', 'REVERSED'] as const)('ignores stale AUTHORIZED after %s', async (status) => {
    const h = harness({ status }, { status: status === 'CONFIRMED' ? 'released' : 'refunded' });
    h.state.booking.status = 'completed';
    await h.service.handleWebhook(h.payload());
    expect(h.writes).toEqual([]);
    expect(h.state.booking.status).toBe('completed');
    expect(h.bookings.transitionState).not.toHaveBeenCalled();
  });

  it('CONFIRMED repairs released escrow and completed booking without calling Confirm', async () => {
    const h = harness({ status: 'CONFIRMED' }, { status: 'funded' });
    await h.service.handleWebhook(h.payload({ Status: 'CONFIRMED' }));
    expect(h.state.escrow.status).toBe('released');
    expect(h.state.booking.status).toBe('completed');
    expect(h.client.confirm).not.toHaveBeenCalled();
    expect(h.client.cancel).not.toHaveBeenCalled();
  });

  it('CONFIRMED retries an incomplete booking even when escrow was already released', async () => {
    const h = harness({ status: 'CONFIRMED' }, { status: 'released' });
    h.state.booking.status = 'in_progress';
    h.bookings.transitionState.mockRejectedValueOnce(new Error('completion unavailable'));
    await expect(h.service.handleWebhook(h.payload({ Status: 'CONFIRMED' }))).rejects.toThrow('completion unavailable');
    await h.service.handleWebhook(h.payload({ Status: 'CONFIRMED' }));
    expect(h.state.booking.status).toBe('completed');
    expect(h.writes.filter((w) => w.table === escrowTransactions)).toHaveLength(0);
  });

  it('serializes concurrent same-status financial transitions in the transaction', async () => {
    const h = harness();
    await Promise.all([h.service.handleWebhook(h.payload()), h.service.handleWebhook(h.payload())]);
    expect(h.state.escrow.status).toBe('funded');
    expect(h.state.booking.status).toBe('escrow_funded');
    expect(h.writes.filter((w) => w.table === escrowTransactions)).toHaveLength(1);
  });

  it('preserves exact decimal kopecks for funding validation', async () => {
    const h = harness({}, { amountHeld: '0.29' });
    await h.service.handleWebhook(h.payload({ Amount: 29 }));
    expect(h.state.escrow.status).toBe('funded');
  });
});
