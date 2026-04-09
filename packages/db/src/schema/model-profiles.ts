/**
 * Model Profiles - профили моделей с верификацией и рейтингом
 * Updated for MVP: Create Model Card functionality
 */

import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean, timestamp, index, uniqueIndex, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const modelProfiles = pgTable(
  'model_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Аккаунт модели; NULL — анкета создана менеджером до привязки пользователя */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    managerId: uuid('manager_id').references(() => users.id),

    // Basic info
    displayName: varchar('display_name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique(),
    biography: text('biography'), // Short bio/description

    // Verification
    verificationStatus: varchar('verification_status', { length: 30 })
      .$type<'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected'>()
      .default('pending'),
    verificationCompletedAt: timestamp('verification_completed_at'),
    lastVideoVerification: timestamp('last_video_verification'),
    eliteStatus: boolean('elite_status').default(false),

    // Pricing
    rateHourly: decimal('rate_hourly', { precision: 10, scale: 2 }),
    rateOvernight: decimal('rate_overnight', { precision: 10, scale: 2 }),

    // Availability
    availabilityStatus: varchar('availability_status', { length: 30 })
      .$type<'offline' | 'online' | 'in_shift' | 'busy'>()
      .default('offline'),
    nextAvailableAt: timestamp('next_available_at'),

    // Attributes (JSONB for flexibility)
    psychotypeTags: jsonb('psychotype_tags').$type<string[]>(),
    languages: jsonb('languages').$type<string[]>(),

    physicalAttributes: jsonb('physical_attributes').$type<{
      age?: number;
      height?: number;
      weight?: number;
      bustSize?: number;
      bustType?: 'natural' | 'silicone';
      bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
      temperament?: 'gentle' | 'active' | 'adaptable';
      sexuality?: 'active' | 'passive' | 'universal';
      hairColor?: string;
      eyeColor?: string;
    }>(),

    // Stats
    ratingReliability: decimal('rating_reliability', { precision: 3, scale: 2 }).default('0.00'),
    totalMeetings: integer('total_meetings').default(0),
    totalCancellations: integer('total_cancellations').default(0),
    cancellationsLast3Months: integer('cancellations_last_3_months').default(0),

    // Media
    photoCount: integer('photo_count').default(0),
    videoWalkthroughUrl: varchar('video_walkthrough_url', { length: 500 }),
    videoVerificationUrl: varchar('video_verification_url', { length: 500 }),
    mainPhotoUrl: varchar('main_photo_url', { length: 500 }), // Primary photo for display

    /** Типографика оверлея главного слайда (публичная страница + мокап в редакторе) */
    heroSliderTypography: jsonb('hero_slider_typography').$type<{
      fontKey?: 'unbounded' | 'inter' | 'playfair' | 'space_grotesk' | 'system';
      textColor?: string;
      metaColor?: string;
    }>(),

    // Publication
    isPublished: boolean('is_published').default(false),
    publishedAt: timestamp('published_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('model_user_unique_nonnull')
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    managerIdx: index('model_manager_idx').on(table.managerId),
    slugIdx: uniqueIndex('model_slug_unique').on(table.slug),
    statusIdx: index('model_status_idx').on(table.availabilityStatus),
    eliteIdx: index('model_elite_idx').on(table.eliteStatus),
    verificationIdx: index('model_verification_idx').on(table.verificationStatus),
    publishedIdx: index('model_published_idx').on(table.isPublished),
  })
);

export const modelProfilesRelations = relations(modelProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [modelProfiles.userId],
    references: [users.id],
  }),
  manager: one(users, {
    fields: [modelProfiles.managerId],
    references: [users.id],
  }),
  bookings: many(bookings),
  reviews: many(reviews),
  mediaFiles: many(mediaFiles),
}));

// Type exports
export type ModelProfile = typeof modelProfiles.$inferSelect;
export type NewModelProfile = typeof modelProfiles.$inferInsert;

// Forward imports for relations
import { bookings } from './bookings';
import { reviews } from './reviews';
import { mediaFiles } from './media';
