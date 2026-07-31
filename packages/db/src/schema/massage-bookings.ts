import { pgTable, uuid, varchar, timestamp, index, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { massageMasters } from './massage-masters';

/**
 * Заявки на бронь у конкретного мастера (массажный режим) — лёгкий лид, без эскроу/оплаты.
 * Отдельно от `bookings` (эскорт-режим), чтобы не связывать бизнес-логику эскроу с этим потоком.
 */
export const massageBookings = pgTable(
  'massage_bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    masterId: uuid('master_id').notNull().references(() => massageMasters.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    contact: varchar('contact', { length: 100 }).notNull(),
    desiredDate: varchar('desired_date', { length: 50 }),
    comment: text('comment'),
    status: varchar('status', { length: 20 })
      .$type<'new' | 'contacted' | 'done' | 'cancelled'>()
      .default('new')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    masterIdx: index('massage_booking_master_idx').on(table.masterId),
    statusIdx: index('massage_booking_status_idx').on(table.status),
  }),
);

export const massageBookingsRelations = relations(massageBookings, ({ one }) => ({
  master: one(massageMasters, {
    fields: [massageBookings.masterId],
    references: [massageMasters.id],
  }),
}));

export type MassageBooking = typeof massageBookings.$inferSelect;
export type NewMassageBooking = typeof massageBookings.$inferInsert;
