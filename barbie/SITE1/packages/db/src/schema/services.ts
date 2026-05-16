/**
 * Services — каталог услуг (программ) тенанта.
 *
 * Может быть глобальной (для всех салонов тенанта, `salon_id IS NULL`) или
 * специфичной для одного салона. Slug уникален в пределах
 * `(tenant_id, salon_id)`: глобальные slug'и и салон-специфичные не конфликтуют.
 *
 * Цена хранится в копейках как `bigint`. API сериализует как строку чтобы
 * не терять точность в JSON.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.8.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { salons } from './salons';

export type ServiceStatus = 'active' | 'draft' | 'archived';

export const services = pgTable(
  'services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    salonId: uuid('salon_id').references(() => salons.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 128 }).notNull(),
    description: text('description'),

    category: varchar('category', { length: 64 }).notNull(),
    durationMin: integer('duration_min').notNull(),
    priceKopecks: bigint('price_kopecks', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('RUB'),

    coverImageKey: varchar('cover_image_key', { length: 500 }),

    status: varchar('status', { length: 20 })
      .$type<ServiceStatus>()
      .notNull()
      .default('draft'),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSalonSlugUniq: uniqueIndex('services_tenant_salon_slug_uniq').on(
      t.tenantId,
      t.salonId,
      t.slug,
    ),
    tenantStatusIdx: index('services_tenant_status_idx').on(t.tenantId, t.status),
    tenantCategoryIdx: index('services_tenant_category_idx').on(t.tenantId, t.category),
    salonStatusIdx: index('services_salon_status_idx').on(t.salonId, t.status),
    durationCheck: check(
      'services_duration_check',
      sql`duration_min > 0 AND duration_min <= 1440`,
    ),
    priceCheck: check('services_price_check', sql`price_kopecks >= 0`),
  }),
);

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
