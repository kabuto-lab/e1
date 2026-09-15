import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import type { EscrowTransaction, TbankOrder } from '@escort/db';
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
