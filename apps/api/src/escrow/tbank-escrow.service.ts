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
  const n = Math.round(Number(amountRub) * 100);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException('Invalid amount for T-Bank order');
  }
  return n;
}

@Injectable()
export class TbankEscrowService {
  private readonly logger = new Logger(TbankEscrowService.name);

  constructor(
    private readonly escrowService: EscrowService,
    private readonly config: ConfigService,
    private readonly bookings: BookingsService,
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

    const order = await this.findOrderByTbankOrderId(payload.OrderId);
    if (!order) {
      this.logger.warn(`T-Bank webhook for unknown OrderId=${payload.OrderId}`);
      return;
    }

    if (order.status === payload.Status) {
      this.logger.debug(`T-Bank webhook idempotent no-op: order=${order.id} status=${payload.Status}`);
      return;
    }

    await this.db
      .update(tbankOrders)
      .set({
        status: payload.Status,
        tbankPaymentId: payload.PaymentId ?? order.tbankPaymentId,
        lastWebhookToken: payload.Token,
        rawWebhookPayload: payload as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(tbankOrders.id, order.id));

    const mapped = TBANK_TO_ESCROW_STATUS[payload.Status];
    if (!mapped) {
      this.logger.log(`T-Bank status ${payload.Status} (order ${order.id}) — без перехода эскроу`);
      return;
    }

    const escrow = await this.escrowService.findById(order.escrowTransactionId);
    if (!escrow || escrow.status === mapped) {
      return;
    }

    if (mapped === 'funded' && escrow.status === 'pending_funding') {
      await this.escrowService.updateStatus(escrow.id, 'funded');
      await this.advanceBookingAfterFunding(escrow.bookingId);
      void this.notifyBookingParties(escrow.bookingId, 'escrow_funded');
    } else if (mapped === 'refunded' && (escrow.status === 'funded' || escrow.status === 'pending_funding')) {
      await this.escrowService.refund(escrow.id);
      void this.notifyBookingParties(escrow.bookingId, 'escrow_refunded');
    } else if (mapped === 'partially_refunded') {
      await this.escrowService.updateStatus(escrow.id, 'partially_refunded');
      void this.notifyBookingParties(escrow.bookingId, 'escrow_refunded');
    }
    // mapped === 'released' обрабатывается в release() напрямую — здесь только safety-net,
    // без дублирования перевода брони в 'completed' (это делает release()).
  }

  private async advanceBookingAfterFunding(bookingId: string): Promise<void> {
    const booking = await this.bookings.findById(bookingId);
    if (!booking) return;
    const status = booking.status ?? 'draft';

    if (status === 'confirmed') {
      try {
        await this.bookings.transitionState(bookingId, 'pending_payment', 'system');
      } catch (e) {
        if (!(e instanceof ConflictException)) {
          this.logger.error(`Booking ${bookingId}: confirmed→pending_payment failed: ${(e as Error).message}`);
        }
      }
    }

    const again = await this.bookings.findById(bookingId);
    if ((again?.status ?? 'draft') !== 'pending_payment') return;

    try {
      await this.bookings.transitionState(bookingId, 'escrow_funded', 'system');
    } catch (e) {
      if (!(e instanceof ConflictException)) {
        this.logger.error(`Booking ${bookingId}: pending_payment→escrow_funded failed: ${(e as Error).message}`);
      }
    }
  }

  /**
   * Списать захолдированную оплату (T-Bank Confirm) и завершить бронь. Ручное действие
   * admin/manager после того как встреча состоялась — как и у TON, это единственный
   * путь в 'completed' (см. TonEscrowService.confirmRelease).
   */
  async release(actorUserId: string, escrowId: string): Promise<EscrowTransaction> {
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
  async refund(actorUserId: string, escrowId: string, reason?: string): Promise<EscrowTransaction> {
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
