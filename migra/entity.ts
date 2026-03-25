/**
 * Escort Platform - Entity Index for Qwen Coder
 * 
 * Использование:
 * import { users, modelProfiles, bookings } from './entity';
 * 
 * Для генерации кода используйте:
 * npm run generate:entity -- --name=EntityName
 */

// ============================================
// DATABASE SCHEMA
// ============================================

/**
 * @entity users
 * @description Базовая таблица всех пользователей
 * @fields id, emailHash, phoneToken, passwordHash, role, status, clerkId, lastLogin, deletedAt, createdAt, updatedAt
 * @security RLS enabled, UUID primary key, email hashed
 */
export { users, type User, type NewUser } from './schema';

/**
 * @entity clientProfiles
 * @description Профили клиентов с психотипами и VIP-статусами
 * @fields id, userId, trustScore, vipTier, psychotype, archetypes, preferences, totalBookings, blacklistStatus, assignedManagerId
 * @security RLS enabled, preferences encrypted
 */
export { clientProfiles, type ClientProfile, type NewClientProfile } from './schema';

/**
 * @entity modelProfiles
 * @description Профили моделей с верификацией и рейтингом
 * @fields id, userId, managerId, displayName, slug, verificationStatus, eliteStatus, rateHourly, availabilityStatus, psychotypeTags, physicalAttributes, ratingReliability
 * @security RLS enabled, verification required for public view
 */
export { modelProfiles, type ModelProfile, type NewModelProfile } from './schema';

/**
 * @entity bookings
 * @description Бронирования с state machine эскроу
 * @fields id, clientId, modelId, managerId, status, startTime, durationHours, locationType, locationEncrypted, totalAmount, platformFee, modelPayout
 * @security RLS enabled, location encrypted, full audit log
 */
export { bookings, type Booking, type NewBooking } from './schema';

/**
 * @entity escrowTransactions
 * @description Финансовая state machine (холдирование, выплаты)
 * @fields id, bookingId, paymentProvider, amountHeld, status, fundedAt, holdUntil, releasedAt, stateHistory
 * @security RLS enabled, immutable state history
 */
export { escrowTransactions, type EscrowTransaction, type NewEscrowTransaction } from './schema';

/**
 * @entity reviews
 * @description Отзывы и рейтинг моделей
 * @fields id, clientId, modelId, bookingId, rating, comment, isPublic, isVerified, moderationStatus
 * @security RLS enabled, one review per booking
 */
export { reviews, type Review, type NewReview } from './schema';

/**
 * @entity blacklists
 * @description Чёрные списки моделей и клиентов
 * @fields id, entityType, entityId, reason, description, status, blockedBy, reviewedBy, restoredAt, isPublic
 * @security RLS enabled (admin only)
 */
export { blacklists, type Blacklist, type NewBlacklist } from './schema';

/**
 * @entity mediaFiles
 * @description Файлы (фото, видео) - ссылки на MinIO
 * @fields id, ownerId, modelId, fileType, mimeType, storageKey, cdnUrl, isVerified, moderationStatus
 * @security RLS enabled, moderated content
 */
export { mediaFiles, type MediaFile, type NewMediaFile } from './schema';

/**
 * @entity bookingAuditLogs
 * @description Неизменяемый аудит лог действий с бронированиями
 * @fields id, bookingId, action, actorId, fromStatus, toStatus, metadata, ipAddress, userAgent
 * @security RLS enabled (admin only), immutable
 */
export { bookingAuditLogs, type BookingAuditLog, type NewBookingAuditLog } from './schema';

/**
 * @entity sessions
 * @description Сессии пользователей (refresh токены)
 * @fields id, userId, refreshTokenHash, accessTokenHash, ipAddress, userAgent, expiresAt, revokedAt
 * @security RLS enabled, token hashed
 */
export { sessions, type Session, type NewSession } from './schema';

// ============================================
// RELATIONS
// ============================================

/**
 * @relations usersRelations
 * @relations clientProfilesRelations
 * @relations modelProfilesRelations
 * @relations bookingsRelations
 * @relations escrowTransactionsRelations
 * @relations reviewsRelations
 * @relations mediaFilesRelations
 * @relations bookingAuditLogsRelations
 * @relations sessionsRelations
 */
export {
  usersRelations,
  clientProfilesRelations,
  modelProfilesRelations,
  bookingsRelations,
  escrowTransactionsRelations,
  reviewsRelations,
  mediaFilesRelations,
  bookingAuditLogsRelations,
  sessionsRelations,
} from './schema';

