/**
 * Reviews Service - отзывы и рейтинги
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { reviews, type Review, type NewReview } from '@escort/db';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject('DRIZZLE') private readonly db: any,
  ) {}

  /**
   * Создать отзыв
   */
  async createReview(data: {
    bookingId: string;
    clientId: string;
    modelId: string;
    rating: number;
    comment?: string;
    isAnonymous?: boolean;
  }): Promise<Review> {
    // Check for existing review
    const existing = await this.findByBooking(data.bookingId);
    if (existing) {
      throw new ConflictException('Review already exists for this booking');
    }

    if (data.rating < 1 || data.rating > 5) {
      throw new ConflictException('Rating must be between 1 and 5');
    }

    const newReview = await this.db.insert(reviews).values({
      bookingId: data.bookingId,
      clientId: data.clientId,
      modelId: data.modelId,
      rating: data.rating,
      comment: data.comment,
      isAnonymous: data.isAnonymous || false,
      status: 'published',
    }).returning();

    return newReview[0];
  }

  /**
   * Найти отзыв по ID
   */
  async findById(id: string): Promise<Review | null> {
    const found = await this.db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return found[0] || null;
  }

  /**
   * Найти отзыв по booking ID
   */
  async findByBooking(bookingId: string): Promise<Review | null> {
    const found = await this.db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
    return found[0] || null;
  }

  /**
   * Получить отзывы модели
   */
  async findByModel(modelId: string, limit = 20): Promise<Review[]> {
    return this.db.select().from(reviews)
      .where(eq(reviews.modelId, modelId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  }

  /**
   * Получить среднюю оценку модели
   */
  async getModelRating(modelId: string): Promise<{
    averageRating: string;
    totalReviews: number;
  }> {
    const modelReviews = await this.findByModel(modelId, 1000);
    
    if (modelReviews.length === 0) {
      return { averageRating: '0.00', totalReviews: 0 };
    }

    const sum = modelReviews.reduce((acc: number, r: Review) => acc + (r.rating || 0), 0);
    const avg = sum / modelReviews.length;

    return {
      averageRating: avg.toFixed(2),
      totalReviews: modelReviews.length,
    };
  }

  /**
   * Обновить отзыв
   */
  async update(id: string, updates: Partial<NewReview>): Promise<Review> {
    const updated = await this.db.update(reviews).set(updates).where(eq(reviews.id, id)).returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundException('Review not found');
    }

    return updated[0];
  }

  /**
   * Удалить отзыв
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(reviews).where(eq(reviews.id, id));
  }

  /**
   * Получить статистику
   */
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
