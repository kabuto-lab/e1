/**
 * WFY City Pages — страницы городов для тенантов типа `wfy-city-dir` (work-for-you).
 *
 * Site-specific концепт: справочник городов с произвольным содержимым (краткое
 * описание, список вакансий, преимущества). Префикс `wfy_` потому что только один
 * сайт такого типа на момент 2026-05-26. При появлении 3-го тенанта-типа
 * `*-city-dir` — кандидат на обобщение (§7 rule-of-three).
 *
 * `slug` уникален в пределах тенанта; используется как URL-сегмент `/[city]`.
 *
 * Спецификация: `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` §2.1.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type WfyCityPageStatus = 'draft' | 'published' | 'archived';

/**
 * Произвольные доп. поля города: meta-теги для SEO, кастомные блоки контента.
 * Структура свободная пока — формализуем при 3-м потребителе.
 */
export type WfyCityExtras = {
  metaTitle?: string;
  metaDescription?: string;
  heroImageKey?: string;
  customBlocks?: Array<{ type: string; data: Record<string, unknown> }>;
};

export const wfyCityPages = pgTable(
  'wfy_city_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    slug: varchar('slug', { length: 64 }).notNull(),
    cityName: varchar('city_name', { length: 128 }).notNull(),
    region: varchar('region', { length: 128 }),
    country: varchar('country', { length: 2 }).notNull().default('RU'),

    headline: varchar('headline', { length: 500 }),
    description: text('description'),

    /** Доп. произвольные поля (см. WfyCityExtras). */
    extras: jsonb('extras')
      .$type<WfyCityExtras>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<WfyCityPageStatus>()
      .notNull()
      .default('draft'),

    ord: integer('ord').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSlugUniq: uniqueIndex('wfy_city_pages_tenant_slug_uniq').on(
      t.tenantId,
      t.slug,
    ),
    tenantStatusIdx: index('wfy_city_pages_tenant_status_idx').on(
      t.tenantId,
      t.status,
    ),
    tenantOrdIdx: index('wfy_city_pages_tenant_ord_idx').on(t.tenantId, t.ord),
    slugCheck: check(
      'wfy_city_pages_slug_format_check',
      sql`slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'`,
    ),
  }),
);

export type WfyCityPage = typeof wfyCityPages.$inferSelect;
export type NewWfyCityPage = typeof wfyCityPages.$inferInsert;
