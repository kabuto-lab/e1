/**
 * Escort Platform - Complete Database Schema
 * Drizzle ORM + PostgreSQL 16
 * 
 * Безопасность:
 * - UUID первичные ключи
 * - RLS политики на всех таблицах
 * - Шифрование чувствительных данных
 * - Аудит всех действий
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  decimal,
  boolean,
  text,
  bytea,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'manager',
  'model',
  'client',
]);

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'pending_verification',
  'blacklisted',
]);

export const vipTierEnum = pgEnum('vip_tier', [
  'standard',
  'silver',
  'gold',
  'platinum',
]);

export const psychotypeEnum = pgEnum('psychotype', [
  'dominant',
  'intellectual',
  'playful',
  'romantic',
  'adventurous',
  'light',
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'video_required',
  'document_required',
  'verified',
  'rejected',
]);

export const availabilityStatusEnum = pgEnum('availability_status', [
  'offline',
  'online',
  'in_shift',
  'busy',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'draft',
  'pending_payment',
  'escrow_funded',
  'confirmed',
  'in_progress',
  'completed',
  'disputed',
  'cancelled',
  'refunded',
]);

export const escrowStatusEnum = pgEnum('escrow_status', [
  'pending_funding',
  'funded',
  'hold_period',
  'released',
  'refunded',
  'disputed_hold',
  'partially_refunded',
]);

export const blacklistReasonEnum = pgEnum('blacklist_reason', [
  'fake_photos',
  'client_complaints',
  'fraud',
  'no_show',
  'video_fake',
  'non_payment',
  'rudeness',
  'pressure',
]);

export const fileTypeEnum = pgEnum('file_type', [
  'photo',
  'video',
  'document',
]);

// ============================================
// CORE TABLES
// ============================================

/**
 * Users - базовая таблица всех пользователей
 * - UUID первичный ключ
 * - Email хеширован (SHA-256)
 * - Phone токенизирован (не хранится в открытом виде)
 * - Soft delete (deletedAt)
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    emailHash: varchar('email_hash', { length: 64 }).notNull().unique(),
    phoneToken: varchar('phone_token', { length: 255 }), // Encrypted reference to Vault
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('client'),
    status: userStatusEnum('status').notNull().default('pending_verification'),
    clerkId: varchar('clerk_id', { length: 255 }).unique(), // Clerk auth reference
    lastLogin: timestamp('last_login'),
    deletedAt: timestamp('deleted_at'), // Soft delete
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('email_hash_idx').on(table.emailHash),
    roleIdx: index('role_idx').on(table.role),
    statusIdx: index('status_idx').on(table.status),
    clerkIdx: index('clerk_id_idx').on(table.clerkId),
  })
);

/**
 * Client Profiles - профили клиентов
 * - Психотипы для подбора
 * - VIP-статусы
 * - Чёрный список
 */
export const clientProfiles = pgTable(
  'client_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // Trust & loyalty
    trustScore: decimal('trust_score', { precision: 3, scale: 2 }).default('0.00'),
    vipTier: vipTierEnum('vip_tier').default('standard'),

    // Psychotype matching
    psychotype: psychotypeEnum('psychotype'),
    archetypes: jsonb('archetypes').$type<string[]>(),

    // Preferences (encrypted at application layer)
    preferences: jsonb('preferences').$type<{
      languages?: string[];
      ageRange?: [number, number];
      physicalTypes?: string[];
      temperament?: string;
    }>(),

    // Statistics
    totalBookings: integer('total_bookings').default(0),
    successfulMeetings: integer('successful_meetings').default(0),
    cancellationRate: decimal('cancellation_rate', { precision: 4, scale: 2 }).default('0.00'),

    // Blacklist
    blacklistStatus: varchar('blacklist_status', { length: 20 })
      .$type<'clear' | 'warning' | 'banned'>()
      .default('clear'),
    blacklistReason: text('blacklist_reason'), // Encrypted

    // Personal manager
    assignedManagerId: uuid('assigned_manager_id').references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex('client_user_unique').on(table.userId),
    managerIdx: index('client_manager_idx').on(table.assignedManagerId),
    vipIdx: index('client_vip_idx').on(table.vipTier),
  })
);

