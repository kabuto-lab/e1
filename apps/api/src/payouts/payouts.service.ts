/**
 * PayoutsService — баланс заработанного (модель/менеджер) и заявки на вывод.
 *
 * Платформа не переводит деньги автоматически (см. TbankEscrowService/TonEscrowService —
 * release() только фиксирует состояние и считает 5%/95%(+доля менеджера) split, реальные
 * деньги остаются на счёте платформы). Здесь — только очередь заявок с ручным одобрением
 * admin/moderator; фактический банковский перевод происходит вне платформы.
 */

import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  bookings,
  modelProfiles,
  payoutRequests,
  type PayoutRequest,
  type PayoutRequestStatus,
} from '@escort/db';

export interface PayoutBalance {
  earned: string;
  paid: string;
  pending: string;
  available: string;
}

const REQUESTER_ROLES = new Set(['model', 'manager']);
const STAFF_ROLES = new Set(['admin', 'moderator']);

const TRANSITIONS: Record<PayoutRequestStatus, PayoutRequestStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: [],
};

function toCents(amount: string | null | undefined): number {
  return Math.round(parseFloat(amount || '0') * 100);
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

@Injectable()
export class PayoutsService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async getBalance(userId: string, role: string): Promise<PayoutBalance> {
    if (!REQUESTER_ROLES.has(role)) {
      throw new ForbiddenException('Only models and managers have a payout balance');
    }

    let earnedCents = 0;

    if (role === 'model') {
      const [profile] = await this.db
        .select({ id: modelProfiles.id })
        .from(modelProfiles)
        .where(eq(modelProfiles.userId, userId))
        .limit(1);

      if (profile) {
        const rows = await this.db
          .select({ modelPayout: bookings.modelPayout })
          .from(bookings)
          .where(and(eq(bookings.modelId, profile.id), eq(bookings.status, 'completed')));
        earnedCents = rows.reduce((sum: number, r: any) => sum + toCents(r.modelPayout), 0);
      }
    } else {
      const profiles = await this.db
        .select({ id: modelProfiles.id })
        .from(modelProfiles)
        .where(eq(modelProfiles.managerId, userId));

      const profileIds = profiles.map((p: any) => p.id);
      if (profileIds.length > 0) {
        const rows = await this.db
          .select({ managerPayout: bookings.managerPayout })
          .from(bookings)
          .where(and(inArray(bookings.modelId, profileIds), eq(bookings.status, 'completed')));
        earnedCents = rows.reduce((sum: number, r: any) => sum + toCents(r.managerPayout), 0);
      }
    }

    const requests = await this.db
      .select({ amount: payoutRequests.amount, status: payoutRequests.status })
      .from(payoutRequests)
      .where(eq(payoutRequests.userId, userId));

    const paidCents = requests
      .filter((r: any) => r.status === 'paid')
      .reduce((sum: number, r: any) => sum + toCents(r.amount), 0);
    const pendingCents = requests
      .filter((r: any) => r.status === 'pending' || r.status === 'approved')
      .reduce((sum: number, r: any) => sum + toCents(r.amount), 0);

    const availableCents = Math.max(0, earnedCents - paidCents - pendingCents);

    return {
      earned: fromCents(earnedCents),
      paid: fromCents(paidCents),
      pending: fromCents(pendingCents),
      available: fromCents(availableCents),
    };
  }

  async createRequest(userId: string, role: string, amount: string): Promise<PayoutRequest> {
    if (!REQUESTER_ROLES.has(role)) {
      throw new ForbiddenException('Only models and managers can request a payout');
    }

    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const balance = await this.getBalance(userId, role);
    if (amountCents > toCents(balance.available)) {
      throw new BadRequestException(
        `Requested amount (${fromCents(amountCents)}) exceeds available balance (${balance.available})`,
      );
    }

    const inserted = await this.db
      .insert(payoutRequests)
      .values({ userId, amount: fromCents(amountCents), status: 'pending' })
      .returning();

    return inserted[0];
  }

  async listRequests(
    actorUserId: string,
    actorRole: string,
    status?: PayoutRequestStatus,
  ): Promise<PayoutRequest[]> {
    const conditions: any[] = [];
    if (STAFF_ROLES.has(actorRole)) {
      // видно всё
    } else if (REQUESTER_ROLES.has(actorRole)) {
      conditions.push(eq(payoutRequests.userId, actorUserId));
    } else {
      throw new ForbiddenException('Not allowed to view payout requests');
    }
    if (status) {
      conditions.push(eq(payoutRequests.status, status));
    }

    return this.db
      .select()
      .from(payoutRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(payoutRequests.requestedAt);
  }

  async transitionRequest(
    actorUserId: string,
    requestId: string,
    newStatus: PayoutRequestStatus,
    note?: string,
  ): Promise<PayoutRequest> {
    const [current] = await this.db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.id, requestId))
      .limit(1);

    if (!current) {
      throw new NotFoundException('Payout request not found');
    }

    const allowed = TRANSITIONS[current.status as PayoutRequestStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${current.status} to ${newStatus}`);
    }

    const updated = await this.db
      .update(payoutRequests)
      .set({
        status: newStatus,
        note: note ?? current.note,
        processedByUserId: actorUserId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutRequests.id, requestId))
      .returning();

    return updated[0];
  }
}
