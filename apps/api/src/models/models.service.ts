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
   * Создать профиль модели (legacy — displayName + slug only)
   */
  async createProfile(userId: string, displayName: string, slug?: string): Promise<ModelProfile> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Profile already exists for this user');
    }

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
   * Создать профиль модели со всеми полями
   */
  async createFullProfile(data: {
    displayName: string;
    slug?: string;
    biography?: string;
    physicalAttributes?: any;
    languages?: string[];
    psychotypeTags?: string[];
    rateHourly?: number;
    rateOvernight?: number;
    managerId?: string;
  }): Promise<ModelProfile> {
    if (data.slug) {
      const existingSlug = await this.findBySlug(data.slug);
      if (existingSlug) {
        throw new ConflictException('This slug is already taken');
      }
    }

    const slug = data.slug || this.generateSlug(data.displayName);

    const newProfiles = await this.db.insert(modelProfiles).values({
      displayName: data.displayName,
      slug,
      biography: data.biography,
      physicalAttributes: data.physicalAttributes,
      languages: data.languages,
      psychotypeTags: data.psychotypeTags,
      rateHourly: data.rateHourly?.toString(),
      rateOvernight: data.rateOvernight?.toString(),
      managerId: data.managerId,
      isPublished: true,
      availabilityStatus: 'online',
      verificationStatus: 'pending',
    }).returning();

    return newProfiles[0];
  }

  private generateSlug(name: string): string {
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ъ': '', 'ь': '',
    };
    const base = name.toLowerCase().split('').map(c => translitMap[c] || c).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
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
    managerId?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'rating' | 'createdAt' | 'displayName';
    order?: 'asc' | 'desc';
  }): Promise<ModelProfile[]> {
    const conditions: any[] = [];

    if (filters?.managerId) {
      conditions.push(eq(modelProfiles.managerId, filters.managerId));
    }

    if (filters?.availabilityStatus) {
      conditions.push(eq(modelProfiles.availabilityStatus, filters.availabilityStatus));
    }

    if (filters?.verificationStatus) {
      conditions.push(eq(modelProfiles.verificationStatus, filters.verificationStatus));
    }

    if (filters?.eliteStatus === true) {
      conditions.push(eq(modelProfiles.eliteStatus, true));
    }

    if (!filters?.managerId) {
      conditions.push(eq(modelProfiles.isPublished, true));
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

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    let qb = this.db.select().from(modelProfiles);

    if (conditions.length > 0) {
      qb = qb.where(and(...conditions));
    }

    return await qb
      .orderBy(orderFunc(orderByColumn))
      .limit(limit)
      .offset(offset);
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
