/**
 * Tenants — корневая мульти-тенант таблица.
 *
 * Каждый ряд = один арендатор платформы (бренд салона / сеть). ВСЕ остальные
 * таблицы (кроме `platform_admins`, `audit_log_platform`, `subscription_plans`)
 * ссылаются сюда через `tenant_id`.
 *
 * Соглашения:
 *  - `slug` URL-safe, lowercase ASCII, 3–64 символа (CHECK regex).
 *  - `status='archived'` — данные сохранены, доступ закрыт.
 *  - `planId` nullable в Phase 0 (нет subscription_plans). FK будет добавлен
 *    миграцией Phase 1; пока что — обычная uuid-колонка без `.references()`.
 *  - `primaryDomain` уникален среди не-NULL значений (partial unique).
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.1.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

export type TenantSettings = {
  features?: Record<string, boolean>;
  bookingPolicy?: { minAdvanceHours?: number; cancelHoursBefore?: number };
  paymentRequired?: boolean;
};

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    legalName: varchar('legal_name', { length: 500 }),

    status: varchar('status', { length: 20 })
      .$type<'active' | 'pending' | 'suspended' | 'archived'>()
      .notNull()
      .default('pending'),

    /**
     * FK на `subscription_plans.id` будет добавлен миграцией Phase 1.
     * Phase 0: nullable uuid column без FK constraint.
     */
    planId: uuid('plan_id'),

    primaryDomain: varchar('primary_domain', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 320 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 32 }),

    timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Moscow'),
    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    settings: jsonb('settings')
      .$type<TenantSettings>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    slugUniq: uniqueIndex('tenants_slug_uniq').on(t.slug),
    primaryDomainUniq: uniqueIndex('tenants_primary_domain_uniq')
      .on(t.primaryDomain)
      .where(sql`${t.primaryDomain} is not null`),
    statusIdx: index('tenants_status_idx').on(t.status),
    slugCheck: check(
      'tenants_slug_format_check',
      sql`slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'`,
    ),
  }),
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
