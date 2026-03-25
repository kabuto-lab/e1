/**
 * Models Service - бизнес-логика работы с профилями моделей
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, like, desc, asc } from 'drizzle-orm';
import { modelProfiles, type ModelProfile, type NewModelProfile } from '@escort/db';

@Injectable()
export class ModelsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать профиль модели
   */
  async createProfile(userId: string, displayName: string, slug?: string): Promise<ModelProfile> {
    // Проверка на существующий профиль
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Profile already exists for this user');
    }

    // Проверка slug на уникальность
    if (slug) {
      const existingSlug = await this.findBySlug(slug);
      if (existingSlug) {
        throw new ConflictException('This slug is already taken');
      }
    }

    const newProfiles = await this.db.insert(modelProfiles).values({
      userId,
      displayName,
      slug,
    }).returning();

    return newProfiles[0];
  }

  /**
   * Найти профиль по ID пользователя
   */
  async findByUserId(userId: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.userId, userId)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти профиль по slug
   */
  async findBySlug(slug: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.slug, slug)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти профиль по ID
   */
  async findById(id: string): Promise<ModelProfile | null> {
    const found = await this.db.select().from(modelProfiles).where(eq(modelProfiles.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Получить каталог моделей с фильтрацией
   */
  async getCatalog(filters?: {
    availabilityStatus?: 'offline' | 'online' | 'in_shift' | 'busy';
    verificationStatus?: 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected';
    eliteStatus?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: 'rating' | 'createdAt' | 'displayName';
    order?: 'asc' | 'desc';
  }): Promise<ModelProfile[]> {
    const conditions: any[] = [];

    if (filters?.availabilityStatus) {
      conditions.push(eq(modelProfiles.availabilityStatus, filters.availabilityStatus));
    }

    if (filters?.verificationStatus) {
      conditions.push(eq(modelProfiles.verificationStatus, filters.verificationStatus));
    }

    if (filters?.eliteStatus === true) {
      conditions.push(eq(modelProfiles.eliteStatus, true));
    }

    // Sorting
    const orderFunc = filters?.order === 'asc' ? asc : desc;
    let orderByColumn;
    switch (filters?.orderBy) {
      case 'rating':
        orderByColumn = modelProfiles.ratingReliability;
        break;
      case 'createdAt':
        orderByColumn = modelProfiles.createdAt;
        break;
      case 'displayName':
      default:
        orderByColumn = modelProfiles.displayName;
    }

    // Build query with all parameters at once
    const query = this.db.select().from(modelProfiles);

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle dynamic where
      query.where(and(...conditions));
    }

    // @ts-ignore - Drizzle orderBy
    query.orderBy(orderFunc(orderByColumn));
    // @ts-ignore - Drizzle limit/offset
    query.limit(filters?.limit || 50);
    // @ts-ignore
    query.offset(filters?.offset || 0);

    // @ts-ignore
    return await query;
  }

  /**
   * Обновить профиль модели
   */
  async updateProfile(id: string, updates: Partial<NewModelProfile>): Promise<ModelProfile> {
    const updated = await this.db.update(modelProfiles).set(updates).where(eq(modelProfiles.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    return updated[0];
  }

  /**
   * Обновить статус доступности
   */
  async updateAvailability(userId: string, status: 'offline' | 'online' | 'in_shift' | 'busy'): Promise<ModelProfile> {
    const profile = await this.findByUserId(userId);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const updated = await this.db.update(modelProfiles)
      .set({
        availabilityStatus: status,
        nextAvailableAt: status === 'offline' ? new Date(Date.now() + 3600000) : null,
      })
      .where(eq(modelProfiles.userId, userId))
      .returning();

    return updated[0];
  }

  /**
   * Установить главное фото модели
   */
  async setMainPhoto(modelId: string, photoUrl: string): Promise<ModelProfile> {
    const profile = await this.findById(modelId);

    if (!profile) {
      throw new NotFoundException('Model profile not found');
    }

    const updated = await this.db.update(modelProfiles)
      .set({ mainPhotoUrl: photoUrl })
      .where(eq(modelProfiles.id, modelId))
      .returning();

    return updated[0];
  }

  /**
   * Удалить профиль
   */
  async deleteProfile(id: string): Promise<void> {
    await this.db.delete(modelProfiles).where(eq(modelProfiles.id, id));
  }

  /**
   * Получить статистику по всем моделям
   */
  async getStats(): Promise<{
    total: number;
    online: number;
    verified: number;
    elite: number;
  }> {
    const all = await this.db.select().from(modelProfiles);
    
    return {
      total: all.length,
      online: all.filter((m: ModelProfile) => m.availabilityStatus === 'online').length,
      verified: all.filter((m: ModelProfile) => m.verificationStatus === 'verified').length,
      elite: all.filter((m: ModelProfile) => m.eliteStatus === true).length,
    };
  }
}
