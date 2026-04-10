/**
 * Для VPS после git pull: гарантирует, что API сможет подключиться к PostgreSQL.
 * 1) Проверка DATABASE_URL (как verify-database-url.mjs).
 * 2) При 28P01 и запущенном контейнере POSTGRES_CONTAINER — запуск align-postgres-password-with-env.mjs и повторная проверка.
 *
 * Запуск из корня: node scripts/ensure-database-url.mjs
 * Входит в npm run vps:after-pull.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

if (!existsSync(envPath)) {
  console.error('[ensure-database] Нет файла', envPath);
  process.exit(1);
}

{
  const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  const parsed = dotenv.parse(raw);
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string') process.env[k] = v;
  }
}
const url = process.env.DATABASE_URL?.trim();
if (!url || !url.startsWith('postgresql')) {
  console.error('[ensure-database] DATABASE_URL не задан или не postgresql:// — см. .env.example');
  process.exit(1);
}

function isPasswordAuthFailed(msg) {
  return /password authentication failed|28P01/i.test(msg);
}

function dockerContainerRunning(name) {
  const r = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', name], {
    encoding: 'utf8',
    cwd: root,
  });
  return r.status === 0 && String(r.stdout || '').trim() === 'true';
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

async function main() {
  let r = await tryConnect(url);
  if (r.ok) {
    console.log('[ensure-database] OK: PostgreSQL отвечает, строка подключения рабочая.');
    return;
  }

  if (!isPasswordAuthFailed(r.msg)) {
    console.error('[ensure-database] Ошибка подключения:', r.msg);
    if (/ECONNREFUSED|connect ECONNREFUSED/i.test(r.msg)) {
      console.error('  Поднимите PostgreSQL (docker compose / systemd) и проверьте хост:порт в DATABASE_URL.');
    } else if (/ENOTFOUND|getaddrinfo/i.test(r.msg)) {
      console.error('  Хост из DATABASE_URL не резолвится.');
    }
    process.exit(1);
  }

  const container = process.env.POSTGRES_CONTAINER || 'escort-postgres';
  console.error('[ensure-database] PostgreSQL отклонил пароль (несовпадение с ролью в БД).');

  if (dockerContainerRunning(container)) {
    console.log(
      `[ensure-database] Контейнер «${container}» запущен — выравниваю пароль роли из DATABASE_URL под .env…`,
    );
    const align = spawnSync(process.execPath, [path.join(root, 'scripts/align-postgres-password-with-env.mjs')], {
      stdio: 'inherit',
      cwd: root,
      env: { ...process.env },
    });
    if (align.status !== 0) {
      console.error('[ensure-database] Скрипт выравнивания пароля завершился с ошибкой.');
      process.exit(1);
    }
    r = await tryConnect(url);
    if (r.ok) {
      console.log('[ensure-database] OK: после ALTER USER подключение успешно.');
      return;
    }
    console.error('[ensure-database] После выравнивания пароля ошибка:', r.msg);
    process.exit(1);
  }

  console.error(
    `[ensure-database] Контейнер Docker «${container}» не запущен — автоматический ALTER USER недоступен.`,
  );
  console.error('  Варианты:');
  console.error(`    • Поднимите Postgres в Docker с именем контейнера «${container}» и снова npm run ensure:database`);
  console.error('    • Или выполните на сервере БД: ALTER USER <роль_из_DATABASE_URL> WITH PASSWORD \'…\';');
  console.error('    • После смены .env всегда: npm run pm2:reload-api (не «pm2 restart» — см. ecosystem.config.cjs).');
  process.exit(1);
}

main().catch((e) => {
  console.error('[ensure-database]', e);
  process.exit(1);
});
