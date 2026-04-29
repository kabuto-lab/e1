/**
 * Escrow Transactions - финансовая state machine
 *
 * Для payment_provider = ton_usdt источник истины по сумме — bigint-поля (минимальные единицы jetton).
 * amount_held (decimal) сохраняется для legacy-провайдеров и может дублировать отображаемую сумму для TON.
 */

import {
  pgTable,
  uuid,
  varchar,
  decimal,
  bigint,
  smallint,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { bookings } from './bookings';

export type EscrowPaymentProvider = 'yookassa' | 'cryptomus' | 'manual' | 'ton_usdt';

export type EscrowTonNetwork = 'ton_mainnet' | 'ton_testnet';

export const escrowTransactions = pgTable(
  'escrow_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    paymentProvider: varchar('payment_provider', { length: 30 }).$type<EscrowPaymentProvider>(),
    paymentProviderRef: varchar('payment_provider_ref', { length: 255 }),

    amountHeld: decimal('amount_held', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('RUB'),

    /** TON USDT: ожидаемая сумма в минимальных единицах jetton (источник истины для ton_usdt). */
    expectedAmountAtomic: bigint('expected_amount_atomic', { mode: 'bigint' }),
    /** Фактически учтённая сумма после матчинга депозита(ов). */
    receivedAmountAtomic: bigint('received_amount_atomic', { mode: 'bigint' }),
    /** Для USDT jetton на TON обычно 6. */
    assetDecimals: smallint('asset_decimals'),

    network: varchar('network', { length: 24 }).$type<EscrowTonNetwork>(),
    jettonMasterAddress: varchar('jetton_master_address', { length: 120 }),
    treasuryAddress: varchar('treasury_address', { length: 120 }),
    /** Для нового TON-пути задаётся обязательно на уровне приложения; UNIQUE для ненулевых значений в PostgreSQL допускает несколько NULL (legacy). */
    expectedMemo: varchar('expected_memo', { length: 128 }),

    fundedTxHash: varchar('funded_tx_hash', { length: 128 }),
    releaseTxHash: varchar('release_tx_hash', { length: 128 }),
    refundTxHash: varchar('refund_tx_hash', { length: 128 }),
    confirmations: integer('confirmations').notNull().default(0),

    status: varchar('status', { length: 40 })
      .$type<
        | 'pending_funding'
        | 'funded'
        | 'hold_period'
        | 'released'
        | 'refunded'
        | 'disputed_hold'
        | 'partially_refunded'
        | 'release_in_flight'
        | 'refund_in_flight'
      >()
      .default('pending_funding'),

    fundedAt: timestamp('funded_at'),
    holdUntil: timestamp('hold_until'),
    releasedAt: timestamp('released_at'),
    refundedAt: timestamp('refunded_at'),

    releaseTrigger: varchar('release_trigger', { length: 50 }).$type<
      'auto_after_hold' | 'manual_confirm' | 'dispute_resolution' | 'admin_override' | 'hot_wallet_broadcast'
    >(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('escrow_booking_idx').on(table.bookingId),
    statusIdx: index('escrow_status_idx').on(table.status),
    fundedAtIdx: index('escrow_funded_at_idx').on(table.fundedAt),
    providerNetworkIdx: index('escrow_provider_network_idx').on(table.paymentProvider, table.network),
    expectedMemoUnique: uniqueIndex('escrow_expected_memo_uidx').on(table.expectedMemo),
    fundedTxHashUnique: uniqueIndex('escrow_funded_tx_hash_uidx').on(table.fundedTxHash),
    releaseTxHashUnique: uniqueIndex('escrow_release_tx_hash_uidx').on(table.releaseTxHash),
    refundTxHashUnique: uniqueIndex('escrow_refund_tx_hash_uidx').on(table.refundTxHash),
  }),
);

// Type exports
export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type NewEscrowTransaction = typeof escrowTransactions.$inferInsert;
