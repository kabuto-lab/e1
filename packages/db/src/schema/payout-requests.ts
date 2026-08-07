/**
 * Заявки на вывод заработанного (модель/менеджер) — ручное одобрение admin/moderator.
 * Платформа не переводит деньги автоматически (см. TbankEscrowService) — это просто
 * очередь заявок; сам банковский перевод происходит вне платформы.
 */

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export type PayoutRequestStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export const payoutRequests = pgTable(
  'payout_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 16 }).$type<PayoutRequestStatus>().notNull().default('pending'),
    note: text('note'),
    /** Реквизиты для перевода (банк + номер счёта/карты, свободный текст) — заполняется при
     *  подаче заявки, admin/moderator видят это в очереди /dashboard/payouts. */
    requisites: text('requisites'),

    processedByUserId: uuid('processed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    processedAt: timestamp('processed_at', { withTimezone: true }),

    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('payout_requests_user_idx').on(t.userId),
    statusIdx: index('payout_requests_status_idx').on(t.status),
  }),
);

export const payoutRequestsRelations = relations(payoutRequests, ({ one }) => ({
  user: one(users, {
    fields: [payoutRequests.userId],
    references: [users.id],
  }),
  processedBy: one(users, {
    fields: [payoutRequests.processedByUserId],
    references: [users.id],
  }),
}));

export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type NewPayoutRequest = typeof payoutRequests.$inferInsert;
