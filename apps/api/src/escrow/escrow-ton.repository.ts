/**
 * Drizzle-слой для TON USDT эскроу: транзакции, аудит, идемпотентные депозиты.
 */

import { Injectable, Inject } from '@nestjs/common';
import { eq, max } from 'drizzle-orm';
import {
  escrowTransactions,
  escrowAuditEvents,
  escrowTonDeposits,
  type EscrowTransaction,
  type NewEscrowTransaction,
  type NewEscrowAuditEvent,
  type NewEscrowTonDeposit,
  type EscrowTonDeposit,
} from '@escort/db';

@Injectable()
export class EscrowTonRepository {
  constructor(@Inject('DRIZZLE') private readonly db: any) {}

  async withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async createIntentWithAudit(input: {
    escrowRow: NewEscrowTransaction;
    actorUserId: string;
    auditPayload?: Record<string, unknown>;
  }): Promise<EscrowTransaction> {
    return this.db.transaction(async (tx: any) => {
      const [row] = await tx.insert(escrowTransactions).values(input.escrowRow).returning();
      await tx.insert(escrowAuditEvents).values({
        escrowTransactionId: row.id,
        eventType: 'ton_intent_created',
        actorType: 'user',
        actorUserId: input.actorUserId,
        payload: input.auditPayload ?? {},
      });
      return row;
    });
  }

  async findByExpectedMemo(memo: string): Promise<EscrowTransaction | null> {
    const rows = await this.db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.expectedMemo, memo))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByExpectedMemoTx(tx: any, memo: string): Promise<EscrowTransaction | null> {
    const rows = await tx
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.expectedMemo, memo))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdTx(tx: any, id: string): Promise<EscrowTransaction | null> {
    const rows = await tx.select().from(escrowTransactions).where(eq(escrowTransactions.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<EscrowTransaction | null> {
    const rows = await this.db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findDepositByTxHash(txHash: string): Promise<EscrowTonDeposit | null> {
    const rows = await this.db
      .select()
      .from(escrowTonDeposits)
      .where(eq(escrowTonDeposits.txHash, txHash))
      .limit(1);
    return rows[0] ?? null;
  }

  async findDepositByTxHashTx(tx: any, txHash: string): Promise<EscrowTonDeposit | null> {
    const rows = await tx
      .select()
      .from(escrowTonDeposits)
      .where(eq(escrowTonDeposits.txHash, txHash))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByBookingId(bookingId: string): Promise<EscrowTransaction | null> {
    const rows = await this.db
      .select()
      .from(escrowTransactions)
      .where(eq(escrowTransactions.bookingId, bookingId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Макс. logical_time среди записанных депозитов (курсор TonAPI `after_lt`). */
  async getMaxDepositLogicalTime(): Promise<bigint | null> {
    const rows = await this.db.select({ m: max(escrowTonDeposits.logicalTime) }).from(escrowTonDeposits);
    const v = rows[0]?.m;
    if (v == null) {
      return null;
    }
    return typeof v === 'bigint' ? v : BigInt(String(v));
  }

  /**
   * Идемпотентная вставка депозита по уникальному tx_hash (повтор — без ошибки).
   */
  async insertDepositIdempotent(
    deposit: NewEscrowTonDeposit,
  ): Promise<{ inserted: boolean; row?: EscrowTonDeposit }> {
    const rows = await this.db
      .insert(escrowTonDeposits)
      .values(deposit)
      .onConflictDoNothing({ target: escrowTonDeposits.txHash })
      .returning();
    if (rows.length > 0) {
      return { inserted: true, row: rows[0] };
    }
    return { inserted: false };
  }

  async insertDepositIdempotentTx(
    tx: any,
    deposit: NewEscrowTonDeposit,
  ): Promise<{ inserted: boolean; row?: EscrowTonDeposit }> {
    const rows = await tx
      .insert(escrowTonDeposits)
      .values(deposit)
      .onConflictDoNothing({ target: escrowTonDeposits.txHash })
      .returning();
    if (rows.length > 0) {
      return { inserted: true, row: rows[0] };
    }
    return { inserted: false };
  }

  async appendAudit(tx: any, event: NewEscrowAuditEvent): Promise<void> {
    await tx.insert(escrowAuditEvents).values(event);
  }
}