/**
 * Model Profiles - профили моделей
 * - Верификация (видео, документы)
 * - Рейтинг надёжности
 * - Физические параметры
 * - Статусы доступности
 */
export const modelProfiles = pgTable(
  'model_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    managerId: uuid('manager_id').references(() => users.id),

    // Public info
    displayName: varchar('display_name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique(), // SEO-friendly URL

    // Verification
    verificationStatus: verificationStatusEnum('verification_status').default('pending'),
    verificationCompletedAt: timestamp('verification_completed_at'),
    lastVideoVerification: timestamp('last_video_verification'),
    eliteStatus: boolean('elite_status').default(false),

    // Rates & availability
    rateHourly: decimal('rate_hourly', { precision: 10, scale: 2 }),
    rateOvernight: decimal('rate_overnight', { precision: 10, scale: 2 }),
    availabilityStatus: availabilityStatusEnum('availability_status').default('offline'),
    nextAvailableAt: timestamp('next_available_at'),

    // Psychotype & attributes
    psychotypeTags: jsonb('psychotype_tags').$type<string[]>(),
    languages: jsonb('languages').$type<string[]>(),

    // Physical attributes (JSON for flexibility)
    physicalAttributes: jsonb('physical_attributes').$type<{
      age?: number;
      height?: number; // cm
      weight?: number; // kg
      bustSize?: number; // 1-6
      bustType?: 'natural' | 'silicone';
      bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
      temperament?: 'gentle' | 'active' | 'adaptable';
      sexuality?: 'active' | 'passive' | 'universal';
    }>(),

    // Rating & statistics
    ratingReliability: decimal('rating_reliability', { precision: 3, scale: 2 }).default('0.00'),
    totalMeetings: integer('total_meetings').default(0),
    totalCancellations: integer('total_cancellations').default(0),
    cancellationsLast3Months: integer('cancellations_last_3_months').default(0),

    // Media (MinIO references)
    photoCount: integer('photo_count').default(0),
    videoWalkthroughUrl: varchar('video_walkthrough_url', { length: 500 }),
    videoVerificationUrl: varchar('video_verification_url', { length: 500 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex('model_user_unique').on(table.userId),
    managerIdx: index('model_manager_idx').on(table.managerId),
    slugIdx: uniqueIndex('model_slug_unique').on(table.slug),
    statusIdx: index('model_status_idx').on(table.availabilityStatus),
    eliteIdx: index('model_elite_idx').on(table.eliteStatus),
    verificationIdx: index('model_verification_idx').on(table.verificationStatus),
  })
);

/**
 * Bookings - бронирования с state machine
 * - Эскроу интеграция
 * - Аудит всех изменений
 * - Шифрование локации
 */
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Foreign keys
    clientId: uuid('client_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    modelId: uuid('model_id')
      .references(() => modelProfiles.id, { onDelete: 'restrict' })
      .notNull(),
    managerId: uuid('manager_id').references(() => users.id),

    // Escrow state machine
    status: bookingStatusEnum('status').default('draft'),

    // Booking details
    startTime: timestamp('start_time').notNull(),
    durationHours: integer('duration_hours').notNull(),
    locationType: varchar('location_type', { length: 20 }).$type<
      'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha'
    >(),
    locationEncrypted: bytea('location_encrypted'), // Encrypted address
    specialRequests: text('special_requests'), // Encrypted

    // Financials
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 12, scale: 2 }),
    modelPayout: decimal('model_payout', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('RUB'),

    // Cancellation
    cancellationReason: text('cancellation_reason'),
    cancelledBy: uuid('cancelled_by').references(() => users.id),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    confirmedAt: timestamp('confirmed_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => ({
    clientIdx: index('booking_client_idx').on(table.clientId),
    modelIdx: index('booking_model_idx').on(table.modelId),
    managerIdx: index('booking_manager_idx').on(table.managerId),
    statusIdx: index('booking_status_idx').on(table.status),
    startTimeIdx: index('booking_start_time_idx').on(table.startTime),
  })
);

