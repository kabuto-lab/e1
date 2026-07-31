import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { massageSettings, type MassageSettings } from '@escort/db';

const SETTINGS_ROW_ID = 'default';

@Injectable()
export class MassageSettingsService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  private async ensureRow(): Promise<MassageSettings> {
    const rows = await this.db
      .select()
      .from(massageSettings)
      .where(eq(massageSettings.id, SETTINGS_ROW_ID))
      .limit(1);
    if (rows[0]) return rows[0];
    const created = await this.db
      .insert(massageSettings)
      .values({ id: SETTINGS_ROW_ID })
      .onConflictDoNothing()
      .returning();
    if (created[0]) return created[0];
    const retry = await this.db
      .select()
      .from(massageSettings)
      .where(eq(massageSettings.id, SETTINGS_ROW_ID))
      .limit(1);
    return retry[0];
  }

  /** Публичная проекция — читается на каждый рендер общих страниц (/, /models, /models/[slug]) */
  async getPublic(): Promise<{ enabled: boolean; catalogMode: 'open' | 'closed'; siteName: string }> {
    const row = await this.ensureRow();
    return { enabled: row.enabled, catalogMode: row.catalogMode, siteName: row.siteName };
  }

  async get(): Promise<MassageSettings> {
    return this.ensureRow();
  }

  async save(patch: { enabled?: boolean; catalogMode?: 'open' | 'closed'; siteName?: string }): Promise<MassageSettings> {
    await this.ensureRow();
    const now = new Date();
    const updated = await this.db
      .update(massageSettings)
      .set({ ...patch, updatedAt: now })
      .where(eq(massageSettings.id, SETTINGS_ROW_ID))
      .returning();
    return updated[0];
  }
}
