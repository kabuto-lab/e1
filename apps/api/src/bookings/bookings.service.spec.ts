import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Booking, ModelProfile } from '@escort/db';
import { BookingsService } from './bookings.service';
import { ModelsService } from '../models/models.service';
import { UsersService } from '../users/users.service';
import { TelegramNotifyService } from '../notifications/telegram-notify.service';

const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const MODEL_PROFILE_ID = '33333333-3333-4333-8333-333333333333';
const MODEL_USER_ID = '44444444-4444-4444-8444-444444444444';
const MANAGER_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ADMIN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function baseBooking(overrides: Partial<Booking> = {}): Booking {
  const t = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: BOOKING_ID,
    clientId: CLIENT_ID,
    modelId: MODEL_PROFILE_ID,
    managerId: null,
    status: 'draft',
    startTime: t,
    durationHours: 2,
    locationType: null,
    specialRequests: null,
    proposedStartTime: null,
    proposedByUserId: null,
    totalAmount: '100.00',
    platformFee: '0',
    modelPayout: '0',
    currency: 'RUB',
    cancellationReason: null,
    cancelledBy: null,
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
  } as Booking;
}

function baseModelProfile(overrides: Partial<ModelProfile> = {}): ModelProfile {
  return {
    id: MODEL_PROFILE_ID,
    userId: MODEL_USER_ID,
    managerId: MANAGER_ID,
    ...overrides,
  } as ModelProfile;
}

/** Мок Drizzle-подобного db: findById читает currentRow, update пишет в capturedUpdates и возвращает updatedRow. */
function makeDb(currentRow: Booking | null, updatedRow?: Booking) {
  const capturedUpdates: any[] = [];
  const capturedInserts: any[] = [];
  return {
    capturedUpdates,
    capturedInserts,
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(currentRow ? [currentRow] : []),
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockImplementation((values: any) => {
        capturedUpdates.push(values);
        return {
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedRow ?? { ...currentRow, ...values }]),
          }),
        };
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockImplementation((values: any) => {
        capturedInserts.push(values);
        return {
          returning: jest.fn().mockResolvedValue([{ ...baseBooking(), ...values, id: BOOKING_ID }]),
        };
      }),
    }),
  };
}

async function buildService(db: ReturnType<typeof makeDb>, modelProfile: ModelProfile | null = baseModelProfile()) {
  const modelsService = { findById: jest.fn().mockResolvedValue(modelProfile), findByUserId: jest.fn() };
  const usersService = { findById: jest.fn().mockResolvedValue(null) };
  const tgNotify = { notifyMany: jest.fn().mockResolvedValue(undefined) };

  const moduleRef = await Test.createTestingModule({
    providers: [
      BookingsService,
      { provide: 'DRIZZLE', useValue: db },
      { provide: ModelsService, useValue: modelsService },
      { provide: UsersService, useValue: usersService },
      { provide: TelegramNotifyService, useValue: tgNotify },
    ],
  }).compile();

  return { service: moduleRef.get(BookingsService), modelsService, usersService, tgNotify };
}

