import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

/**
 * Изолированный notifier для массажного режима — намеренно НЕ переиспользует
 * TelegramNotifyService/ContactService (их типы событий/шаблоны заточены под эскорт-режим,
 * их не редактируем). Использует те же env-переменные (TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS,
 * SMTP_*, CONTACT_FORM_TO_EMAIL), только читает их — сами сервисы не трогаются.
 */
function isMailhogOrLocalRelay(host: string, port: number): boolean {
  const h = host.toLowerCase();
  return port === 1025 || h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.includes('mailhog');
}

@Injectable()
export class MassageNotifyService {
  private readonly logger = new Logger(MassageNotifyService.name);

  constructor(private readonly config: ConfigService) {}

  private buildTransportOptions(): SMTPTransport.Options | null {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) return null;
    const port = parseInt(this.config.get<string>('SMTP_PORT', '587'), 10);
    const secureEnv = this.config.get<string>('SMTP_SECURE');
    const secure = secureEnv === 'true' || port === 465;
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS') ?? '';
    const plainRelay = isMailhogOrLocalRelay(host, port);

    return {
      host,
      port,
      secure: plainRelay ? false : secure,
      auth: user ? { user, pass } : undefined,
      ignoreTLS: plainRelay,
      connectionTimeout: 25_000,
      greetingTimeout: 15_000,
    };
  }

  /** Best-effort уведомление в Telegram админам — раз в вызов, ошибки не пробрасываются. */
  async notifyAdminsTelegram(text: string): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return;
    const adminIds = (this.config.get<string>('TELEGRAM_ADMIN_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (adminIds.length === 0) return;

    await Promise.allSettled(
      adminIds.map((chatId) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        }),
      ),
    ).catch(() => {});
  }

  /** Best-effort email уведомление на CRM-адрес — ошибки только логируются. */
  async notifyAdminsEmail(subject: string, text: string): Promise<void> {
    const options = this.buildTransportOptions();
    if (!options) return;

    try {
      const transporter = nodemailer.createTransport(options);
      const to = this.config.get<string>('CONTACT_FORM_TO_EMAIL')?.trim() || 'ssuppor7mail@yandex.ru';
      const from = this.config.get<string>('SMTP_FROM')?.trim() || 'noreply@lovnge.local';
      await transporter.sendMail({ to, from, subject, text });
    } catch (err) {
      const e = err as Error;
      this.logger.warn(`Failed to send massage-mode admin notification: ${e.message}`);
    }
  }

  async notifyAdmins(subject: string, text: string): Promise<void> {
    await Promise.allSettled([this.notifyAdminsTelegram(text), this.notifyAdminsEmail(subject, text)]);
  }
}
