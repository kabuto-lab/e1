import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * Настройки массажного режима — одна строка (id='default'), как platform_settings,
 * но отдельная таблица: siteMode массажного режима не смешивается с общим брендингом.
 */
export const massageSettings = pgTable('massage_settings', {
  id: varchar('id', { length: 64 }).primaryKey(),
  /** Глобальный тумблер: включает массажный контент на общих URL (/, /models, /models/[slug]) */
  enabled: boolean('enabled').default(false).notNull(),
  catalogMode: varchar('catalog_mode', { length: 20 })
    .$type<'open' | 'closed'>()
    .default('open')
    .notNull(),
  /** Название бренда массажного режима — плейсхолдер, реальное имя вписывает админ позже */
  siteName: varchar('site_name', { length: 100 }).default('Название проекта').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MassageSettings = typeof massageSettings.$inferSelect;
export type NewMassageSettings = typeof massageSettings.$inferInsert;
