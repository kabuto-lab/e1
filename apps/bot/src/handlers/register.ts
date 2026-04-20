/**
 * /register — создаёт TG-only client через бэк и подтверждает пользователю.
 *
 * Успех → "Зарегистрирован" + ссылка на веб. Access-token не возвращаем пользователю:
 * JWT в URL не безопасно (логи, share-sheet). Web-вход будет через стандартный
 * email/password ИЛИ позже — через callback-страницу, которая принимает
 * одноразовый short-lived exchange token.
 */

import type { Context } from 'grammy';
import { ApiClient, ApiError } from '../api-client';

export function makeRegisterHandler(api: ApiClient, siteUrl?: string) {
  return async (ctx: Context) => {
    const tgId = ctx.from?.id?.toString();
    if (!tgId) {
      await ctx.reply('Не удалось определить Telegram ID. Попробуйте позже.');
      return;
    }

    try {
      const result = await api.registerByTelegram({
        telegramId: tgId,
        telegramUsername: ctx.from?.username,
        telegramLanguageCode: ctx.from?.language_code,
        role: 'client',
      });
      const webHint = siteUrl ? `\n\nЛК: ${siteUrl}/cabinet` : '';
      await ctx.reply(
        `✓ Аккаунт создан. Роль: ${result.user.role}.${webHint}\n\nТеперь можешь бронировать моделей прямо отсюда.`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          await ctx.reply(
            'У тебя уже есть аккаунт Lovnge, привязанный к этому Telegram. Используй /me чтобы проверить.',
          );
          return;
        }
        if (err.status === 503) {
          await ctx.reply('Регистрация временно недоступна. Попробуй позже.');
          return;
        }
      }
      console.error('[register] failed:', err);
      await ctx.reply('Не получилось создать аккаунт. Попробуй ещё раз через минуту.');
    }
  };
}
