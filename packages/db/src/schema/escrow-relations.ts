/**
 * Relations для escrow: вынесено из escrow.ts, чтобы избежать циклического импорта с escrow-ton-deposits.
 */

import { relations } from 'drizzle-orm';
import { escrowTransactions } from './escrow';
import { escrowTonDeposits } from './escrow-ton-deposits';
import { escrowAuditEvents } from './escrow-audit-events';
import { tbankOrders } from './tbank-orders';
import { bookings } from './bookings';

export const escrowTransactionsRelations = relations(escrowTransactions, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [escrowTransactions.bookingId],
    references: [bookings.id],
  }),
  tonDeposits: many(escrowTonDeposits),
  auditEvents: many(escrowAuditEvents),
  tbankOrder: one(tbankOrders, {
    fields: [escrowTransactions.id],
    references: [tbankOrders.escrowTransactionId],
  }),
}));
