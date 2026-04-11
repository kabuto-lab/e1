/**
 * Неизменяемый журнал доменных событий эскроу (TON и прочие провайдеры).
 * Отдельно от booking_audit_logs — там только переходы статуса брони.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { escrowTransactions } from './escrow';
import { users } from './users';

export const escrowAuditEvents = pgTable(
  'escrow_audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    escrowTransactionId: uuid('escrow_transaction_id')
      .references(() => escrowTransactions.id, { onDelete: 'cascade' })
      .notNull(),

    eventType: varchar('event_type', { length: 64 }).notNull(),
    actorType: varchar('actor_type', { length: 24 }).notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),

    correlationId: varchar('correlation_id', { length: 64 }),
    payload: jsonb('payload').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    escrowIdx: index('escrow_audit_escrow_idx').on(t.escrowTransactionId),
    typeIdx: index('escrow_audit_type_idx').on(t.eventType),
    createdIdx: index('escrow_audit_created_idx').on(t.createdAt),
  }),
);

export const escrowAuditEventsRelations = relations(escrowAuditEvents, ({ one }) => ({
  escrowTransaction: one(escrowTransactions, {
    fields: [escrowAuditEvents.escrowTransactionId],
    references: [escrowTransactions.id],
  }),
  actorUser: one(users, {
    fields: [escrowAuditEvents.actorUserId],
    references: [users.id],
  }),
}));

export type EscrowAuditEvent = typeof escrowAuditEvents.$inferSelect;
export type NewEscrowAuditEvent = typeof escrowAuditEvents.$inferInsert;
