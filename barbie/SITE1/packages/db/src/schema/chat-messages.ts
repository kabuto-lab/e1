/**
 * Chat Messages — сообщения в каналах.
 *
 * - `body` — текст в markdown-сабсете (parsing на клиенте).
 * - `attachments` jsonb — массив `{ mediaKey, mime, size, name }`. Ключи —
 *   tenant-prefixed S3 (`tenant/{tid}/chat/{channelId}/...`), создаются через
 *   существующий MediaModule presigned PUT.
 * - `reply_to_message_id` — self-FK для thread-replies (плоский reply, не дерево).
 * - `edited_at` ставится при PATCH; `deleted_at` — soft delete, тело заменяется
 *   на пустую строку при render'е.
 *
 * Hot path: лента канала — `(tenant_id, channel_id, created_at desc)`.
 *
 * Спецификация: новый модуль NAS chat (Level 2 design).
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  foreignKey,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { chatChannels } from './chat-channels';
import { users } from './users';

export type ChatAttachment = {
  mediaKey: string;
  mime: string;
  size: number;
  name: string;
};

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    channelId: uuid('channel_id')
      .references(() => chatChannels.id, { onDelete: 'cascade' })
      .notNull(),
    authorUserId: uuid('author_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    body: text('body').notNull(),

    attachments: jsonb('attachments')
      .$type<ChatAttachment[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    replyToMessageId: uuid('reply_to_message_id'),

    editedAt: timestamp('edited_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    replyFk: foreignKey({
      columns: [t.replyToMessageId],
      foreignColumns: [t.id],
      name: 'chat_messages_reply_fk',
    }).onDelete('set null'),
    channelCreatedIdx: index('chat_messages_channel_created_idx').on(
      t.tenantId,
      t.channelId,
      t.createdAt,
    ),
    authorCreatedIdx: index('chat_messages_author_created_idx').on(
      t.tenantId,
      t.authorUserId,
      t.createdAt,
    ),
    bodyLenCheck: check(
      'chat_messages_body_len_check',
      sql`length(body) <= 8000`,
    ),
  }),
);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

/** Self-reference helper для TS, чтобы schema-файл не циклился. */
export const chatMessagesIdRef = (): AnyPgColumn => chatMessages.id;
