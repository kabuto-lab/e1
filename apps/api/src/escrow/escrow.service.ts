/**
 * Escrow Service - эскроу платежи
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { escrowTransactions, type EscrowTransaction, type NewEscrowTransaction } from '@escort/db';

@Injectable()
export class EscrowService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать эскроу транзакцию
   */
  async createTransaction(data: {
    bookingId: string;
    amount: string;
    paymentProvider: 'yookassa' | 'cryptomus' | 'manual';
  }): Promise<EscrowTransaction> {
    const newTx = await this.db.insert(escrowTransactions).values({
      bookingId: data.bookingId,
      amountHeld: data.amount,
      status: 'pending_funding',
      paymentProvider: data.paymentProvider,
    }).returning();

    return newTx[0];
  }

  /**
   * Найти транзакцию по ID
   */
  async findById(id: string): Promise<EscrowTransaction | null> {
    const found = await this.db.select().from(escrowTransactions).where(eq(escrowTransactions.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти транзакцию по booking ID
   */
  async findByBookingId(bookingId: string): Promise<EscrowTransaction | null> {
    const found = await this.db.select().from(escrowTransactions).where(eq(escrowTransactions.bookingId, bookingId)).limit(1);
    return found[0] || null;
  }

  /**
   * Обновить статус транзакции
   */
  async updateStatus(id: string, status: EscrowTransaction['status']): Promise<EscrowTransaction> {
    const updated = await this.db.update(escrowTransactions)
      .set({ status, updatedAt: new Date() })
      .where(eq(escrowTransactions.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Transaction not found');
    }

    return updated[0];
  }

  /**
   * Подтвердить получение средств
   */
  async confirmFunding(id: string): Promise<EscrowTransaction> {
    return this.updateStatus(id, 'funded');
  }

  /**
   * Освободить средства (выплата модели)
   */
  async release(id: string, payoutAmount?: string): Promise<EscrowTransaction> {
    const tx = await this.findById(id);
    if (!tx) throw new NotFoundException('Transaction not found');

    const updates: any = {
      status: 'released',
      releasedAt: new Date(),
    };
    if (payoutAmount) {
      updates.payoutAmount = payoutAmount;
    }

    const updated = await this.db.update(escrowTransactions)
      .set(updates)
      .where(eq(escrowTransactions.id, id))
      .returning();

    return updated[0];
  }

  /**
   * Вернуть средства клиенту
   */
  async refund(id: string): Promise<EscrowTransaction> {
    return this.updateStatus(id, 'refunded');
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    total: number;
    totalVolume: string;
    byStatus: Record<string, number>;
  }> {
    const all = await this.db.select().from(escrowTransactions);
    
    const byStatus: Record<string, number> = {};
    let totalVolume = 0;

    all.forEach((t: EscrowTransaction) => {
      const status = t.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
      totalVolume += parseFloat(t.amountHeld || '0');
    });

    return {
      total: all.length,
      totalVolume: totalVolume.toFixed(2),
      byStatus,
    };
  }
}
