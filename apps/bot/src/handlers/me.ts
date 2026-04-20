/**
 * /me — показывает пользователю, привязан ли его Telegram и какая роль.
 * Реализовано через /auth/telegram/login: если 401 — нет аккаунта, предлагаем /register.
 * Мы НЕ возвращаем полученный JWT пользователю — только статус.
 */

import type { Context } from 'grammy';
import { ApiClient, ApiError } from '../api-client';

export function makeMeHandler(api: ApiClient) {
  return async (ctx: Context) => {
    const tgId = ctx.from?.id?.toString();
    if (!tgId) {
      await ctx.reply('Не удалось определить Telegram ID.');
      return;
    }

    try {
      const result = await api.loginByTelegramId(tgId);
      await ctx.reply(
        `Ты залогинен как ${result.user.role} (${result.user.status}).\n\n` +
          `Telegram: @${result.user.telegramUsername ?? '—'}\n` +
          `ID: ${result.user.id}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await ctx.reply(
          'У тебя ещё нет аккаунта Lovnge, связанного с этим Telegram.\n' +
            'Используй /register чтобы создать клиентский аккаунт, ' +
            'или /start link_<token> если уже зарегался на сайте.',
        );
        return;
      }
      console.error('[me] failed:', err);
      await ctx.reply('Не получилось проверить статус. Попробуй позже.');
    }
  };
}
