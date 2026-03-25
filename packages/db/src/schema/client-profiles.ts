/**
 * Client Profiles - профили клиентов с психотипами и VIP-статусами
 */

import { pgTable, uuid, varchar, decimal, integer, jsonb, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const clientProfiles = pgTable(
  'client_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    
    trustScore: decimal('trust_score', { precision: 3, scale: 2 }).default('0.00'),
    vipTier: varchar('vip_tier', { length: 20 }).$type<'standard' | 'silver' | 'gold' | 'platinum'>().default('standard'),
    
    psychotype: varchar('psychotype', { length: 30 }).$type<'dominant' | 'intellectual' | 'playful' | 'romantic' | 'adventurous' | 'light'>(),
    archetypes: jsonb('archetypes').$type<string[]>(),
    
    preferences: jsonb('preferences').$type<{
      languages?: string[];
      ageRange?: [number, number];
      physicalTypes?: string[];
      temperament?: string;
    }>(),
    
    totalBookings: integer('total_bookings').default(0),
    successfulMeetings: integer('successful_meetings').default(0),
    cancellationRate: decimal('cancellation_rate', { precision: 4, scale: 2 }).default('0.00'),
    
    blacklistStatus: varchar('blacklist_status', { length: 20 }).$type<'clear' | 'warning' | 'banned'>().default('clear'),
    blacklistReason: text('blacklist_reason'),
    
    assignedManagerId: uuid('assigned_manager_id').references(() => users.id),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex('client_user_unique').on(table.userId),
    managerIdx: index('client_manager_idx').on(table.assignedManagerId),
    vipIdx: index('client_vip_idx').on(table.vipTier),
  })
);

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

// Type exports
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
