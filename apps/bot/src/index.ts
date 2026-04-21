/**
 * Lovnge Telegram bot — точка входа.
 *
 * Что умеет сейчас (MVP):
 *   /start              — приветствие
 *   /start link_<token> — привязать web-аккаунт к текущему TG-пользователю
 *
 * Dev (polling):
 *   cd apps/bot && cp .env.example .env && <BOT_TOKEN, BOT_SECRET> && npm run dev
 *
 * Prod (webhook, VPS):
 *   BOT_MODE=webhook BOT_WEBHOOK_URL=https://api.lovnge.com/bot/webhook BOT_PORT=3002
 *   Reverse-proxy (nginx) прокидывает /bot/webhook -> 127.0.0.1:3002.
 *   Webhook secret_token = BOT_SECRET (тот же, что API проверяет в x-bot-secret).
 */

import { createServer } from 'http';
import { Bot, GrammyError, HttpError, webhookCallback } from 'grammy';
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

  if (env.BOT_MODE === 'webhook') {
    await startWebhook(bot, env);
  } else {
    await startPolling(bot, env);
  }
}

async function startPolling(bot: Bot, env: ReturnType<typeof loadEnv>) {
  console.log(`[bot] starting polling (API=${env.API_URL})`);
  await bot.start({
    drop_pending_updates: true,
    onStart: (info) => console.log(`[bot] @${info.username} ready (polling)`),
  });
}

async function startWebhook(bot: Bot, env: ReturnType<typeof loadEnv>) {
  // BOT_WEBHOOK_URL проверен refine() в env-схеме — здесь он точно есть.
  const webhookUrl = env.BOT_WEBHOOK_URL!;
  const handleUpdate = webhookCallback(bot, 'http', {
    secretToken: env.BOT_SECRET,
  });

  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/bot/webhook') {
      handleUpdate(req, res).catch((err) => {
        console.error('[bot] webhook handler failed:', err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.end();
        }
      });
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/plain');
      res.end('ok');
      return;
    }
    res.statusCode = 404;
    res.end();
  });

  server.listen(env.BOT_PORT, () => {
    console.log(`[bot] webhook server listening on :${env.BOT_PORT}`);
  });

  await bot.init();
  await bot.api.setWebhook(webhookUrl, {
    secret_token: env.BOT_SECRET,
    drop_pending_updates: true,
  });
  console.log(
    `[bot] @${bot.botInfo.username} ready (webhook=${webhookUrl}, API=${env.API_URL})`,
  );

  const shutdown = async (signal: string) => {
    console.log(`[bot] ${signal} received, shutting down`);
    server.close();
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: false });
    } catch (err) {
      console.warn('[bot] deleteWebhook on shutdown failed:', err);
    }
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[bot] fatal:', err);
  process.exit(1);
});
