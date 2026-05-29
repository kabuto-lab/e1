/**
 * Girls — глобальный каталог моделей (Class-G, content-model §1.1).
 *
 * БЕЗ `tenant_id` — платформенно-глобальный каталог: правится один раз
 * `platform-admin`'ом, отображается идентично на всех тенантах (read-only через
 * published snapshots, ADR-009). Carve-out из I-5 оформлен в **ADR-008**;
 * прецедент — `platform_admins` / `tenants` (тоже без tenant_id).
 *
 * Эта таблица — рабочее (draft) состояние; публикация на сайты — снапшотами
 * (ADR-009), поэтому здесь нет колонок статуса публикации.
 *
 * Спецификация: `SITE1/docs/CONTENT-MODEL.md`.
 */

import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const girls = pgTable(
  'girls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),

    /** Свободные параметры карточки: рост/вес/грудь/возраст и т.п. */
    params: jsonb('params').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),

    description: text('description'),

    /** Массив S3-ключей фотографий (MinIO, глобальный префикс). */
    mediaKeys: jsonb('media_keys').$type<string[]>().notNull().default(sql`'[]'::jsonb`),

    ord: integer('ord').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    ordIdx: index('girls_ord_idx').on(t.ord),
  }),
);

export type Girl = typeof girls.$inferSelect;
export type NewGirl = typeof girls.$inferInsert;
