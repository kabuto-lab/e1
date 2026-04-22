/**
 * Bookings Service - бизнес-логика с state machine
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { bookings, modelProfiles, type Booking, type NewBooking } from '@escort/db';

// State machine transitions
const STATE_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_payment', 'cancelled'],
  pending_payment: ['escrow_funded', 'cancelled'],
  escrow_funded: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'disputed', 'cancelled'],
  completed: ['disputed'],
  disputed: ['refunded', 'completed'],
  cancelled: [],
  refunded: [],
};

const VALID_TRANSITIONS = new Set(Object.keys(STATE_TRANSITIONS));

@Injectable()
export class BookingsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать новое бронирование
   */
  async createBooking(data: {
    clientId: string;
    modelId: string;
    managerId?: string;
    startTime: Date;
    durationHours: number;
    locationType?: 'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha';
    totalAmount: string;
    platformFee?: string;
    modelPayout?: string;
    specialRequests?: string;
  }): Promise<Booking> {
    if (data.durationHours < 1) {
      throw new BadRequestException('Duration must be at least 1 hour');
    }

    const newBookings = await this.db.insert(bookings).values({
      clientId: data.clientId,
      modelId: data.modelId,
      managerId: data.managerId,
      startTime: data.startTime,
      durationHours: data.durationHours,
      locationType: data.locationType,
      totalAmount: data.totalAmount,
      platformFee: data.platformFee || '0',
      modelPayout: data.modelPayout || '0',
      specialRequests: data.specialRequests,
      status: 'draft',
    }).returning();

    return newBookings[0];
  }

  /**
   * Найти бронирование по ID
   */
  async findById(id: string): Promise<Booking | null> {
    const found = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Получить все бронирования пользователя, с именем и slug модели
   */
  async findByUser(userId: string, role: 'client' | 'model' | 'manager'): Promise<(Booking & { modelName: string | null; modelSlug: string | null })[]> {
    let condition;

    switch (role) {
      case 'client':
        condition = eq(bookings.clientId, userId);
        break;
      case 'model':
        condition = eq(bookings.modelId, userId);
        break;
      case 'manager':
        condition = eq(bookings.managerId, userId);
        break;
    }

    const rows = await this.db
      .select({ booking: bookings, modelName: modelProfiles.displayName, modelSlug: modelProfiles.slug })
      .from(bookings)
      .leftJoin(modelProfiles, eq(bookings.modelId, modelProfiles.id))
      .where(condition)
      .orderBy(desc(bookings.createdAt));

    return rows.map((r: any) => ({ ...r.booking, modelName: r.modelName ?? null, modelSlug: r.modelSlug ?? null }));
  }

  /**
   * State machine transition
   */
  async transitionState(id: string, newStatus: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.findById(id);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate state transition
    const currentStatus = booking.status || 'draft';
    if (!VALID_TRANSITIONS.has(currentStatus)) {
      throw new BadRequestException(`Invalid current state: ${currentStatus}`);
    }

    const allowedTransitions = STATE_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ConflictException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }

    // Build update object
    const updates: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Set timestamp fields based on new status
    if (newStatus === 'confirmed') {
      updates.confirmedAt = new Date();
    } else if (newStatus === 'completed') {
      updates.completedAt = new Date();
    } else if (newStatus === 'cancelled') {
      updates.cancelledAt = new Date();
      updates.cancelledBy = userId;
      if (reason) {
        updates.cancellationReason = reason;
      }
    }

    const updated = await this.db.update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();

    return updated[0];
  }

  /**
   * Confirm booking (escrow funded -> confirmed)
   */
  async confirm(id: string): Promise<Booking> {
    return this.transitionState(id, 'confirmed', 'system');
  }

  /**
   * Cancel booking
   */
  async cancel(id: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.findById(id);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'completed' || booking.status === 'refunded') {
      throw new ConflictException('Cannot cancel completed or refunded booking');
    }

    return this.transitionState(id, 'cancelled', userId, reason);
  }

  /**
   * Complete booking
   */
  async complete(id: string): Promise<Booking> {
    return this.transitionState(id, 'completed', 'system');
  }

  /**
   * Start dispute
   */
  async startDispute(id: string): Promise<Booking> {
    return this.transitionState(id, 'disputed', 'system');
  }

  /**
   * Resolve dispute - refund
   */
  async refund(id: string): Promise<Booking> {
    return this.transitionState(id, 'refunded', 'system');
  }

  /**
   * Обновить бронирование
   */
  async update(id: string, updates: Partial<NewBooking>): Promise<Booking> {
    // Don't allow direct status updates - use state machine
    if ('status' in updates) {
      delete updates.status;
    }

    const updated = await this.db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Booking not found');
    }

    return updated[0];
  }

  /**
   * Удалить бронирование (только draft или cancelled)
   */
  async delete(id: string): Promise<void> {
    const booking = await this.findById(id);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'draft' && booking.status !== 'cancelled') {
      throw new ConflictException('Can only delete draft or cancelled bookings');
    }

    await this.db.delete(bookings).where(eq(bookings.id, id));
  }

  /**
   * Создать гостевую бронь без аккаунта (5.16)
   */
  async createGuestBooking(data: {
    modelId: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    guestMessage?: string;
    startTime: Date;
    durationHours: number;
    totalAmount: string;
    currency?: string;
  }): Promise<Booking> {
    if (data.durationHours < 1) {
      throw new BadRequestException('Duration must be at least 1 hour');
    }
    const rows = await this.db.insert(bookings).values({
      modelId: data.modelId,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail ?? null,
      guestMessage: data.guestMessage ?? null,
      startTime: data.startTime,
      durationHours: data.durationHours,
      totalAmount: data.totalAmount,
      currency: data.currency ?? 'RUB',
      status: 'draft',
    }).returning();
    return rows[0];
  }

  /**
   * Все бронирования (admin/manager)
   */
  async findAll(): Promise<Booking[]> {
    return this.db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  /**
   * Получить статистику по бронированиям
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalRevenue: string;
  }> {
    const all = await this.db.select().from(bookings);
    
    const byStatus: Record<string, number> = {};
    let totalRevenue = 0;

    all.forEach((b: Booking) => {
      const status = b.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (status === 'completed') {
        totalRevenue += Math.round(parseFloat(b.totalAmount || '0') * 100);
      }
    });

    return {
      total: all.length,
      byStatus,
      totalRevenue: (totalRevenue / 100).toString(),
    };
  }
}
