/**
 * /start handler.
 *
 *   /start               → приветствие + инструкция
 *   /start link_<token>  → потребить link-token и привязать web-юзера к текущему TG-id
 */

import type { Context } from 'grammy';
import { ApiClient, ApiError } from '../api-client';

const LINK_PREFIX = 'link_';
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

export function makeStartHandler(api: ApiClient) {
  return async (ctx: Context) => {
    const text = ctx.message?.text ?? '';
    const payload = text.split(/\s+/, 2)[1] ?? '';
    const tgId = ctx.from?.id?.toString();

    if (!tgId) {
      await ctx.reply('Не удалось определить ваш Telegram ID — попробуйте позже.');
      return;
    }

    if (!payload) {
      await ctx.reply(
        'Привет! Этот бот — для привязки аккаунта Lovnge и уведомлений.\n\n' +
          'Чтобы привязать аккаунт — войди на сайте, открой Настройки → Telegram и нажми «Привязать». Бот получит ссылку с токеном и свяжет аккаунт автоматически.',
      );
      return;
    }

    if (!payload.startsWith(LINK_PREFIX)) {
      await ctx.reply('Не понял команду. Используй /start из ЛК — он сам подставит токен.');
      return;
    }

    const token = payload.slice(LINK_PREFIX.length);
    if (!TOKEN_REGEX.test(token)) {
      await ctx.reply('Токен повреждён. Сгенерируй новый в Настройки → Telegram.');
      return;
    }

    try {
      const result = await api.consumeLinkToken({
        token,
        telegramId: tgId,
        telegramUsername: ctx.from?.username,
        telegramLanguageCode: ctx.from?.language_code,
      });
      await ctx.reply(
        `✓ Готово! Telegram привязан к твоему Lovnge-аккаунту.\nID: ${result.userId}`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          await ctx.reply('Токен просрочен или уже использован. Сгенерируй новый в ЛК.');
          return;
        }
        if (err.status === 409) {
          await ctx.reply('Этот Telegram уже привязан к другому аккаунту Lovnge.');
          return;
        }
        if (err.status === 503) {
          await ctx.reply('Сервис линковки временно недоступен. Попробуй позже.');
          return;
        }
      }
      console.error('[start] consume failed:', err);
      await ctx.reply('Не получилось привязать аккаунт. Попробуй ещё раз через минуту.');
    }
  };
}
