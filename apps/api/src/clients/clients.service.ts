/**
 * Clients Service - бизнес-логика работы с профилями клиентов
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { clientProfiles, type ClientProfile, type NewClientProfile } from '@escort/db';

@Injectable()
export class ClientsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать профиль клиента
   */
  async createProfile(userId: string): Promise<ClientProfile> {
    // Проверка на существующий профиль
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Profile already exists for this user');
    }

    const newProfiles = await this.db.insert(clientProfiles).values({
      userId,
    }).returning();

    return newProfiles[0];
  }

  /**
   * Найти профиль по ID пользователя
   */
  async findByUserId(userId: string): Promise<ClientProfile | null> {
    const found = await this.db.select().from(clientProfiles).where(eq(clientProfiles.userId, userId)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти профиль по ID
   */
  async findById(id: string): Promise<ClientProfile | null> {
    const found = await this.db.select().from(clientProfiles).where(eq(clientProfiles.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Обновить профиль клиента
   */
  async updateProfile(id: string, updates: Partial<NewClientProfile>): Promise<ClientProfile> {
    const updated = await this.db.update(clientProfiles).set(updates).where(eq(clientProfiles.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    return updated[0];
  }

  /**
   * Обновить VIP статус
   */
  async updateVipTier(userId: string, tier: 'standard' | 'silver' | 'gold' | 'platinum'): Promise<ClientProfile> {
    const profile = await this.findByUserId(userId);
    
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.db.update(clientProfiles)
      .set({ vipTier: tier })
      .where(eq(clientProfiles.userId, userId))
      .returning();

    return updated[0];
  }

  /**
   * Обновить психотип
   */
  async updatePsychotype(userId: string, psychotype: string): Promise<ClientProfile> {
    const profile = await this.findByUserId(userId);
    
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.db.update(clientProfiles)
      .set({ psychotype })
      .where(eq(clientProfiles.userId, userId))
      .returning();

    return updated[0];
  }

  /**
   * Удалить профиль
   */
  async deleteProfile(id: string): Promise<void> {
    await this.db.delete(clientProfiles).where(eq(clientProfiles.id, id));
  }

  /**
   * Получить статистику по клиентам
   */
  async getStats(): Promise<{
    total: number;
    vip: { standard: number; silver: number; gold: number; platinum: number };
    banned: number;
  }> {
    const all = await this.db.select().from(clientProfiles);
    
    const vip = {
      standard: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    };

    all.forEach((p: ClientProfile) => {
      if (p.vipTier === 'standard') vip.standard++;
      else if (p.vipTier === 'silver') vip.silver++;
      else if (p.vipTier === 'gold') vip.gold++;
      else if (p.vipTier === 'platinum') vip.platinum++;
    });

    return {
      total: all.length,
      vip,
      banned: all.filter((p: ClientProfile) => p.blacklistStatus === 'banned').length,
    };
  }
}
