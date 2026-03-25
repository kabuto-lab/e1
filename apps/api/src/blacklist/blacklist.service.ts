/**
 * Blacklist Service - чёрный список
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { blacklists, type Blacklist, type NewBlacklist } from '@escort/db';

@Injectable()
export class BlacklistService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Добавить в чёрный список
   */
  async addToBlacklist(data: {
    entityType: 'model' | 'client';
    entityId: string;
    blockedBy: string;
    reason: Blacklist['reason'];
    description?: string;
  }): Promise<Blacklist> {
    // Check if already blacklisted
    const existing = await this.findByEntity(data.entityType, data.entityId);
    if (existing && existing.status === 'blocked') {
      throw new ConflictException('User is already blacklisted');
    }

    const newEntry = await this.db.insert(blacklists).values({
      entityType: data.entityType,
      entityId: data.entityId,
      blockedBy: data.blockedBy,
      reason: data.reason,
      description: data.description,
      status: 'blocked',
    }).returning();

    return newEntry[0];
  }

  /**
   * Найти запись по ID
   */
  async findById(id: string): Promise<Blacklist | null> {
    const found = await this.db.select().from(blacklists).where(eq(blacklists.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти по entityId
   */
  async findByEntity(entityType: 'model' | 'client', entityId: string): Promise<Blacklist | null> {
    const found = await this.db.select().from(blacklists)
      .where(and(
        eq(blacklists.entityType, entityType),
        eq(blacklists.entityId, entityId)
      ))
      .orderBy(desc(blacklists.blockedAt))
      .limit(1);
    return found[0] || null;
  }

  /**
   * Проверить, находится ли пользователь в чёрном списке
   */
  async isBlacklisted(entityType: 'model' | 'client', entityId: string): Promise<boolean> {
    const entry = await this.findByEntity(entityType, entityId);
    return entry?.status === 'blocked';
  }

  /**
   * Восстановить из чёрного списка
   */
  async restore(id: string, restoredBy: string): Promise<Blacklist> {
    const updated = await this.db.update(blacklists)
      .set({ 
        status: 'restored',
        restoredAt: new Date(),
        restoredBy,
      })
      .where(eq(blacklists.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Blacklist entry not found');
    }

    return updated[0];
  }

  /**
   * Получить все активные записи
   */
  async getActive(limit = 50): Promise<Blacklist[]> {
    return this.db.select().from(blacklists)
      .where(eq(blacklists.status, 'blocked'))
      .orderBy(desc(blacklists.blockedAt))
      .limit(limit);
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    total: number;
    blocked: number;
    restored: number;
    underReview: number;
    byReason: Record<string, number>;
  }> {
    const all = await this.db.select().from(blacklists);
    
    const byReason: Record<string, number> = {};
    let blocked = 0, restored = 0, underReview = 0;

    all.forEach((b: Blacklist) => {
      if (b.status === 'blocked') blocked++;
      else if (b.status === 'restored') restored++;
      else if (b.status === 'under_review') underReview++;
      
      const reason = b.reason || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    });

    return {
      total: all.length,
      blocked,
      restored,
      underReview,
      byReason,
    };
  }
}
