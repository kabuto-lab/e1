/**
 * Reviews - отзывы и рейтинг
 */

import { pgTable, uuid, varchar, text, integer, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';
import { bookings } from './bookings';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    
    clientId: uuid('client_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }).notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull().unique(),
    
    rating: integer('rating').notNull(),
    comment: text('comment'),
    isPublic: boolean('is_public').default(false),
    isVerified: boolean('is_verified').default(false),
    
    moderationStatus: varchar('moderation_status', { length: 20 }).$type<'pending' | 'approved' | 'rejected'>().default('pending'),
    moderationReason: text('moderation_reason'),
    
    helpfulCount: integer('helpful_count').default(0),
    notHelpfulCount: integer('not_helpful_count').default(0),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    modelIdx: index('review_model_idx').on(table.modelId),
    clientIdx: index('review_client_idx').on(table.clientId),
    bookingIdx: uniqueIndex('review_booking_unique').on(table.bookingId),
    ratingIdx: index('review_rating_idx').on(table.rating),
  })
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
  }),
  model: one(modelProfiles, {
    fields: [reviews.modelId],
    references: [modelProfiles.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
}));

// Type exports
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
