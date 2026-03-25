/**
 * Escrow Transactions - финансовая state machine
 */

import { pgTable, uuid, varchar, decimal, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { bookings } from './bookings';

export const escrowTransactions = pgTable(
  'escrow_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull().unique(),
    
    paymentProvider: varchar('payment_provider', { length: 30 }).$type<'yookassa' | 'cryptomus' | 'manual'>(),
    paymentProviderRef: varchar('payment_provider_ref', { length: 255 }),
    
    amountHeld: decimal('amount_held', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('RUB'),
    
    status: varchar('status', { length: 40 })
      .$type<'pending_funding' | 'funded' | 'hold_period' | 'released' | 'refunded' | 'disputed_hold' | 'partially_refunded'>()
      .default('pending_funding'),
    
    fundedAt: timestamp('funded_at'),
    holdUntil: timestamp('hold_until'),
    releasedAt: timestamp('released_at'),
    refundedAt: timestamp('refunded_at'),
    
    releaseTrigger: varchar('release_trigger', { length: 50 })
      .$type<'auto_after_hold' | 'manual_confirm' | 'dispute_resolution' | 'admin_override'>(),
    
    stateHistory: jsonb('state_history').$type<Array<{
      fromStatus: string;
      toStatus: string;
      triggeredBy: string;
      timestamp: string;
      reason?: string;
    }>>(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('escrow_booking_idx').on(table.bookingId),
    statusIdx: index('escrow_status_idx').on(table.status),
    fundedAtIdx: index('escrow_funded_at_idx').on(table.fundedAt),
  })
);

export const escrowTransactionsRelations = relations(escrowTransactions, ({ one }) => ({
  booking: one(bookings, {
    fields: [escrowTransactions.bookingId],
    references: [bookings.id],
  }),
}));

// Type exports
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type NewEscrowTransaction = typeof escrowTransactions.$inferInsert;
