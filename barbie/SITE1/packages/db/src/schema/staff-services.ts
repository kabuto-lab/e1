/**
 * Staff Services (M2M) — какой мастер оказывает какую услугу.
 *
 * Composite PK `(staff_id, service_id)`. `tenant_id` дублируется для composite
 * индексов и safety при cascade (соответствует pattern в спеке §1.10).
 *
 * `priceOverrideKopecks` / `durationOverrideMin` опциональны: позволяют
 * мастеру брать за услугу больше базовой ставки (например, senior-мастер).
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.10.
 */

import {
  pgTable,
  uuid,
  bigint,
  integer,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { staff } from './staff';
import { services } from './services';
import { tenants } from './tenants';

export const staffServices = pgTable(
  'staff_services',
  {
    staffId: uuid('staff_id')
      .references(() => staff.id, { onDelete: 'cascade' })
      .notNull(),
    serviceId: uuid('service_id')
      .references(() => services.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    priceOverrideKopecks: bigint('price_override_kopecks', { mode: 'bigint' }),
    durationOverrideMin: integer('duration_override_min'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.staffId, t.serviceId] }),
    tenantIdx: index('staff_services_tenant_idx').on(t.tenantId),
    serviceIdx: index('staff_services_service_idx').on(t.serviceId),
  }),
);

export type StaffService = typeof staffServices.$inferSelect;
export type NewStaffService = typeof staffServices.$inferInsert;
