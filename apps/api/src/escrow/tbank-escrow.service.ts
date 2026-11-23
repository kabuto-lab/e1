/**
 * TbankEscrowService — адаптер T-Bank (Tinkoff Acquiring), двухстадийная оплата
 * (Init → hold AUTHORIZED → Confirm списывает / Cancel снимает холд) поверх общей
 * escrow state machine в escrow_transactions.
 *
 * Платформа — мерчант по договору с T-Bank: все деньги оседают на расчётном счёте
 * платформы независимо от того, кто клиент. release()/refund() поэтому не переводят
 * деньги конкретной модели/менеджеру — это лишь фиксация состояния (funded → released/
 * refunded) и, при release(), перевод самой брони в 'completed' (там уже считается и
 * сохраняется 5%/95% split — см. BookingsService.transitionState). Фактическая выплата
 * моделям/менеджерам — отдельный ручной flow (payout requests, следующий срез работ).
 *
 * Референс того же паттерна: ./ton-escrow.service.ts
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import {
  escrowTransactions,
  tbankOrders,
  type EscrowTransaction,
  type TbankOrder,
  type TbankOrderStatus,
} from '@escort/db';
import { BookingsService } from '../bookings/bookings.service';
import { ModelsService } from '../models/models.service';
import { UsersService } from '../users/users.service';
import { TelegramNotifyService, type TgNotifyEvent } from '../notifications/telegram-notify.service';
import { EscrowService } from './escrow.service';
import { TbankClientService, type TbankScalarPayload } from './tbank/tbank-client.service';

/** Платить можно только после подтверждения заявки исполнителем/менеджером (см. TON-эквивалент). */
const ALLOWED_BOOKING_STATUS_FOR_CREATE = new Set(['confirmed', 'pending_payment']);

/**
 * Маппинг статусов T-Bank → escrow_transactions.status.
 * AUTHORIZED — деньги захолдированы (эскроу «funded», как и в TON-флоу).
 * CONFIRMED — деньги списаны; в норме это уже сделал release() ниже, здесь только
 * идемпотентный safety-net на случай, если серверный вызов Confirm прошёл, а апдейт
 * БД не успел (краш) — вебхук досведёт состояние.
 */
const TBANK_TO_ESCROW_STATUS: Partial<Record<TbankOrderStatus, EscrowTransaction['status']>> = {
  AUTHORIZED: 'funded',
  CONFIRMED: 'released',
  REVERSED: 'refunded',
  REFUNDED: 'refunded',
  PARTIAL_REFUNDED: 'partially_refunded',
};

const STATUS_RANK: Record<TbankOrderStatus, number> = {
  NEW: 0, FORM_SHOWED: 1, AUTHORIZING: 2, AUTHORIZED: 3, CONFIRMING: 4,
  CONFIRMED: 5, REVERSING: 6, REFUNDING: 6, PARTIAL_REFUNDED: 7,
  REVERSED: 8, REFUNDED: 8, REJECTED: 8, DEADLINE_EXPIRED: 8, CANCELED: 8,
};
const FINAL_ORDER_STATUSES = new Set<TbankOrderStatus>([
  'REVERSED', 'REFUNDED', 'REJECTED', 'DEADLINE_EXPIRED', 'CANCELED',
]);
const REFUND_FINAL_STATUSES = new Set<TbankOrderStatus>(['REVERSED', 'REFUNDED', 'CANCELED']);

export interface TbankWebhookPayload extends TbankScalarPayload {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: TbankOrderStatus;
  PaymentId: string;
  Amount: number;
  Token: string;
}

function toKopecks(amountRub: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amountRub);
  if (!match) {
    throw new BadRequestException('Invalid amount for T-Bank order');
  }
  const value = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BadRequestException('Invalid amount for T-Bank order');
  }
  return Number(value);
}

@Injectable()
export class TbankEscrowService {
  private readonly logger = new Logger(TbankEscrowService.name);

