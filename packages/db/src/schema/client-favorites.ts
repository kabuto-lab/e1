import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const clientFavorites = pgTable(
  'client_favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userModelUniq: uniqueIndex('client_favorites_user_model_uniq').on(t.userId, t.modelId),
    userIdx: index('client_favorites_user_id_idx').on(t.userId),
  }),
);

export type ClientFavorite = typeof clientFavorites.$inferSelect;
export type NewClientFavorite = typeof clientFavorites.$inferInsert;
