/**
 * WFY Advantages — пронумерованные «6 причин работать у нас» для тенантов типа
 * `wfy-city-dir`.
 *
 * Site-specific (префикс `wfy_`): короткие маркетинговые буллеты с порядком и
 * опциональной иконкой. Обобщать при 3-м потребителе (§7 rule-of-three).
 *
 * Используется блоком `AdvantagesGrid` (Data-block ED-редактора) и админкой
 * `/admin/wfy/advantages` (Phase D).
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

export const wfyAdvantages = pgTable(
  'wfy_advantages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    /** lucide-icon name или внутренний symbol-key — рендерится в палитре блока. */
    iconName: varchar('icon_name', { length: 64 }),

    ord: integer('ord').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantOrdIdx: index('wfy_advantages_tenant_ord_idx').on(t.tenantId, t.ord),
  }),
);

export type WfyAdvantage = typeof wfyAdvantages.$inferSelect;
export type NewWfyAdvantage = typeof wfyAdvantages.$inferInsert;
