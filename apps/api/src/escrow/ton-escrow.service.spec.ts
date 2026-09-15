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
import { TonExchangeRateService } from './ton/ton-exchange-rate.service';
import { UsersService } from '../users/users.service';
import { ModelsService } from '../models/models.service';
import { TelegramNotifyService } from '../notifications/telegram-notify.service';
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
    managerPayout: null,
    currency: 'RUB',
    proposedStartTime: null,
    proposedByUserId: null,
    cancellationReason: null,
    cancelledBy: null,
    refundRequestedAt: null,
    refundRequestedReason: null,
    guestName: null,
    guestPhone: null,
    guestEmail: null,
    guestMessage: null,
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
    clientRefundAddress: null,
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
    createdAt: t,
    updatedAt: t,
    ...overrides,
  };
}

describe('tonEscrowToClientView', () => {
  it('does not expose stateHistory or paymentProviderRef', () => {
    const row = baseTonEscrow({
      paymentProviderRef: 'secret-ref',
    });
    const v = tonEscrowToClientView(row);
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
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
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
  let exchangeRate: { getUsdtRubRate: jest.Mock };

  const TON_CONFIG = {
    TON_NETWORK: 'ton_testnet',
    TON_USDT_JETTON_MASTER: 'EQ' + 'J'.repeat(46),
    TON_TREASURY_ADDRESS: 'UQ' + 'T'.repeat(46),
  };
  const VALID_REFUND_ADDRESS = 'UQ' + 'C'.repeat(46);
  const VALID_INTENT_DTO = { bookingId: BOOKING_ID, clientRefundAddress: VALID_REFUND_ADDRESS };

  beforeEach(async () => {
    bookings = { findById: jest.fn(), transitionState: jest.fn() };
    tonRepo = {
      findByBookingId: jest.fn(),
      createIntentWithAudit: jest.fn(),
      withTransaction: jest.fn(),
    };
    configGet = jest.fn((key: string) => TON_CONFIG[key as keyof typeof TON_CONFIG]);
    // 100 RUB/USDT — baseBooking().totalAmount = '100.00' → ровно 1 USDT (1_000_000 atomic).
    exchangeRate = { getUsdtRubRate: jest.fn().mockResolvedValue(100) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: TonHotWalletService, useValue: {} },
        { provide: TonExchangeRateService, useValue: exchangeRate },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws ServiceUnavailable when TON config missing', async () => {
    configGet.mockReturnValue(undefined);
    await expect(service.createIntent(CLIENT_ID, VALID_INTENT_DTO)).rejects.toThrow();
  });

  it('throws NotFound when booking missing', async () => {
    bookings.findById.mockResolvedValue(null);
    await expect(service.createIntent(CLIENT_ID, VALID_INTENT_DTO)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws Forbidden when actor is not booking client', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    await expect(service.createIntent(OTHER_USER_ID, VALID_INTENT_DTO)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows creating intent when booking status is confirmed (pay only after confirmation)', async () => {
    bookings.findById.mockResolvedValue(baseBooking({ status: 'confirmed' }));
    tonRepo.findByBookingId.mockResolvedValue(null);
    tonRepo.createIntentWithAudit.mockResolvedValue(baseTonEscrow({ status: 'pending_funding' }));
    const v = await service.createIntent(CLIENT_ID, VALID_INTENT_DTO);
    expect(v.bookingId).toBe(BOOKING_ID);
  });

  it('throws BadRequest when booking status is draft (not yet confirmed)', async () => {
    bookings.findById.mockResolvedValue(baseBooking({ status: 'draft' }));
    await expect(service.createIntent(CLIENT_ID, VALID_INTENT_DTO)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Conflict when escrow already exists', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(baseTonEscrow());
    await expect(service.createIntent(CLIENT_ID, VALID_INTENT_DTO)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws BadRequest for zero-price booking', async () => {
    bookings.findById.mockResolvedValue(baseBooking({ totalAmount: '0' }));
    tonRepo.findByBookingId.mockResolvedValue(null);
    await expect(service.createIntent(CLIENT_ID, VALID_INTENT_DTO)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest for a malformed clientRefundAddress', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(null);
    await expect(
      service.createIntent(CLIENT_ID, { bookingId: BOOKING_ID, clientRefundAddress: 'not-a-ton-address' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates intent and returns client view', async () => {
    bookings.findById.mockResolvedValue(baseBooking());
    tonRepo.findByBookingId.mockResolvedValue(null);
    const escrow = baseTonEscrow({ status: 'pending_funding' });
    tonRepo.createIntentWithAudit.mockResolvedValue(escrow);

    const v = await service.createIntent(CLIENT_ID, VALID_INTENT_DTO);
    expect(v.bookingId).toBe(BOOKING_ID);
    expect(v.status).toBe('pending_funding');
    expect(v).not.toHaveProperty('stateHistory');
    expect(tonRepo.createIntentWithAudit).toHaveBeenCalledTimes(1);
  });

  it('computes atomic amount from booking totalAmount (RUB) and the live USDT/RUB rate', async () => {
    bookings.findById.mockResolvedValue(baseBooking({ totalAmount: '250.00' }));
    tonRepo.findByBookingId.mockResolvedValue(null);
    exchangeRate.getUsdtRubRate.mockResolvedValue(50); // 250 RUB / 50 = 5 USDT
    tonRepo.createIntentWithAudit.mockResolvedValue(baseTonEscrow());

    await service.createIntent(CLIENT_ID, VALID_INTENT_DTO);
    const call = tonRepo.createIntentWithAudit.mock.calls[0][0];
    expect(call.escrowRow.expectedAmountAtomic).toBe(5_000_000n);
    expect(call.escrowRow.assetDecimals).toBe(6);
    expect(call.escrowRow.clientRefundAddress).toBe(VALID_REFUND_ADDRESS);
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
      findDepositByTxHash: jest.fn().mockResolvedValue(null),
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
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
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
  let models: { findById: jest.Mock };

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
    models = { findById: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: models },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when escrow missing', async () => {
    tonRepo.findByIdTx.mockResolvedValue(null);
    await expect(
      service.confirmRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest for non-ton_usdt escrow', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ paymentProvider: 'manual' }));
    await expect(
      service.confirmRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {
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
      service.confirmRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('is idempotent when already released with same hash', async () => {
    tonRepo.findByIdTx.mockResolvedValue(
      baseTonEscrow({ status: 'released', releaseTxHash: RELEASE_TX_HASH }),
    );
    bookings.findById.mockResolvedValue(baseBooking({ status: 'completed' }));
    const v = await service.confirmRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {
      releaseTxHash: RELEASE_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
    });
    expect(v.status).toBe('released');
  });

  it('throws Conflict when escrow status is pending_funding', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'pending_funding' }));
    await expect(
      service.confirmRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('drives booking escrow_funded -> completed after a successful release (payout happens post-meeting, not pre-payment confirm)', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    // beforeEach already mocks bookings.findById -> baseBooking({ status: 'escrow_funded' })
    await service.confirmRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {
      releaseTxHash: RELEASE_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
    });
    expect(bookings.transitionState).toHaveBeenCalledWith(BOOKING_ID, 'completed', CLIENT_ID);
  });

  it('throws Forbidden when a manager tries to confirm release for a model they do not manage', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    models.findById.mockResolvedValue({ managerId: 'someone-else' });
    await expect(
      service.confirmRelease(CLIENT_ID, 'manager', ESCROW_TX_ID, {
        releaseTxHash: RELEASE_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the assigned manager to confirm release for their own model', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    models.findById.mockResolvedValue({ managerId: CLIENT_ID });
    const v = await service.confirmRelease(CLIENT_ID, 'manager', ESCROW_TX_ID, {
      releaseTxHash: RELEASE_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
    });
    expect(v.status).toBe('released');
  });
});

// ---------------------------------------------------------------------------
// settleWithoutPayout
// ---------------------------------------------------------------------------

describe('TonEscrowService.settleWithoutPayout', () => {
  let service: TonEscrowService;
  let tonRepo: Record<string, jest.Mock>;
  let bookings: Record<string, jest.Mock>;
  let models: { findById: jest.Mock };

  beforeEach(async () => {
    const fakeTx = makeTxWithUpdate([baseTonEscrow({ status: 'released', releaseTrigger: 'pooled_no_payout' })]);
    tonRepo = {
      withTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(fakeTx)),
      findByIdTx: jest.fn(),
      appendAudit: jest.fn().mockResolvedValue(undefined),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue(baseBooking({ status: 'escrow_funded' })),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };
    models = { findById: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: models },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when escrow missing', async () => {
    tonRepo.findByIdTx.mockResolvedValue(null);
    await expect(service.settleWithoutPayout(CLIENT_ID, 'admin', ESCROW_TX_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequest for non-ton_usdt escrow', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ paymentProvider: 'manual' }));
    await expect(service.settleWithoutPayout(CLIENT_ID, 'admin', ESCROW_TX_ID)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Conflict when escrow status does not allow release', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'pending_funding' }));
    await expect(service.settleWithoutPayout(CLIENT_ID, 'admin', ESCROW_TX_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('is idempotent when already released', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'released', releaseTrigger: 'pooled_no_payout' }));
    bookings.findById.mockResolvedValue(baseBooking({ status: 'completed' }));
    const v = await service.settleWithoutPayout(CLIENT_ID, 'admin', ESCROW_TX_ID);
    expect(v.status).toBe('released');
  });

  it('marks released with releaseTrigger=pooled_no_payout and no tx hash, without touching the hot wallet', async () => {
    const fakeTx = makeTxWithUpdate([baseTonEscrow({ status: 'released', releaseTrigger: 'pooled_no_payout' })]);
    tonRepo.withTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(fakeTx));
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));

    await service.settleWithoutPayout(CLIENT_ID, 'admin', ESCROW_TX_ID, 'meeting done');

    const setCallArg = fakeTx.update().set.mock.calls[0][0];
    expect(setCallArg.releaseTrigger).toBe('pooled_no_payout');
    expect(setCallArg.releaseTxHash).toBeUndefined();
    expect(bookings.transitionState).toHaveBeenCalledWith(BOOKING_ID, 'completed', CLIENT_ID);
  });

  it('throws Forbidden when a manager tries to settle escrow for a model they do not manage', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    models.findById.mockResolvedValue({ managerId: 'someone-else' });
    await expect(service.settleWithoutPayout(CLIENT_ID, 'manager', ESCROW_TX_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the assigned manager to settle escrow for their own model', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    models.findById.mockResolvedValue({ managerId: CLIENT_ID });
    const v = await service.settleWithoutPayout(CLIENT_ID, 'manager', ESCROW_TX_ID);
    expect(v.status).toBe('released');
  });
});

// ---------------------------------------------------------------------------
// broadcastRelease — commission must be deducted before sending to the model
// (regression coverage for the "model got 100%, platform got nothing" bug).
// ---------------------------------------------------------------------------

describe('TonEscrowService.broadcastRelease', () => {
  let service: TonEscrowService;
  let tonRepo: Record<string, jest.Mock>;
  let bookings: Record<string, jest.Mock>;
  let hotWallet: { transferJettonToOwner: jest.Mock };
  let models: { findById: jest.Mock };
  let users: { findById: jest.Mock };

  beforeEach(async () => {
    const fakeTx = makeTxWithUpdate([baseTonEscrow({ status: 'released', releaseTxHash: RELEASE_TX_HASH })]);
    tonRepo = {
      findById: jest.fn().mockResolvedValue(baseTonEscrow({ status: 'funded', receivedAmountAtomic: 1_000_000n })),
      withTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(fakeTx)),
      findByIdTx: jest.fn().mockResolvedValue(baseTonEscrow({ status: 'funded', receivedAmountAtomic: 1_000_000n })),
      appendAudit: jest.fn().mockResolvedValue(undefined),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue(baseBooking({ status: 'escrow_funded' })),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };
    hotWallet = { transferJettonToOwner: jest.fn().mockResolvedValue(RELEASE_TX_HASH) };
    models = { findById: jest.fn().mockResolvedValue(null) };
    users = { findById: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: hotWallet },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: users },
        { provide: ModelsService, useValue: models },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('deducts platform fee + manager share before sending the rest to the model', async () => {
    models.findById.mockResolvedValue({
      managerId: 'manager-1',
      platformCommissionRate: '0.050',
      managerCommissionRate: '0.200',
    });
    users.findById.mockResolvedValue({ id: 'manager-1', role: 'manager' });

    await service.broadcastRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, { recipientAddress: VALID_RECIPIENT });

    // total 1_000_000n: 5% platform (50_000n) + 20% manager, from FULL total per the gross-based
    // explicit rate (200_000n) → model gets the remaining 750_000n, not the full 1_000_000n.
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalledWith(
      expect.objectContaining({ jettonAmountAtomic: 750_000n }),
    );
  });

  it('deducts only the platform fee when the model has no manager owner', async () => {
    models.findById.mockResolvedValue({ managerId: null, platformCommissionRate: null, managerCommissionRate: null });

    await service.broadcastRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, { recipientAddress: VALID_RECIPIENT });

    // Default 5% platform fee, no manager to split with → model gets the rest of the pool (950_000n).
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalledWith(
      expect.objectContaining({ jettonAmountAtomic: 950_000n }),
    );
  });

  it('throws BadRequest when recipientAddress is omitted (release has no stored fallback)', async () => {
    await expect(service.broadcastRelease(CLIENT_ID, 'admin', ESCROW_TX_ID, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Forbidden when a manager tries to release escrow for a model they do not manage', async () => {
    models.findById.mockResolvedValue({ managerId: 'someone-else', platformCommissionRate: null, managerCommissionRate: null });
    await expect(
      service.broadcastRelease(CLIENT_ID, 'manager', ESCROW_TX_ID, { recipientAddress: VALID_RECIPIENT }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(hotWallet.transferJettonToOwner).not.toHaveBeenCalled();
  });

  it('allows the assigned manager to release escrow for their own model', async () => {
    models.findById.mockResolvedValue({ managerId: CLIENT_ID, platformCommissionRate: null, managerCommissionRate: null });
    await service.broadcastRelease(CLIENT_ID, 'manager', ESCROW_TX_ID, { recipientAddress: VALID_RECIPIENT });
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// broadcastRefund
// ---------------------------------------------------------------------------

describe('TonEscrowService.broadcastRefund', () => {
  let service: TonEscrowService;
  let tonRepo: Record<string, jest.Mock>;
  let bookings: Record<string, jest.Mock>;
  let hotWallet: { transferJettonToOwner: jest.Mock };
  let models: { findById: jest.Mock };
  const STORED_REFUND_ADDRESS = 'UQ' + 'S'.repeat(46);

  beforeEach(async () => {
    const fakeTx = makeTxWithUpdate([baseTonEscrow({ status: 'refunded', refundTxHash: RELEASE_TX_HASH })]);
    tonRepo = {
      findById: jest.fn().mockResolvedValue(
        baseTonEscrow({ status: 'funded', receivedAmountAtomic: 1_000_000n, clientRefundAddress: STORED_REFUND_ADDRESS }),
      ),
      withTransaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(fakeTx)),
      findByIdTx: jest.fn().mockResolvedValue(
        baseTonEscrow({ status: 'funded', receivedAmountAtomic: 1_000_000n, clientRefundAddress: STORED_REFUND_ADDRESS }),
      ),
      appendAudit: jest.fn().mockResolvedValue(undefined),
    };
    bookings = {
      findById: jest.fn().mockResolvedValue(baseBooking({ status: 'escrow_funded' })),
      transitionState: jest.fn().mockResolvedValue(undefined),
    };
    hotWallet = { transferJettonToOwner: jest.fn().mockResolvedValue(RELEASE_TX_HASH) };
    models = { findById: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: hotWallet },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: models },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('falls back to the stored clientRefundAddress when none is passed explicitly', async () => {
    await service.broadcastRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {});
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalledWith(
      expect.objectContaining({ recipientOwnerAddress: STORED_REFUND_ADDRESS }),
    );
  });

  it('prefers an explicitly passed recipientAddress over the stored one', async () => {
    await service.broadcastRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, { recipientAddress: VALID_RECIPIENT });
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalledWith(
      expect.objectContaining({ recipientOwnerAddress: VALID_RECIPIENT }),
    );
  });

  it('throws BadRequest when neither an explicit address nor a stored one exists', async () => {
    tonRepo.findById.mockResolvedValue(
      baseTonEscrow({ status: 'funded', receivedAmountAtomic: 1_000_000n, clientRefundAddress: null }),
    );
    await expect(service.broadcastRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws Forbidden when a manager tries to refund escrow for a model they do not manage', async () => {
    models.findById.mockResolvedValue({ managerId: 'someone-else' });
    await expect(service.broadcastRefund(CLIENT_ID, 'manager', ESCROW_TX_ID, {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(hotWallet.transferJettonToOwner).not.toHaveBeenCalled();
  });

  it('allows the assigned manager to refund escrow for their own model', async () => {
    models.findById.mockResolvedValue({ managerId: CLIENT_ID });
    await service.broadcastRefund(CLIENT_ID, 'manager', ESCROW_TX_ID, {});
    expect(hotWallet.transferJettonToOwner).toHaveBeenCalled();
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
  let models: { findById: jest.Mock };

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
    models = { findById: jest.fn().mockResolvedValue(null) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TonEscrowService,
        { provide: BookingsService, useValue: bookings },
        { provide: EscrowTonRepository, useValue: tonRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: TonHotWalletService, useValue: {} },
        { provide: TonExchangeRateService, useValue: { getUsdtRubRate: jest.fn().mockResolvedValue(100) } },
        { provide: UsersService, useValue: { findById: jest.fn().mockResolvedValue(null) } },
        { provide: ModelsService, useValue: models },
        { provide: TelegramNotifyService, useValue: { notifyMany: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = moduleRef.get(TonEscrowService);
  });

  it('throws NotFound when escrow missing', async () => {
    tonRepo.findByIdTx.mockResolvedValue(null);
    await expect(
      service.confirmRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {
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
      service.confirmRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {
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
    const v = await service.confirmRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {
      refundTxHash: REFUND_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
    });
    expect(v.status).toBe('refunded');
  });

  it('throws Conflict when escrow status does not allow refund', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'pending_funding' }));
    await expect(
      service.confirmRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {
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

    await service.confirmRefund(CLIENT_ID, 'admin', ESCROW_TX_ID, {
      refundTxHash: REFUND_TX_HASH,
      recipientAddress: VALID_RECIPIENT,
      cancellationReason: 'test refund',
    });
    expect(bookings.transitionState).toHaveBeenCalledWith(
      BOOKING_ID, 'cancelled', CLIENT_ID, 'test refund',
    );
  });

  it('throws Forbidden when a manager tries to confirm refund for a model they do not manage', async () => {
    tonRepo.findByIdTx.mockResolvedValue(baseTonEscrow({ status: 'funded' }));
    models.findById.mockResolvedValue({ managerId: 'someone-else' });
    await expect(
      service.confirmRefund(CLIENT_ID, 'manager', ESCROW_TX_ID, {
        refundTxHash: REFUND_TX_HASH,
        recipientAddress: VALID_RECIPIENT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
