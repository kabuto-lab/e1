import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../config/configuration';
import { MailService } from '../mail/mail.service';
import { CreateJobApplicationDto } from './dto/create-job-application.dto';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);

  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async submit(
    dto: CreateJobApplicationDto,
    photos: Express.Multer.File[],
  ): Promise<{ ok: true; photos: number }> {
    const to = this.config.get<AppConfig['mail']>('mail')!.jobApplicationTo;
    const source = dto.tenantSlug ? `сайта «${dto.tenantSlug}»` : 'сайта тенанта';

    const rows: Array<[string, string]> = [
      ['ФИО', dto.fullName],
      ['Контакты', dto.contact],
      ['Сообщение', dto.message?.trim() || '—'],
      ['Источник', dto.tenantSlug ?? '—'],
      ['Фото', String(photos.length)],
    ];

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#1c1c1e">
        <h2 style="margin:0 0 12px">Новая заявка «Хочешь работать у нас?»</h2>
        <p style="color:#666;margin:0 0 16px">Пришла с ${esc(source)}.</p>
        <table style="border-collapse:collapse">
          ${rows
            .map(
              ([k, v]) =>
                `<tr><td style="padding:6px 14px 6px 0;color:#888;vertical-align:top;white-space:nowrap">${esc(
                  k,
                )}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`,
            )
            .join('')}
        </table>
        ${photos.length ? `<p style="color:#666;margin-top:16px">Фото (${photos.length}) — во вложениях.</p>` : ''}
      </div>`;

    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

    await this.mail.send({
      to,
      subject: `Заявка на работу: ${dto.fullName}`,
      html,
      text,
      attachments: photos.map((f, i) => ({
        filename: f.originalname || `photo-${i + 1}.jpg`,
        content: f.buffer,
        contentType: f.mimetype,
      })),
    });

    this.logger.log(`job application from "${dto.fullName}" → ${to} (${photos.length} photos)`);
    return { ok: true, photos: photos.length };
  }
}
