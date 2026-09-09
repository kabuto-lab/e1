/**
 * Единая очередь модерации: анкеты (верификация), медиа, отзывы.
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, desc, inArray } from 'drizzle-orm';
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

  /** admin/moderator — видят и модерируют всё (глобальная роль, не привязана к managerId); manager — только свои анкеты. */
  private async resolveModerationScope(role: string, userId: string): Promise<{ scopeAll: boolean; managerId: string | null }> {
    if (role === 'admin' || role === 'moderator') return { scopeAll: true, managerId: null };
    if (role === 'manager') return { scopeAll: false, managerId: userId };
    throw new ForbiddenException('Insufficient permissions');
  }

  private async assertCanModerateModel(role: string, userId: string, model: { managerId: string | null }): Promise<void> {
    const scope = await this.resolveModerationScope(role, userId);
    if (scope.scopeAll) return;
    if (model.managerId != null && model.managerId !== scope.managerId) {
      throw new ForbiddenException('Not your model');
    }
  }

  async getQueue(role: string, userId: string) {
    const statusList = [...PROFILE_VERIFICATION_QUEUE];
    const scope = await this.resolveModerationScope(role, userId);

    const profileWhere = scope.scopeAll
      ? inArray(modelProfiles.verificationStatus, statusList)
      : and(
          inArray(modelProfiles.verificationStatus, statusList),
          eq(modelProfiles.managerId, scope.managerId as string),
        );

    const candidateProfiles = await this.db
      .select()
      .from(modelProfiles)
      .where(profileWhere)
      .orderBy(desc(modelProfiles.createdAt))
      .limit(100);

    // Самостоятельно зарегистрировавшаяся модель (без менеджера) не должна попадать
    // модератору без загруженных верификационного фото (albumCategory='verified') и
    // видео (albumCategory='verification_video') — иначе на проверку уходят пустые
    // профили сразу после регистрации. Анкеты, заведённые менеджером (managerId есть),
    // этому требованию не подчиняются — менеджер уже подтверждает анкету своим действием,
    // попадают в очередь как раньше.
    const unmanagedCandidateIds = candidateProfiles
      .filter((p: { managerId: string | null }) => !p.managerId)
      .map((p: { id: string }) => p.id);
    const verificationMedia = unmanagedCandidateIds.length > 0
      ? await this.db
          .select({ modelId: mediaFiles.modelId, albumCategory: mediaFiles.albumCategory })
          .from(mediaFiles)
          .where(
            and(
              inArray(mediaFiles.modelId, unmanagedCandidateIds),
              inArray(mediaFiles.albumCategory, ['verified', 'verification_video']),
            ),
          )
      : [];
    const modelsWithPhoto = new Set(
      verificationMedia.filter((m: { albumCategory: string | null }) => m.albumCategory === 'verified').map((m: { modelId: string | null }) => m.modelId),
    );
    const modelsWithVideo = new Set(
      verificationMedia
        .filter((m: { albumCategory: string | null }) => m.albumCategory === 'verification_video')
        .map((m: { modelId: string | null }) => m.modelId),
    );
    const profiles = candidateProfiles.filter(
      (p: { id: string; managerId: string | null }) =>
        !!p.managerId || (modelsWithPhoto.has(p.id) && modelsWithVideo.has(p.id)),
    );

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
        albumCategory: mediaFiles.albumCategory,
        displayName: modelProfiles.displayName,
        slug: modelProfiles.slug,
        managerId: modelProfiles.managerId,
      })
      .from(mediaFiles)
      .leftJoin(modelProfiles, eq(mediaFiles.modelId, modelProfiles.id))
      .where(eq(mediaFiles.moderationStatus, 'pending'))
      .orderBy(desc(mediaFiles.createdAt))
      .limit(200);

    const media = scope.scopeAll
      ? mediaRows
      : mediaRows.filter((row: { managerId: string | null }) => row.managerId === scope.managerId);

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

    const reviewItems = scope.scopeAll
      ? reviewRows
      : reviewRows.filter((row: { managerId: string | null }) => row.managerId === scope.managerId);

    const disputedRows = await this.db
      .select({
        id: reviews.id,
        modelId: reviews.modelId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        complaintReason: reviews.complaintReason,
        complaintComment: reviews.complaintComment,
        complaintCreatedAt: reviews.complaintCreatedAt,
        modelName: modelProfiles.displayName,
        slug: modelProfiles.slug,
        managerId: modelProfiles.managerId,
      })
      .from(reviews)
      .innerJoin(modelProfiles, eq(reviews.modelId, modelProfiles.id))
      .where(eq(reviews.complaintStatus, 'open'))
      .orderBy(desc(reviews.complaintCreatedAt))
      .limit(150);

    const disputedReviews = scope.scopeAll
      ? disputedRows
      : disputedRows.filter((row: { managerId: string | null }) => row.managerId === scope.managerId);

    return { profiles, media, reviews: reviewItems, disputedReviews };
  }

  async setProfileVerification(
    profileId: string,
    verificationStatus: 'verified' | 'rejected',
    role: string,
    userId: string,
  ) {
    const mp = await this.modelsService.findById(profileId);
    if (!mp) throw new NotFoundException('Profile not found');
    await this.assertCanModerateModel(role, userId, mp);

    if (verificationStatus === 'verified' && !mp.managerId) {
      const media = await this.db
        .select({ albumCategory: mediaFiles.albumCategory })
        .from(mediaFiles)
        .where(
          and(
            eq(mediaFiles.modelId, profileId),
            inArray(mediaFiles.albumCategory, ['verified', 'verification_video']),
          ),
        );
      const hasPhoto = media.some((m: { albumCategory: string | null }) => m.albumCategory === 'verified');
      const hasVideo = media.some((m: { albumCategory: string | null }) => m.albumCategory === 'verification_video');
      if (!hasPhoto || !hasVideo) {
        throw new BadRequestException('Нельзя верифицировать анкету без верификационного фото и видео');
      }
    }

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
    await this.assertCanModerateModel(role, userId, mp);
    return this.reviewsService.update(reviewId, {
      moderationStatus,
      moderationReason: moderationReason?.trim() || null,
      updatedAt: new Date(),
      isPublic: moderationStatus === 'approved',
    });
  }

  async resolveReviewComplaint(
    reviewId: string,
    resolution: 'dismissed' | 'redacted' | 'deleted',
    redactedComment: string | undefined,
    role: string,
    userId: string,
  ) {
    const rev = await this.reviewsService.findById(reviewId);
    if (!rev) throw new NotFoundException('Review not found');
    const mp = await this.modelsService.findById(rev.modelId);
    if (!mp) throw new NotFoundException('Model not found');
    await this.assertCanModerateModel(role, userId, mp);
    return this.reviewsService.resolveComplaint(reviewId, resolution, redactedComment, userId);
  }
}
