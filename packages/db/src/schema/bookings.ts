/**
 * Bookings - бронирования с state machine эскроу
 */

import { pgTable, uuid, varchar, decimal, integer, timestamp, text, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    
    clientId: uuid('client_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'restrict' }).notNull(),
    managerId: uuid('manager_id').references(() => users.id),
    
    status: varchar('status', { length: 30 })
      .$type<'draft' | 'pending_payment' | 'escrow_funded' | 'confirmed' | 'in_progress' | 'completed' | 'disputed' | 'cancelled' | 'refunded'>()
      .default('draft'),
    
    startTime: timestamp('start_time').notNull(),
    durationHours: integer('duration_hours').notNull(),
    locationType: varchar('location_type', { length: 20 }).$type<'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha'>(),
    // locationEncrypted: pgBinary('location_encrypted'), // TODO: добавить позже
    specialRequests: text('special_requests'),
    
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 12, scale: 2 }),
    modelPayout: decimal('model_payout', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('RUB'),
    
    cancellationReason: text('cancellation_reason'),
    cancelledBy: uuid('cancelled_by').references(() => users.id),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    confirmedAt: timestamp('confirmed_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    clientIdx: index('booking_client_idx').on(table.clientId),
    modelIdx: index('booking_model_idx').on(table.modelId),
    managerIdx: index('booking_manager_idx').on(table.managerId),
    statusIdx: index('booking_status_idx').on(table.status),
    startTimeIdx: index('booking_start_time_idx').on(table.startTime),
  })
);

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
    relationName: 'client_bookings',
  }),
  model: one(modelProfiles, {
    fields: [bookings.modelId],
    references: [modelProfiles.id],
  }),
  manager: one(users, {
    fields: [bookings.managerId],
    references: [users.id],
    relationName: 'manager_bookings',
  }),
  escrow: one(escrowTransactions),
  auditLogs: many(bookingAuditLogs),
}));

// Type exports
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

// Forward imports
import { escrowTransactions } from './escrow';
import { bookingAuditLogs } from './audit';
