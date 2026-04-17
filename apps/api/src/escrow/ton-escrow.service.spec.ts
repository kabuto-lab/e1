import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Booking, EscrowTransaction } from '@escort/db';
import { BookingsService } from '../bookings/bookings.service';
import { EscrowTonRepository } from './escrow-ton.repository';
import { TonHotWalletService } from './ton/ton-hot-wallet.service';
import { TonEscrowService, tonEscrowToClientView } from './ton-escrow.service';

const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function baseBooking(overrides: Partial<Booking> = {}): Booking {
  const t = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: BOOKING_ID,
    clientId: CLIENT_ID,
    modelId: '33333333-3333-4333-8333-333333333333',
    managerId: null,
    status: 'pending_payment',
    startTime: t,
    durationHours: 2,
    locationType: null,
    specialRequests: null,
    totalAmount: '100.00',
    platformFee: '0',
    modelPayout: '0',
    currency: 'RUB',
    cancellationReason: null,
    cancelledBy: null,
    createdAt: t,
    updatedAt: t,
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function baseTonEscrow(overrides: Partial<EscrowTransaction> = {}): EscrowTransaction {
  const t = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: '44444444-4444-4444-8444-444444444444',
    bookingId: BOOKING_ID,
    paymentProvider: 'ton_usdt',
    paymentProviderRef: 'internal-ref',
    amountHeld: '10.00',
    currency: 'USD',
    expectedAmountAtomic: 1_000_000n,
    receivedAmountAtomic: 0n,
    assetDecimals: 6,
    network: 'ton_testnet',
    jettonMasterAddress: 'EQTestJetton',
    treasuryAddress: 'UQTestTreasury',
    expectedMemo: 'MEMO123',
    fundedTxHash: null,
    releaseTxHash: null,
    refundTxHash: null,
    confirmations: 0,
    status: 'pending_funding',
    fundedAt: null,
    holdUntil: null,
    releasedAt: null,
    refundedAt: null,
    releaseTrigger: null,
    stateHistory: [],
    createdAt: t,
    updatedAt: t,
    ...overrides,
  };
}

describe('tonEscrowToClientView', () => {
  it('does not expose stateHistory or paymentProviderRef', () => {
    const row = baseTonEscrow({
      stateHistory: [
        {
          fromStatus: 'pending_funding',
          toStatus: 'funded',
          triggeredBy: 'system',
          timestamp: '2026-01-02T00:00:00.000Z',
        },
      ],
      paymentProviderRef: 'secret-ref',
    });
    const v = tonEscrowToClientView(row);
    expect(v).not.toHaveProperty('stateHistory');
    expect(v).not.toHaveProperty('paymentProviderRef');
    expect(v.expectedMemo).toBe('MEMO123');
    expect(v.expectedAmountAtomic).toBe('1000000');
    expect(v.expectedAmountHuman).toBeDefined();
  });
});

