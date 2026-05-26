/**
 * Partner Salons — каталог-карточка партнёрского салона для тенантов типа `wfy-city-dir`.
 *
 * НЕ ПУТАТЬ с `salons` (физический CRM-салон с workingHours, мастерами и записями).
 * Здесь — лёгкий справочник: лого, ссылка на внешний сайт партнёра, контакты.
 * Используется блоком `PartnerSalonsGrid` (Data-block ED-редактора) и админкой
 * `/admin/wfy/partner-salons` (Phase D).
 *
 * `logoMediaId` — FK на общую `nas.media`. Repo-слой обязан проверять
 * `media.tenant_id === partner_salons.tenant_id` при insert/update — закрытие
 * cross-tenant media leak (см. session-plan §2 SENTINEL F-2 для Phase A).
 *
 * Спецификация: `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` §2.2.
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
import { media } from './media';

export const partnerSalons = pgTable(
  'partner_salons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    address: text('address'),
    phone: varchar('phone', { length: 64 }),
    email: varchar('email', { length: 320 }),

    /** URL партнёрского сайта (5massage.ru, imperiumspa.ru и т.п.). */
    externalLink: text('external_link'),

    /**
     * Логотип партнёра в общей `nas.media`. ON DELETE SET NULL — если медиа
     * удалили, карточка остаётся без логотипа.
     */
    logoMediaId: uuid('logo_media_id').references(() => media.id, {
      onDelete: 'set null',
    }),

    /** Порядок отображения в админке и публичной сетке. */
    ord: integer('ord').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantOrdIdx: index('partner_salons_tenant_ord_idx').on(t.tenantId, t.ord),
  }),
);

export type PartnerSalon = typeof partnerSalons.$inferSelect;
export type NewPartnerSalon = typeof partnerSalons.$inferInsert;
