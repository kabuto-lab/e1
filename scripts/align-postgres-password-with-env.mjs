/**
 * Выравнивает пароль роли из DATABASE_URL (имя пользователя из URL) в Docker-контейнере под .env.
 * Нужен, когда .env и реальная БД разъехались (28P01). Dollar-quoting — безопасно для кавычек в пароле.
 * Идемпотентно: если подключение с DATABASE_URL уже успешно, ALTER не выполняется.
 *
 * Использование (из корня репо): node scripts/align-postgres-password-with-env.mjs
 * Опция: POSTGRES_CONTAINER=escort-postgres (по умолчанию escort-postgres)
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
if (!existsSync(envPath)) {
  console.error('Нет файла', envPath);
  process.exit(1);
}
{
  const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  const parsed = dotenv.parse(raw);
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string') process.env[k] = v;
  }
}

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('DATABASE_URL не задан в .env');
  process.exit(1);
}

const container = process.env.POSTGRES_CONTAINER || 'escort-postgres';
const u = new URL(raw.replace(/^postgresql:/i, 'http:'));
const pwd = decodeURIComponent(u.password || '');
const dbUser = decodeURIComponent((u.username || 'postgres').replace(/^\/+/, '') || 'postgres');

function isPasswordAuthFailed(msg) {
  return /password authentication failed|28P01/i.test(msg);
}

async function tryConnect(connectionUrl) {
  const sql = postgres(connectionUrl, { max: 1, connect_timeout: 12 });
  try {
    await sql`select 1 as ok`;
    await sql.end({ timeout: 2 });
    return { ok: true };
  } catch (e) {
    const msg = String(e?.message ?? e);
    await sql.end({ timeout: 1 }).catch(() => {});
    return { ok: false, msg };
  }
}

/** Идентификатор роли для ALTER USER (безопасная подстановка в SQL). */
function pgQuoteIdent(ident) {
  const s = String(ident);
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

async function main() {
  const first = await tryConnect(raw);
  if (first.ok) {
    console.log(
      `OK: подключение с DATABASE_URL успешно — пароль роли ${dbUser} уже совпадает, ALTER не выполняется.`,
    );
    return;
  }

  if (!isPasswordAuthFailed(first.msg)) {
    console.error('Ошибка подключения (не пароль):', first.msg);
    process.exit(1);
  }

  const tag = `p${crypto.randomBytes(8).toString('hex')}`;
  const sql = `ALTER USER ${pgQuoteIdent(dbUser)} WITH PASSWORD $${tag}$${pwd}$${tag}$`;

  execFileSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-c', sql], {
    stdio: 'inherit',
    cwd: root,
  });
  console.log(`OK: пароль роли ${dbUser} в контейнере совпал с паролем из DATABASE_URL (.env)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
