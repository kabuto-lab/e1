/**
 * Tenant Users — связь user ↔ tenant с ролью в этом тенанте.
 *
 * Multi-tenant membership: один user может состоять в нескольких тенантах
 * с разными ролями. Связка `(tenant_id, user_id)` уникальна — в одном тенанте
 * у пользователя одна активная роль.
 *
 * Роли:
 *  - `tenant-admin` — владелец тенанта; `salon_id` IS NULL.
 *  - `salon-manager` — менеджер салона; `salon_id` REQUIRED.
 *  - `master` — мастер; `salon_id` REQUIRED.
 *  - `client` — клиент тенанта; `salon_id` IS NULL.
 *
 * CHECK constraint enforce: для salon-manager/master `salon_id` обязателен.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.6.
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
import { tenants } from './tenants';
import { users } from './users';
import { salons } from './salons';

export type TenantUserRole = 'tenant-admin' | 'salon-manager' | 'master' | 'client';
export type TenantUserStatus = 'active' | 'invited' | 'suspended' | 'archived';

export const tenantUsers = pgTable(
  'tenant_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    role: varchar('role', { length: 32 }).$type<TenantUserRole>().notNull(),

    salonId: uuid('salon_id').references(() => salons.id, { onDelete: 'set null' }),

    permissions: jsonb('permissions')
      .$type<Record<string, boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<TenantUserStatus>()
      .notNull()
      .default('active'),

    invitedAt: timestamp('invited_at'),
    acceptedAt: timestamp('accepted_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantUserUniq: uniqueIndex('tenant_users_tenant_user_uniq').on(t.tenantId, t.userId),
    tenantRoleIdx: index('tenant_users_tenant_role_idx').on(t.tenantId, t.role),
    salonRoleIdx: index('tenant_users_salon_role_idx').on(t.salonId, t.role),
    salonRequiredCheck: check(
      'tenant_users_salon_required_check',
      sql`(role IN ('tenant-admin','client') OR salon_id IS NOT NULL)`,
    ),
  }),
);

export type TenantUser = typeof tenantUsers.$inferSelect;
export type NewTenantUser = typeof tenantUsers.$inferInsert;