/**
 * Escrow Transactions - финансовая state machine
 * - Холдирование средств
 * - Авто-выплата через 24ч
 * - Полная история состояний
 */
export const escrowTransactions = pgTable(
  'escrow_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    // Payment provider
    paymentProvider: varchar('payment_provider', { length: 30 }).$type<
      'yookassa' | 'cryptomus' | 'manual'
    >(),
    paymentProviderRef: varchar('payment_provider_ref', { length: 255 }),

    // Amounts
    amountHeld: decimal('amount_held', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('RUB'),

    // Escrow state machine
    status: escrowStatusEnum('status').default('pending_funding'),

    // Timing
    fundedAt: timestamp('funded_at'),
    holdUntil: timestamp('hold_until'), // Auto-release after 24h
    releasedAt: timestamp('released_at'),
    refundedAt: timestamp('refunded_at'),

    // Release trigger
    releaseTrigger: varchar('release_trigger', { length: 50 }).$type<
      'auto_after_hold'
      | 'manual_confirm'
      | 'dispute_resolution'
      | 'admin_override'
    >(),

    // State history (immutable audit log)
    stateHistory: jsonb('state_history').$type<
      Array<{
        fromStatus: string;
        toStatus: string;
        triggeredBy: string;
        timestamp: string;
        reason?: string;
      }>
    >(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('escrow_booking_idx').on(table.bookingId),
    statusIdx: index('escrow_status_idx').on(table.status),
    fundedAtIdx: index('escrow_funded_at_idx').on(table.fundedAt),
  })
);

/**
 * Reviews - отзывы и рейтинг
 * - Верифицированные встречи
 * - Модерация
 * - Публичные/приватные
 */
export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Foreign keys
    clientId: uuid('client_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    modelId: uuid('model_id')
      .references(() => modelProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),

    // Rating (1-5)
    rating: integer('rating').notNull(),

    // Review content
    comment: text('comment'),
    isPublic: boolean('is_public').default(false),
    isVerified: boolean('is_verified').default(false),

    // Admin moderation
    moderationStatus: varchar('moderation_status', { length: 20 }).$type<
      'pending' | 'approved' | 'rejected'
    >().default('pending'),
    moderationReason: text('moderation_reason'),

    // Helpfulness
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

/**
 * Blacklists - чёрные списки
 * - Модели и клиенты
 * - Публичные/приватные
 * - Статусы блокировки
 */
export const blacklists = pgTable(
  'blacklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Type: model or client
    entityType: varchar('entity_type', { length: 10 })
      .$type<'model' | 'client'>()
      .notNull(),
    entityId: uuid('entity_id').notNull(),

    // Blacklist reason
    reason: blacklistReasonEnum('reason').notNull(),
    description: text('description'), // Detailed reason (encrypted)

    // Status
    status: varchar('status', { length: 20 })
      .$type<'blocked' | 'under_review' | 'restored'>()
      .default('blocked'),

    // Admin actions
    blockedBy: uuid('blocked_by').references(() => users.id).notNull(),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    restoredBy: uuid('restored_by').references(() => users.id),

    // Timestamps
    blockedAt: timestamp('blocked_at').defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at'),
    restoredAt: timestamp('restored_at'),

    // Visibility
    isPublic: boolean('is_public').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index('blacklist_entity_idx').on(table.entityType, table.entityId),
    statusIdx: index('blacklist_status_idx').on(table.status),
    reasonIdx: index('blacklist_reason_idx').on(table.reason),
  })
);

/**
 * Media Files - файлы (фото, видео, документы)
 * - Ссылки на MinIO
 * - Верификация модератором
 * - CDN URL
 */
