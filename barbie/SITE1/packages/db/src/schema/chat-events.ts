/**
 * Chat Events — журнал событий для SSE catch-up.
 *
 * Когда клиент переподключает EventSource с `Last-Event-ID: <bigint>`, сервер
 * читает события `id > Last-Event-ID` для каналов, в которых пользователь —
 * member, и проигрывает их. Это закрывает gap'ы при flaky-сетях.
 *
 * `event_type`:
 *  - `message.created` — payload: полное message DTO
 *  - `message.edited` — payload: { id, body, editedAt }
 *  - `message.deleted` — payload: { id, channelId }
 *  - `member.read` — payload: { channelId, userId, lastReadAt }
 *  - `channel.created` — payload: channel DTO (для обновления списка)
 *  - `channel.member.added` / `channel.member.removed`
 *  - `channel.member.promoted` — payload: { channelId, userId, role: 'admin', reason }.
 *    Эмитится сервером, в т.ч. при last-admin succession при self-leave.
 *
 * TTL: cron `DELETE WHERE created_at < now() - interval '30 days'`.
 *
 * Спецификация: новый модуль NAS chat (Level 2 design).
 */

import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { chatChannels } from './chat-channels';

export type ChatEventType =
  | 'message.created'
  | 'message.edited'
  | 'message.deleted'
  | 'member.read'
  | 'channel.created'
  | 'channel.updated'
  | 'channel.member.added'
  | 'channel.member.removed'
  | 'channel.member.promoted';

export const chatEvents = pgTable(
  'chat_events',
  {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    channelId: uuid('channel_id')
      .references(() => chatChannels.id, { onDelete: 'cascade' })
      .notNull(),
    eventType: varchar('event_type', { length: 32 })
      .$type<ChatEventType>()
      .notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantChannelIdx: index('chat_events_tenant_channel_id_idx').on(
      t.tenantId,
      t.channelId,
      t.id,
    ),
    createdAtIdx: index('chat_events_created_at_idx').on(t.createdAt),
  }),
);

export type ChatEvent = typeof chatEvents.$inferSelect;
export type NewChatEvent = typeof chatEvents.$inferInsert;
