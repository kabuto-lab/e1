/**
 * Media Service - управление медиафайлами
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { mediaFiles, type MediaFile, type NewMediaFile } from '@escort/db';

@Injectable()
export class MediaService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать запись о файле
   */
  async createFile(data: {
    ownerId: string;
    modelId?: string;
    fileType: 'photo' | 'video' | 'document';
    storageKey: string;
    cdnUrl?: string;
    mimeType: string;
    fileSize?: number;
    metadata?: any;
  }): Promise<MediaFile> {
    const newFile = await this.db.insert(mediaFiles).values({
      ownerId: data.ownerId,
      modelId: data.modelId,
      fileType: data.fileType,
      storageKey: data.storageKey,
      cdnUrl: data.cdnUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      metadata: data.metadata,
      moderationStatus: 'pending',
    }).returning();

    return newFile[0];
  }

  /**
   * Найти файл по ID
   */
  async findById(id: string): Promise<MediaFile | null> {
    const found = await this.db.select().from(mediaFiles).where(eq(mediaFiles.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Получить файлы владельца
   */
  async findByOwner(ownerId: string): Promise<MediaFile[]> {
    return this.db.select().from(mediaFiles)
      .where(eq(mediaFiles.ownerId, ownerId))
      .orderBy(desc(mediaFiles.createdAt));
  }

  /**
   * Получить публичные фото модели (одобренные и видимые)
   */
  async getModelPhotos(modelId: string): Promise<MediaFile[]> {
    const files = await this.db.select().from(mediaFiles)
      .where(eq(mediaFiles.modelId, modelId))
      .orderBy(mediaFiles.sortOrder, desc(mediaFiles.createdAt));

    return files.filter((f: MediaFile) =>
      f.fileType === 'photo' &&
      f.moderationStatus === 'approved' &&
      f.isPublicVisible !== false,
    );
  }

  /**
   * Обновить файл
   */
  async update(id: string, updates: Partial<NewMediaFile>): Promise<MediaFile> {
    const updated = await this.db.update(mediaFiles).set(updates).where(eq(mediaFiles.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('File not found');
    }

    return updated[0];
  }

  /**
   * Утвердить файл (модерация)
   */
  async approve(id: string): Promise<MediaFile> {
    return this.update(id, { moderationStatus: 'approved', isVerified: true, verificationDate: new Date() });
  }

  /**
   * Отклонить файл
   */
  async reject(id: string, reason: string): Promise<MediaFile> {
    return this.update(id, { moderationStatus: 'rejected', moderationReason: reason });
  }

  /**
   * Удалить файл
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(mediaFiles).where(eq(mediaFiles.id, id));
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    total: number;
    photos: number;
    videos: number;
    documents: number;
    totalSize: string;
  }> {
    const all = await this.db.select().from(mediaFiles);

    let photos = 0, videos = 0, documents = 0, totalSize = 0;

    all.forEach((f: MediaFile) => {
      if (f.fileType === 'photo') photos++;
      else if (f.fileType === 'video') videos++;
      else if (f.fileType === 'document') documents++;

      totalSize += f.fileSize || 0;
    });

    return {
      total: all.length,
      photos,
      videos,
      documents,
      totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
    };
  }

  /**
   * Обновить видимость файла
   */
  async updateVisibility(
    id: string,
    updates: {
      isPublicVisible?: boolean;
      albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';
      sortOrder?: number;
    },
  ): Promise<MediaFile> {
    return this.update(id, updates);
  }

  /**
   * Массовое обновление видимости
   */
  async bulkUpdateVisibility(
    mediaIds: string[],
    updates: {
      isPublicVisible?: boolean;
      albumCategory?: 'portfolio' | 'vip' | 'elite' | 'verified';
    },
    ownerId: string,
    isStaff = false,
  ): Promise<number> {
    let validIds: string[];

    if (isStaff) {
      validIds = mediaIds;
    } else {
      const files = await this.db.select().from(mediaFiles)
        .where(eq(mediaFiles.ownerId, ownerId));
      const ownedIds = new Set(files.map((f: MediaFile) => f.id));
      validIds = mediaIds.filter(id => ownedIds.has(id));
    }

    if (validIds.length === 0) return 0;

    for (const id of validIds) {
      await this.db.update(mediaFiles).set(updates).where(eq(mediaFiles.id, id));
    }

    return validIds.length;
  }

  /**
   * Получить файлы модели с видимостью
   */
  async getModelPhotosWithVisibility(modelId: string): Promise<MediaFile[]> {
    return this.db.select().from(mediaFiles)
      .where(eq(mediaFiles.modelId, modelId))
      .orderBy(mediaFiles.sortOrder, desc(mediaFiles.createdAt));
  }

  /**
   * Получить только публичные фото модели
   */
  async getModelPublicPhotos(modelId: string): Promise<MediaFile[]> {
    const files = await this.db.select().from(mediaFiles)
      .where(eq(mediaFiles.modelId, modelId))
      .orderBy(mediaFiles.sortOrder, desc(mediaFiles.createdAt));

    return files.filter((f: MediaFile) => 
      f.fileType === 'photo' && 
      f.moderationStatus === 'approved' &&
      f.isPublicVisible === true
    );
  }
}
