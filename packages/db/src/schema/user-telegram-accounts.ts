/**
 * Дополнительные Telegram-аккаунты менеджера/сотрудника (§«несколько TG на один аккаунт»).
 *
 * Отдельно от users.telegramId (тот остаётся «основным» слотом для входа/уведомлений —
 * не трогаем существующую линковку ни для одной роли). Здесь — доп. рабочие TG, которые
 * можно делегировать конкретным анкетам (model_profiles.operatorTelegramAccountId), не
 * заводя под каждый телефон отдельного фиктивного сотрудника.
 *
 * Линковка — тот же токен-флоу (TelegramLinkTokenService), но отдельный /start-префикс
 * в боте (linkx_ вместо link_) и отдельный метод в UsersService, который пишет сюда,
 * а не в users.telegramId. Доступно только Role.MANAGER/Role.EMPLOYEE (проверка в сервисе).
 *
 * CASCADE: удаление user удаляет все его доп. TG-аккаунты.
 */

import { pgTable, uuid, bigint, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const userTelegramAccounts = pgTable(
  'user_telegram_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull(),
    telegramUsername: varchar('telegram_username', { length: 64 }),
    /** Короткая метка для себя — «Рабочий 1», «Рабочий 2» и т.п. */
    label: varchar('label', { length: 60 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Один и тот же Telegram нельзя привязать дважды — ни сюда, ни в users.telegramId
    // (второе проверяется в сервисе явным SELECT, кросс-табличный constraint СУБД не выразить).
    telegramIdIdx: uniqueIndex('user_telegram_accounts_telegram_id_unique').on(table.telegramId),
    userIdx: index('user_telegram_accounts_user_id_idx').on(table.userId),
  }),
);

export const userTelegramAccountsRelations = relations(userTelegramAccounts, ({ one }) => ({
  user: one(users, { fields: [userTelegramAccounts.userId], references: [users.id] }),
}));

export type UserTelegramAccount = typeof userTelegramAccounts.$inferSelect;
export type NewUserTelegramAccount = typeof userTelegramAccounts.$inferInsert;
