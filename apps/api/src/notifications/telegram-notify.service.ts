import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TgNotifyEvent = 'escrow_funded' | 'escrow_released' | 'escrow_refunded' | 'escrow_disputed';

const EMOJI: Record<TgNotifyEvent, string> = {
  escrow_funded:   '💰',
  escrow_released: '✅',
  escrow_refunded: '↩️',
  escrow_disputed: '⚠️',
};

const TITLE: Record<TgNotifyEvent, string> = {
  escrow_funded:   'Оплата получена',
  escrow_released: 'Выплата произведена',
  escrow_refunded: 'Средства возвращены',
  escrow_disputed: 'Открыт спор',
};

export interface TgNotifyPayload {
  event: TgNotifyEvent;
  bookingId: string;
  amountHuman?: string | null;
  note?: string;
}

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);
  private readonly token: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
  }

  async notify(chatId: bigint | null | undefined, payload: TgNotifyPayload): Promise<void> {
    if (!chatId || !this.token) return;

    const { event, bookingId, amountHuman, note } = payload;
    const short = bookingId.slice(0, 8);
    const amount = amountHuman ? ` · ${amountHuman} USDT` : '';
    const extra = note ? `\n${note}` : '';

    const text =
      `${EMOJI[event]} *${TITLE[event]}*${amount}\n` +
      `Бронирование \`${short}…\`${extra}`;

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId.toString(),
            text,
            parse_mode: 'Markdown',
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`TG notify failed (${res.status}): ${body}`);
      }
    } catch (e) {
      this.logger.warn(`TG notify error: ${(e as Error).message}`);
    }
  }

  async notifyMany(
    chatIds: (bigint | null | undefined)[],
    payload: TgNotifyPayload,
  ): Promise<void> {
    await Promise.all(chatIds.map((id) => this.notify(id, payload)));
  }
}
