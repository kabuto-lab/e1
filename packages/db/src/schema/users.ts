/**
 * Users - базовая таблица всех пользователей
 * UUID первичный ключ, email хеширован, phone токенизирован
 */

import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    emailHash: varchar('email_hash', { length: 64 }).notNull().unique(),
    phoneToken: varchar('phone_token', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).$type<'admin' | 'manager' | 'model' | 'client'>().notNull().default('client'),
    status: varchar('status', { length: 30 }).$type<'active' | 'suspended' | 'pending_verification' | 'blacklisted'>().notNull().default('pending_verification'),
    clerkId: varchar('clerk_id', { length: 255 }).unique(),
    lastLogin: timestamp('last_login'),
    deletedAt: timestamp('deleted_at'),
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
