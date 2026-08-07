import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { ContactMessageDto } from './dto/contact-message.dto';

const DEFAULT_INBOX = 'ssuppor7mail@yandex.ru';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isMailhogOrLocalRelay(host: string, port: number): boolean {
  const h = host.toLowerCase();
  return (
    port === 1025 ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h.includes('mailhog')
  );
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly config: ConfigService) {}

  private buildTransportOptions(): SMTPTransport.Options {
    const host = this.config.get<string>('SMTP_HOST')!.trim();
    const port = parseInt(this.config.get<string>('SMTP_PORT', '587'), 10);
    const secureEnv = this.config.get<string>('SMTP_SECURE');
    const secure = secureEnv === 'true' || port === 465;
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS') ?? '';

    const plainRelay = isMailhogOrLocalRelay(host, port);

    const base: SMTPTransport.Options = {
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 25_000,
      greetingTimeout: 15_000,
    };

    if (plainRelay) {
      return {
        ...base,
        secure: false,
        ignoreTLS: true,
        requireTLS: false,
      };
    }

    if (port === 587 && !secure) {
      return {
        ...base,
        requireTLS: true,
        tls: { minVersion: 'TLSv1.2' },
      };
    }

    return base;
  }

  async sendGuestBookingConfirmation(params: {
    email: string;
    name: string;
    bookingId: string;
    startTime: Date;
    durationHours: number;
  }): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) return;

    const transporter = nodemailer.createTransport(this.buildTransportOptions());
    const from = this.config.get<string>('SMTP_FROM')?.trim() || 'My Muse <noreply@mymuse.local>';
    const short = params.bookingId.slice(0, 8).toUpperCase();

    const date = params.startTime.toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const time = params.startTime.toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit',
    });

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr><td style="padding:32px 40px;background:#111;border:1px solid #222;border-radius:16px;">
      <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#d4af37;letter-spacing:-0.02em;">Заявка принята</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Здравствуйте, <strong style="color:#fff;">${escapeHtml(params.name)}</strong>!</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#aaa;">Ваша заявка на бронирование зарегистрирована. Менеджер свяжется с вами в ближайшее время.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <tr><td style="padding:6px 0;font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.06em;">Номер заявки</td><td style="padding:6px 0;font-size:13px;color:#d4af37;font-weight:600;text-align:right;">#${short}</td></tr>
        <tr><td style="padding:6px 0;font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.06em;">Дата</td><td style="padding:6px 0;font-size:13px;color:#fff;text-align:right;">${date}, ${time}</td></tr>
        <tr><td style="padding:6px 0;font-size:12px;color:#777;text-transform:uppercase;letter-spacing:0.06em;">Длительность</td><td style="padding:6px 0;font-size:13px;color:#fff;text-align:right;">${params.durationHours} ч.</td></tr>
      </table>
      <p style="margin:0;font-size:12px;color:#555;line-height:1.5;">Если у вас возникли вопросы, ответьте на это письмо.</p>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        to: params.email,
        from,
        subject: `Заявка #${short} принята — My Muse`,
        text: `Здравствуйте, ${params.name}!\n\nВаша заявка #${short} зарегистрирована.\nДата: ${date}, ${time}\nДлительность: ${params.durationHours} ч.\n\nМенеджер свяжется с вами в ближайшее время.`,
        html,
      });

      this.logger.log(`Guest booking confirmation sent to ${params.email} (booking ${short})`);
    } catch (err: unknown) {
      const e = err as Error;
      this.logger.warn(`Failed to send guest booking confirmation to ${params.email}: ${e.message}`);
    }
  }

  async sendContactMessage(dto: ContactMessageDto): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    if (!host) {
      this.logger.warn('SMTP_HOST is not set — contact form disabled');
      throw new ServiceUnavailableException(
        'Отправка сообщений временно недоступна. Обратитесь другим способом.',
      );
    }

    const transporter = nodemailer.createTransport(this.buildTransportOptions());

    const to = this.config.get<string>('CONTACT_FORM_TO_EMAIL')?.trim() || DEFAULT_INBOX;
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() || 'My Muse <contact-form@mymuse.local>';

    try {
      await transporter.sendMail({
        to,
        from,
        replyTo: dto.email,
        subject: `Сообщение с сайта My Muse: ${dto.name}`,
        text: `От: ${dto.name} <${dto.email}>\n\n${dto.message}`,
        html: `<p><strong>От:</strong> ${escapeHtml(dto.name)} &lt;${escapeHtml(dto.email)}&gt;</p><p>${escapeHtml(
          dto.message,
        ).replace(/\n/g, '<br/>')}</p>`,
      });
    } catch (err: unknown) {
      const e = err as Error & { response?: string; code?: string };
      const detail = [e.message, e.response].filter(Boolean).join(' | ');
      this.logger.error(`sendMail failed: ${detail}`, e.stack);
      throw new BadGatewayException(
        'Не удалось отправить письмо через SMTP. Проверьте настройки почты на сервере или напишите на ssuppor7mail@yandex.ru.',
      );
    }

    this.logger.log(`Contact form message sent to ${to} (from ${dto.email})`);
  }
}