export const mediaFiles = pgTable(
  'media_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Owner
    ownerId: uuid('owner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    modelId: uuid('model_id').references(() => modelProfiles.id, {
      onDelete: 'cascade',
    }),

    // File info
    fileType: fileTypeEnum('file_type').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size'), // bytes

    // Storage (MinIO)
    storageKey: varchar('storage_key', { length: 500 }).notNull().unique(),
    cdnUrl: varchar('cdn_url', { length: 500 }),

    // Verification
    isVerified: boolean('is_verified').default(false),
    verificationDate: timestamp('verification_date'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      width?: number;
      height?: number;
      duration?: number;
      uploadedFrom?: string; // IP hash
    }>(),

    // Moderation
    moderationStatus: varchar('moderation_status', { length: 20 }).$type<
      'pending' | 'approved' | 'rejected'
    >().default('pending'),
    moderationReason: varchar('moderation_reason', { length: 500 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index('media_owner_idx').on(table.ownerId),
    modelIdx: index('media_model_idx').on(table.modelId),
    typeIdx: index('media_type_idx').on(table.fileType),
    verifiedIdx: index('media_verified_idx').on(table.isVerified),
  })
);

/**
 * Booking Audit Logs - неизменяемый аудит лог
 * - Все действия с бронированиями
 * - IP адреса и User-Agent
 * - Для безопасности и расследований
 */
export const bookingAuditLogs = pgTable(
  'booking_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookings.id, { onDelete: 'cascade' })
      .notNull(),

    // Action
    action: varchar('action', { length: 50 }).notNull(),
    actorId: uuid('actor_id').references(() => users.id),

    // Before/after state
    fromStatus: varchar('from_status', { length: 30 }),
    toStatus: varchar('to_status', { length: 30 }),
    metadata: jsonb('metadata'),

    // Security
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),

    // Immutable
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index('audit_booking_idx').on(table.bookingId),
    actorIdx: index('audit_actor_idx').on(table.actorId),
    actionIdx: index('audit_action_idx').on(table.action),
    createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
  })
);

/**
 * Sessions - сессии пользователей (если не используется Clerk)
 * - Refresh токены
 * - Истечение сессий
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // Tokens
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    accessTokenHash: varchar('access_token_hash', { length: 255 }),

    // Session info
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    expiresAt: timestamp('expires_at').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    userIdx: index('session_user_idx').on(table.userId),
    expiresIdx: index('session_expires_idx').on(table.expiresAt),
    tokenIdx: index('refresh_token_idx').on(table.refreshTokenHash),
  })
);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  clientProfile: one(clientProfiles),
  modelProfile: one(modelProfiles),
  bookingsAsClient: many(bookings, { relationName: 'client_bookings' }),
  bookingsAsManager: many(bookings, { relationName: 'manager_bookings' }),
  auditLogs: many(bookingAuditLogs),
  sessions: many(sessions),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id],
  }),
  manager: one(users, {
    fields: [clientProfiles.assignedManagerId],
    references: [users.id],
  }),
}));

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

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
    relationName: 'client_bookings',
  }),
  model: one(modelProfiles, {
    fields: [bookings.modelId],
    references: [modelProfiles.id],
  }),
  manager: one(users, {
    fields: [bookings.managerId],
    references: [users.id],
    relationName: 'manager_bookings',
  }),
  escrow: one(escrowTransactions),
  auditLogs: many(bookingAuditLogs),
}));

export const escrowTransactionsRelations = relations(escrowTransactions, ({ one }) => ({
  booking: one(bookings, {
    fields: [escrowTransactions.bookingId],
    references: [bookings.id],
  }),
}));

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

export const bookingAuditLogsRelations = relations(bookingAuditLogs, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingAuditLogs.bookingId],
    references: [bookings.id],
  }),
  actor: one(users, {
    fields: [bookingAuditLogs.actorId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ============================================
// TYPE EXPORTS (для использования в коде)
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;

export type ModelProfile = typeof modelProfiles.$inferSelect;
export type NewModelProfile = typeof modelProfiles.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type EscrowTransaction = typeof escrowTransactions.$inferSelect;
export type NewEscrowTransaction = typeof escrowTransactions.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type Blacklist = typeof blacklists.$inferSelect;
export type NewBlacklist = typeof blacklists.$inferInsert;

export type MediaFile = typeof mediaFiles.$inferSelect;
export type NewMediaFile = typeof mediaFiles.$inferInsert;

export type BookingAuditLog = typeof bookingAuditLogs.$inferSelect;
export type NewBookingAuditLog = typeof bookingAuditLogs.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
