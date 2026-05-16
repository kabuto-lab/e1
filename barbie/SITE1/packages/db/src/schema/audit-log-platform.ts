/**
 * Audit Log Platform — действия platform-admin'ов.
 *
 * БЕЗ обязательного `tenant_id`. `affectedTenantId` опционально указывает на
 * затронутого тенанта (например, при suspend/restore).
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.15.
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';
import type { AuditPayloadDiff } from './audit-log-tenant';

export const auditLogPlatform = pgTable(
  'audit_log_platform',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    action: varchar('action', { length: 64 }).notNull(),
    affectedTenantId: uuid('affected_tenant_id').references(() => tenants.id, {
      onDelete: 'set null',
    }),

    payloadDiff: jsonb('payload_diff').$type<AuditPayloadDiff>(),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    requestId: varchar('request_id', { length: 64 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    actorCreatedIdx: index('alp_actor_created_idx').on(
      t.actorUserId,
      t.createdAt.desc(),
    ),
    affectedTenantIdx: index('alp_affected_tenant_idx').on(t.affectedTenantId),
    actionIdx: index('alp_action_idx').on(t.action),
    createdIdx: index('alp_created_idx').on(t.createdAt.desc()),
  }),
);

export type AuditLogPlatform = typeof auditLogPlatform.$inferSelect;
export type NewAuditLogPlatform = typeof auditLogPlatform.$inferInsert;