  constructor(
    private readonly escrowService: EscrowService,
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
    private readonly models: ModelsService,
    private readonly users: UsersService,
    private readonly tgNotify: TelegramNotifyService,
    private readonly tbankClient: TbankClientService,
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  private async notifyBookingParties(bookingId: string, event: TgNotifyEvent): Promise<void> {
    try {
      const booking = await this.bookings.findById(bookingId);
      if (!booking?.clientId) return;
      const clientTelegramId = await this.users.getNotifiableTelegramId(booking.clientId);
      await this.tgNotify.notifyMany([clientTelegramId], { event, bookingId });
    } catch (e) {
      this.logger.warn(`notifyBookingParties failed: ${(e as Error).message}`);
    }
  }

  private async findOrderByEscrowId(escrowTransactionId: string): Promise<TbankOrder | null> {
    const rows = await this.db
      .select()
      .from(tbankOrders)
      .where(eq(tbankOrders.escrowTransactionId, escrowTransactionId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async findOrderByTbankOrderId(tbankOrderId: string): Promise<TbankOrder | null> {
    const rows = await this.db
      .select()
      .from(tbankOrders)
      .where(eq(tbankOrders.tbankOrderId, tbankOrderId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Создать платёж в T-Bank (Init, двухстадийный) и завести запись эскроу
   * (paymentProvider='tbank'). Сумма — только из booking.totalAmount, клиент её не выбирает.
   */
  async createOrder(
    actorUserId: string,
    bookingId: string,
  ): Promise<{ escrowTransactionId: string; paymentUrl: string }> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.clientId !== actorUserId) {
      throw new ForbiddenException('Only the booking client can pay for this booking');
    }
    const status = booking.status ?? 'draft';
    if (!ALLOWED_BOOKING_STATUS_FOR_CREATE.has(status)) {
      throw new BadRequestException(
        `Booking status must be confirmed or pending_payment to create a T-Bank order (current: ${status})`,
      );
    }

    const existing = await this.escrowService.findByBookingId(bookingId);
    if (existing) {
      throw new ConflictException('Escrow already exists for this booking');
    }

    const amountKopecks = toKopecks(booking.totalAmount);
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    // TBANK_NOTIFICATION_URL — публичный HTTPS-домен (T-Bank должен достучаться извне).
    // Локально (API_URL=http://localhost:3000) вебхук физически недостижим, пока не задан —
    // Init всё равно отработает, просто AUTHORIZED узнаем не мгновенно (см. .env комментарий).
    const notificationUrl =
      this.config.get<string>('TBANK_NOTIFICATION_URL') ??
      `${this.config.get<string>('API_URL') ?? 'http://localhost:3000'}/escrow/tbank/webhook`;

    const escrowRow = await this.escrowService.createTransaction({
      bookingId,
      amount: booking.totalAmount,
      paymentProvider: 'tbank',
    });

    let initResult;
    try {
      initResult = await this.tbankClient.init({
        OrderId: escrowRow.id,
        Amount: amountKopecks,
        Description: `Бронирование ${bookingId.slice(0, 8)}`,
        PayType: 'T',
        NotificationURL: notificationUrl,
        SuccessURL: `${frontendUrl}/cabinet/bookings/${bookingId}?payment=success`,
        FailURL: `${frontendUrl}/cabinet/bookings/${bookingId}?payment=fail`,
      });
    } catch (e) {
      // Init не удался — не оставляем висящую escrow-запись без платёжного заказа.
      await this.db.delete(escrowTransactions).where(eq(escrowTransactions.id, escrowRow.id));
      throw e;
    }

    if (!initResult.PaymentURL) {
      await this.db.delete(escrowTransactions).where(eq(escrowTransactions.id, escrowRow.id));
      throw new ConflictException('T-Bank Init did not return a payment URL');
    }

    await this.db.insert(tbankOrders).values({
      escrowTransactionId: escrowRow.id,
      tbankOrderId: escrowRow.id,
      tbankPaymentId: initResult.PaymentId,
      terminalKey: initResult.TerminalKey,
      paymentUrl: initResult.PaymentURL,
      status: (initResult.Status as TbankOrderStatus) ?? 'NEW',
      rawInitPayload: initResult as unknown as Record<string, unknown>,
    });

    return { escrowTransactionId: escrowRow.id, paymentUrl: initResult.PaymentURL };
  }

  /**
   * Вебхук T-Bank. Подпись обязательна — без неё любой мог бы прислать поддельный
   * AUTHORIZED/CONFIRMED и рассинхронизировать эскроу с реальными деньгами.
   */
  async handleWebhook(payload: TbankWebhookPayload): Promise<void> {
    if (!this.tbankClient.verifyToken(payload)) {
      throw new ForbiddenException('Invalid T-Bank webhook signature');
    }

    if (!Object.prototype.hasOwnProperty.call(STATUS_RANK, payload.Status)) {
      throw new BadRequestException('Unsupported T-Bank webhook status');
    }

    // Financial state and order checkpoint commit together. Do not call global
    // services while holding this transaction: they use a different pool connection.
    const result = await this.db.transaction(async (tx: any) => {
      const [order]: TbankOrder[] = await tx.select().from(tbankOrders)
        .where(eq(tbankOrders.tbankOrderId, payload.OrderId)).limit(1).for('update');
      if (!order) return null;
      const [escrow]: EscrowTransaction[] = await tx.select().from(escrowTransactions)
        .where(eq(escrowTransactions.id, order.escrowTransactionId)).limit(1).for('update');
      if (!escrow || escrow.paymentProvider !== 'tbank') {
        throw new ConflictException('T-Bank order has no matching escrow');
      }
      this.assertWebhookPayment(payload, order, escrow);

      const current = order.status ?? 'NEW';
      const refundAlias = REFUND_FINAL_STATUSES.has(current) && REFUND_FINAL_STATUSES.has(payload.Status);
      if ((FINAL_ORDER_STATUSES.has(current) && current !== payload.Status && !refundAlias)
        || STATUS_RANK[payload.Status] < (STATUS_RANK[current] ?? 0)
        || (['REJECTED', 'DEADLINE_EXPIRED'].includes(payload.Status)
          && (STATUS_RANK[current] ?? 0) >= STATUS_RANK.AUTHORIZED && current !== payload.Status)) {
        return null;
      }

      const mapped = TBANK_TO_ESCROW_STATUS[payload.Status];
      let changed = false;
      if (mapped && mapped !== escrow.status) {
        const allowed = mapped === 'funded'
          ? escrow.status === 'pending_funding'
          : mapped === 'released'
            ? ['pending_funding', 'funded', 'hold_period'].includes(escrow.status ?? '')
            : mapped === 'refunded'
              ? ['pending_funding', 'funded', 'hold_period', 'released', 'partially_refunded'].includes(escrow.status ?? '')
              : ['pending_funding', 'funded', 'hold_period', 'released'].includes(escrow.status ?? '');
        if (allowed) {
          const now = new Date();
          await tx.update(escrowTransactions).set({
            status: mapped, updatedAt: now,
            ...(mapped === 'funded' ? { fundedAt: escrow.fundedAt ?? now } : {}),
            ...(mapped === 'released' ? { releasedAt: escrow.releasedAt ?? now } : {}),
            ...(mapped === 'refunded' ? { refundedAt: escrow.refundedAt ?? now } : {}),
          }).where(eq(escrowTransactions.id, escrow.id));
          changed = true;
        }
      }
      await tx.update(tbankOrders).set({
        status: payload.Status,
        lastWebhookToken: payload.Token,
        rawWebhookPayload: payload as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      }).where(eq(tbankOrders.id, order.id));
      return { bookingId: escrow.bookingId, mapped, changed,
        reconcile: mapped === escrow.status || changed };
    });

    if (!result?.reconcile) return;
    // Booking transitions are retryable after commit. A failed transition must
    // reject the webhook; a same-status bank retry repairs it rather than skipping it.
    if (result.mapped === 'funded') {
      await this.advanceBookingAfterFunding(result.bookingId);
    } else if (result.mapped === 'released') {
      await this.advanceBookingAfterFunding(result.bookingId);
      await this.completeBookingAfterConfirmation(result.bookingId);
    }
    if (result.changed) {
      const event: TgNotifyEvent = result.mapped === 'funded' ? 'escrow_funded'
        : result.mapped === 'released' ? 'escrow_released' : 'escrow_refunded';
      void this.notifyBookingParties(result.bookingId, event);
    }
  }

  private assertWebhookPayment(payload: TbankWebhookPayload, order: TbankOrder, escrow: EscrowTransaction): void {
    const terminal = this.config.get<string>('TBANK_TERMINAL_KEY');
    if (!terminal || payload.TerminalKey !== terminal || order.terminalKey !== terminal
      || !order.tbankPaymentId || String(payload.PaymentId) !== order.tbankPaymentId) {
      throw new ForbiddenException('T-Bank webhook does not match the stored payment');
    }
    const expected = toKopecks(escrow.amountHeld);
    if (!Number.isSafeInteger(payload.Amount) || payload.Amount < 0 || payload.Amount > expected) {
      throw new BadRequestException('Invalid T-Bank webhook amount');
    }
    const mapped = TBANK_TO_ESCROW_STATUS[payload.Status];
    if (mapped && payload.Success !== true) {
      throw new ForbiddenException('Unsuccessful T-Bank notification cannot settle escrow');
    }
    if ((payload.Status === 'AUTHORIZED' || payload.Status === 'CONFIRMED') && payload.Amount !== expected) {
      throw new ForbiddenException('T-Bank funding amount does not match escrow');
    }
  }

  private async advanceBookingAfterFunding(bookingId: string): Promise<void> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) return;
    const status = booking.status ?? 'draft';

    if (status === 'confirmed') {
      try {
        await this.bookings.transitionState(bookingId, 'pending_payment', 'system');
      } catch (e) {
        const current = await this.bookings.findById(bookingId);
        if (!(e instanceof ConflictException) || current?.status === 'confirmed') throw e;
      }
    }

    const again = await this.bookings.findById(bookingId);
    if ((again?.status ?? 'draft') !== 'pending_payment') return;

    try {
      await this.bookings.transitionState(bookingId, 'escrow_funded', 'system');
    } catch (e) {
      const current = await this.bookings.findById(bookingId);
      if (!(e instanceof ConflictException) || current?.status === 'pending_payment') throw e;
    }
  }

  private async completeBookingAfterConfirmation(bookingId: string): Promise<void> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found after T-Bank confirmation');
    if (!['escrow_funded', 'in_progress', 'disputed'].includes(booking.status ?? '')) return;
    try {
      await this.bookings.transitionState(bookingId, 'completed', 'system');
    } catch (e) {
      const current = await this.bookings.findById(bookingId);
      if (!(e instanceof ConflictException) || current?.status !== 'completed') throw e;
    }
  }

  /**
   * Manager может release/refund только эскроу СВОИХ моделей — раньше любой manager мог
   * распоряжаться чужим эскроу (проверялась только роль, не владение). Admin проходит без проверки.
   */
  private async assertActorCanManageEscrowBooking(bookingId: string, actorUserId: string, actorRole: string): Promise<void> {
    if (actorRole !== 'manager') return;
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found for this escrow');
    }
    const model = await this.models.findById(booking.modelId);
    if (model?.managerId !== actorUserId) {
      throw new ForbiddenException('Not authorized to manage escrow for this booking');
    }
  }

  /**
   * Списать захолдированную оплату (T-Bank Confirm) и завершить бронь. Ручное действие
   * admin/manager после того как встреча состоялась — как и у TON, это единственный
   * путь в 'completed' (см. TonEscrowService.confirmRelease).
   */
  async release(actorUserId: string, actorRole: string, escrowId: string): Promise<EscrowTransaction> {
    const escrow = await this.escrowService.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    if (escrow.paymentProvider !== 'tbank') {
      throw new BadRequestException('Not a T-Bank escrow');
    }
    if (escrow.status === 'released') {
      return escrow;
    }
    if (escrow.status !== 'funded') {
      throw new ConflictException(`Cannot release escrow in status ${escrow.status}`);
    }
    await this.assertActorCanManageEscrowBooking(escrow.bookingId, actorUserId, actorRole);

    const order = await this.findOrderByEscrowId(escrowId);
    if (!order?.tbankPaymentId) {
      throw new ConflictException('No T-Bank payment on this escrow');
    }

    await this.tbankClient.confirm({ PaymentId: order.tbankPaymentId });

    await this.db
      .update(tbankOrders)
      .set({ status: 'CONFIRMED' as TbankOrderStatus, updatedAt: new Date() })
      .where(eq(tbankOrders.id, order.id));

    const updated = await this.escrowService.release(escrowId);

    try {
      await this.bookings.transitionState(escrow.bookingId, 'completed', actorUserId);
    } catch (e) {
      if (!(e instanceof ConflictException)) {
        this.logger.error(`Booking ${escrow.bookingId}: →completed after T-Bank release failed: ${(e as Error).message}`);
      }
    }

    void this.notifyBookingParties(escrow.bookingId, 'escrow_released');

    return updated;
  }

  /**
   * Снять холд (T-Bank Cancel) до списания — используется при отмене брони,
   * пока эскроу ещё в статусе 'funded' (деньги ещё не списаны с карты).
   */
  async refund(actorUserId: string, actorRole: string, escrowId: string, reason?: string): Promise<EscrowTransaction> {
    const escrow = await this.escrowService.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }
    if (escrow.paymentProvider !== 'tbank') {
      throw new BadRequestException('Not a T-Bank escrow');
    }
    if (escrow.status === 'refunded') {
      return escrow;
    }
    if (escrow.status !== 'funded') {
      throw new ConflictException(`Cannot refund escrow in status ${escrow.status}`);
    }
    await this.assertActorCanManageEscrowBooking(escrow.bookingId, actorUserId, actorRole);

    const order = await this.findOrderByEscrowId(escrowId);
    if (!order?.tbankPaymentId) {
      throw new ConflictException('No T-Bank payment on this escrow');
    }

    await this.tbankClient.cancel({ PaymentId: order.tbankPaymentId });

    await this.db
      .update(tbankOrders)
      .set({ status: 'CANCELED' as TbankOrderStatus, updatedAt: new Date() })
      .where(eq(tbankOrders.id, order.id));

    const updated = await this.escrowService.refund(escrowId);

    try {
      await this.bookings.transitionState(escrow.bookingId, 'cancelled', actorUserId, reason ?? 'T-Bank refund');
    } catch (e) {
      if (!(e instanceof ConflictException)) {
        this.logger.error(`Booking ${escrow.bookingId}: cancel after T-Bank refund failed: ${(e as Error).message}`);
      }
    }

    void this.notifyBookingParties(escrow.bookingId, 'escrow_refunded');

    return updated;
  }

  /** Просмотр T-Bank эскроу по booking: клиент брони или admin/manager. */
  async getByBookingForViewer(
    viewerUserId: string,
    viewerRole: string,
    bookingId: string,
  ): Promise<EscrowTransaction> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const isStaff = viewerRole === 'admin' || viewerRole === 'manager';
    if (!isStaff && booking.clientId !== viewerUserId) {
      throw new ForbiddenException('You cannot view escrow for this booking');
    }

    const escrow = await this.escrowService.findByBookingId(bookingId);
    if (!escrow || escrow.paymentProvider !== 'tbank') {
      throw new NotFoundException('No T-Bank escrow for this booking');
    }
    return escrow;
  }
}
