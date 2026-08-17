/**
 * Model Stats — статистика анкеты для ЛК модели: просмотры и обращения.
 * Избранное считается напрямую из client_favorites (без отдельного лога).
 */

import { pgTable, uuid, varchar, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { modelProfiles } from './model-profiles';

/** Один визит анкеты = одна строка на посетителя за календарный день (дедуп по viewerHash). */
export const modelProfileViews = pgTable(
  'model_profile_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }).notNull(),
    /** SHA-256(IP) — та же схема, что users.emailHash/phoneHash; сырой IP не хранится. */
    viewerHash: varchar('viewer_hash', { length: 64 }).notNull(),
    viewDate: date('view_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    dedupUniq: uniqueIndex('model_profile_views_dedup_uniq').on(t.modelId, t.viewerHash, t.viewDate),
    modelDateIdx: index('model_profile_views_model_date_idx').on(t.modelId, t.viewDate),
  }),
);

/** Append-only лог обращений — 3-уровневая воронка (не дедуплицируется, каждое действие — сигнал). */
export const modelContactEvents = pgTable(
  'model_contact_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }).notNull(),
    channel: varchar('channel', { length: 20 }).$type<'click' | 'telegram' | 'platform'>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    modelChannelIdx: index('model_contact_events_model_channel_idx').on(t.modelId, t.channel, t.createdAt),
  }),
);

export type ModelProfileView = typeof modelProfileViews.$inferSelect;
export type NewModelProfileView = typeof modelProfileViews.$inferInsert;
export type ModelContactEvent = typeof modelContactEvents.$inferSelect;
export type NewModelContactEvent = typeof modelContactEvents.$inferInsert;
