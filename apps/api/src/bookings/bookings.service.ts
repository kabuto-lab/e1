/**
 * Bookings Service - бизнес-логика с state machine
 *
 * Флоу по ТЗ: заявка (draft) -> подтверждение (confirmed) / предложить время (time_proposed) /
 * отклонить (declined) -> ТОЛЬКО ПОСЛЕ подтверждения оплата (pending_payment -> escrow_funded) ->
 * встреча -> завершение (completed, тут же удерживается комиссия площадки).
 */

import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { eq, and, desc, inArray, notInArray } from 'drizzle-orm';
import { bookings, modelProfiles, type Booking, type NewBooking } from '@escort/db';
import { ModelsService } from '../models/models.service';
import { UsersService } from '../users/users.service';
import { TelegramNotifyService, type TgNotifyEvent } from '../notifications/telegram-notify.service';

// State machine transitions
const STATE_TRANSITIONS: Record<string, string[]> = {
  draft: ['time_proposed', 'confirmed', 'declined', 'cancelled'],
  time_proposed: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['pending_payment', 'cancelled'],
  pending_payment: ['escrow_funded', 'cancelled'],
  escrow_funded: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'disputed', 'cancelled'],
  completed: ['disputed'],
  disputed: ['refunded', 'completed'],
  declined: [],
  cancelled: [],
  refunded: [],
};

const VALID_TRANSITIONS = new Set(Object.keys(STATE_TRANSITIONS));

/** Фиксированная комиссия площадки (не настраивается из админки — см. MVP-2.0.pdf п.7). */
const PLATFORM_COMMISSION_RATE = 0.05;

/**
 * Дефолт доли менеджера (model_profiles.managerCommissionRate), когда она явно не задана
 * (NULL — не то же самое, что explicit 0%, см. computeCommissionSplit). Применяется только
 * когда владелец модели — реальный аккаунт с ролью manager; если модель числится за admin
 * (или владельца нет вовсе) — доля менеджера всегда 0, весь пул уходит модели (см. ниже).
 * Совпадает с фронтом (dashboard/users/page.tsx, SplitCells) — при изменении менять в обоих местах.
 */
