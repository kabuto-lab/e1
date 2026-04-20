/**
 * Users — базовая таблица всех пользователей.
 *
 * Identity:
 *  - email_hash / password_hash становятся nullable для client/model, у которых
 *    единственный identity — telegram_id (логин через TG-бота).
 *    CHECK users_staff_credentials_check гарантирует, что staff (admin/manager/
 *    moderator) ВСЕГДА имеют email+password — юридически и для аудита.
 *
 * Telegram (миграция 0011):
 *  - telegram_id: BIGINT, partial unique (только не-NULL).
 *  - МИНИМУМ PII: не храним first_name/last_name/photo_url из TG-payload (§P1).
 *  - telegram_notification_prefs: JSONB overrides поверх DEFAULTS_BY_ROLE;
 *    пустой {} → использовать дефолты роли (ленивая инициализация §Q5).
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  bigint,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// UserRole канонически объявлен в ./types.ts; не дублируем экспорт здесь,
// чтобы избежать TS2308 при `export type * from './types'` в index.ts.

export type TelegramNotificationEvent =
  | 'booking.escrow_funded'
  | 'booking.confirmed'
  | 'booking.completed'
  | 'booking.disputed'
  | 'booking.cancelled'
  | 'escrow.released'
  | 'escrow.refunded';

export type TelegramNotificationPrefs = Partial<Record<TelegramNotificationEvent, boolean>>;

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    /** SHA-256(lower(trim(email))); NULL у TG-only клиентов. */
    emailHash: varchar('email_hash', { length: 64 }),
    phoneToken: varchar('phone_token', { length: 255 }),
    /** bcrypt; NULL у TG-only клиентов (логин только через Telegram). */
    passwordHash: varchar('password_hash', { length: 255 }),

    role: varchar('role', { length: 20 })
      .$type<'admin' | 'manager' | 'moderator' | 'model' | 'client'>()
      .notNull()
      .default('client'),

    /** Доступ клиента к просмотру отзывов на анкетах: none = как гость. */
    subscriptionTier: varchar('subscription_tier', { length: 20 })
      .$type<'none' | 'basic' | 'standard' | 'premium'>()
      .default('none'),

    status: varchar('status', { length: 30 })
      .$type<'active' | 'suspended' | 'pending_verification' | 'blacklisted'>()
      .notNull()
      .default('pending_verification'),

    clerkId: varchar('clerk_id', { length: 255 }).unique(),

    // ── Telegram identity (MVP: минимум PII, §P1) ──
    /** Telegram user id = ctx.from.id; BIGINT т.к. новые аккаунты > 2^31. */
    telegramId: bigint('telegram_id', { mode: 'bigint' }),
    /** Волатильный; обновляется при каждом логине для UI staff. */
    telegramUsername: varchar('telegram_username', { length: 64 }),
    /** 'ru' | 'en' после нормализации из TG language_code; fallback 'ru'. */
    telegramLanguageCode: varchar('telegram_language_code', { length: 8 }),
    telegramLinkedAt: timestamp('telegram_linked_at'),
    /** Per-event overrides; пустой {} = использовать DEFAULTS_BY_ROLE. */
    telegramNotificationPrefs: jsonb('telegram_notification_prefs')
      .$type<TelegramNotificationPrefs>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    /** Staff один раз видит disclaimer про TG-историю перед /post_model. */
    telegramDisclaimerAckedAt: timestamp('telegram_disclaimer_acked_at'),

    lastLogin: timestamp('last_login'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Partial unique: nullable email_hash, но дубли среди заполненных запрещены.
    emailIdx: uniqueIndex('email_hash_idx')
      .on(table.emailHash)
      .where(sql`${table.emailHash} is not null`),
    roleIdx: index('role_idx').on(table.role),
    statusIdx: index('status_idx').on(table.status),
    clerkIdx: index('clerk_id_idx').on(table.clerkId),
    // Одно telegram_id не может быть привязано к двум users (§P1 identity).
    telegramIdIdx: uniqueIndex('users_telegram_id_unique_nonnull')
      .on(table.telegramId)
      .where(sql`${table.telegramId} is not null`),
    // Staff-роли обязаны иметь email+password; client/model могут жить без них
    // (единственный identity — telegram_id, защищённый partial unique выше).
    staffCredentialsCheck: check(
      'users_staff_credentials_check',
      sql`role IN ('client','model') OR (email_hash IS NOT NULL AND password_hash IS NOT NULL)`,
    ),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  clientProfile: one(clientProfiles),
  modelProfile: one(modelProfiles),
  bookingsAsClient: many(bookings, { relationName: 'client_bookings' }),
  bookingsAsManager: many(bookings, { relationName: 'manager_bookings' }),
  auditLogs: many(bookingAuditLogs),
  sessions: many(sessions),
}));

// Import for relations (will be resolved after all files created)
import { clientProfiles } from './client-profiles';
import { modelProfiles } from './model-profiles';
import { bookings } from './bookings';
import { bookingAuditLogs } from './audit';
import { sessions } from './sessions';

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
