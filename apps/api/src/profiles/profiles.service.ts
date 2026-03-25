/**
 * Profiles Service - Business logic for model profiles
 * Handles CRUD operations, media management, and publication
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, desc, like, or } from 'drizzle-orm';
import {
  modelProfiles,
  mediaFiles,
  type ModelProfile,
  type NewModelProfile,
  type MediaFile,
} from '@escort/db';
import { MinioService } from './minio.service';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly minioService: MinioService,
  ) {}

  // ============================================
  // PROFILE CRUD
  // ============================================

  /**
   * Create a new model profile
   */
  async createProfile(
    userId: string | null,
    data: {
      displayName: string;
      slug?: string;
      biography?: string;
      physicalAttributes?: any;
      languages?: string[];
      psychotypeTags?: string[];
      rateHourly?: number;
      rateOvernight?: number;
    },
  ): Promise<ModelProfile> {
    // For demo, skip duplicate check - allow multiple profiles
    // In production, you might want to check if user already has a profile
    // const existing = userId ? await this.findByUserId(userId) : null;
    // if (existing) {
    //   throw new ConflictException('Profile already exists for this user');
    // }

    // Check slug uniqueness if provided
    if (data.slug) {
      const existingSlug = await this.findBySlug(data.slug);
      if (existingSlug) {
        throw new ConflictException('This slug is already taken');
      }
    }

    // Generate slug from displayName if not provided
    const slug = data.slug || this.generateSlug(data.displayName);

    const newProfile = await this.db
      .insert(modelProfiles)
      .values({
        userId,
        displayName: data.displayName,
        slug,
        biography: data.biography,
        physicalAttributes: data.physicalAttributes,
        languages: data.languages,
        psychotypeTags: data.psychotypeTags,
        rateHourly: data.rateHourly?.toString(),
        rateOvernight: data.rateOvernight?.toString(),
        verificationStatus: 'pending',
        isPublished: false,
      })
      .returning();

    return newProfile[0];
  }

  /**
   * Find profile by user ID
   */
  async findByUserId(userId: string): Promise<ModelProfile | null> {
    const found = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.userId, userId))
      .limit(1);
    return found[0] || null;
  }

  /**
   * Find profile by ID
   */
  async findById(id: string): Promise<ModelProfile | null> {
    const found = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, id))
      .limit(1);
    return found[0] || null;
  }

  /**
   * Find profile by slug (public endpoint)
   */
  async findBySlug(slug: string): Promise<ModelProfile | null> {
    const found = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.slug, slug))
      .limit(1);
    return found[0] || null;
  }

  /**
   * Get published catalog with filters
   */
  async getCatalog(filters?: {
    availabilityStatus?: string;
    eliteStatus?: boolean;
    minAge?: number;
    maxAge?: number;
    location?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'rating' | 'createdAt' | 'displayName';
    order?: 'asc' | 'desc';
    includeUnpublished?: boolean; // NEW: for admin users
  }): Promise<ModelProfile[]> {
    const conditions: any[] = [];

    // Only filter by isPublished if includeUnpublished is not true
    if (!filters?.includeUnpublished) {
      conditions.push(eq(modelProfiles.isPublished, true));
    }

    if (filters?.availabilityStatus) {
      conditions.push(eq(modelProfiles.availabilityStatus, filters.availabilityStatus as any));
    }

    if (filters?.eliteStatus === true) {
      conditions.push(eq(modelProfiles.eliteStatus, true));
    }

    const query = this.db.select().from(modelProfiles);

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle dynamic where
      query.where(and(...conditions));
    }

    // Sorting
    const orderFunc = filters?.order === 'asc' ? desc : desc;
    let orderByColumn;
    switch (filters?.orderBy) {
      case 'rating':
        orderByColumn = modelProfiles.ratingReliability;
        break;
      case 'createdAt':
        orderByColumn = modelProfiles.createdAt;
        break;
      default:
        orderByColumn = modelProfiles.displayName;
    }

    // @ts-ignore
    query.orderBy(orderFunc(orderByColumn));
    // @ts-ignore
    query.limit(filters?.limit || 50);
    // @ts-ignore
    query.offset(filters?.offset || 0);

    // @ts-ignore
    return await query;
  }

  /**
   * Update profile
   */
  async updateProfile(
    id: string,
    updates: Partial<NewModelProfile>,
  ): Promise<ModelProfile> {
    const updated = await this.db
      .update(modelProfiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(modelProfiles.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    return updated[0];
  }

  /**
   * Publish/unpublish profile
   */
  async togglePublication(id: string, isPublished: boolean): Promise<ModelProfile> {
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Validate before publishing
    if (isPublished) {
      // TEMPORARILY DISABLED: Allow publishing without photo for testing
      // if (!profile.mainPhotoUrl) {
      //   throw new BadRequestException('Profile must have a main photo before publishing');
      // }
      if (!profile.displayName) {
        throw new BadRequestException('Profile must have a display name');
      }
    }

    return this.updateProfile(id, {
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    });
  }

  /**
   * Delete profile
   */
  async deleteProfile(id: string): Promise<void> {
    await this.db.delete(modelProfiles).where(eq(modelProfiles.id, id));
  }

  // ============================================
  // MEDIA MANAGEMENT
  // ============================================

  /**
   * Generate presigned URL for media upload
   */
  async generatePresignedUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    modelId?: string,
  ): Promise<{
    uploadUrl: string;
    storageKey: string;
    cdnUrl: string;
    mediaId: string;
  }> {
    // Generate MinIO presigned URL
    const { uploadUrl, storageKey, cdnUrl } = await this.minioService.generateUploadUrl(
      fileName,
      mimeType,
      fileSize,
    );

    // Create media record in database
    const newMedia = await this.db
      .insert(mediaFiles)
      .values({
        ownerId: userId,
        modelId,
        fileType: mimeType.startsWith('image/') ? 'photo' : 'video',
        mimeType,
        fileSize,
        storageKey,
        cdnUrl,
        presignedUrl: uploadUrl,
        presignedExpiresAt: new Date(Date.now() + 3600 * 1000),
        moderationStatus: 'pending',
      })
      .returning();

    return {
      uploadUrl,
      storageKey,
      cdnUrl,
      mediaId: newMedia[0].id,
    };
  }

  /**
   * Confirm media upload after client uploads to MinIO
   */
  async confirmUpload(
    mediaId: string,
    data: {
      cdnUrl?: string;
      metadata?: any;
      modelId?: string;
    },
  ): Promise<MediaFile> {
    const updated = await this.db
      .update(mediaFiles)
      .set({
        cdnUrl: data.cdnUrl,
        modelId: data.modelId,
        metadata: data.metadata,
        presignedUrl: null, // Clear presigned URL after upload
        updatedAt: new Date(),
      })
      .where(eq(mediaFiles.id, mediaId))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Media not found');
    }

    return updated[0];
  }

  /**
   * Get profile media files
   */
  async getProfileMedia(modelId: string): Promise<MediaFile[]> {
    return this.db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.modelId, modelId))
      .orderBy(desc(mediaFiles.createdAt));
  }

  /**
   * Set main photo for profile
   */
  async setMainPhoto(modelId: string, mediaId: string): Promise<ModelProfile> {
    const media = await this.db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, mediaId))
      .limit(1);

    if (!media || media.length === 0) {
      throw new NotFoundException('Media not found');
    }

    return this.updateProfile(modelId, {
      mainPhotoUrl: media[0].cdnUrl,
    });
  }

  /**
   * Approve media (moderation)
   */
  async approveMedia(mediaId: string, moderatedBy: string): Promise<MediaFile> {
    return this.updateMedia(mediaId, {
      moderationStatus: 'approved',
      isVerified: true,
      moderatedBy,
      moderatedAt: new Date(),
    });
  }

  /**
   * Reject media (moderation)
   */
  async rejectMedia(
    mediaId: string,
    reason: string,
    moderatedBy: string,
  ): Promise<MediaFile> {
    return this.updateMedia(mediaId, {
      moderationStatus: 'rejected',
      moderationReason: reason,
      moderatedBy,
      moderatedAt: new Date(),
    });
  }

  /**
   * Update media
   */
  async updateMedia(mediaId: string, updates: any): Promise<MediaFile> {
    const updated = await this.db
      .update(mediaFiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(mediaFiles.id, mediaId))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Media not found');
    }

    return updated[0];
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string): Promise<void> {
    const media = await this.db
      .select()
      .from(mediaFiles)
      .where(eq(mediaFiles.id, mediaId))
      .limit(1);

    if (media && media.length > 0) {
      // Delete from MinIO
      await this.minioService.deleteFile(media[0].storageKey);
      // Delete from database
      await this.db.delete(mediaFiles).where(eq(mediaFiles.id, mediaId));
    }
  }

  // ============================================
  // STATS
  // ============================================

  /**
   * Get profiles statistics
   */
  async getStats(): Promise<{
    total: number;
    published: number;
    verified: number;
    elite: number;
    online: number;
  }> {
    const all = await this.db.select().from(modelProfiles);

    return {
      total: all.length,
      published: all.filter((m: ModelProfile) => m.isPublished).length,
      verified: all.filter((m: ModelProfile) => m.verificationStatus === 'verified').length,
      elite: all.filter((m: ModelProfile) => m.eliteStatus).length,
      online: all.filter((m: ModelProfile) => m.availabilityStatus === 'online').length,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Generate URL-friendly slug from display name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}