// ============================================
// QUICK REFERENCE
// ============================================

/**
 * 📋 Entity Quick Reference:
 * 
 * users
 *   └─ clientProfiles (1:1)
 *   └─ modelProfiles (1:1)
 *   └─ bookings (1:N) as client
 *   └─ bookings (1:N) as manager
 *   └─ bookingAuditLogs (1:N)
 *   └─ sessions (1:N)
 * 
 * clientProfiles
 *   └─ user (1:1)
 *   └─ manager (N:1)
 * 
 * modelProfiles
 *   └─ user (1:1)
 *   └─ manager (N:1)
 *   └─ bookings (1:N)
 *   └─ reviews (1:N)
 *   └─ mediaFiles (1:N)
 * 
 * bookings
 *   └─ client (N:1)
 *   └─ model (N:1)
 *   └─ manager (N:1)
 *   └─ escrow (1:1)
 *   └─ auditLogs (1:N)
 * 
 * escrowTransactions
 *   └─ booking (1:1)
 * 
 * reviews
 *   └─ client (N:1)
 *   └─ model (N:1)
 *   └─ booking (1:1)
 * 
 * blacklists
 *   └─ (polymorphic: model or client)
 * 
 * mediaFiles
 *   └─ owner (N:1)
 *   └─ model (N:1)
 * 
 * bookingAuditLogs
 *   └─ booking (N:1)
 *   └─ actor (N:1)
 * 
 * sessions
 *   └─ user (N:1)
 */

// ============================================
// SECURITY RULES
// ============================================

/**
 * 🔒 Security Rules:
 * 
 * 1. UUID для всех первичных ключей
 * 2. RLS включен на всех таблицах
 * 3. Email хеширован (SHA-256)
 * 4. Phone токенизирован (Vault)
 * 5. sensitive данные шифруются (location, preferences)
 * 6. Аудит лог неизменяем
 * 7. Soft delete для users
 * 8. Токены хешированы (bcrypt)
 */

// ============================================
// BUSINESS RULES
// ============================================

/**
 * 📊 Business Rules:
 * 
 * 1. booking.status transitions:
 *    draft → pending_payment → escrow_funded → confirmed → in_progress → completed
 *                                              ↓
 *                                         cancelled / disputed / refunded
 * 
 * 2. escrow.status transitions:
 *    pending_funding → funded → hold_period → released
 *                                      ↓
 *                                   refunded / disputed_hold
 * 
 * 3. model.verificationStatus:
 *    pending → video_required → document_required → verified
 *                                               ↓
 *                                            rejected
 * 
 * 4. blacklist.status:
 *    blocked → under_review → restored
 * 
 * 5. review: один отзыв на booking (уникальный bookingId)
 * 
 * 6. platformFee = totalAmount * 0.20 (20%)
 *    modelPayout = totalAmount * 0.80 (80%)
 * 
 * 7. hold_period = 24 часа после fundedAt
 */

// ============================================
// API ENDPOINTS REFERENCE
// ============================================

/**
 * 🔌 API Endpoints:
 * 
 * AUTH:
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   POST   /api/auth/logout
 *   POST   /api/auth/refresh
 *   POST   /api/auth/2fa/enable
 *   POST   /api/auth/2fa/verify
 * 
 * USERS:
 *   GET    /api/users/me
 *   PATCH  /api/users/me
 *   DELETE /api/users/me
 *   GET    /api/users/:id (admin)
 * 
 * MODELS:
 *   GET    /api/models (catalog with filters)
 *   GET    /api/models/:slug
 *   POST   /api/models (manager)
 *   PATCH  /api/models/:id
 *   DELETE /api/models/:id
 *   POST   /api/models/:id/verify (admin)
 * 
 * BOOKINGS:
 *   GET    /api/bookings
 *   POST   /api/bookings
 *   GET    /api/bookings/:id
 *   PATCH  /api/bookings/:id/status
 *   POST   /api/bookings/:id/cancel
 *   POST   /api/bookings/:id/confirm
 * 
 * ESCROW:
 *   POST   /api/escrow/:bookingId/fund
 *   POST   /api/escrow/:bookingId/release
 *   POST   /api/escrow/:bookingId/refund
 *   GET    /api/escrow/:bookingId/status
 * 
 * REVIEWS:
 *   GET    /api/reviews?modelId=:id
 *   POST   /api/reviews
 *   PATCH  /api/reviews/:id
 *   DELETE /api/reviews/:id
 * 
 * BLACKLISTS:
 *   GET    /api/blacklists (admin)
 *   POST   /api/blacklists
 *   PATCH  /api/blacklists/:id/status
 *   DELETE /api/blacklists/:id
 * 
 * MEDIA:
 *   POST   /api/media/upload
 *   GET    /api/media/:id
 *   DELETE /api/media/:id
 *   POST   /api/media/:id/verify (admin)
 */