const DEFAULT_MANAGER_COMMISSION_RATE = 0.5;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly modelsService: ModelsService,
    private readonly usersService: UsersService,
    private readonly tgNotify: TelegramNotifyService,
  ) {}

  /**
   * Комиссия площадки (model_profiles.platformCommissionRate, дефолт 5%) снимается первой;
   * из оставшегося пула — доля менеджера (model_profiles.managerCommissionRate, 0..1), но
   * ТОЛЬКО если владелец модели — реальный аккаунт с ролью manager. Если модель числится за
   * admin или владельца нет вовсе — делить не с кем, весь пул уходит модели, managerPayout
   * = null (см. PayoutsModule — доли считаются только по этим полям).
   *
   * Ставка менеджера не задана явно (NULL, не 0%) → берём дефолт DEFAULT_MANAGER_COMMISSION_RATE.
   * Admin/moderator могут явно переопределить на любое значение включая 0% через UI (только
   * когда владелец — manager), тогда сохранённое значение всегда в приоритете.
   */
  private async computeCommissionSplit(
    totalAmount: string,
    modelId: string,
  ): Promise<{ platformFee: string; modelPayout: string; managerPayout: string | null }> {
    const cents = Math.round(parseFloat(totalAmount || '0') * 100);
    const model = await this.modelsService.findById(modelId);

    const platformRate = model?.platformCommissionRate != null
      ? parseFloat(model.platformCommissionRate)
      : PLATFORM_COMMISSION_RATE;
    const feeCents = Math.round(cents * platformRate);
    const poolCents = cents - feeCents;

    let rate = 0;
    if (model?.managerId) {
      const owner = await this.usersService.findById(model.managerId);
      if (owner?.role === 'manager') {
        rate = model.managerCommissionRate != null
          ? parseFloat(model.managerCommissionRate)
          : DEFAULT_MANAGER_COMMISSION_RATE;
      }
    }

    if (!rate || rate <= 0) {
      return {
        platformFee: (feeCents / 100).toFixed(2),
        modelPayout: (poolCents / 100).toFixed(2),
        managerPayout: null,
      };
    }

    const managerCents = Math.round(poolCents * rate);
    return {
      platformFee: (feeCents / 100).toFixed(2),
      modelPayout: ((poolCents - managerCents) / 100).toFixed(2),
      managerPayout: (managerCents / 100).toFixed(2),
    };
  }

  /** Резолвит telegramId клиента/исполнителя/менеджера для уведомлений (менеджер — через model_profiles.managerId, не через bookings.managerId — эта колонка не заполняется). */
  private async resolveBookingContacts(booking: Booking): Promise<{
    clientTelegramId: bigint | null;
    modelTelegramId: bigint | null;
    managerTelegramId: bigint | null;
  }> {
    const modelProfile = await this.modelsService.findById(booking.modelId);
    const [clientTelegramId, modelTelegramId, managerTelegramId] = await Promise.all([
      booking.clientId ? this.usersService.getNotifiableTelegramId(booking.clientId) : Promise.resolve(null),
      modelProfile?.userId ? this.usersService.getNotifiableTelegramId(modelProfile.userId) : Promise.resolve(null),
      modelProfile?.managerId ? this.usersService.getNotifiableTelegramId(modelProfile.managerId) : Promise.resolve(null),
    ]);
    return { clientTelegramId, modelTelegramId, managerTelegramId };
  }

  private async notifyBookingEvent(
    booking: Booking,
    event: TgNotifyEvent,
    targets: Array<'client' | 'model' | 'manager'>,
  ): Promise<void> {
    try {
      const contacts = await this.resolveBookingContacts(booking);
      const ids: Array<bigint | null | undefined> = [];
      if (targets.includes('client')) ids.push(contacts.clientTelegramId);
      if (targets.includes('model')) ids.push(contacts.modelTelegramId);
      if (targets.includes('manager')) ids.push(contacts.managerTelegramId);
      await this.tgNotify.notifyMany(ids, { event, bookingId: booking.id });
    } catch (e) {
      this.logger.warn(`notifyBookingEvent failed: ${(e as Error).message}`);
    }
  }

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

    const split = data.platformFee != null && data.modelPayout != null
      ? { platformFee: data.platformFee, modelPayout: data.modelPayout, managerPayout: null as string | null }
      : await this.computeCommissionSplit(data.totalAmount, data.modelId);

    const newBookings = await this.db.insert(bookings).values({
      clientId: data.clientId,
      modelId: data.modelId,
      managerId: data.managerId,
      startTime: data.startTime,
      durationHours: data.durationHours,
      locationType: data.locationType,
      totalAmount: data.totalAmount,
      platformFee: split.platformFee,
      modelPayout: split.modelPayout,
      managerPayout: split.managerPayout,
      specialRequests: data.specialRequests,
      status: 'draft',
    }).returning();

    const booking = newBookings[0];
    void this.notifyBookingEvent(booking, 'booking_requested', ['model', 'manager']);
    return booking;
  }

  /**
   * Найти бронирование по ID
   */
  async findById(id: string): Promise<Booking | null> {
    const found = await this.db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Получить все бронирования пользователя, с именем, slug и userId (для чата) модели
   */
  async findByUser(
    userId: string,
    role: 'client' | 'model' | 'manager',
  ): Promise<(Booking & { modelName: string | null; modelSlug: string | null; modelUserId: string | null })[]> {
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
      .select({
        booking: bookings,
        modelName: modelProfiles.displayName,
        modelSlug: modelProfiles.slug,
        modelUserId: modelProfiles.userId,
      })
      .from(bookings)
      .leftJoin(modelProfiles, eq(bookings.modelId, modelProfiles.id))
      .where(condition)
      .orderBy(desc(bookings.createdAt));

    return rows.map((r: any) => ({
      ...r.booking,
      modelName: r.modelName ?? null,
      modelSlug: r.modelSlug ?? null,
      modelUserId: r.modelUserId ?? null,
    }));
  }

  /**
   * State machine transition. extra — доп. поля, которые нужно записать вместе со сменой статуса
   * (например proposedStartTime при переходе в time_proposed).
   */
  async transitionState(id: string, newStatus: string, userId: string, reason?: string, extra?: Partial<NewBooking>): Promise<Booking> {
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
      ...extra,
    };

    // Set timestamp/derived fields based on new status
    if (newStatus === 'confirmed') {
      updates.confirmedAt = new Date();
    } else if (newStatus === 'completed') {
      updates.completedAt = new Date();
      // Комиссия площадки удерживается автоматически при завершении сделки (MVP-2.0.pdf п.7).
      const split = await this.computeCommissionSplit(booking.totalAmount, booking.modelId);
      updates.platformFee = split.platformFee;
      updates.modelPayout = split.modelPayout;
      updates.managerPayout = split.managerPayout;
    } else if (newStatus === 'cancelled' || newStatus === 'declined') {
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
   * Проверить, что actor вправе управлять заявкой (подтвердить/отклонить/предложить время/отменить):
   * admin — всегда; менеджер — если это модель из его пула (model_profiles.managerId, а не
   * bookings.managerId — та колонка нигде не заполняется); модель — если это её собственная анкета.
   */
  private async assertCanManage(id: string, actorUserId: string, actorRole: string, actorModelProfileId: string | null): Promise<Booking> {
    const booking = await this.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (actorRole === 'admin') return booking;
    if (actorRole === 'model' && actorModelProfileId != null && actorModelProfileId === booking.modelId) {
      return booking;
    }
    if (actorRole === 'manager') {
      const model = await this.modelsService.findById(booking.modelId);
      if (model?.managerId === actorUserId) return booking;
    }
    throw new ForbiddenException('Not authorized to manage this booking');
  }

  /**
   * Подтвердить заявку (исполнитель или её менеджер) — только ДО оплаты.
   */
  async confirmForActor(id: string, actorUserId: string, actorRole: string, actorModelProfileId: string | null): Promise<Booking> {
    await this.assertCanManage(id, actorUserId, actorRole, actorModelProfileId);
    const updated = await this.transitionState(id, 'confirmed', actorUserId);
    void this.notifyBookingEvent(updated, 'booking_confirmed', ['client']);
    return updated;
  }

  /**
   * Отклонить заявку (исполнитель или её менеджер) — до оплаты, с необязательной причиной.
   */
  async declineForActor(id: string, actorUserId: string, actorRole: string, actorModelProfileId: string | null, reason?: string): Promise<Booking> {
    await this.assertCanManage(id, actorUserId, actorRole, actorModelProfileId);
    const updated = await this.transitionState(id, 'declined', actorUserId, reason);
    void this.notifyBookingEvent(updated, 'booking_declined', ['client']);
    return updated;
  }

  /**
   * Предложить другое время встречи (исполнитель или её менеджер).
   */
  async proposeTimeForActor(id: string, actorUserId: string, actorRole: string, actorModelProfileId: string | null, proposedStartTime: Date): Promise<Booking> {
    await this.assertCanManage(id, actorUserId, actorRole, actorModelProfileId);
    const updated = await this.transitionState(id, 'time_proposed', actorUserId, undefined, {
      proposedStartTime,
      proposedByUserId: actorUserId,
    });
    void this.notifyBookingEvent(updated, 'booking_time_proposed', ['client']);
    return updated;
  }

  /**
   * Клиент принимает предложенное время — заменяет startTime и подтверждает бронь.
   */
  async acceptProposedTime(id: string, actorUserId: string): Promise<Booking> {
    const booking = await this.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.clientId !== actorUserId) {
      throw new ForbiddenException('Only the booking client can accept a proposed time');
    }
    if (!booking.proposedStartTime) {
      throw new BadRequestException('No proposed time to accept');
    }
    const updated = await this.transitionState(id, 'confirmed', actorUserId, undefined, {
      startTime: booking.proposedStartTime,
      proposedStartTime: null,
      proposedByUserId: null,
    });
    void this.notifyBookingEvent(updated, 'booking_confirmed', ['model', 'manager']);
    return updated;
  }

  /**
   * Отменить бронирование — клиент (своя бронь), исполнитель/её менеджер, или admin.
   */
  async cancel(id: string, actorUserId: string, actorRole: string, actorModelProfileId: string | null, reason?: string): Promise<Booking> {
    const booking = await this.findById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'completed' || booking.status === 'refunded') {
      throw new ConflictException('Cannot cancel completed or refunded booking');
    }

    const isOwnClient = booking.clientId === actorUserId;
    const isOwnModel = actorRole === 'model' && actorModelProfileId != null && actorModelProfileId === booking.modelId;
    let isOwnManager = false;
    if (actorRole === 'manager') {
      const model = await this.modelsService.findById(booking.modelId);
      isOwnManager = model?.managerId === actorUserId;
    }
    if (actorRole !== 'admin' && !isOwnClient && !isOwnModel && !isOwnManager) {
      throw new ForbiddenException('Not authorized to cancel this booking');
    }

    return this.transitionState(id, 'cancelled', actorUserId, reason);
  }

  /**
   * Complete booking
   */
  async complete(id: string): Promise<Booking> {
    const updated = await this.transitionState(id, 'completed', 'system');
    void this.notifyBookingEvent(updated, 'review_prompt', ['client']);
    return updated;
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
  async findAll(managerId?: string): Promise<Booking[]> {
    if (!managerId) {
      return this.db.select().from(bookings).orderBy(desc(bookings.createdAt));
    }
    const managerModels = await this.db
      .select({ id: modelProfiles.id })
      .from(modelProfiles)
      .where(eq(modelProfiles.managerId, managerId));
    if (managerModels.length === 0) return [];
    const modelIds = managerModels.map((m: { id: string }) => m.id);
    return this.db
      .select()
      .from(bookings)
      .where(inArray(bookings.modelId, modelIds))
      .orderBy(desc(bookings.createdAt));
  }

  /**
   * Занятые интервалы модели — для UI (дизейблить даты/время при создании новой брони).
   * Учитываются только активные брони (не отменённые/отклонённые/возвращённые/завершённые) и
   * только будущие интервалы.
   */
  async getBusyRanges(modelId: string): Promise<{ start: string; end: string }[]> {
    const now = new Date();
    const rows = await this.db
      .select({ startTime: bookings.startTime, durationHours: bookings.durationHours })
      .from(bookings)
      .where(and(
        eq(bookings.modelId, modelId),
        notInArray(bookings.status, ['cancelled', 'declined', 'refunded', 'completed']),
      ));

    return rows
      .map((r: { startTime: Date; durationHours: number }) => {
        const start = new Date(r.startTime);
        const end = new Date(start.getTime() + r.durationHours * 3600_000);
        return { start, end };
      })
      .filter((r: { start: Date; end: Date }) => r.end > now)
      .map((r: { start: Date; end: Date }) => ({ start: r.start.toISOString(), end: r.end.toISOString() }));
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
