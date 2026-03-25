# 🎯 Escort Platform Migration

**Миграция с WordPress на современный стек 2026**

---

## 📋 Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Целевой стек технологий](#целевой-стек-технологий)
3. [Entity Schema (Drizzle ORM)](#entity-schema)
4. [Поэтапный план миграции](#поэтапный-план)
5. [Безопасность](#безопасность)
6. [API Endpoints](#api-endpoints)

---

## 🎯 Обзор проекта

### Бизнес-модель
Премиальная платформа сопровождения с:
- ✅ Эскроу-системой (безопасная сделка)
- ✅ Верификацией анкет (видео + документы)
- ✅ Рейтингом надёжности (% вместо звёзд)
- ✅ Чёрными списками (анкеты, клиенты)
- ✅ CRM для менеджеров
- ✅ Интеграция с Telegram

### Критично для безопасности
- 🔒 Шифрование телефонов (токенизация)
- 🔒 Row-Level Security (RLS) на всех таблицах
- 🔒 Аудит всех действий
- 🔒 UUID вместо последовательных ID
- 🔒 Криптографическое удаление данных

---

## 🚀 Целевой стек технологий

### Фронтенд
```
Next.js 15 (App Router)
React 19
TypeScript 5.6+
TailwindCSS + shadcn/ui
Zustand (state management)
React Query (server state)
```

### Бэкенд
```
NestJS 11
Node.js 22 LTS
Drizzle ORM (вместо TypeORM)
PostgreSQL 16
Redis 7 (кеш, сессии)
```

### Авторизация
```
Clerk Auth (основная)
JWT (access/refresh)
2FA для админов
HashiCorp Vault (секреты)
```

### Платежи
```
YooKassa (холдирование)
Cryptomus (крипто-резерв)
Escrow state machine
```

### Инфраструктура
```
Docker + Docker Compose
GitHub Actions (CI/CD)
Traefik (reverse proxy)
MinIO (файловое хранилище)
```

---

## 📦 Entity Schema (Drizzle ORM)

### users
Базовая таблица пользователей

```typescript
// apps/api/src/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailHash: varchar('email_hash', { length: 64 }).notNull().unique(),
  phoneToken: varchar('phone_token', { length: 255 }), // Токенизированный телефон
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).$type<'admin' | 'manager' | 'model' | 'client'>().notNull().default('client'),
  status: varchar('status', { length: 30 }).$type<'active' | 'suspended' | 'pending_verification' | 'blacklisted'>().notNull().default('pending_verification'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login'),
  deletedAt: timestamp('deleted_at'), // Soft delete
}, (table) => ({
  emailIdx: uniqueIndex('email_hash_idx').on(table.emailHash),
  roleIdx: index('role_idx').on(table.role),
  statusIdx: index('status_idx').on(table.status),
}));
```

### client_profiles
Профили клиентов (психотипы, VIP-статус)

```typescript
// apps/api/src/db/schema/client-profiles.ts
import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const clientProfiles = pgTable('client_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Trust & loyalty
  trustScore: decimal('trust_score', { precision: 3, scale: 2 }).default('0.00'), // 0.00-1.00
  vipTier: varchar('vip_tier', { length: 20 }).$type<'standard' | 'silver' | 'gold' | 'platinum'>().default('standard'),
  
  // Psychotype matching
  psychotype: varchar('psychotype', { length: 30 }).$type<'dominant' | 'intellectual' | 'playful' | 'romantic' | 'adventurous' | 'light'>(),
  archetypes: jsonb('archetypes').$type<string[]>(), // Доминирующая, Интеллектуальная, etc
  
  // Preferences (encrypted at application layer)
  preferences: jsonb('preferences').$type<{
    languages?: string[];
    ageRange?: [number, number];
    physicalTypes?: string[];
  }>(),
  
  // Statistics
  totalBookings: integer('total_bookings').default(0),
  successfulMeetings: integer('successful_meetings').default(0),
  cancellationRate: decimal('cancellation_rate', { precision: 4, scale: 2 }).default('0.00'),
  
  // Blacklist
  blacklistStatus: varchar('blacklist_status', { length: 20 }).$type<'clear' | 'warning' | 'banned'>().default('clear'),
  blacklistReason: varchar('blacklist_reason', { length: 500 }), // Encrypted
  
  assignedManagerId: uuid('assigned_manager_id').references(() => users.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
```

### model_profiles
Профили моделей (верификация, рейтинг, статусы)

```typescript
// apps/api/src/db/schema/model-profiles.ts
import { pgTable, uuid, varchar, decimal, integer, jsonb, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const modelProfiles = pgTable('model_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  managerId: uuid('manager_id').references(() => users.id),
  
  // Public info
  displayName: varchar('display_name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(), // SEO-friendly URL
  
  // Verification
  verificationStatus: varchar('verification_status', { length: 30 })
    .$type<'pending' | 'video_required' | 'document_required' | 'verified' | 'rejected'>()
    .default('pending'),
  verificationCompletedAt: timestamp('verification_completed_at'),
  lastVideoVerification: timestamp('last_video_verification'),
  eliteStatus: boolean('elite_status').default(false),
  
  // Rates & availability
  rateHourly: decimal('rate_hourly', { precision: 10, scale: 2 }),
  rateOvernight: decimal('rate_overnight', { precision: 10, scale: 2 }),
  availabilityStatus: varchar('availability_status', { length: 30 })
    .$type<'offline' | 'online' | 'in_shift' | 'busy'>()
    .default('offline'),
  nextAvailableAt: timestamp('next_available_at'),
  
  // Psychotype & attributes
  psychotypeTags: jsonb('psychotype_tags').$type<string[]>(), // ['dominant', 'intellectual']
  languages: jsonb('languages').$type<string[]>(), // ['ru', 'en', 'zh']
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
  ratingReliability: decimal('rating_reliability', { precision: 3, scale: 2 }).default('0.00'), // 0-100%
  totalMeetings: integer('total_meetings').default(0),
  totalCancellations: integer('total_cancellations').default(0),
  cancellationsLast3Months: integer('cancellations_last_3_months').default(0),
  
  // Media (stored in MinIO, references only)
  photoCount: integer('photo_count').default(0),
  videoWalkthroughUrl: varchar('video_walkthrough_url', { length: 500 }),
  videoVerificationUrl: varchar('video_verification_url', { length: 500 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  managerIdx: index('model_manager_idx').on(table.managerId),
  statusIdx: index('model_status_idx').on(table.availabilityStatus),
  eliteIdx: index('model_elite_idx').on(table.eliteStatus),
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
}));
```

### bookings
Бронирования с state machine эскроу

```typescript
// apps/api/src/db/schema/bookings.ts
import { pgTable, uuid, varchar, decimal, integer, timestamp, text, bytea, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Foreign keys
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'restrict' }).notNull(),
  managerId: uuid('manager_id').references(() => users.id),
  
  // Escrow state machine
  status: varchar('status', { length: 30 })
    .$type<'draft' | 'pending_payment' | 'escrow_funded' | 'confirmed' | 'in_progress' | 'completed' | 'disputed' | 'cancelled' | 'refunded'>()
    .default('draft'),
  
  // Booking details
  startTime: timestamp('start_time').notNull(),
  durationHours: integer('duration_hours').notNull(),
  locationType: varchar('location_type', { length: 20 }).$type<'incall' | 'outcall' | 'travel' | 'hotel' | 'dachа'>(),
  locationEncrypted: bytea('location_encrypted'), // Encrypted address
  specialRequests: text('special_requests'), // Encrypted
  
  // Financials
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 12, scale: 2 }), // 20% by default
  modelPayout: decimal('model_payout', { precision: 12, scale: 2 }), // 80% by default
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
}, (table) => ({
  clientIdx: index('booking_client_idx').on(table.clientId),
  modelIdx: index('booking_model_idx').on(table.modelId),
  managerIdx: index('booking_manager_idx').on(table.managerId),
  statusIdx: index('booking_status_idx').on(table.status),
  startTimeIdx: index('booking_start_time_idx').on(table.startTime),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
  }),
  model: one(modelProfiles, {
    fields: [bookings.modelId],
    references: [modelProfiles.id],
  }),
  manager: one(users, {
    fields: [bookings.managerId],
    references: [users.id],
  }),
  escrow: one(escrowTransactions),
  auditLogs: many(bookingAuditLogs),
}));
```

### escrow_transactions
Финансовая state machine

```typescript
// apps/api/src/db/schema/escrow.ts
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { bookings } from './bookings';

export const escrowTransactions = pgTable('escrow_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Payment provider
  paymentProvider: varchar('payment_provider', { length: 30 }).$type<'yookassa' | 'cryptomus' | 'manual'>(),
  paymentProviderRef: varchar('payment_provider_ref', { length: 255 }), // YooKassa ID / Crypto TX
  paymentProviderRef: varchar('payment_provider_ref', { length: 255 }),
  
  // Amounts
  amountHeld: decimal('amount_held', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RUB'),
  
  // Escrow state machine
  status: varchar('status', { length: 40 })
    .$type<'pending_funding' | 'funded' | 'hold_period' | 'released' | 'refunded' | 'disputed_hold' | 'partially_refunded'>()
    .default('pending_funding'),
  
  // Timing
  fundedAt: timestamp('funded_at'),
  holdUntil: timestamp('hold_until'), // Auto-release after 24h
  releasedAt: timestamp('released_at'),
  refundedAt: timestamp('refunded_at'),
  
  // Release trigger
  releaseTrigger: varchar('release_trigger', { length: 50 })
    .$type<'auto_after_hold' | 'manual_confirm' | 'dispute_resolution' | 'admin_override'>(),
  
  // State history (immutable audit log)
  stateHistory: jsonb('state_history').$type<Array<{
    fromStatus: string;
    toStatus: string;
    triggeredBy: string;
    timestamp: string;
    reason?: string;
  }>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  bookingIdx: index('escrow_booking_idx').on(table.bookingId),
  statusIdx: index('escrow_status_idx').on(table.status),
  fundedAtIdx: index('escrow_funded_at_idx').on(table.fundedAt),
}));

export const escrowTransactionsRelations = relations(escrowTransactions, ({ one }) => ({
  booking: one(bookings, {
    fields: [escrowTransactions.bookingId],
    references: [bookings.id],
  }),
}));
```

### reviews
Отзывы и рейтинг

```typescript
// apps/api/src/db/schema/reviews.ts
import { pgTable, uuid, varchar, text, decimal, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Foreign keys
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }).notNull(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Rating (1-5)
  rating: integer('rating').notNull(),
  
  // Review content
  comment: text('comment'),
  isPublic: boolean('is_public').default(false),
  isVerified: boolean('is_verified').default(false), // Verified booking
  
  // Admin moderation
  moderationStatus: varchar('moderation_status', { length: 20 }).$type<'pending' | 'approved' | 'rejected'>().default('pending'),
  moderationReason: text('moderation_reason'),
  
  // Helpfulness (for public reviews)
  helpfulCount: integer('helpful_count').default(0),
  notHelpfulCount: integer('not_helpful_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  modelIdx: index('review_model_idx').on(table.modelId),
  clientIdx: index('review_client_idx').on(table.clientId),
  bookingIdx: uniqueIndex('review_booking_unique').on(table.bookingId),
  ratingIdx: index('review_rating_idx').on(table.rating),
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
```

### blacklists
Чёрные списки (анкеты и клиенты)

```typescript
// apps/api/src/db/schema/blacklists.ts
import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const blacklists = pgTable('blacklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Type: model or client
  entityType: varchar('entity_type', { length: 10 }).$type<'model' | 'client'>().notNull(),
  entityId: uuid('entity_id').notNull(), // References users.id or modelProfiles.id
  
  // Blacklist reason
  reason: varchar('reason', { length: 50 }).$type<'fake_photos' | 'client_complaints' | 'fraud' | 'no_show' | 'video_fake' | 'non_payment' | 'rudeness' | 'pressure'>().notNull(),
  description: text('description'), // Detailed reason (encrypted)
  
  // Status
  status: varchar('status', { length: 20 }).$type<'blocked' | 'under_review' | 'restored'>().default('blocked'),
  
  // Admin actions
  blockedBy: uuid('blocked_by').references(() => users.id).notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  restoredBy: uuid('restored_by').references(() => users.id),
  
  // Timestamps
  blockedAt: timestamp('blocked_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  restoredAt: timestamp('restored_at'),
  
  // Visibility
  isPublic: boolean('is_public').default(false), // Public blacklist for clients
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityIdx: index('blacklist_entity_idx').on(table.entityType, table.entityId),
  statusIdx: index('blacklist_status_idx').on(table.status),
  reasonIdx: index('blacklist_reason_idx').on(table.reason),
}));
```

### booking_audit_logs
Неизменяемый аудит лог действий

```typescript
// apps/api/src/db/schema/audit.ts
import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { bookings } from './bookings';
import { users } from './users';

export const bookingAuditLogs = pgTable('booking_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
  
  // Action
  action: varchar('action', { length: 50 }).notNull(), // 'status_change', 'payment_received', etc
  actorId: uuid('actor_id').references(() => users.id),
  
  // Before/after state
  fromStatus: varchar('from_status', { length: 30 }),
  toStatus: varchar('to_status', { length: 30 }),
  metadata: jsonb('metadata'), // Additional context
  
  // Immutable
  createdAt: timestamp('created_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }), // For security audit
  userAgent: varchar('user_agent', { length: 500 }),
}, (table) => ({
  bookingIdx: index('audit_booking_idx').on(table.bookingId),
  actorIdx: index('audit_actor_idx').on(table.actorId),
  actionIdx: index('audit_action_idx').on(table.action),
  createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
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
```

### media_files
Файлы (фото, видео) - ссылки на MinIO

```typescript
// apps/api/src/db/schema/media.ts
import { pgTable, uuid, varchar, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Owner
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }),
  
  // File info
  fileType: varchar('file_type', { length: 20 }).$type<'photo' | 'video' | 'document'>().notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size'), // bytes
  
  // Storage (MinIO)
  storageKey: varchar('storage_key', { length: 500 }).notNull().unique(), // MinIO object key
  cdnUrl: varchar('cdn_url', { length: 500 }),
  
  // Verification
  isVerified: boolean('is_verified').default(false),
  verificationDate: timestamp('verification_date'),
  
  // Metadata
  metadata: jsonb('metadata').$type<{
    width?: number;
    height?: number;
    duration?: number; // for videos
    uploadedFrom?: string; // IP hash
  }>(),
  
  // Moderation
  moderationStatus: varchar('moderation_status', { length: 20 }).$type<'pending' | 'approved' | 'rejected'>().default('pending'),
  moderationReason: varchar('moderation_reason', { length: 500 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index('media_owner_idx').on(table.ownerId),
  modelIdx: index('media_model_idx').on(table.modelId),
  typeIdx: index('media_type_idx').on(table.fileType),
  verifiedIdx: index('media_verified_idx').on(table.isVerified),
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
```

---

## 📋 Поэтапный план миграции

### Этап 1: Фундамент (Недели 1-2)

#### 1.1 Инициализация проекта
```bash
# Создать монорепозиторий
npx create-turbo@latest escort-platform
cd escort-platform

# Структура:
# apps/
#   api/         (NestJS)
#   web/         (Next.js)
#   admin/       (Next.js admin panel)
# packages/
#   db/          (Drizzle schema, migrations)
#   ui/          (Shared components)
#   config/      (ESLint, TypeScript configs)
```

**Ожидаемый результат:**
- ✅ GitHub репозиторий создан
- ✅ Turborepo настроен
- ✅ Базовый Docker Compose работает

---

#### 1.2 База данных и Drizzle ORM
```bash
# В packages/db
npm install drizzle-orm drizzle-kit postgres
npm install -D @types/pg

# Инициализировать Drizzle
npx drizzle-kit init
```

**drizzle.config.ts:**
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Ожидаемый результат:**
- ✅ Схема Drizzle создана (все entity выше)
- ✅ Первая миграция сгенерирована
- ✅ RLS политики включены

---

#### 1.3 Авторизация (Clerk + Vault)
```bash
# В apps/api
npm install @clerk/backend @clerk/nextjs
npm install node-vault
```

**Критично:**
- Clerk middleware устанавливает `x-user-id` и `x-user-role` заголовки
- Vault хранит секреты (DB password, API keys)
- RLS контекст передаётся в каждый запрос

**Ожидаемый результат:**
- ✅ Регистрация/вход работают
- ✅ 2FA для админов включено
- ✅ JWT токены выдают

---

### Этап 2: Ядро системы (Недели 3-5)

#### 2.1 NestJS API Core
```bash
# В apps/api
npm install @nestjs/core @nestjs/common @nestjs/platform-express
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install class-validator class-transformer
```

**Модули:**
- `AuthModule` - авторизация, guards
- `UsersModule` - CRUD пользователей
- `ModelsModule` - профили моделей
- `BookingsModule` - бронирования
- `EscrowModule` - эскроу state machine
- `ReviewsModule` - отзывы
- `BlacklistModule` - ЧС

**Ожидаемый результат:**
- ✅ API отвечает на запросы
- ✅ Валидация DTO работает
- ✅ Guards проверяют роли

---

#### 2.2 Эскроу State Machine
```typescript
// apps/api/src/escrow/escrow.service.ts
@Injectable()
export class EscrowService {
  private readonly HOLD_PERIOD_HOURS = 24;

  async fund(bookingId: string, paymentData: PaymentData) {
    // 1. Validate booking status = 'pending_payment'
    // 2. Create escrow transaction
    // 3. Call YooKassa/Cryptomus
    // 4. Update status to 'escrow_funded'
    // 5. Set hold_until = now + 24h
  }

  async release(bookingId: string, trigger: ReleaseTrigger) {
    // 1. Validate status = 'escrow_funded' OR 'hold_period'
    // 2. Check hold period expired
    // 3. Transfer to model (minus commission)
    // 4. Update status to 'released'
    // 5. Log to audit
  }

  async refund(bookingId: string, reason: string) {
    // 1. Validate status
    // 2. Return funds to client
    // 3. Update status to 'refunded'
  }
}
```

**Ожидаемый результат:**
- ✅ Холдирование платежей работает
- ✅ Авто-выплата через 24ч
- ✅ Вебхуки обрабатываются

---

#### 2.3 Next.js Фронтенд
```bash
# В apps/web
npm install next@15 react@19
npm install tailwindcss @radix-ui
npm install @tanstack/react-query zustand
```

**Страницы:**
- `/` - Главная (лендинг)
- `/catalog` - Каталог анкет
- `/models/[slug]` - Карточка модели
- `/dashboard` - ЛК клиента
- `/dashboard/models` - ЛК модели
- `/dashboard/managers` - ЛК менеджера
- `/admin` - Админ-панель

**Ожидаемый результат:**
- ✅ Каталог с фильтрами работает
- ✅ Карточка модели отображается
- ✅ ЛК разные для ролей

---

### Этап 3: Интеграции (Недели 6-8)

#### 3.1 Платежи (YooKassa + Cryptomus)
```typescript
// apps/api/src/payments/yookassa.adapter.ts
@Injectable()
export class YooKassaAdapter {
  async createPayment(dto: CreatePaymentDto) {
    // YooKassa API: создание платежа с холдированием
  }

  async confirmPayment(paymentId: string) {
    // Подтверждение после встречи
  }

  async refund(paymentId: string, amount: number) {
    // Возврат средств
  }
}
```

**Ожидаемый результат:**
- ✅ YooKassa холдирование
- ✅ Cryptomus крипто-платежи
- ✅ Вебхуки обрабатываются

---

#### 3.2 Telegram Bot API
```typescript
// apps/api/src/telegram/telegram.gateway.ts
@Injectable()
export class TelegramGateway {
  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: MessageDto) {
    // 1. Mask phone numbers
    // 2. Save to DB (encrypted)
    // 3. Forward to recipient via TG Bot API
  }
}
```

**Ожидаемый результат:**
- ✅ Бот принимает сообщения
- ✅ Анти-слив фильтрует номера
- ✅ История сохраняется

---

#### 3.3 MinIO файловое хранилище
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=companion" \
  -e "MINIO_ROOT_PASSWORD=secure_password" \
  minio/minio server /data --console-address ":9001"
```

**Ожидаемый результат:**
- ✅ Загрузка фото/видео
- ✅ Верификация модератором
- ✅ CDN отдают файлы

---

### Этап 4: Тестирование и запуск (Недели 9-10)

#### 4.1 Тесты
```bash
# В apps/api
npm install -D @nestjs/testing jest @types/jest
npm install -D supertest

# Запустить тесты
npm run test
npm run test:e2e
```

**Ожидаемый результат:**
- ✅ Unit тесты >80% coverage
- ✅ E2E тесты критичных путей
- ✅ Нагрузочное тестирование

---

#### 4.2 Production деплой
```bash
# Docker Compose production
docker-compose -f docker-compose.prod.yml up -d

# Миграции
npx drizzle-kit migrate

# Seed данные
npm run seed
```

**Ожидаемый результат:**
- ✅ Production запущен
- ✅ SSL настроен
- ✅ Бэкапы работают

---

## 🔒 Безопасность

### Row-Level Security (RLS)

```sql
-- Включить RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Managers can view their models"
  ON model_profiles FOR SELECT
  USING (manager_id = auth.jwt()->>'user_id');

CREATE POLICY "Clients can view own bookings"
  ON bookings FOR SELECT
  USING (client_id = auth.uid());
```

### Шифрование полей

```typescript
// packages/db/src/encryption.ts
import { createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Аудит логирование

```typescript
// apps/api/src/audit/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(REQUEST) private req: Request,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          action: context.getHandler().name,
          userId: this.req.headers['x-user-id'],
          role: this.req.headers['x-user-role'],
          ipAddress: this.req.ip,
          duration: Date.now() - startTime,
        });
      }),
    );
  }
}
```

---

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/register          - Регистрация
POST   /api/auth/login             - Вход
POST   /api/auth/logout            - Выход
POST   /api/auth/refresh           - Refresh токена
POST   /api/auth/2fa/enable        - Включить 2FA
POST   /api/auth/2fa/verify        - Подтвердить 2FA
```

### Users
```
GET    /api/users/me               - Мой профиль
PATCH  /api/users/me               - Обновить профиль
DELETE /api/users/me               - Удалить аккаунт
GET    /api/users/:id              - Профиль пользователя (admin)
```

### Models
```
GET    /api/models                 - Каталог моделей
GET    /api/models/:slug           - Карточка модели
POST   /api/models                 - Создать модель (manager)
PATCH  /api/models/:id             - Обновить модель
DELETE /api/models/:id             - Удалить модель
POST   /api/models/:id/verify      - Верифицировать (admin)
```

### Bookings
```
GET    /api/bookings               - Мои бронирования
POST   /api/bookings               - Создать бронь
GET    /api/bookings/:id           - Детали брони
PATCH  /api/bookings/:id/status    - Изменить статус
POST   /api/bookings/:id/cancel    - Отменить
POST   /api/bookings/:id/confirm   - Подтвердить встречу
```

### Escrow
```
POST   /api/escrow/:bookingId/fund     - Холдировать платеж
POST   /api/escrow/:bookingId/release  - Выплатить модели
POST   /api/escrow/:bookingId/refund   - Вернуть клиенту
GET    /api/escrow/:bookingId/status   - Статус эскроу
```

### Reviews
```
GET    /api/reviews?modelId=:id    - Отзывы модели
POST   /api/reviews                - Создать отзыв
PATCH  /api/reviews/:id            - Обновить отзыв
DELETE /api/reviews/:id            - Удалить отзыв
```

### Blacklists
```
GET    /api/blacklists             - Все ЧС (admin)
POST   /api/blacklists             - Добавить в ЧС
PATCH  /api/blacklists/:id/status  - Изменить статус
DELETE /api/blacklists/:id         - Удалить из ЧС
```

---

## 📊 Миграция данных из WordPress

### Скрипт миграции

```typescript
// scripts/migrate-from-wp.ts
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

async function migrateWordPress() {
  const wpClient = new Client({
    host: 'wp-host',
    database: 'wp_db',
    user: 'wp_user',
    password: 'wp_password',
  });
  
  await wpClient.connect();
  
  // Миграция пользователей
  const wpUsers = await wpClient.query(`
    SELECT ID, user_email, user_pass, meta_value as role
    FROM wp_users
    JOIN wp_usermeta ON wp_users.ID = wp_usermeta.user_id
    WHERE meta_key = 'wp_capabilities'
  `);
  
  for (const user of wpUsers.rows) {
    await migrateUser(user);
  }
  
  // Миграция моделей (CPT)
  const wpModels = await wpClient.query(`
    SELECT * FROM wp_posts WHERE post_type = 'models'
  `);
  
  for (const model of wpModels.rows) {
    await migrateModel(model);
  }
  
  await wpClient.end();
}
```

---

## ✅ Чеклист готовности к запуску

### Функциональность
- [ ] Регистрация/вход работают
- [ ] Каталог с фильтрами
- [ ] Карточка модели полная
- [ ] Бронирование создаётся
- [ ] Эскроу холдирует
- [ ] Выплаты работают
- [ ] Отзывы создаются
- [ ] ЧС работает

### Безопасность
- [ ] RLS включен
- [ ] Шифрование телефонов
- [ ] Аудит логирование
- [ ] 2FA для админов
- [ ] Rate limiting
- [ ] HTTPS везде

### Производительность
- [ ] Кэш Redis
- [ ] CDN для файлов
- [ ] Индексы БД
- [ ] Нагрузочное тестирование

### Документация
- [ ] README.md
- [ ] API документация (Swagger)
- [ ] Инструкции для команды
- [ ] Runbook для продакшена

---

## 📞 Контакты для AI Coder

Для генерации кода используйте команды:

```bash
# Сгенерировать entity
npm run generate:entity -- --name=ModelProfile

# Создать миграцию
npm run db:migrate -- --name=create_model_profiles

# Создать API модуль
npm run generate:module -- --name=Bookings

# Создать компонент
npm run generate:component -- --name=ModelCard
```

---

**Версия документа:** 1.0  
**Последнее обновление:** 2026-01-01  
**Статус:** MVP в разработке