// ============================================
// GENERATION COMMANDS
// ============================================

/**
 * 🛠️ Generation Commands for Qwen Coder:
 * 
 * # Generate entity
 * npm run generate:entity -- --name=ModelProfile
 * 
 * # Generate migration
 * npm run db:generate -- --name=create_model_profiles
 * 
 * # Generate NestJS module
 * npm run generate:module -- --name=Bookings
 * 
 * # Generate NestJS service
 * npm run generate:service -- --name=Escrow
 * 
 * # Generate NestJS controller
 * npm run generate:controller -- --name=Reviews
 * 
 * # Generate React component
 * npm run generate:component -- --name=ModelCard
 * 
 * # Generate Next.js page
 * npm run generate:page -- --name=/models/[slug]
 * 
 * # Generate Drizzle relation
 * npm run generate:relation -- --from=users --to=bookings
 */

// ============================================
// TYPE UTILITIES
// ============================================

/**
 * 🔧 Type Utilities:
 * 
 * type UserRole = 'admin' | 'manager' | 'model' | 'client'
 * 
 * type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'blacklisted'
 * 
 * type VipTier = 'standard' | 'silver' | 'gold' | 'platinum'
 * 
 * type Psychotype = 'dominant' | 'intellectual' | 'playful' | 'romantic' | 'adventurous' | 'light'
 * 
 * type VerificationStatus = 'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected'
 * 
 * type AvailabilityStatus = 'offline' | 'online' | 'in_shift' | 'busy'
 * 
 * type BookingStatus = 'draft' | 'pending_payment' | 'escrow_funded' | 'confirmed' | 'in_progress' | 'completed' | 'disputed' | 'cancelled' | 'refunded'
 * 
 * type EscrowStatus = 'pending_funding' | 'funded' | 'hold_period' | 'released' | 'refunded' | 'disputed_hold' | 'partially_refunded'
 * 
 * type BlacklistReason = 'fake_photos' | 'client_complaints' | 'fraud' | 'no_show' | 'video_fake' | 'non_payment' | 'rudeness' | 'pressure'
 * 
 * type FileType = 'photo' | 'video' | 'document'
 * 
 * type LocationType = 'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha'
 * 
 * type PaymentProvider = 'yookassa' | 'cryptomus' | 'manual'
 * 
 * type ReleaseTrigger = 'auto_after_hold' | 'manual_confirm' | 'dispute_resolution' | 'admin_override'
 */

// ============================================
// PHYSICAL ATTRIBUTES TYPE
// ============================================

/**
 * 📐 Physical Attributes Type:
 * 
 * type PhysicalAttributes = {
 *   age?: number;                    // 18-45
 *   height?: number;                 // cm (150-200)
 *   weight?: number;                 // kg (40-80)
 *   bustSize?: number;               // 1-6
 *   bustType?: 'natural' | 'silicone';
 *   bodyType?: 'slim' | 'curvy' | 'bbw' | 'pear' | 'fit';
 *   temperament?: 'gentle' | 'active' | 'adaptable';
 *   sexuality?: 'active' | 'passive' | 'universal';
 * }
 */

// ============================================
// CLIENT PREFERENCES TYPE
// ============================================

/**
 * 💭 Client Preferences Type:
 * 
 * type ClientPreferences = {
 *   languages?: string[];            // ['ru', 'en', 'zh']
 *   ageRange?: [number, number];     // [min, max]
 *   physicalTypes?: string[];        // ['slim', 'curvy']
 *   temperament?: string;            // 'gentle', 'active'
 *   psychotypes?: string[];          // ['dominant', 'intellectual']
 *   bodyTypes?: string[];            // ['slim', 'bbw', 'pear']
 *   minBustSize?: number;
 *   maxBustSize?: number;
 *   minHeight?: number;
 *   maxHeight?: number;
 * }
 */

