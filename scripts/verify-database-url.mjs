/**
 * Проверяет DATABASE_URL из корневого .env до старта API (VPS / локально).
 * Выход 0 — SELECT 1 прошёл; иначе понятное сообщение и код 1.
 *
 * Запуск из корня: node scripts/verify-database-url.mjs
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

if (!existsSync(envPath)) {
  console.error(`[verify-database] Нет файла ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath, override: true });
const url = process.env.DATABASE_URL?.trim();
if (!url || !url.startsWith('postgresql')) {
  console.error('[verify-database] DATABASE_URL не задан или не postgresql:// — см. .env.example');
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 8 });

try {
  await sql`select 1 as ok`;
  console.log('[verify-database] OK: PostgreSQL отвечает, строка подключения рабочая.');
  await sql.end({ timeout: 2 });
  process.exit(0);
} catch (e) {
  const msg = String(e?.message ?? e);
  await sql.end({ timeout: 1 }).catch(() => {});

  if (/password authentication failed|28P01/i.test(msg)) {
    console.error(
      '[verify-database] Ошибка: пароль/пользователь в DATABASE_URL не совпадают с PostgreSQL.',
    );
    console.error(
      '  • Проверьте .env на VPS и перезагрузите PM2 из ecosystem (см. npm run pm2:reload-api).',
    );
    console.error(
      '  • Если БД в Docker и пароль в томе старый: npm run db:align-password (или ALTER USER вручную).',
    );
  } else if (/ECONNREFUSED|connect ECONNREFUSED/i.test(msg)) {
    console.error('[verify-database] Ошибка: PostgreSQL не слушает хост/порт из DATABASE_URL (сервис не запущен?).');
  } else if (/ENOTFOUND|getaddrinfo/i.test(msg)) {
    console.error('[verify-database] Ошибка: хост из DATABASE_URL не резолвится.');
  } else {
    console.error('[verify-database] Ошибка подключения:', msg);
  }
  process.exit(1);
}
