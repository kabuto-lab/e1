import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { platformSettings } from '@escort/db';

const SETTINGS_ROW_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

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

  async save(data: Record<string, unknown>): Promise<Record<string, unknown>> {
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
