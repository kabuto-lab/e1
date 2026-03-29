/**
 * Единая очередь модерации: анкеты (верификация), медиа, отзывы.
 */

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, desc, inArray, or, isNull } from 'drizzle-orm';
import { modelProfiles, mediaFiles, reviews } from '@escort/db';
import { ModelsService } from '../models/models.service';
import { ReviewsService } from '../reviews/reviews.service';

const PROFILE_VERIFICATION_QUEUE = ['pending', 'video_required', 'document_required'] as const;

@Injectable()
export class ModerationService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
    private readonly modelsService: ModelsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  private assertCanModerateModel(role: string, userId: string, model: { managerId: string | null }) {
    if (role === 'admin') return;
    if (role !== 'manager') throw new ForbiddenException('Insufficient permissions');
    if (model.managerId != null && model.managerId !== userId) {
      throw new ForbiddenException('Not your model');
    }
  }

  async getQueue(role: string, userId: string) {
    const statusList = [...PROFILE_VERIFICATION_QUEUE];

    const profileWhere =
      role === 'admin'
        ? inArray(modelProfiles.verificationStatus, statusList)
        : and(
            inArray(modelProfiles.verificationStatus, statusList),
            or(eq(modelProfiles.managerId, userId), isNull(modelProfiles.managerId)),
          );

    const profiles = await this.db
      .select()
      .from(modelProfiles)
      .where(profileWhere)
      .orderBy(desc(modelProfiles.createdAt))
      .limit(100);

    const mediaRows = await this.db
      .select({
        id: mediaFiles.id,
        modelId: mediaFiles.modelId,
        cdnUrl: mediaFiles.cdnUrl,
        fileType: mediaFiles.fileType,
        mimeType: mediaFiles.mimeType,
        createdAt: mediaFiles.createdAt,
        moderationStatus: mediaFiles.moderationStatus,
        metadata: mediaFiles.metadata,
        displayName: modelProfiles.displayName,
        slug: modelProfiles.slug,
        managerId: modelProfiles.managerId,
      })
      .from(mediaFiles)
      .leftJoin(modelProfiles, eq(mediaFiles.modelId, modelProfiles.id))
      .where(eq(mediaFiles.moderationStatus, 'pending'))
      .orderBy(desc(mediaFiles.createdAt))
      .limit(200);

    const media =
      role === 'admin'
        ? mediaRows
        : mediaRows.filter(
            (row: { managerId: string | null }) => row.managerId == null || row.managerId === userId,
          );

    const reviewRows = await this.db
      .select({
        id: reviews.id,
        modelId: reviews.modelId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        moderationStatus: reviews.moderationStatus,
        modelName: modelProfiles.displayName,
        slug: modelProfiles.slug,
        managerId: modelProfiles.managerId,
      })
      .from(reviews)
      .innerJoin(modelProfiles, eq(reviews.modelId, modelProfiles.id))
      .where(eq(reviews.moderationStatus, 'pending'))
      .orderBy(desc(reviews.createdAt))
      .limit(150);

    const reviewItems =
      role === 'admin'
        ? reviewRows
        : reviewRows.filter(
            (row: { managerId: string | null }) => row.managerId == null || row.managerId === userId,
          );

    return { profiles, media, reviews: reviewItems };
  }

  async setProfileVerification(
    profileId: string,
    verificationStatus: 'verified' | 'rejected',
    role: string,
    userId: string,
  ) {
    const mp = await this.modelsService.findById(profileId);
    if (!mp) throw new NotFoundException('Profile not found');
    this.assertCanModerateModel(role, userId, mp);
    return this.modelsService.updateProfile(profileId, {
      verificationStatus,
      verificationCompletedAt: verificationStatus === 'verified' ? new Date() : null,
    });
  }

  async setReviewModeration(
    reviewId: string,
    moderationStatus: 'approved' | 'rejected',
    moderationReason: string | undefined,
    role: string,
    userId: string,
  ) {
    const rev = await this.reviewsService.findById(reviewId);
    if (!rev) throw new NotFoundException('Review not found');
    const mp = await this.modelsService.findById(rev.modelId);
    if (!mp) throw new NotFoundException('Model not found');
    this.assertCanModerateModel(role, userId, mp);
    return this.reviewsService.update(reviewId, {
      moderationStatus,
      moderationReason: moderationReason?.trim() || null,
      updatedAt: new Date(),
      isPublic: moderationStatus === 'approved',
    });
  }
}
