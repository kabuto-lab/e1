/**
 * Reviews Service — отзывы, модерация, доступ по ролям и подписке
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc, and, getTableColumns } from 'drizzle-orm';
import {
  reviews,
  modelProfiles,
  bookings,
  users,
  type Review,
  type NewReview,
} from '@escort/db';

export type ModelReviewsResponse =
  | { accessMode: 'list'; reviews: Review[] }
  | { accessMode: 'summary'; averageRating: string; totalReviews: number };

@Injectable()
export class ReviewsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  async createReview(data: {
    bookingId: string;
    clientId: string;
    modelId: string;
    rating: number;
    comment?: string;
    characteristics?: string[];
    isAnonymous?: boolean;
  }): Promise<Review> {
    const existing = await this.findByBooking(data.bookingId);
    if (existing) {
      throw new ConflictException('Review already exists for this booking');
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new ConflictException('Rating must be between 1 and 5');
    }

    const [booking] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.clientId !== data.clientId) {
      throw new ForbiddenException('Not your booking');
    }
    if (booking.modelId !== data.modelId) {
      throw new BadRequestException('modelId does not match booking');
    }
    if (booking.status !== 'completed') {
      throw new ForbiddenException('Review allowed only after a completed meeting');
    }

    const newReview = await this.db.insert(reviews).values({
      bookingId: data.bookingId,
      clientId: data.clientId,
      modelId: data.modelId,
      rating: data.rating,
      comment: data.comment,
      characteristics: data.characteristics && data.characteristics.length > 0 ? data.characteristics : null,
      isPublic: !data.isAnonymous,
      // Отзыв всегда привязан к реальной завершённой сделке (проверено выше) — по определению подтверждён.
      isVerified: true,
      moderationStatus: 'pending',
    }).returning();

    return newReview[0];
  }

  /**
   * Черновик отзыва от staff — всегда на модерацию. Менеджер — только по своим моделям.
   */
  async createStaffReview(data: {
    authorUserId: string;
    authorRole: string;
    modelId: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    if (data.rating < 1 || data.rating > 5) {
      throw new ConflictException('Rating must be between 1 and 5');
    }

    const [mp] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, data.modelId))
      .limit(1);
    if (!mp) {
      throw new NotFoundException('Model not found');
    }
    if (data.authorRole === 'manager' && mp.managerId !== data.authorUserId) {
      throw new ForbiddenException('You can only add reviews for models you manage');
    }

    const row = await this.db
      .insert(reviews)
      .values({
        clientId: data.authorUserId,
        modelId: data.modelId,
        bookingId: null,
        rating: data.rating,
        comment: data.comment?.trim() || null,
        isPublic: true,
        isVerified: false,
        moderationStatus: 'pending',
      })
      .returning();

    return row[0];
  }

  async findById(id: string): Promise<Review | null> {
    const found = await this.db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return found[0] || null;
  }

  async findByBooking(bookingId: string): Promise<Review | null> {
    const found = await this.db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
    return found[0] || null;
  }

  /** Все отзывы, оставленные клиентом (для его личного кабинета) — с именем/слагом модели. */
  async findMyReviews(clientId: string): Promise<Array<Review & { modelName: string; modelSlug: string | null }>> {
    return this.db
      .select({
        ...getTableColumns(reviews),
        modelName: modelProfiles.displayName,
        modelSlug: modelProfiles.slug,
      })
      .from(reviews)
      .innerJoin(modelProfiles, eq(modelProfiles.id, reviews.modelId))
      .where(eq(reviews.clientId, clientId))
      .orderBy(desc(reviews.createdAt));
  }

  /** Все отзывы по модели (для кабинета модели/менеджера/админа) */
  async findByModelAllStatuses(modelId: string, limit = 20): Promise<Review[]> {
    return this.db
      .select()
      .from(reviews)
      .where(eq(reviews.modelId, modelId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  }

  async findApprovedByModel(modelId: string, limit: number): Promise<Review[]> {
    return this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.modelId, modelId), eq(reviews.moderationStatus, 'approved')))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  }

  /** "Александр К." из полного имени; без имени — обезличенно, логин наружу не показываем. */
  private maskClientName(fullName: string | null | undefined): string {
    const name = fullName?.trim();
    if (!name) return 'Клиент';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0]} ${parts[1][0]}.`;
    return parts[0];
  }

  /**
   * Публичная выдача для анкеты/каталога: только одобренные; текст отзыва — если is_public.
   * Без JWT (гостям тоже) — один round-trip: средняя оценка + количество + сам список.
   */
  async listPublicCatalogReviews(
    modelId: string,
    limit: number,
  ): Promise<{
    averageRating: string;
    totalReviews: number;
    reviews: Array<{
      id: string;
      rating: number;
      comment: string | null;
      characteristics: string[];
      isVerified: boolean;
      createdAt: Date;
      clientLabel: string;
    }>;
  }> {
    const [mp] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, modelId))
      .limit(1);
    if (!mp) {
      throw new NotFoundException('Model not found');
    }

    const cap = Math.min(Math.max(limit, 1), 40);
    const summary = await this.getApprovedSummary(modelId);

    const rows = await this.db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        isPublic: reviews.isPublic,
        isVerified: reviews.isVerified,
        characteristics: reviews.characteristics,
        createdAt: reviews.createdAt,
        clientFullName: users.fullName,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.clientId))
      .where(and(eq(reviews.modelId, modelId), eq(reviews.moderationStatus, 'approved')))
      .orderBy(desc(reviews.createdAt))
      .limit(cap);

    return {
      averageRating: summary.averageRating,
      totalReviews: summary.totalReviews,
      reviews: rows.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.isPublic ? (r.comment?.trim() || null) : null,
        characteristics: r.characteristics ?? [],
        isVerified: !!r.isVerified,
        createdAt: r.createdAt,
        clientLabel: this.maskClientName(r.clientFullName),
      })),
    };
  }

  async getApprovedSummary(modelId: string): Promise<{ averageRating: string; totalReviews: number }> {
    const list = await this.findApprovedByModel(modelId, 5000);
    if (list.length === 0) {
      return { averageRating: '0.00', totalReviews: 0 };
    }
    const sum = list.reduce((acc: number, r: Review) => acc + (r.rating || 0), 0);
    return {
      averageRating: (sum / list.length).toFixed(2),
      totalReviews: list.length,
    };
  }

  /**
   * Просмотр отзывов на анкете: гость не допускается (только JWT).
   * Клиент: по уровню подписки. Модель/менеджер — только свои. Админ — всё.
   */
  async getReviewsForViewer(
    modelId: string,
    limit: number,
    userId: string,
    role: string,
  ): Promise<ModelReviewsResponse> {
    const [mp] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.id, modelId))
      .limit(1);
    if (!mp) {
      throw new NotFoundException('Model not found');
    }

    const cap = Math.min(Math.max(limit, 1), 500);

    if (role === 'admin') {
      return { accessMode: 'list', reviews: await this.findByModelAllStatuses(modelId, cap) };
    }
    if (role === 'manager') {
      // Назначенный менеджер — только свои анкеты; без manager_id — любой менеджер (дашборд / черновики).
      if (mp.managerId != null && mp.managerId !== userId) {
        throw new ForbiddenException('Reviews visible only for models you published');
      }
      return { accessMode: 'list', reviews: await this.findByModelAllStatuses(modelId, cap) };
    }
    if (role === 'model') {
      if (mp.userId !== userId) {
        throw new ForbiddenException('You can only view reviews on your own profile');
      }
      return { accessMode: 'list', reviews: await this.findByModelAllStatuses(modelId, cap) };
    }
    if (role === 'client') {
      const [u] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
      const tier = (u?.subscriptionTier as string) || 'none';
      if (tier === 'none') {
        throw new ForbiddenException('Subscription required to view reviews');
      }
      if (tier === 'basic') {
        return { accessMode: 'summary', ...(await this.getApprovedSummary(modelId)) };
      }
      if (tier === 'standard') {
        return {
          accessMode: 'list',
          reviews: await this.findApprovedByModel(modelId, Math.min(cap, 10)),
        };
      }
      if (tier === 'premium') {
        return {
          accessMode: 'list',
          reviews: await this.findApprovedByModel(modelId, Math.min(cap, 200)),
        };
      }
      throw new ForbiddenException('Subscription required to view reviews');
    }

    throw new ForbiddenException('Cannot view reviews');
  }

  /** Рейтинг по одобренным отзывам; доступ те же правила, что и у просмотра (basic+). */
  async getModelRatingForViewer(modelId: string, userId: string, role: string): Promise<{
    averageRating: string;
    totalReviews: number;
  }> {
    const res = await this.getReviewsForViewer(modelId, 1, userId, role);
    if (res.accessMode === 'summary') {
      return { averageRating: res.averageRating, totalReviews: res.totalReviews };
    }
    return this.getApprovedSummary(modelId);
  }

  /** @deprecated Используйте getApprovedSummary или getModelRatingForViewer */
  async getModelRating(modelId: string): Promise<{ averageRating: string; totalReviews: number }> {
    return this.getApprovedSummary(modelId);
  }

  async update(id: string, updates: Partial<NewReview>): Promise<Review> {
    const updated = await this.db.update(reviews).set(updates).where(eq(reviews.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Review not found');
    }

    return updated[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(reviews).where(eq(reviews.id, id));
  }

  /** Модель подаёт жалобу на отзыв о себе. */
  async fileComplaint(reviewId: string, modelUserId: string, reason: string, comment?: string): Promise<Review> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const [profile] = await this.db
      .select()
      .from(modelProfiles)
      .where(eq(modelProfiles.userId, modelUserId))
      .limit(1);
    if (!profile) {
      throw new NotFoundException('Model profile not found');
    }
    if (review.modelId !== profile.id) {
      throw new ForbiddenException('Not your review');
    }
    if (review.complaintStatus !== 'none') {
      throw new ConflictException('Complaint already filed for this review');
    }

    return this.update(reviewId, {
      complaintStatus: 'open',
      complaintReason: reason,
      complaintComment: comment?.trim() || null,
      complaintCreatedAt: new Date(),
    });
  }

  /** Модератор разрешает жалобу — оставить без изменений / скрыть текст / удалить отзыв. */
  async resolveComplaint(
    reviewId: string,
    resolution: 'dismissed' | 'redacted' | 'deleted',
    redactedComment: string | undefined,
    moderatorUserId: string,
  ): Promise<Review | null> {
    const review = await this.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.complaintStatus !== 'open') {
      throw new ConflictException('No open complaint for this review');
    }

    const base = {
      complaintStatus: 'resolved' as const,
      complaintResolution: resolution,
      complaintResolvedAt: new Date(),
      complaintResolvedBy: moderatorUserId,
    };

    if (resolution === 'redacted') {
      await this.update(reviewId, { ...base, comment: redactedComment?.trim() || review.comment });
    } else {
      await this.update(reviewId, base);
    }

    if (resolution === 'deleted') {
      await this.delete(reviewId);
      return null;
    }

    return this.findById(reviewId);
  }

  async getStats(): Promise<{
    total: number;
    averageRating: string;
    byRating: Record<number, number>;
  }> {
    const all = await this.db.select().from(reviews);

    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    all.forEach((r: Review) => {
      const rating = r.rating || 0;
      byRating[rating] = (byRating[rating] || 0) + 1;
      sum += rating;
    });

    return {
      total: all.length,
      averageRating: all.length > 0 ? (sum / all.length).toFixed(2) : '0.00',
      byRating,
    };
  }
}
