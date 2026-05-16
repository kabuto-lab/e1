/**
 * Users — глобальная identity-таблица.
 *
 * ОДИН user row может:
 *  - быть platform-admin (через `platform_admins`),
 *  - состоять в нескольких тенантах с разными ролями (через `tenant_users`).
 *
 * Соглашения:
 *  - `email` глобально уникален (lowercased) — упрощает логин без tenant slug.
 *  - В таблице НЕТ `tenant_id` (cross-tenant identity).
 *  - `passwordHash` — bcrypt cost 12.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.4.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';

export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'archived';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),

    emailVerifiedAt: timestamp('email_verified_at'),
    phoneVerifiedAt: timestamp('phone_verified_at'),

    status: varchar('status', { length: 20 })
      .$type<UserStatus>()
      .notNull()
      .default('pending_verification'),

    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    lastLoginAt: timestamp('last_login_at'),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    emailUniq: uniqueIndex('users_email_uniq').on(t.email),
    phoneIdx: index('users_phone_idx').on(t.phone),
    statusIdx: index('users_status_idx').on(t.status),
    emailFormatCheck: check(
      'users_email_format_check',
      // sanity-проверка; основная валидация — в DTO через class-validator IsEmail.
      // Используем простой POSIX regex; \s/\. экранируются в template literal — заменяем
      // на character class и литерал, чтобы избежать потери backslash при SQL-генерации.
      sql.raw(`email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'`),
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
