/**
 * Sessions - сессии пользователей (refresh токены)
 */

import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    accessTokenHash: varchar('access_token_hash', { length: 255 }),
    
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    expiresAt: timestamp('expires_at').notNull(),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    userIdIdx: index('session_user_idx').on(table.userId),
    expiresIdx: index('session_expires_idx').on(table.expiresAt),
    tokenIdx: index('refresh_token_idx').on(table.refreshTokenHash),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Type exports
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
