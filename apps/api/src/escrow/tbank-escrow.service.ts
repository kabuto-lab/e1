/**
 * TbankEscrowService — адаптер T-Bank (Tinkoff Acquiring) над общей escrow state machine.
 *
 * Скелет (Эпик 5.15 / T-Bank, День 2): персистентность T-Bank-специфичных полей
 * (`tbank_orders`: order id, payment url, token, raw payload) ещё не существует —
 * таблица появится в миграции `0017_tbank_escrow.sql` (spine, требует ок оператора).
 * До миграции методы, которым нужна персистентность, бросают NotImplementedException.
 *
 * См. docs/adr/ADR-002-tbank-adapter.md — почему адаптер, а не отдельная подсистема.
 * Референс реализации того же паттерна: ./ton-escrow.service.ts
 */

import {
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EscrowTransaction } from '@escort/db';
import { EscrowService } from './escrow.service';

/**
 * Статусы T-Bank Acquiring API.
 * См. https://www.tbank.ru/kassa/dev/payments/ — Notification / GetState.
 */
export type TbankOrderStatus =
  | 'NEW'
  | 'FORM_SHOWED'
  | 'AUTHORIZING'
  | 'AUTHORIZED'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'REVERSING'
  | 'REVERSED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'PARTIAL_REFUNDED'
  | 'REJECTED'
  | 'DEADLINE_EXPIRED'
  | 'CANCELED';

/**
 * Маппинг статусов T-Bank → общая escrow state machine (`escrow_transactions.status`).
 * Статусы, не попавшие в карту (NEW/FORM_SHOWED/AUTHORIZING/...), не меняют наш статус —
 * это промежуточные шаги до фактического зачисления/возврата средств.
 */
const TBANK_TO_ESCROW_STATUS: Partial<Record<TbankOrderStatus, EscrowTransaction['status']>> = {
  CONFIRMED: 'funded',
  REVERSED: 'refunded',
  REFUNDED: 'refunded',
  PARTIAL_REFUNDED: 'partially_refunded',
};

export interface CreateTbankOrderParams {
  bookingId: string;
  /** decimal-строка в рублях, как amountHeld в escrow_transactions */
  amountRub: string;
  description?: string;
}

export interface CreateTbankOrderResult {
  escrowTransactionId: string;
  tbankOrderId: string;
  paymentUrl: string;
}

export interface TbankWebhookPayload {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: TbankOrderStatus;
  PaymentId: string;
  Amount: number;
  /** Подпись для верификации (SHA-256 от конкатенации полей + Password) */
  Token: string;
  [key: string]: unknown;
}

@Injectable()
export class TbankEscrowService {
  private readonly logger = new Logger(TbankEscrowService.name);

  constructor(
    private readonly escrowService: EscrowService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Создать платёж в T-Bank (Init) и завести запись эскроу с paymentProvider='tbank'.
   * TODO(0017): после миграции — сохранить tbankOrderId/paymentUrl/token в `tbank_orders`.
   */
  async createOrder(_params: CreateTbankOrderParams): Promise<CreateTbankOrderResult> {
    this.assertConfigured();
    // TODO: вызов T-Bank Init API (TerminalKey, Password-хеш, Amount, OrderId, NotificationURL)
    // TODO: this.escrowService.createTransaction({ bookingId, amount: amountRub, paymentProvider: 'tbank' })
    throw new NotImplementedException(
      'TbankEscrowService.createOrder: ждёт миграцию 0017_tbank_escrow.sql (tbank_orders)',
    );
  }

  /**
   * Обработать вебхук-нотификацию T-Bank. Должен быть идемпотентен: повторная
   * нотификация с тем же Status — no-op (см. идемпотентность TON-индексера как образец).
   */
  async handleWebhook(payload: TbankWebhookPayload): Promise<void> {
    this.verifyWebhookToken(payload);

    const mapped = TBANK_TO_ESCROW_STATUS[payload.Status];
    if (!mapped) {
      this.logger.log(`T-Bank status ${payload.Status} (order ${payload.OrderId}) — без перехода`);
      return;
    }

    // TODO(0017): найти escrow_transactions по tbank_orders.tbank_order_id = payload.OrderId
    // TODO: проверить текущий статус перед переходом (идемпотентность повторных вебхуков)
    // TODO: this.escrowService.updateStatus(escrowTransactionId, mapped)
    throw new NotImplementedException(
      'TbankEscrowService.handleWebhook: ждёт миграцию 0017_tbank_escrow.sql (tbank_orders)',
    );
  }

  /** Подтвердить платёж (T-Bank Confirm) — для двухстадийных операций. */
  async release(_escrowTransactionId: string): Promise<void> {
    // TODO: T-Bank Confirm API + this.escrowService.release(...)
    throw new NotImplementedException('TbankEscrowService.release: not implemented yet');
  }

  /** Вернуть средства клиенту (T-Bank Cancel/Refund). */
  async refund(_escrowTransactionId: string): Promise<void> {
    // TODO: T-Bank Cancel API + this.escrowService.refund(...)
    throw new NotImplementedException('TbankEscrowService.refund: not implemented yet');
  }

  private assertConfigured(): void {
    const terminalKey = this.configService.get<string>('TBANK_TERMINAL_KEY');
    const password = this.configService.get<string>('TBANK_PASSWORD');
    if (!terminalKey || !password) {
      throw new ServiceUnavailableException(
        'T-Bank escrow is not configured: задайте TBANK_TERMINAL_KEY и TBANK_PASSWORD в .env',
      );
    }
  }

  /**
   * Верификация подписи вебхука по алгоритму T-Bank: Token = SHA-256 от пар key=value
   * (кроме Token и DATA), отсортированных по ключу, с Password вместо TerminalKey-секрета.
   * TODO: реализовать перед включением `POST /escrow/tbank/webhook` в роутинг.
   */
  private verifyWebhookToken(_payload: TbankWebhookPayload): void {
    // TODO: см. https://www.tbank.ru/kassa/dev/payments/#section/Podpis-zapros
  }
}
