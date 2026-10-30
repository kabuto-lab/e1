import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { requestTelegramApi } from './telegram-http.util';

export type TgNotifyEvent =
  | 'escrow_funded' | 'escrow_released' | 'escrow_refunded' | 'escrow_disputed'
  | 'booking_requested' | 'booking_confirmed' | 'booking_declined' | 'booking_time_proposed'
  | 'review_prompt' | 'refund_requested';

const EMOJI: Record<TgNotifyEvent, string> = {
  escrow_funded:   '💰',
  escrow_released: '✅',
  escrow_refunded: '↩️',
  escrow_disputed: '⚠️',
  booking_requested:     '📩',
  booking_confirmed:     '✅',
  booking_declined:      '❌',
  booking_time_proposed: '🕒',
  review_prompt:         '⭐',
  refund_requested:      '⚠️',
};

const TITLE: Record<TgNotifyEvent, string> = {
  escrow_funded:   'Оплата получена',
  escrow_released: 'Выплата произведена',
  escrow_refunded: 'Средства возвращены',
  escrow_disputed: 'Открыт спор',
  booking_requested:     'Новая заявка на встречу',
  booking_confirmed:     'Бронирование подтверждено',
  booking_declined:      'Заявка отклонена',
  booking_time_proposed: 'Предложено другое время',
  review_prompt:         'Оставьте отзыв о встрече',
  refund_requested:      'Клиент запросил возврат',
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface TgNotifyPayload {
  event: TgNotifyEvent;
  bookingId: string;
  amountHuman?: string | null;
  note?: string;
  /** Ссылка на бронь в ЛК/дашборде получателя — разная для client/model/manager-employee, см. BookingsService.notifyBookingEvent. */
  link?: string;
}

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);
  private readonly token: string | undefined;
  private readonly newMessageChannelId: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.newMessageChannelId = this.config.get<string>('TELEGRAM_NOTIFY_CHANNEL_ID');
    if (!this.token) this.logger.warn('TELEGRAM_BOT_TOKEN is missing — Telegram notifications are disabled');
  }

  private async sendRaw(chatId: string, text: string): Promise<void> {
    if (!this.token) return;
    try {
      const res = await requestTelegramApi(this.token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      });
      if (res.status < 200 || res.status >= 300) {
        this.logger.warn(`TG notify failed for chat ${chatId} (${res.status}): ${res.body}`);
      }
    } catch (e) {
      const message = (e as Error).message.replaceAll(this.token, '[redacted]');
      this.logger.warn(`TG notify error for chat ${chatId}: ${message}`);
    }
  }

  async notify(chatId: bigint | null | undefined, payload: TgNotifyPayload): Promise<void> {
    if (!chatId) return;

    const { event, bookingId, amountHuman, note, link } = payload;
    const short = escapeHtml(bookingId.slice(0, 8));
    const amount = amountHuman ? ` · ${escapeHtml(amountHuman)} USDT` : '';
    const extra = note ? `\n${escapeHtml(note)}` : '';
    const linkLine = link ? `\n<a href="${escapeHtml(link)}">Открыть бронь</a>` : '';

    const text =
      `${EMOJI[event]} <b>${TITLE[event]}</b>${amount}\n` +
      `Бронирование <code>${short}…</code>${extra}${linkLine}`;

    await this.sendRaw(chatId.toString(), text);
  }

  async notifyMany(
    chatIds: (bigint | null | undefined)[],
    payload: TgNotifyPayload,
  ): Promise<void> {
    await Promise.all([...new Set(chatIds)].map((id) => this.notify(id, payload)));
  }

  private async sendToGroup(text: string): Promise<void> {
    if (!this.newMessageChannelId) return;
    await this.sendRaw(this.newMessageChannelId, text);
  }

  /**
   * Сообщение клиента в диалоге с моделью — личное ТГ-уведомление получателю,
   * вызывающий решает кому именно (оператору анкеты, либо менеджеру/сотрудникам — см.
   * MessagesService.notifyClientMessage → TelegramRelayService.resolveCandidates).
   * Было уведомлением в общий канал на всю платформу — заменили личными сообщениями, т.к. на
   * платформе несколько независимых менеджеров и им не нужно видеть уведомления друг друга.
   */
  async notifyNewClientMessage(chatId: bigint, modelName: string, conversationLink: string): Promise<void> {
    if (!chatId) return;
    await this.sendRaw(
      chatId.toString(),
      `💬 <b>Новое сообщение от клиента</b>\n` +
        `Модель: ${escapeHtml(modelName)}\n` +
        `<a href="${escapeHtml(conversationLink)}">Открыть диалог</a>`,
    );
  }

  /**
   * Первое сообщение клиента боту в анонимном Telegram-обращении (см.
   * TelegramRelayService/BotService, callback crs_) — уведомление в общий канал со ссылкой
   * на team-inbox (там же появляется само обращение, раздел «Telegram»).
   */
  async notifyNewTelegramContact(modelName: string, teamInboxLink: string): Promise<void> {
    await this.sendToGroup(
      `💬 <b>Новое обращение в Telegram</b>\n` +
        `Модель: ${escapeHtml(modelName)}\n` +
        `<a href="${escapeHtml(teamInboxLink)}">Открыть</a>`,
    );
  }

  /**
   * Клиент создал новую заявку на бронирование (см. BookingsService.createBooking) —
   * уведомление в общий канал со ссылкой на карточку брони в дашборде.
   */
  async notifyNewBookingRequest(modelName: string, bookingLink: string): Promise<void> {
    await this.sendToGroup(
      `📩 <b>Новая заявка на встречу</b>\n` +
        `Модель: ${escapeHtml(modelName)}\n` +
        `<a href="${escapeHtml(bookingLink)}">Открыть бронь</a>`,
    );
  }
}
