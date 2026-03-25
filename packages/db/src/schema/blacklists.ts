/**
 * Blacklists - чёрные списки моделей и клиентов
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const blacklists = pgTable(
  'blacklists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    
    entityType: varchar('entity_type', { length: 10 }).$type<'model' | 'client'>().notNull(),
    entityId: uuid('entity_id').notNull(),
    
    reason: varchar('reason', { length: 50 }).$type<'fake_photos' | 'client_complaints' | 'fraud' | 'no_show' | 'video_fake' | 'non_payment' | 'rudeness' | 'pressure'>().notNull(),
    description: text('description'),
    
    status: varchar('status', { length: 20 }).$type<'blocked' | 'under_review' | 'restored'>().default('blocked'),
    
    blockedBy: uuid('blocked_by').references(() => users.id).notNull(),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    restoredBy: uuid('restored_by').references(() => users.id),
    
    blockedAt: timestamp('blocked_at').defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at'),
    restoredAt: timestamp('restored_at'),
    
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

// Type exports
export type Blacklist = typeof blacklists.$inferSelect;
export type NewBlacklist = typeof blacklists.$inferInsert;
