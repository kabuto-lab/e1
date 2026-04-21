/**
 * Environment validation — zod-схема для env-переменных бота.
 * Читает apps/bot/.env, падает с внятным сообщением, если чего-то нет.
 */

import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

loadDotenv({ path: resolve(__dirname, '../.env'), override: true });

const envSchema = z
  .object({
    BOT_TOKEN: z
      .string()
      .min(20, { message: 'BOT_TOKEN нужно получить у @BotFather (формат <digits>:<alnum>)' }),
    API_URL: z.string().url({ message: 'API_URL должен быть валидным URL (http://127.0.0.1:3000)' }),
    BOT_SECRET: z
      .string()
      .min(24, { message: 'BOT_SECRET должен совпадать с TELEGRAM_BOT_SECRET в корневом .env (мин. 24 символа)' }),
    SITE_URL: z.string().url().optional(),
    DEFAULT_LOCALE: z.enum(['ru', 'en']).default('ru'),

    /** polling — long-polling (dev); webhook — Telegram шлёт POST на BOT_WEBHOOK_URL (prod/VPS). */
    BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
    /** Публичный HTTPS URL для webhook. Обязателен при BOT_MODE=webhook. Пример: https://api.lovnge.com/bot/webhook */
    BOT_WEBHOOK_URL: z.string().url().optional(),
    /** Порт локального HTTP-сервера бота в webhook-режиме (reverse-proxy прокинет сюда). */
    BOT_PORT: z.coerce.number().int().min(1024).max(65535).default(3002),
  })
  .refine((data) => data.BOT_MODE !== 'webhook' || !!data.BOT_WEBHOOK_URL, {
    message: 'BOT_WEBHOOK_URL обязателен при BOT_MODE=webhook',
    path: ['BOT_WEBHOOK_URL'],
  });

export type BotEnv = z.infer<typeof envSchema>;

export function loadEnv(): BotEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Ошибка в apps/bot/.env:');
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('');
    console.error('Скопируй apps/bot/.env.example → apps/bot/.env и заполни.');
    process.exit(1);
  }
  return parsed.data;
}
