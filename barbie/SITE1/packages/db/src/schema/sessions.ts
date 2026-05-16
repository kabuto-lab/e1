/**
 * Sessions — JWT refresh-token sessions.
 *
 * `tenant_id` nullable: `scope='platform'` означает platform-admin login без
 * привязки к тенанту. CHECK constraint enforces:
 *   (scope='platform' AND tenant_id IS NULL) OR (scope='tenant' AND tenant_id IS NOT NULL)
 *
 * `refresh_token_hash` уникален (нельзя одинаковый рефреш в двух сессиях).
 *
 * Cleanup expired (Open Q §6 #7): рекомендован pgcron job ежедневно
 * `DELETE FROM sessions WHERE expires_at < now() - interval '7 days'`.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.13.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export type SessionScope = 'tenant' | 'platform';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),

    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    accessTokenHash: varchar('access_token_hash', { length: 255 }),

    scope: varchar('scope', { length: 16 }).$type<SessionScope>().notNull(),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),

    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    revokedReason: varchar('revoked_reason', { length: 128 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
    tenantUserIdx: index('sessions_tenant_user_idx').on(t.tenantId, t.userId),
    refreshTokenUniq: uniqueIndex('sessions_refresh_token_uniq').on(t.refreshTokenHash),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
    scopeTenantCheck: check(
      'sessions_scope_tenant_check',
      sql`(scope = 'platform' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL)`,
    ),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
