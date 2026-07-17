import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const managerProfiles = pgTable(
  'manager_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    fullName: varchar('full_name', { length: 120 }).notNull(),
    companyName: varchar('company_name', { length: 200 }),
    phone: varchar('phone', { length: 30 }),
    telegramContact: varchar('telegram_contact', { length: 64 }),
    /** Способ связи "whatsapp" при регистрации; email — через users.email, phone/telegram — колонки выше. */
    contactWhatsapp: varchar('contact_whatsapp', { length: 40 }),

    reviewNote: text('review_note'),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: varchar('rejection_reason', { length: 500 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex('manager_profiles_user_id_unique').on(table.userId),
    approvedByIdx: index('manager_profiles_approved_by_idx').on(table.approvedBy),
  }),
);

export const managerProfilesRelations = relations(managerProfiles, ({ one }) => ({
  user: one(users, { fields: [managerProfiles.userId], references: [users.id] }),
  approver: one(users, {
    fields: [managerProfiles.approvedBy],
    references: [users.id],
    relationName: 'manager_approver',
  }),
}));

export type ManagerProfile = typeof managerProfiles.$inferSelect;
export type NewManagerProfile = typeof managerProfiles.$inferInsert;
