import { pgTable, uuid, varchar, decimal, jsonb, boolean, timestamp, index, uniqueIndex, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Мастера массажного режима — отдельная сущность от model_profiles (эскорт-каталог).
 * Данные не смешиваются: это самостоятельный набор контента для второго режима сайта.
 */
export const massageMasters = pgTable(
  'massage_masters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),

    priceFrom: decimal('price_from', { precision: 10, scale: 2 }),

    mainPhotoUrl: varchar('main_photo_url', { length: 500 }),
    photoUrls: jsonb('photo_urls').$type<string[]>(),

    availabilityStatus: varchar('availability_status', { length: 20 })
      .$type<'available' | 'busy' | 'unavailable'>()
      .default('available')
      .notNull(),

    /** Замена бейджа «Премиум» из эскорт-режима — «Популярный мастер» */
    isPopular: boolean('is_popular').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('massage_master_slug_unique').on(table.slug),
    publishedIdx: index('massage_master_published_idx').on(table.isPublished),
  }),
);

export const massageMastersRelations = relations(massageMasters, ({ many }) => ({
  programs: many(massageServicePrograms),
  bookings: many(massageBookings),
}));

export type MassageMaster = typeof massageMasters.$inferSelect;
export type NewMassageMaster = typeof massageMasters.$inferInsert;

import { massageServicePrograms } from './massage-service-programs';
import { massageBookings } from './massage-bookings';
