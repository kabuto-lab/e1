/**
 * Booking Audit Logs - неизменяемый аудит лог действий
 */

import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { bookings } from './bookings';
import { users } from './users';

export const bookingAuditLogs = pgTable(
  'booking_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
    
    action: varchar('action', { length: 50 }).notNull(),
    actorId: uuid('actor_id').references(() => users.id),
    
    fromStatus: varchar('from_status', { length: 30 }),
    toStatus: varchar('to_status', { length: 30 }),
    metadata: jsonb('metadata'),
    
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('audit_booking_idx').on(table.bookingId),
    actorIdx: index('audit_actor_idx').on(table.actorId),
    actionIdx: index('audit_action_idx').on(table.action),
    createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
  })
);

export const bookingAuditLogsRelations = relations(bookingAuditLogs, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingAuditLogs.bookingId],
    references: [bookings.id],
  }),
  actor: one(users, {
    fields: [bookingAuditLogs.actorId],
    references: [users.id],
  }),
}));

// Type exports
export type BookingAuditLog = typeof bookingAuditLogs.$inferSelect;
export type NewBookingAuditLog = typeof bookingAuditLogs.$inferInsert;
