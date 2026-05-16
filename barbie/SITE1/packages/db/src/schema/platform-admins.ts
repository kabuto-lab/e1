/**
 * Platform admins — суперпользователи платформы (cross-tenant).
 *
 * БЕЗ `tenant_id` — явно cross-tenant роль.
 *  - `platform-admin` — полный доступ ко всем тенантам.
 *  - `platform-support` — read-only для саппорта (Phase 1+).
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.5.
 */

import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export type PlatformAdminRole = 'platform-admin' | 'platform-support';

export const platformAdmins = pgTable(
  'platform_admins',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    role: varchar('role', { length: 32 })
      .$type<PlatformAdminRole>()
      .notNull()
      .default('platform-admin'),

    permissions: jsonb('permissions')
      .$type<Record<string, boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    roleIdx: index('platform_admins_role_idx').on(t.role),
  }),
);

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
