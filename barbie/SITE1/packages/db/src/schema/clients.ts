/**
 * Clients — CRM-карточки клиентов салона.
 *
 * Это НЕ платформенные users (тех логин на сайт), а CRM-record о человеке,
 * который ходит в салон. Опционально связан с `users.id` (если клиент
 * зарегистрировался и привязал свою карточку).
 *
 * Уникальность `(tenant_id, phone)` — один телефон = одна карточка в тенанте.
 * Между тенантами карточки независимы.
 *
 * Aggregate-поля `first_visit_at`, `last_visit_at`, `total_spent_kopecks`
 * обновляются триггером `bump_clients_aggregates()` (см. §3.3) при завершении
 * appointment'a — добавляется в Phase 1.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.11.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  bigint,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export type ClientStatus = 'active' | 'blocked' | 'archived';

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 320 }),
    birthdate: date('birthdate'),

    notes: text('notes'),
    tags: jsonb('tags')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<ClientStatus>()
      .notNull()
      .default('active'),

    firstVisitAt: timestamp('first_visit_at'),
    lastVisitAt: timestamp('last_visit_at'),
    totalSpentKopecks: bigint('total_spent_kopecks', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantPhoneUniq: uniqueIndex('clients_tenant_phone_uniq').on(t.tenantId, t.phone),
    tenantEmailIdx: index('clients_tenant_email_idx')
      .on(t.tenantId, t.email)
      .where(sql`${t.email} is not null`),
    tenantStatusIdx: index('clients_tenant_status_idx').on(t.tenantId, t.status),
    userIdx: index('clients_user_idx').on(t.userId),
  }),
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
