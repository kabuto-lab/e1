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

const DEFAULT_INBOX = 'index.g0@gmail.com';

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
      this.config.get<string>('SMTP_FROM')?.trim() || 'Lovnge <contact-form@lovnge.local>';

    try {
      await transporter.sendMail({
        to,
        from,
        replyTo: dto.email,
        subject: `Сообщение с сайта Lovnge: ${dto.name}`,
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
        'Не удалось отправить письмо через SMTP. Проверьте настройки почты на сервере или напишите на index.g0@gmail.com.',
      );
    }

    this.logger.log(`Contact form message sent to ${to} (from ${dto.email})`);
  }
}