// ============================================
// ESCROW STATE HISTORY TYPE
// ============================================

/**
 * 📜 Escrow State History Type:
 * 
 * type StateHistoryEntry = {
 *   fromStatus: string;
 *   toStatus: string;
 *   triggeredBy: string;             // user ID
 *   timestamp: string;               // ISO 8601
 *   reason?: string;
 *   metadata?: {
 *     paymentProviderRef?: string;
 *     amount?: number;
 *     currency?: string;
 *   };
 * }
 */

// ============================================
// BLACKLIST CARD TYPE
// 
// @description Публичная карточка ЧС
// ============================================

/**
 * 🚫 Blacklist Card Type:
 * 
 * type BlacklistCard = {
 *   id: string;
 *   entityType: 'model' | 'client';
 *   displayName: string;             // or "Клиент #ID"
 *   reason: BlacklistReason;
 *   description?: string;            // truncated for public
 *   status: 'blocked' | 'under_review' | 'restored';
 *   blockedAt: string;               // ISO 8601
 *   isPublic: boolean;
 * }
 */

// ============================================
// MODEL CARD PUBLIC TYPE
// 
// @description Публичная карточка модели
// ============================================

/**
 * 👤 Model Card Public Type:
 * 
 * type ModelCardPublic = {
 *   id: string;
 *   displayName: string;
 *   slug: string;
 *   verificationStatus: 'verified' | 'pending';
 *   eliteStatus: boolean;
 *   availabilityStatus: AvailabilityStatus;
 *   rateHourly?: string;
 *   psychotypeTags?: string[];
 *   languages?: string[];
 *   physicalAttributes?: {
 *     age?: number;
 *     height?: number;
 *     bodyType?: string;
 *   };
 *   ratingReliability: string;       // 0-100%
 *   totalMeetings: number;
 *   photoCount: number;
 *   hasVideoWalkthrough: boolean;
 *   hasVideoVerification: boolean;
 *   lastVideoVerification?: string;
 * }
 */

// ============================================
// BOOKING SUMMARY TYPE
// 
// @description Краткая информация о брони
// ============================================

/**
 * 📋 Booking Summary Type:
 * 
 * type BookingSummary = {
 *   id: string;
 *   status: BookingStatus;
 *   startTime: string;               // ISO 8601
 *   durationHours: number;
 *   locationType: LocationType;
 *   totalAmount: string;
 *   platformFee: string;
 *   modelPayout: string;
 *   currency: string;
 *   model: {
 *     id: string;
 *     displayName: string;
 *     photoUrl?: string;
 *   };
 *   client?: {
 *     id: string;
 *     vipTier?: string;
 *   };
 *   escrowStatus?: EscrowStatus;
 *   canCancel: boolean;
 *   canConfirm: boolean;
 *   canReview: boolean;
 * }
 */

// ============================================
// DASHBOARD STATS TYPE
// ============================================

/**
 * 📊 Dashboard Stats Types:
 * 
 * type ClientDashboardStats = {
 *   totalBookings: number;
 *   activeBookings: number;
 *   completedMeetings: number;
 *   totalSpent: string;
 *   trustScore: string;
 *   vipTier: VipTier;
 *   nextBooking?: BookingSummary;
 * }
 * 
 * type ModelDashboardStats = {
 *   totalMeetings: number;
 *   totalEarnings: string;
 *   pendingEarnings: string;
 *   ratingReliability: string;
 *   cancellationsLast3Months: number;
 *   nextAvailableAt?: string;
 *   verificationStatus: VerificationStatus;
 *   eliteStatus: boolean;
 * }
 * 
 * type ManagerDashboardStats = {
 *   totalModels: number;
 *   activeModels: number;
 *   totalBookings: number;
 *   totalCommission: string;
 *   pendingVerifications: number;
 *   recentBlacklists: number;
 * }
 * 
 * type AdminDashboardStats = {
 *   totalUsers: number;
 *   totalBookings: number;
 *   totalRevenue: string;
 *   activeEscrows: number;
 *   pendingVerifications: number;
 *   blacklistCount: number;
 *   systemHealth: {
 *     postgres: 'healthy' | 'degraded' | 'down';
 *     redis: 'healthy' | 'degraded' | 'down';
 *     minio: 'healthy' | 'degraded' | 'down';
 *     clerk: 'healthy' | 'degraded' | 'down';
 *   };
 * }
 */
