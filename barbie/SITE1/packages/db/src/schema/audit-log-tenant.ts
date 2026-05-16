/**
 * Audit Log Tenant — tenant-scoped аудит действий.
 *
 * Иммутабельный лог. Запросы по тенанту с time-range (DESC по created_at) —
 * главный hot path, обслуживается composite index `(tenant_id, created_at desc)`.
 *
 * `payloadDiff` — `{ before, after }` для UPDATE-action либо
 * `{ event, data, meta }` для domain event.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.14.
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export type AuditPayloadDiff = {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  event?: string;
  meta?: Record<string, unknown>;
};

export const auditLogTenant = pgTable(
  'audit_log_tenant',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    action: varchar('action', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: uuid('entity_id'),

    payloadDiff: jsonb('payload_diff').$type<AuditPayloadDiff>(),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    requestId: varchar('request_id', { length: 64 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index('alt_tenant_created_idx').on(t.tenantId, t.createdAt.desc()),
    tenantActionIdx: index('alt_tenant_action_idx').on(t.tenantId, t.action),
    tenantEntityIdx: index('alt_tenant_entity_idx').on(
      t.tenantId,
      t.entityType,
      t.entityId,
    ),
    actorIdx: index('alt_actor_idx').on(t.actorUserId),
  }),
);

export type AuditLogTenant = typeof auditLogTenant.$inferSelect;
export type NewAuditLogTenant = typeof auditLogTenant.$inferInsert;
