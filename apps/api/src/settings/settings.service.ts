import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { platformSettings } from '@escort/db';

const SETTINGS_ROW_ID = 'default';
const TEXT_LOGO_MAX = 64;
const DEFAULT_TEXT_LOGO = 'Lovnge';

@Injectable()
export class SettingsService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  /**
   * Публичные поля брендинга (без авторизации) — только текстовый логотип и флаг анимации.
   */
  async getPublicBranding(): Promise<{ textLogo: string; textLogoBlink: boolean }> {
    const data = await this.get();
    let textLogo = DEFAULT_TEXT_LOGO;
    if (typeof data.textLogo === 'string') {
      const t = data.textLogo
        .trim()
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .slice(0, TEXT_LOGO_MAX);
      if (t.length > 0) textLogo = t;
    }
    const textLogoBlink = data.textLogoBlink !== false;
    return { textLogo, textLogoBlink };
  }

  async get(): Promise<Record<string, unknown>> {
    const rows = await this.db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, SETTINGS_ROW_ID))
      .limit(1);
    const row = rows[0];
    if (!row?.data || typeof row.data !== 'object') return {};
    return row.data as Record<string, unknown>;
  }

  async save(incoming: Record<string, unknown>): Promise<Record<string, unknown>> {
    const existing = await this.get();
    const data = { ...existing, ...incoming };
    const now = new Date();
    await this.db
      .insert(platformSettings)
      .values({ id: SETTINGS_ROW_ID, data, updatedAt: now })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: { data, updatedAt: now },
      });
    return data;
  }
}
