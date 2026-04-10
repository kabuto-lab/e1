/**
 * Один источник правды для пароля Postgres (вариант 1): POSTGRES_PASSWORD в .env должен совпадать
 * с паролем в DATABASE_URL. Иначе при первом создании тома контейнер получит пароль из compose,
 * а API — другой из URL → каждый deploy с пересозданием тома или рассинхрон источников.
 *
 * Compose: POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
 * Если POSTGRES_PASSWORD в .env не задан, ожидаем пароль «postgres» в URL.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

if (!existsSync(envPath)) {
  console.error('[check-postgres-env] Нет файла', envPath);
  process.exit(1);
}

dotenv.config({ path: envPath, override: true });

const raw = process.env.DATABASE_URL?.trim();
if (!raw || !raw.startsWith('postgresql')) {
  console.error('[check-postgres-env] DATABASE_URL не задан или не postgresql://');
  process.exit(1);
}

let u;
try {
  u = new URL(raw.replace(/^postgresql:/i, 'http:'));
} catch {
  console.error('[check-postgres-env] Некорректный DATABASE_URL');
  process.exit(1);
}

const urlPw = decodeURIComponent(u.password || '');
const composeExplicit = process.env.POSTGRES_PASSWORD;
const composePw =
  composeExplicit !== undefined && composeExplicit !== '' ? composeExplicit : 'postgres';

if (urlPw !== composePw) {
  console.error('[check-postgres-env] Расхождение: POSTGRES_PASSWORD (docker-compose) ≠ пароль в DATABASE_URL.');
  console.error(
    '  Задайте в .env одно значение в обоих местах — см. .env.example (POSTGRES_PASSWORD + DATABASE_URL).',
  );
  console.error(
    '  После смены пароля на существующем томе: npm run ensure:database (или db:align-password).',
  );
  process.exit(1);
}

console.log('[check-postgres-env] OK: POSTGRES_PASSWORD и пароль в DATABASE_URL совпадают.');
