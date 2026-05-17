/**
 * Chat Channels — staff-to-staff каналы внутри одного тенанта.
 *
 * Два типа:
 *  - `dm` — 1:1 между двумя сотрудниками. `title` IS NULL (рендерится из members).
 *  - `group` — N сотрудников; `title` обязателен. Опциональная привязка к salon_id.
 *
 * `dm_key` — детерминированный ключ "uuidA:uuidB" (отсортированные), нужен для
 * partial unique index — нельзя завести второй DM между теми же двумя людьми.
 * Для group `dm_key` IS NULL.
 *
 * Спецификация: новый модуль NAS chat (Level 2 design).
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { salons } from './salons';

export type ChatChannelType = 'dm' | 'group';

export const chatChannels = pgTable(
  'chat_channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    type: varchar('type', { length: 8 }).$type<ChatChannelType>().notNull(),

    title: varchar('title', { length: 120 }),

    salonId: uuid('salon_id').references(() => salons.id, { onDelete: 'set null' }),

    /** "uuidA:uuidB" отсортированно для type='dm', NULL для group. */
    dmKey: varchar('dm_key', { length: 80 }),

    createdBy: uuid('created_by').notNull(),

    lastMessageAt: timestamp('last_message_at'),

    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantUpdatedIdx: index('chat_channels_tenant_updated_idx').on(
      t.tenantId,
      t.archivedAt,
      t.lastMessageAt,
    ),
    tenantSalonIdx: index('chat_channels_tenant_salon_idx').on(t.tenantId, t.salonId),
    dmUniq: uniqueIndex('chat_channels_dm_uniq')
      .on(t.tenantId, t.dmKey)
      .where(sql`${t.dmKey} is not null`),
    typeCheck: check(
      'chat_channels_type_check',
      sql`type IN ('dm','group')`,
    ),
    dmShapeCheck: check(
      'chat_channels_dm_shape_check',
      sql`(type = 'dm' AND dm_key IS NOT NULL AND title IS NULL) OR (type = 'group' AND dm_key IS NULL AND title IS NOT NULL)`,
    ),
  }),
);

export type ChatChannel = typeof chatChannels.$inferSelect;
export type NewChatChannel = typeof chatChannels.$inferInsert;
