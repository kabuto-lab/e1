/**
 * Выравнивает пароль роли из DATABASE_URL (имя пользователя из URL) в Docker-контейнере под .env.
 * Нужен, когда .env и реальная БД разъехались (28P01). Dollar-quoting — безопасно для кавычек в пароле.
 *
 * Использование (из корня репо): node scripts/align-postgres-password-with-env.mjs
 * Опция: CONTAINER=escort-postgres (по умолчанию escort-postgres)
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
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
const dbUser = decodeURIComponent((u.username || 'postgres').replace(/^\/+/, '') || 'postgres');

/** Идентификатор роли для ALTER USER (безопасная подстановка в SQL). */
function pgQuoteIdent(ident) {
  const s = String(ident);
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

const tag = `p${crypto.randomBytes(8).toString('hex')}`;
const sql = `ALTER USER ${pgQuoteIdent(dbUser)} WITH PASSWORD $${tag}$${pwd}$${tag}$`;

/* Без shell: иначе /bin/sh подставляет $tag в строке -c как переменные и ломает dollar-quoting. */
execFileSync(
  'docker',
  ['exec', container, 'psql', '-U', 'postgres', '-c', sql],
  { stdio: 'inherit', cwd: root },
);
console.log(`OK: пароль роли ${dbUser} в контейнере совпал с паролем из DATABASE_URL (.env)`);
