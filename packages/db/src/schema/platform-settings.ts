import { pgTable, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

/** Единственная строка id = default — JSON настроек дашборда. */
export const platformSettings = pgTable('platform_settings', {
  id: varchar('id', { length: 64 }).primaryKey(),
  data: jsonb('data').notNull().$type<Record<string, unknown>>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PlatformSettingsRow = typeof platformSettings.$inferSelect;
export type NewPlatformSettingsRow = typeof platformSettings.$inferInsert;
