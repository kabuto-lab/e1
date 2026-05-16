/**
 * Salons — физический салон тенанта.
 *
 * Один тенант может содержать несколько салонов (сеть). Slug уникален в пределах
 * тенанта. `workingHours` — недельное расписание + exceptions для праздников.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.7.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type SalonStatus = 'active' | 'paused' | 'archived';

export type WorkingHoursDay = { open: string; close: string; closed?: boolean };
export type WorkingHours = {
  mon?: WorkingHoursDay;
  tue?: WorkingHoursDay;
  wed?: WorkingHoursDay;
  thu?: WorkingHoursDay;
  fri?: WorkingHoursDay;
  sat?: WorkingHoursDay;
  sun?: WorkingHoursDay;
  exceptions?: Array<{ date: string; closed?: boolean; open?: string; close?: string }>;
};

export const salons = pgTable(
  'salons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),

    address: text('address').notNull(),
    city: varchar('city', { length: 128 }).notNull(),
    region: varchar('region', { length: 128 }),
    country: varchar('country', { length: 2 }).notNull().default('RU'),
    postalCode: varchar('postal_code', { length: 16 }),

    geoLat: numeric('geo_lat', { precision: 9, scale: 6 }),
    geoLng: numeric('geo_lng', { precision: 9, scale: 6 }),

    phone: varchar('phone', { length: 32 }),
    email: varchar('email', { length: 320 }),

    workingHours: jsonb('working_hours').$type<WorkingHours>().notNull(),

    status: varchar('status', { length: 20 })
      .$type<SalonStatus>()
      .notNull()
      .default('active'),

    coverImageKey: varchar('cover_image_key', { length: 500 }),
    description: text('description'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSlugUniq: uniqueIndex('salons_tenant_slug_uniq').on(t.tenantId, t.slug),
    tenantStatusIdx: index('salons_tenant_status_idx').on(t.tenantId, t.status),
    tenantCityIdx: index('salons_tenant_city_idx').on(t.tenantId, t.city),
  }),
);

export type Salon = typeof salons.$inferSelect;
export type NewSalon = typeof salons.$inferInsert;
