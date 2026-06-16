/**
 * T-Bank (Tinkoff Acquiring) — провайдер-специфичные данные платежа.
 * 1:1 к escrow_transactions (paymentProvider='tbank'); сам статус и переходы
 * живут в общей машине состояний escrow_transactions.status.
 * См. docs/adr/ADR-002-tbank-adapter.md
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { escrowTransactions } from './escrow';

export type TbankOrderStatus =
  | 'NEW'
  | 'FORM_SHOWED'
  | 'AUTHORIZING'
  | 'AUTHORIZED'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'REVERSING'
  | 'REVERSED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'PARTIAL_REFUNDED'
  | 'REJECTED'
  | 'DEADLINE_EXPIRED'
  | 'CANCELED';

export const tbankOrders = pgTable(
  'tbank_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    escrowTransactionId: uuid('escrow_transaction_id')
      .references(() => escrowTransactions.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    /** OrderId, который мы передаём в T-Bank Init (обычно = escrowTransactionId или bookingId) */
    tbankOrderId: varchar('tbank_order_id', { length: 64 }).notNull(),
    /** PaymentId, который возвращает T-Bank в ответ на Init */
    tbankPaymentId: varchar('tbank_payment_id', { length: 64 }),

    paymentUrl: varchar('payment_url', { length: 512 }),

    /** Токен последнего вебхука — для аудита/идемпотентности повторных нотификаций */
    lastWebhookToken: varchar('last_webhook_token', { length: 128 }),

    status: varchar('status', { length: 24 }).$type<TbankOrderStatus>().default('NEW'),

    rawInitPayload: jsonb('raw_init_payload').$type<Record<string, unknown>>(),
    rawWebhookPayload: jsonb('raw_webhook_payload').$type<Record<string, unknown>>(),

    confirmations: integer('confirmations').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    escrowIdx: index('tbank_orders_escrow_idx').on(t.escrowTransactionId),
    tbankOrderIdUnique: uniqueIndex('tbank_orders_tbank_order_id_uidx').on(t.tbankOrderId),
    statusIdx: index('tbank_orders_status_idx').on(t.status),
  }),
);

export const tbankOrdersRelations = relations(tbankOrders, ({ one }) => ({
  escrowTransaction: one(escrowTransactions, {
    fields: [tbankOrders.escrowTransactionId],
    references: [escrowTransactions.id],
  }),
}));

export type TbankOrder = typeof tbankOrders.$inferSelect;
export type NewTbankOrder = typeof tbankOrders.$inferInsert;
