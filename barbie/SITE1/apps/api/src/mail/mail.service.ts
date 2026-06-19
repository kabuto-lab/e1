import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { AppConfig } from '../config/configuration';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

/**
 * MailService — единая точка отправки писем через SMTP (nodemailer).
 *
 * Dev: SMTP_HOST=localhost SMTP_PORT=8035 → Mailhog (http://localhost:8025).
 * Prod: задать реальный relay (SMTP_HOST/PORT/USER/PASS/SECURE) — иначе письма
 * не уйдут на внешние адреса. Конфиг — cfg.mail (см. configuration.ts).
 *
 * Transporter создаётся лениво и переиспользуется (pool по умолчанию nodemailer).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private get mail(): AppConfig['mail'] {
    return this.config.get<AppConfig['mail']>('mail')!;
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const { host, port, user, pass, secure } = this.mail;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true для 465, иначе STARTTLS/plain
      // auth указываем только если заданы креды (Mailhog работает без auth)
      ...(user ? { auth: { user, pass } } : {}),
    });
    return this.transporter;
  }

  async send(input: SendMailInput): Promise<void> {
    const { from } = this.mail;
    try {
      await this.getTransporter().sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      this.logger.log(`mail sent → ${input.to} · "${input.subject}"`);
    } catch (err) {
      this.logger.error(`mail send failed → ${input.to}: ${(err as Error).message}`);
      throw err;
    }
  }
}