describe('TonEscrowService.getTonEscrowByBookingForViewer', () => {
  let service: TonEscrowService;
  let bookings: { findById: jest.Mock };
  let tonRepo: { findByBookingId: jest.Mock };

  beforeEach(async () => {
    bookings = { findById: jest.fn() };
    tonRepo = { findByBookingId: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when booking is missing', async () => {
    bookings.findById.mockResolvedValue(null);
    await expect(
      service.getTonEscrowByBookingForViewer(CLIENT_ID, 'client', BOOKING_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tonRepo.findByBookingId).not.toHaveBeenCalled();
  });

  it('throws Forbidden when viewer is not client and not staff', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    await expect(
      service.getTonEscrowByBookingForViewer(OTHER_USER_ID, 'client', BOOKING_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tonRepo.findByBookingId).not.toHaveBeenCalled();
  });

  it('throws Forbidden for model role viewing another client booking', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    await expect(
      service.getTonEscrowByBookingForViewer(OTHER_USER_ID, 'model', BOOKING_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns client view when booking client matches', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(baseTonEscrow());
    const v = await service.getTonEscrowByBookingForViewer(CLIENT_ID, 'client', BOOKING_ID);
    expect(v.bookingId).toBe(BOOKING_ID);
    expect(v.paymentProvider).toBe('ton_usdt');
    expect(v).not.toHaveProperty('stateHistory');
  });

  it('allows admin to view', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(baseTonEscrow());
    const v = await service.getTonEscrowByBookingForViewer(OTHER_USER_ID, 'admin', BOOKING_ID);
    expect(v.expectedMemo).toBe('MEMO123');
  });

  it('allows manager to view', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(baseTonEscrow());
    const v = await service.getTonEscrowByBookingForViewer(OTHER_USER_ID, 'manager', BOOKING_ID);
    expect(v.status).toBe('pending_funding');
  });

  it('throws NotFound when there is no escrow row', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(null);
    await expect(
      service.getTonEscrowByBookingForViewer(CLIENT_ID, 'client', BOOKING_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFound when escrow is not ton_usdt', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(baseTonEscrow({ paymentProvider: 'manual' }));
    await expect(
      service.getTonEscrowByBookingForViewer(CLIENT_ID, 'client', BOOKING_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// Helpers for mocking withTransaction
// ---------------------------------------------------------------------------

function mockWithTx(tonRepo: Record<string, jest.Mock>) {
  tonRepo.withTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
}

// ---------------------------------------------------------------------------
// createIntent
// ---------------------------------------------------------------------------

describe('TonEscrowService.createIntent', () => {
  let service: TonEscrowService;
  let bookings: Record<string, jest.Mock>;
  let tonRepo: Record<string, jest.Mock>;
  let configGet: jest.Mock;

  const TON_CONFIG = {
    TON_NETWORK: 'ton_testnet',
    TON_USDT_JETTON_MASTER: 'EQ' + 'J'.repeat(46),
    TON_TREASURY_ADDRESS: 'UQ' + 'T'.repeat(46),
  };

  beforeEach(async () => {
    bookings = { findById: jest.fn(), transitionState: jest.fn() };
    tonRepo = {
      findByBookingId: jest.fn(),
      createIntentWithAudit: jest.fn(),
      withTransaction: jest.fn(),
    };
    configGet = jest.fn((key: string) => TON_CONFIG[key as keyof typeof TON_CONFIG]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: TonHotWalletService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws ServiceUnavailable when TON config missing', async () => {
    configGet.mockReturnValue(undefined);
    await expect(
      service.createIntent(CLIENT_ID, { bookingId: BOOKING_ID, expectedAmountAtomic: '1000000' }),
    ).rejects.toThrow();
  });

  it('throws NotFound when booking missing', async () => {
    bookings.findById.mockResolvedValue(null);
    await expect(
      service.createIntent(CLIENT_ID, { bookingId: BOOKING_ID, expectedAmountAtomic: '1000000' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Forbidden when actor is not booking client', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    await expect(
      service.createIntent(OTHER_USER_ID, { bookingId: BOOKING_ID, expectedAmountAtomic: '1000000' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequest when booking status is confirmed', async () => {
    bookings.findById.mockResolvedValue(baseBooking({ status: 'confirmed' }));
    await expect(
      service.createIntent(CLIENT_ID, { bookingId: BOOKING_ID, expectedAmountAtomic: '1000000' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Conflict when escrow already exists', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(baseTonEscrow());
    await expect(
      service.createIntent(CLIENT_ID, { bookingId: BOOKING_ID, expectedAmountAtomic: '1000000' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws BadRequest for zero amount', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(null);
    await expect(
      service.createIntent(CLIENT_ID, { bookingId: BOOKING_ID, expectedAmountAtomic: '0' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates intent and returns client view', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(null);
    const escrow = baseTonEscrow({ status: 'pending_funding' });
    tonRepo.createIntentWithAudit.mockResolvedValue(escrow);

    const v = await service.createIntent(CLIENT_ID, {
      bookingId: BOOKING_ID,
      expectedAmountAtomic: '1000000',
    });
    expect(v.bookingId).toBe(BOOKING_ID);
    expect(v.status).toBe('pending_funding');
    expect(v).not.toHaveProperty('stateHistory');
    expect(tonRepo.createIntentWithAudit).toHaveBeenCalledTimes(1);
  });

  it('uses provided assetDecimals', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(null);
    const escrow = baseTonEscrow({ assetDecimals: 9 });
    tonRepo.createIntentWithAudit.mockResolvedValue(escrow);

    await service.createIntent(CLIENT_ID, {
      bookingId: BOOKING_ID,
      expectedAmountAtomic: '1000000000',
      assetDecimals: 9,
    });
    const call = tonRepo.createIntentWithAudit.mock.calls[0][0];
    expect(call.escrowRow.assetDecimals).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// recordDeposit
// ---------------------------------------------------------------------------

const VALID_TREASURY = 'UQ' + 'T'.repeat(46);
const VALID_JETTON = 'EQ' + 'J'.repeat(46);
const ESCROW_ID = '44444444-4444-4444-8444-444444444444';

function baseDepositDto(overrides: Record<string, unknown> = {}) {
  return {
    memo: 'E1testmemo',
    txHash: 'abcdef1234567890',
    fromAddressRaw: 'EQ' + 'F'.repeat(46),
    treasuryAddressRaw: VALID_TREASURY,
    jettonMasterRaw: VALID_JETTON,
    amountAtomic: '1000000',
    network: 'ton_testnet' as const,
    ...overrides,
  };
}

describe('TonEscrowService.recordDeposit', () => {
  let service: TonEscrowService;
  let tonRepo: Record<string, jest.Mock>;
  let bookings: Record<string, jest.Mock>;
  let tx: Record<string, jest.Mock>;

  beforeEach(async () => {
    tx = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([baseTonEscrow({ status: 'funded', fundedTxHash: 'abcdef1234567890', fundedAt: new Date(), receivedAmountAtomic: 1_000_000n })]),
          }),
        }),
      }),
    };
    tonRepo = {
      withTransaction: jest.fn(),
      findByExpectedMemoTx: jest.fn(),
      findDepositByTxHashTx: jest.fn(),
      insertDepositIdempotentTx: jest.fn().mockResolvedValue({ inserted: true }),
      findByIdTx: jest.fn(),
      appendAudit: jest.fn().mockResolvedValue(undefined),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue(baseBooking({ status: 'pending_payment' })),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };

    tonRepo.withTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when no escrow matches memo', async () => {
    tonRepo.findByExpectedMemoTx.mockResolvedValue(null);
    await expect(service.recordDeposit(baseDepositDto())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest when escrow is not ton_usdt', async () => {
    tonRepo.findByExpectedMemoTx.mockResolvedValue(
      baseTonEscrow({ paymentProvider: 'manual', expectedMemo: 'E1testmemo' }),
    );
    await expect(service.recordDeposit(baseDepositDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest on network mismatch', async () => {
    tonRepo.findByExpectedMemoTx.mockResolvedValue(
      baseTonEscrow({ network: 'ton_mainnet', treasuryAddress: VALID_TREASURY, jettonMasterAddress: VALID_JETTON }),
    );
    await expect(
      service.recordDeposit(baseDepositDto({ network: 'ton_testnet' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when treasury does not match', async () => {
    const otherTreasury = 'UQ' + 'X'.repeat(46);
    tonRepo.findByExpectedMemoTx.mockResolvedValue(
      baseTonEscrow({ treasuryAddress: otherTreasury, jettonMasterAddress: VALID_JETTON }),
    );
    await expect(service.recordDeposit(baseDepositDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns idempotent=true for duplicate txHash when already funded', async () => {
    const funded = baseTonEscrow({
      status: 'funded',
      treasuryAddress: VALID_TREASURY,
      jettonMasterAddress: VALID_JETTON,
    });
    tonRepo.findByExpectedMemoTx.mockResolvedValue(funded);
    tonRepo.findDepositByTxHashTx.mockResolvedValue({
      id: 'dep-id',
      escrowTransactionId: funded.id,
      txHash: 'abcdef1234567890',
    });

    const result = await service.recordDeposit(baseDepositDto());
    expect(result.idempotent).toBe(true);
    expect(result.fullyFunded).toBe(true);
  });

  it('marks escrow as funded when amount meets expectation', async () => {
    const escrow = baseTonEscrow({
      status: 'pending_funding',
      treasuryAddress: VALID_TREASURY,
      jettonMasterAddress: VALID_JETTON,
      expectedAmountAtomic: 1_000_000n,
      receivedAmountAtomic: 0n,
      assetDecimals: 6,
    });
    tonRepo.findByExpectedMemoTx.mockResolvedValue(escrow);
    tonRepo.insertDepositIdempotentTx.mockResolvedValue({ inserted: true });

    const result = await service.recordDeposit(baseDepositDto({ amountAtomic: '1000000' }));
    expect(result.fullyFunded).toBe(true);
    expect(result.idempotent).toBe(false);
  });

  it('does not mark as funded when amount is partial', async () => {
    const escrow = baseTonEscrow({
      status: 'pending_funding',
      treasuryAddress: VALID_TREASURY,
      jettonMasterAddress: VALID_JETTON,
      expectedAmountAtomic: 2_000_000n,
      receivedAmountAtomic: 0n,
      assetDecimals: 6,
    });
    tonRepo.findByExpectedMemoTx.mockResolvedValue(escrow);
    tonRepo.insertDepositIdempotentTx.mockResolvedValue({ inserted: true });

    // tx.update returns partial status
    tx.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            baseTonEscrow({ status: 'pending_funding', receivedAmountAtomic: 1_000_000n }),
          ]),
        }),
      }),
    });

    const result = await service.recordDeposit(baseDepositDto({ amountAtomic: '1000000' }));
    expect(result.fullyFunded).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// confirmRelease
// ---------------------------------------------------------------------------

const ESCROW_TX_ID = '44444444-4444-4444-8444-444444444444';
const VALID_RECIPIENT = 'EQ' + 'R'.repeat(46);
const RELEASE_TX_HASH = 'release-hash-abcdef1234';

function makeTxWithUpdate(returning: unknown[]) {
  return {
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue(returning) }),
      }),
    }),
    insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) }),
  };
}

describe('TonEscrowService.confirmRelease', () => {
  let service: TonEscrowService;
  let tonRepo: Record<string, jest.Mock>;
  let bookings: Record<string, jest.Mock>;

  beforeEach(async () => {
    const fakeTx = makeTxWithUpdate([baseTonEscrow({ status: 'released', releaseTxHash: RELEASE_TX_HASH })]);
    tonRepo = {
      withTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(fakeTx)),
      findByIdTx: jest.fn(),
      appendAudit: jest.fn().mockResolvedValue(undefined),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue(baseBooking({ status: 'escrow_funded' })),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when escrow missing', async () => {
    tonRepo.findByIdTx.mockResolvedValue(null);
    await expect(
      service.confirmRelease(CLIENT_ID, ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest for non-ton_usdt escrow', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ paymentProvider: 'manual' }));
    await expect(
      service.confirmRelease(CLIENT_ID, ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Conflict when already released with different hash', async () => {
    tonRepo.findByIdTx.mockResolvedValue(
      baseTonEscrow({ status: 'released', releaseTxHash: 'other-hash' }),
    );
    await expect(
      service.confirmRelease(CLIENT_ID, ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('is idempotent when already released with same hash', async () => {
    tonRepo.findByIdTx.mockResolvedValue(
      baseTonEscrow({ status: 'released', releaseTxHash: RELEASE_TX_HASH }),
    );
    bookings.findById.mockResolvedValue(baseBooking({ status: 'confirmed' }));
    const v = await service.confirmRelease(CLIENT_ID, ESCROW_TX_ID, {
      releaseTxHash: RELEASE_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
    });
    expect(v.status).toBe('released');
  });

  it('throws Conflict when escrow status is pending_funding', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'pending_funding' }));
    await expect(
      service.confirmRelease(CLIENT_ID, ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

// ---------------------------------------------------------------------------
// confirmRefund
// ---------------------------------------------------------------------------

const REFUND_TX_HASH = 'refund-hash-abcdef1234';

describe('TonEscrowService.confirmRefund', () => {
  let service: TonEscrowService;
  let tonRepo: Record<string, jest.Mock>;
  let bookings: Record<string, jest.Mock>;

  beforeEach(async () => {
    const fakeTx = makeTxWithUpdate([baseTonEscrow({ status: 'refunded', refundTxHash: REFUND_TX_HASH })]);
    tonRepo = {
      withTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(fakeTx)),
      findByIdTx: jest.fn(),
      appendAudit: jest.fn().mockResolvedValue(undefined),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue(baseBooking({ status: 'escrow_funded' })),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when escrow missing', async () => {
    tonRepo.findByIdTx.mockResolvedValue(null);
    await expect(
      service.confirmRefund(CLIENT_ID, ESCROW_TX_ID, {
        refundTxHash: REFUND_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Conflict when already refunded with different hash', async () => {
    tonRepo.findByIdTx.mockResolvedValue(
      baseTonEscrow({ status: 'refunded', refundTxHash: 'other-hash' }),
    );
    await expect(
      service.confirmRefund(CLIENT_ID, ESCROW_TX_ID, {
        refundTxHash: REFUND_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('is idempotent when already refunded with same hash', async () => {
    tonRepo.findByIdTx.mockResolvedValue(
      baseTonEscrow({ status: 'refunded', refundTxHash: REFUND_TX_HASH }),
    );
    bookings.findById.mockResolvedValue(baseBooking({ status: 'cancelled' }));
    const v = await service.confirmRefund(CLIENT_ID, ESCROW_TX_ID, {
      refundTxHash: REFUND_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
    });
    expect(v.status).toBe('refunded');
  });

  it('throws Conflict when escrow status does not allow refund', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'pending_funding' }));
    await expect(
      service.confirmRefund(CLIENT_ID, ESCROW_TX_ID, {
        refundTxHash: REFUND_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('transitions booking to cancelled after refund', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    // tx.update mock for confirmRefund path
    tonRepo.withTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const fakeTx = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([
                baseTonEscrow({ status: 'refunded', refundTxHash: REFUND_TX_HASH }),
              ]),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) }),
      };
      tonRepo.appendAudit.mockImplementation(async () => undefined);
      return fn(fakeTx);
    });

    await service.confirmRefund(CLIENT_ID, ESCROW_TX_ID, {
      refundTxHash: REFUND_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
      cancellationReason: 'test refund',
    });
    expect(bookings.transitionState).toHaveBeenCalledWith(
      BOOKING_ID, 'cancelled', CLIENT_ID, 'test refund',
    );
  });
});
