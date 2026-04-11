import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
