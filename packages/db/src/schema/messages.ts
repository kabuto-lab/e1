import { pgTable, uuid, timestamp, text, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /**
     * Анкета, о которой этот диалог (клиент ↔ модель) — задаётся при создании, если
     * собеседник является аккаунтом модели. Через неё менеджер/сотрудники модели видят
     * диалог в общем инбоксе (см. MessagesService), не будучи формальными участниками.
     * Null — для остальных диалогов (сотрудник↔админ и т.п.) и самостоятельных моделей
     * без менеджера, где общий инбокс неприменим.
     */
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'set null' }),
    /** Кто из менеджера/сотрудников взял диалог в работу — anti-double-reply. */
    claimedBy: uuid('claimed_by').references(() => users.id, { onDelete: 'set null' }),
    claimedAt: timestamp('claimed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    modelIdx: index('conversations_model_idx').on(t.modelId),
  }),
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    lastReadAt: timestamp('last_read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique('conv_participants_uniq').on(t.conversationId, t.userId),
    userIdx: index('conv_participants_user_idx').on(t.userId),
  }),
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: uuid('sender_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    convIdx: index('messages_conversation_idx').on(t.conversationId),
  }),
);

export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
