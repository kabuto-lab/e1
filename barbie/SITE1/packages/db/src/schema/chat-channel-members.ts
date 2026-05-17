/**
 * Chat Channel Members — членство сотрудников в каналах.
 *
 * `tenant_id` денормализован для дешёвых tenant-scoped запросов (`withTenant()`)
 * — гарантированно совпадает с `chat_channels.tenant_id` (DB CHECK не нужен,
 * application enforces при insert).
 *
 * `last_read_at` — read receipts; для unread badge сравнивается с
 * `chat_channels.last_message_at`.
 *
 * Композитный PK `(channel_id, user_id)` — пользователь в канале одна запись.
 *
 * Спецификация: новый модуль NAS chat (Level 2 design).
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { chatChannels } from './chat-channels';
import { tenants } from './tenants';
import { users } from './users';

export type ChatMemberRole = 'member' | 'admin';

export const chatChannelMembers = pgTable(
  'chat_channel_members',
  {
    channelId: uuid('channel_id')
      .references(() => chatChannels.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    role: varchar('role', { length: 8 })
      .$type<ChatMemberRole>()
      .notNull()
      .default('member'),

    lastReadAt: timestamp('last_read_at'),
    muted: boolean('muted').notNull().default(false),

    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.channelId, t.userId] }),
    tenantUserIdx: index('chat_members_tenant_user_idx').on(t.tenantId, t.userId),
    channelIdx: index('chat_members_channel_idx').on(t.channelId),
  }),
);

export type ChatChannelMember = typeof chatChannelMembers.$inferSelect;
export type NewChatChannelMember = typeof chatChannelMembers.$inferInsert;
