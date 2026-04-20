/**
 * Telegram Link Tokens — одноразовые токены для web-first линковки Telegram (§Q2).
 *
 * Поток:
 *  1. Web ЛК: user нажимает «Привязать Telegram» → POST /auth/telegram/link-token.
 *  2. Бэкенд создаёт row с token (crypto.randomBytes(32).hex), expires_at = now + 5 min.
 *  3. Фронт показывает deep-link t.me/<bot>?start=link_<token> (или QR).
 *  4. User открывает бот → scene link-account → token проверяется + помечается consumed.
 *
 * CASCADE: удаление user удаляет все его токены (§P6).
 * Cleanup: lazy (§Q6) — expired rows удаляются при consume; batch-зачистка на
 * старте bot-процесса (старше 7 дней).
 */

import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const telegramLinkTokens = pgTable(
  'telegram_link_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    /** crypto.randomBytes(32).toString('hex'); фиксированная длина 64 hex-символа. */
    token: varchar('token', { length: 64 }).notNull(),
    /** createdAt + TELEGRAM_LINK_TOKEN_TTL_SEC (дефолт 300s); считается в сервисе. */
    expiresAt: timestamp('expires_at').notNull(),
    /** NULL до первого consume; после — timestamp. Повторный consume → null возврат. */
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('telegram_link_tokens_token_idx').on(table.token),
    userIdx: index('telegram_link_tokens_user_id_idx').on(table.userId),
    expiresIdx: index('telegram_link_tokens_expires_idx').on(table.expiresAt),
  }),
);

export const telegramLinkTokensRelations = relations(telegramLinkTokens, ({ one }) => ({
  user: one(users, {
    fields: [telegramLinkTokens.userId],
    references: [users.id],
  }),
}));

export type TelegramLinkToken = typeof telegramLinkTokens.$inferSelect;
export type NewTelegramLinkToken = typeof telegramLinkTokens.$inferInsert;
