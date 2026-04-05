/**
 * Выравнивает пароль роли postgres в Docker-контейнере под пароль из DATABASE_URL в корневом .env.
 * Нужен, когда .env и реальная БД разъехались (28P01). Dollar-quoting — безопасно для кавычек в пароле.
 *
 * Использование (из корня репо): node scripts/align-postgres-password-with-env.mjs
 * Опция: CONTAINER=escort-postgres (по умолчанию escort-postgres)
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
if (!existsSync(envPath)) {
  console.error('Нет файла', envPath);
  process.exit(1);
}
dotenv.config({ path: envPath });

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('DATABASE_URL не задан в .env');
  process.exit(1);
}

const container = process.env.POSTGRES_CONTAINER || 'escort-postgres';
const u = new URL(raw.replace(/^postgresql:/i, 'http:'));
const pwd = decodeURIComponent(u.password || '');
const tag = `p${crypto.randomBytes(8).toString('hex')}`;
const sql = `ALTER USER postgres WITH PASSWORD $${tag}$${pwd}$${tag}$`;

execSync(`docker exec ${container} psql -U postgres -c ${JSON.stringify(sql)}`, {
  stdio: 'inherit',
  cwd: root,
});
console.log('OK: пароль postgres в контейнере совпал с паролем из DATABASE_URL (.env)');
