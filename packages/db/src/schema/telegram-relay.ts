/**
 * Telegram Relay — анонимная переписка клиент ↔ команда анкеты (менеджер/сотрудники, иначе сама
 * модель) через бота (§«Написать в Telegram»).
 *
 * Поток:
 *  1. Авторизованный клиент → POST /models/:id/telegram-contact-token.
 *     Сервис резолвит кандидатов (менеджер анкеты + сотрудники его команды с привязанным TG,
 *     иначе сама модель — см. TelegramRelayService.resolveCandidates), создаёт row
 *     status='pending' с одноразовым token, expires через TTL.
 *  2. Клиент открывает t.me/<bot>?start=contact_<token> → бот потребляет токен,
 *     проставляет clientTelegramId из ctx.chat.id, переводит status → 'active'.
 *     counterpartUserId/counterpartTelegramId остаются NULL — тред «неразобран».
 *  3. Пока тред неразобран, каждое сообщение клиента рассылается broadcast'ом ВСЕМ текущим
 *     кандидатам (свежий resolveCandidates на каждое сообщение). Кто из них первый ответит
 *     (обязательно свайпом Reply на пересланную копию — см. forwardedMessageId) — тот и
 *     фиксируется в counterpartUserId/counterpartTelegramId/claimedAt (claimThreadByReply,
 *     атомарный UPDATE ... WHERE counterpart_user_id IS NULL). Можно закрепить за собой тред и
 *     из веб-панели (claimThreadFromWeb, тот же атомарный переход).
 *  4. После закрепления — обычная 1:1 пересылка через bot.api.sendMessage в обе стороны, не
 *     раскрывая telegramId/username друг другу.
 *
 * CASCADE: удаление model_profiles/users удаляет треды и их сообщения.
 */

import { pgTable, uuid, varchar, bigint, boolean, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { modelProfiles } from './model-profiles';

export const telegramRelayThreads = pgTable(
  'telegram_relay_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id').references(() => modelProfiles.id, { onDelete: 'cascade' }).notNull(),

    clientUserId: uuid('client_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    /** NULL до потребления токена — заполняется из ctx.chat.id при /start contact_<token>. */
    clientTelegramId: bigint('client_telegram_id', { mode: 'bigint' }),
    clientTelegramUsername: varchar('client_telegram_username', { length: 64 }),

    /**
     * NULL, пока тред не «взят в работу» — до этого сообщения клиента рассылаются broadcast'ом
     * всем кандидатам (менеджер + сотрудники его команды с привязанным TG, см. resolveCandidates),
     * и первый ответивший фиксируется здесь (claimThreadByReply/claimThreadFromWeb).
     */
    counterpartUserId: uuid('counterpart_user_id').references(() => users.id, { onDelete: 'cascade' }),
    counterpartTelegramId: bigint('counterpart_telegram_id', { mode: 'bigint' }),
    claimedAt: timestamp('claimed_at'),

    status: varchar('status', { length: 20 }).$type<'pending' | 'active' | 'closed'>().default('pending').notNull(),

    /** crypto.randomBytes(32).toString('hex'); NULL после потребления (см. §Q6-style lazy cleanup). */
    token: varchar('token', { length: 64 }),
    tokenExpiresAt: timestamp('token_expires_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastMessageAt: timestamp('last_message_at'),
  },
  (table) => ({
    tokenIdx: uniqueIndex('telegram_relay_threads_token_idx')
      .on(table.token)
      .where(sql`${table.token} is not null`),
    clientTelegramIdx: index('telegram_relay_threads_client_tg_idx').on(table.clientTelegramId),
    counterpartTelegramIdx: index('telegram_relay_threads_counterpart_tg_idx').on(table.counterpartTelegramId),
    statusIdx: index('telegram_relay_threads_status_idx').on(table.status),
  }),
);

export const telegramRelayMessages = pgTable(
  'telegram_relay_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id').references(() => telegramRelayThreads.id, { onDelete: 'cascade' }).notNull(),

    senderTelegramId: bigint('sender_telegram_id', { mode: 'bigint' }).notNull(),
    recipientTelegramId: bigint('recipient_telegram_id', { mode: 'bigint' }).notNull(),
    /** message_id пересланной копии в чате получателя — NULL если доставка не удалась. Используется для роутинга Reply. */
    forwardedMessageId: bigint('forwarded_message_id', { mode: 'bigint' }),

    content: text('content').notNull(),
    /** true — сообщение перехвачено AntiLeakService и не переслано получателю. */
    blocked: boolean('blocked').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    threadIdx: index('telegram_relay_messages_thread_idx').on(table.threadId),
    replyLookupIdx: index('telegram_relay_messages_reply_idx').on(table.recipientTelegramId, table.forwardedMessageId),
  }),
);

export const telegramRelayThreadsRelations = relations(telegramRelayThreads, ({ one, many }) => ({
  model: one(modelProfiles, {
    fields: [telegramRelayThreads.modelId],
    references: [modelProfiles.id],
  }),
  clientUser: one(users, {
    fields: [telegramRelayThreads.clientUserId],
    references: [users.id],
  }),
  counterpartUser: one(users, {
    fields: [telegramRelayThreads.counterpartUserId],
    references: [users.id],
  }),
  messages: many(telegramRelayMessages),
}));

export const telegramRelayMessagesRelations = relations(telegramRelayMessages, ({ one }) => ({
  thread: one(telegramRelayThreads, {
    fields: [telegramRelayMessages.threadId],
    references: [telegramRelayThreads.id],
  }),
}));

export type TelegramRelayThread = typeof telegramRelayThreads.$inferSelect;
export type NewTelegramRelayThread = typeof telegramRelayThreads.$inferInsert;
export type TelegramRelayMessage = typeof telegramRelayMessages.$inferSelect;
export type NewTelegramRelayMessage = typeof telegramRelayMessages.$inferInsert;
