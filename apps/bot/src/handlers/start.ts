/**
 * /start handler.
 *
 *   /start               → приветствие + инструкция
 *   /start link_<token>  → потребить link-token и привязать web-юзера к текущему TG-id
 */

import type { Context } from 'grammy';
import { ApiClient, ApiError } from '../api-client';

const LINK_PREFIX = 'link_';
const MODEL_PREFIX = 'model_';
const TOKEN_REGEX = /^[a-f0-9]{64}$/i;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    if (payload.startsWith(MODEL_PREFIX)) {
      const modelId = payload.slice(MODEL_PREFIX.length);
      if (!UUID_REGEX.test(modelId)) {
        await ctx.reply('Ссылка повреждена — попробуйте открыть анкету заново и нажать «Связаться» ещё раз.');
        return;
      }
      try {
        const result = await api.sendModelContactRequest({
          modelId,
          telegramId: tgId,
          telegramUsername: ctx.from?.username,
        });
        await ctx.reply(
          result.notified
            ? `Готово! Мы передали ваш запрос по анкете «${result.displayName}» — с вами свяжутся здесь, в Telegram.`
            : `Не получилось передать запрос по анкете «${result.displayName}» — попробуйте написать на платформе.`,
        );
      } catch (err) {
        console.error('[start] contact-request failed:', err);
        await ctx.reply('Не получилось передать запрос. Попробуйте написать на платформе.');
      }
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
