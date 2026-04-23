/**
 * Media Files - файлы (фото, видео) - ссылки на MinIO
 * Updated for MVP: Presigned URL support + sortOrder
 */

import { pgTable, uuid, varchar, integer, timestamp, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const mediaFiles = pgTable(
  'media_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }),

    fileType: varchar('file_type', { length: 20 }).$type<'photo' | 'video' | 'document'>().notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size'),

    // Storage
    storageKey: varchar('storage_key', { length: 500 }).notNull().unique(), // MinIO object key
    bucket: varchar('bucket', { length: 100 }).default('escort-media'),
    cdnUrl: varchar('cdn_url', { length: 500 }),
    presignedUrl: varchar('presigned_url', { length: 1000 }), // Temporary upload URL
    presignedExpiresAt: timestamp('presigned_expires_at'),

    // Ordering
    sortOrder: integer('sort_order').default(0),

    // Visibility Control (for public profile display)
    isPublicVisible: boolean('is_public_visible').default(true), // Toggle show/hide on public profile
    albumCategory: varchar('album_category', { length: 50 }).default('portfolio'), // portfolio, vip, elite, verified

    // Verification
    isVerified: boolean('is_verified').default(false),
    verificationDate: timestamp('verification_date'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      width?: number;
      height?: number;
      duration?: number;
      uploadedFrom?: string; // IP or device info
      originalName?: string;
    }>(),

    // Moderation
    moderationStatus: varchar('moderation_status', { length: 20 }).$type<'pending' | 'approved' | 'rejected'>().default('pending'),
    moderationReason: varchar('moderation_reason', { length: 500 }),
    moderatedBy: uuid('moderated_by').references(() => users.id),
    moderatedAt: timestamp('moderated_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index('media_owner_idx').on(table.ownerId),
    modelIdx: index('media_model_idx').on(table.modelId),
    typeIdx: index('media_type_idx').on(table.fileType),
    verifiedIdx: index('media_verified_idx').on(table.isVerified),
    moderationIdx: index('media_moderation_idx').on(table.moderationStatus),
    storageKeyIdx: uniqueIndex('media_storage_key_unique').on(table.storageKey),
    profileVisibilityIdx: index('media_profile_visibility_idx').on(table.modelId, table.isPublicVisible),
  })
);

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  owner: one(users, {
    fields: [mediaFiles.ownerId],
    references: [users.id],
  }),
  model: one(modelProfiles, {
    fields: [mediaFiles.modelId],
    references: [modelProfiles.id],
  }),
}));

// Type exports
export type MediaFile = typeof mediaFiles.$inferSelect;
export type NewMediaFile = typeof mediaFiles.$inferInsert;
