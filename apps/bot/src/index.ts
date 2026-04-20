/**
 * Lovnge Telegram bot — точка входа.
 *
 * Что умеет сейчас (MVP):
 *   /start              — приветствие
 *   /start link_<token> — привязать web-аккаунт к текущему TG-пользователю
 *
 * Запуск (dev, polling):
 *   cd apps/bot && cp .env.example .env && <заполни BOT_TOKEN и BOT_SECRET> && npm run dev
 *
 * Для prod нужен webhook — добавим позже.
 */

import { Bot, GrammyError, HttpError } from 'grammy';
import { loadEnv } from './env';
import { ApiClient } from './api-client';
import { makeStartHandler } from './handlers/start';
import { makeRegisterHandler } from './handlers/register';
import { makeMeHandler } from './handlers/me';

async function main() {
  const env = loadEnv();
  const api = new ApiClient(env);
  const bot = new Bot(env.BOT_TOKEN);

  bot.command('start', makeStartHandler(api));
  bot.command('register', makeRegisterHandler(api, env.SITE_URL));
  bot.command('me', makeMeHandler(api));

  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Команды бота:\n\n' +
        '/start — приветствие\n' +
        '/start link_<token> — привязать существующий web-аккаунт (ссылка приходит из ЛК)\n' +
        '/register — создать новый клиентский аккаунт без email/пароля\n' +
        '/me — показать статус привязки\n\n' +
        'Уведомления о бронях и эскроу появятся после первой брони.',
    );
  });

  bot.catch((err) => {
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error('[bot] Grammy error:', e.description);
    } else if (e instanceof HttpError) {
      console.error('[bot] Network error:', e.message);
    } else {
      console.error('[bot] Unexpected error:', e);
    }
  });

  console.log(`[bot] starting polling (API=${env.API_URL})`);
  await bot.start({
    drop_pending_updates: true,
    onStart: (info) => console.log(`[bot] @${info.username} ready`),
  });
}

main().catch((err) => {
  console.error('[bot] fatal:', err);
  process.exit(1);
});
