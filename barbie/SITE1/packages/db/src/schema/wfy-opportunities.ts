/**
 * WFY Opportunities — карточки «заработай на: машину / квартиру / отпуск» для
 * тенантов типа `wfy-city-dir` (work-for-you).
 *
 * Site-specific (префикс `wfy_`): нерегулярная структура «hero-сумма + список
 * требований». Обобщать при 3-м потребителе шаблона (§7 rule-of-three).
 *
 * Используется блоком `OpportunitiesGrid` (Data-block ED-редактора) и админкой
 * `/admin/wfy/opportunities` (Phase D).
 *
 * Спецификация: `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` §2.1.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const wfyOpportunities = pgTable(
  'wfy_opportunities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    title: varchar('title', { length: 255 }).notNull(),
    /** Сумма / краткое описание награды («1 500 000 ₽», «новая Hyundai Solaris»). */
    headline: varchar('headline', { length: 255 }),
    description: text('description'),
    /** Ключ изображения в `nas.media` (через module='wfy-opp'). nullable. */
    coverImageKey: varchar('cover_image_key', { length: 500 }),

    ord: integer('ord').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantOrdIdx: index('wfy_opportunities_tenant_ord_idx').on(t.tenantId, t.ord),
  }),
);

export type WfyOpportunity = typeof wfyOpportunities.$inferSelect;
export type NewWfyOpportunity = typeof wfyOpportunities.$inferInsert;
