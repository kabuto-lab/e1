/**
 * Blacklist Service - чёрный список
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { blacklists, users, type Blacklist, type NewBlacklist } from '@escort/db';
import { UsersService } from '../users/users.service';

@Injectable()
export class BlacklistService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Добавить в чёрный список. entityId — это users.id заблокированного аккаунта:
   * запись в blacklists хранит причину/аудит, а users.status='blacklisted' реально
   * блокирует вход (см. AuthService.login) и скрывает анкету модели из каталога
   * (см. ModelsService.getCatalog/findBySlugPublic).
   */
  async addToBlacklist(data: {
    entityType: 'model' | 'client' | 'manager';
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

    await this.usersService.updateStatus(data.entityId, 'blacklisted');

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
  async findByEntity(entityType: 'model' | 'client' | 'manager', entityId: string): Promise<Blacklist | null> {
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
  async isBlacklisted(entityType: 'model' | 'client' | 'manager', entityId: string): Promise<boolean> {
    const entry = await this.findByEntity(entityType, entityId);
    return entry?.status === 'blocked';
  }

  /**
   * Восстановить из чёрного списка по id записи — снимает и users.status обратно на 'active'.
   */
  async restore(id: string, restoredBy: string): Promise<Blacklist> {
    const entry = await this.findById(id);
    if (!entry) {
      throw new NotFoundException('Blacklist entry not found');
    }

    const updated = await this.db.update(blacklists)
      .set({
        status: 'restored',
        restoredAt: new Date(),
        restoredBy,
      })
      .where(eq(blacklists.id, id))
      .returning();

    await this.usersService.updateStatus(entry.entityId, 'active');

    return updated[0];
  }

  /**
   * Восстановить по entityId — находит последнюю активную блокировку и снимает её.
   * Удобно для UI, где под рукой только userId (напр. таблица пользователей).
   */
  async restoreByEntity(
    entityType: 'model' | 'client' | 'manager',
    entityId: string,
    restoredBy: string,
  ): Promise<Blacklist> {
    const entry = await this.findByEntity(entityType, entityId);
    if (!entry || entry.status !== 'blocked') {
      throw new NotFoundException('Active blacklist entry not found for this entity');
    }
    return this.restore(entry.id, restoredBy);
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
   * Полная история (активные + восстановленные) с данными заблокированного аккаунта
   * и именами того, кто заблокировал/восстановил — для страницы «Чёрный список».
   */
  async getHistory(limit = 100): Promise<Array<Blacklist & {
    entityLogin: string | null;
    entityEmail: string | null;
    blockedByLogin: string | null;
    restoredByLogin: string | null;
  }>> {
    const rows = await this.db
      .select({
        blacklist: blacklists,
        entityLogin: users.login,
        entityEmail: users.email,
      })
      .from(blacklists)
      .leftJoin(users, eq(users.id, blacklists.entityId))
      .orderBy(desc(blacklists.blockedAt))
      .limit(limit);

    const actorIds = [...new Set(rows.flatMap((r: any) => [r.blacklist.blockedBy, r.blacklist.restoredBy].filter(Boolean)))] as string[];
    const actorMap = new Map<string, { login: string | null; email: string | null }>();
    if (actorIds.length > 0) {
      const found = await this.db
        .select({ id: users.id, login: users.login, email: users.email })
        .from(users)
        .where(inArray(users.id, actorIds));
      for (const u of found) actorMap.set(u.id, { login: u.login, email: u.email });
    }

    return rows.map((r: any) => ({
      ...r.blacklist,
      entityLogin: r.entityLogin,
      entityEmail: r.entityEmail,
      blockedByLogin: actorMap.get(r.blacklist.blockedBy)?.login ?? actorMap.get(r.blacklist.blockedBy)?.email ?? null,
      restoredByLogin: r.blacklist.restoredBy
        ? (actorMap.get(r.blacklist.restoredBy)?.login ?? actorMap.get(r.blacklist.restoredBy)?.email ?? null)
        : null,
    }));
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
