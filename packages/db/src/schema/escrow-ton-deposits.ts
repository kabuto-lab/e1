/**
 * Входящие jetton-переводы (TON USDT) на treasury — идемпотентность по tx_hash.
 */

import {
  pgTable,
  uuid,
  varchar,
  bigint,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { escrowTransactions } from './escrow';

export const escrowTonDeposits = pgTable(
  'escrow_ton_deposits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    escrowTransactionId: uuid('escrow_transaction_id')
      .references(() => escrowTransactions.id, { onDelete: 'cascade' })
      .notNull(),

    txHash: varchar('tx_hash', { length: 128 }).notNull(),
    logicalTime: bigint('logical_time', { mode: 'bigint' }),

    fromAddressRaw: varchar('from_address_raw', { length: 128 }).notNull(),
    treasuryAddressRaw: varchar('treasury_address_raw', { length: 128 }).notNull(),
    jettonMasterRaw: varchar('jetton_master_raw', { length: 128 }).notNull(),

    amountAtomic: bigint('amount_atomic', { mode: 'bigint' }).notNull(),
    memoMatched: varchar('memo_matched', { length: 128 }),

    confirmationCount: integer('confirmation_count').notNull().default(0),
    indexerSource: varchar('indexer_source', { length: 32 }),

    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    txHashUnique: uniqueIndex('escrow_ton_deposits_tx_hash_uidx').on(t.txHash),
    escrowIdx: index('escrow_ton_deposits_escrow_idx').on(t.escrowTransactionId),
    createdIdx: index('escrow_ton_deposits_created_idx').on(t.createdAt),
  }),
);

export const escrowTonDepositsRelations = relations(escrowTonDeposits, ({ one }) => ({
  escrowTransaction: one(escrowTransactions, {
    fields: [escrowTonDeposits.escrowTransactionId],
    references: [escrowTransactions.id],
  }),
}));

export type EscrowTonDeposit = typeof escrowTonDeposits.$inferSelect;
export type NewEscrowTonDeposit = typeof escrowTonDeposits.$inferInsert;