describe('BookingsService.createBooking', () => {
  it('computes 5%/95% commission split from totalAmount', async () => {
    const db = makeDb(null);
    const { service } = await buildService(db);

    await service.createBooking({
      clientId: CLIENT_ID,
      modelId: MODEL_PROFILE_ID,
      startTime: new Date(),
      durationHours: 2,
      totalAmount: '1000.00',
    });

    expect(db.capturedInserts[0].platformFee).toBe('50.00');
    expect(db.capturedInserts[0].modelPayout).toBe('950.00');
    expect(db.capturedInserts[0].managerPayout).toBeNull();
    expect(db.capturedInserts[0].status).toBe('draft');
  });

  it('splits the 95% pool with the manager per managerCommissionRate', async () => {
    const db = makeDb(null);
    const { service } = await buildService(db, baseModelProfile({ managerCommissionRate: '0.200' }));

    await service.createBooking({
      clientId: CLIENT_ID,
      modelId: MODEL_PROFILE_ID,
      startTime: new Date(),
      durationHours: 2,
      totalAmount: '1000.00',
    });

    expect(db.capturedInserts[0].platformFee).toBe('50.00');
    expect(db.capturedInserts[0].managerPayout).toBe('190.00');
    expect(db.capturedInserts[0].modelPayout).toBe('760.00');
  });

  it('gives 100% of the pool to the model when the profile has no manager', async () => {
    const db = makeDb(null);
    const { service } = await buildService(db, baseModelProfile({ managerId: null, managerCommissionRate: '0.500' }));

    await service.createBooking({
      clientId: CLIENT_ID,
      modelId: MODEL_PROFILE_ID,
      startTime: new Date(),
      durationHours: 2,
      totalAmount: '1000.00',
    });

    expect(db.capturedInserts[0].modelPayout).toBe('950.00');
    expect(db.capturedInserts[0].managerPayout).toBeNull();
  });

  it('throws BadRequest for durationHours < 1', async () => {
    const db = makeDb(null);
    const { service } = await buildService(db);
    await expect(
      service.createBooking({ clientId: CLIENT_ID, modelId: MODEL_PROFILE_ID, startTime: new Date(), durationHours: 0, totalAmount: '100' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BookingsService state machine (transitionState)', () => {
  it('rejects escrow_funded -> confirmed (old backwards transition no longer allowed)', async () => {
    const db = makeDb(baseBooking({ status: 'escrow_funded' }));
    const { service } = await buildService(db);
    await expect(service.transitionState(BOOKING_ID, 'confirmed', ADMIN_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows draft -> confirmed directly (confirm before payment)', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    const updated = await service.transitionState(BOOKING_ID, 'confirmed', ADMIN_ID);
    expect(updated.status).toBe('confirmed');
  });

  it('rejects confirmed -> escrow_funded directly (must go through pending_payment)', async () => {
    const db = makeDb(baseBooking({ status: 'confirmed' }));
    const { service } = await buildService(db);
    await expect(service.transitionState(BOOKING_ID, 'escrow_funded', ADMIN_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('recomputes platformFee/modelPayout on completion', async () => {
    const db = makeDb(baseBooking({ status: 'escrow_funded', totalAmount: '200.00', platformFee: '0', modelPayout: '0' }));
    const { service } = await buildService(db);
    await service.transitionState(BOOKING_ID, 'completed', ADMIN_ID);
    expect(db.capturedUpdates[0].platformFee).toBe('10.00');
    expect(db.capturedUpdates[0].modelPayout).toBe('190.00');
  });
});

describe('BookingsService.confirmForActor / declineForActor / proposeTimeForActor', () => {
  it('allows admin to confirm', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    const updated = await service.confirmForActor(BOOKING_ID, ADMIN_ID, 'admin', null);
    expect(updated.status).toBe('confirmed');
  });

  it('allows the assigned manager to confirm', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db, baseModelProfile({ managerId: MANAGER_ID }));
    const updated = await service.confirmForActor(BOOKING_ID, MANAGER_ID, 'manager', null);
    expect(updated.status).toBe('confirmed');
  });

  it('forbids a manager who does not own this model', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db, baseModelProfile({ managerId: MANAGER_ID }));
    await expect(service.confirmForActor(BOOKING_ID, OTHER_USER_ID, 'manager', null)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the model to confirm her own booking', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    const updated = await service.confirmForActor(BOOKING_ID, MODEL_USER_ID, 'model', MODEL_PROFILE_ID);
    expect(updated.status).toBe('confirmed');
  });

  it('forbids a model confirming a booking that is not her own', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    await expect(
      service.confirmForActor(BOOKING_ID, OTHER_USER_ID, 'model', 'some-other-profile-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids the client from confirming their own booking', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    await expect(service.confirmForActor(BOOKING_ID, CLIENT_ID, 'client', null)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('decline sets status declined and records reason via cancellationReason', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    await service.declineForActor(BOOKING_ID, ADMIN_ID, 'admin', null, 'занята в это время');
    expect(db.capturedUpdates[0].status).toBe('declined');
    expect(db.capturedUpdates[0].cancellationReason).toBe('занята в это время');
  });

  it('proposeTime writes proposedStartTime/proposedByUserId and sets status time_proposed', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    const proposed = new Date('2026-02-01T18:00:00.000Z');
    const updated = await service.proposeTimeForActor(BOOKING_ID, ADMIN_ID, 'admin', null, proposed);
    expect(updated.status).toBe('time_proposed');
    expect(db.capturedUpdates[0].proposedStartTime).toBe(proposed);
    expect(db.capturedUpdates[0].proposedByUserId).toBe(ADMIN_ID);
  });
});

describe('BookingsService.acceptProposedTime', () => {
  it('client accepts proposed time: startTime updated, proposed fields cleared, status confirmed', async () => {
    const proposed = new Date('2026-02-01T18:00:00.000Z');
    const db = makeDb(baseBooking({ status: 'time_proposed', proposedStartTime: proposed, proposedByUserId: MANAGER_ID }));
    const { service } = await buildService(db);
    const updated = await service.acceptProposedTime(BOOKING_ID, CLIENT_ID);
    expect(updated.status).toBe('confirmed');
    expect(db.capturedUpdates[0].startTime).toBe(proposed);
    expect(db.capturedUpdates[0].proposedStartTime).toBeNull();
    expect(db.capturedUpdates[0].proposedByUserId).toBeNull();
  });

  it('forbids a non-client from accepting', async () => {
    const proposed = new Date('2026-02-01T18:00:00.000Z');
    const db = makeDb(baseBooking({ status: 'time_proposed', proposedStartTime: proposed }));
    const { service } = await buildService(db);
    await expect(service.acceptProposedTime(BOOKING_ID, OTHER_USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequest when there is no proposed time', async () => {
    const db = makeDb(baseBooking({ status: 'draft', proposedStartTime: null }));
    const { service } = await buildService(db);
    await expect(service.acceptProposedTime(BOOKING_ID, CLIENT_ID)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BookingsService.cancel', () => {
  it('allows the owning client to cancel', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    const updated = await service.cancel(BOOKING_ID, CLIENT_ID, 'client', null);
    expect(updated.status).toBe('cancelled');
  });

  it('allows the assigned manager to cancel', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db, baseModelProfile({ managerId: MANAGER_ID }));
    const updated = await service.cancel(BOOKING_ID, MANAGER_ID, 'manager', null);
    expect(updated.status).toBe('cancelled');
  });

  it('forbids an unrelated user from cancelling', async () => {
    const db = makeDb(baseBooking({ status: 'draft' }));
    const { service } = await buildService(db);
    await expect(service.cancel(BOOKING_ID, OTHER_USER_ID, 'client', null)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws Conflict when cancelling a completed booking', async () => {
    const db = makeDb(baseBooking({ status: 'completed' }));
    const { service } = await buildService(db);
    await expect(service.cancel(BOOKING_ID, CLIENT_ID, 'client', null)).rejects.toBeInstanceOf(ConflictException);
  });
});
