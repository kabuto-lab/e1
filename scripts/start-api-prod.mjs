/**
 * Старт собранного API в проде: ensure (проверка + при 28P01 ALTER в Docker), затем main.js.
 * Частая ситуа на VPS: пароль в томе Postgres и в .env снова разъехались — без ensure API падает в 503.
 *
 * Сначала подмешиваем корневой .env с override: true — иначе PM2 может держать старый DATABASE_URL
 * в process.env, а npm run ensure:database (читает файл) выровняет БД под .env → Nest получит 28P01.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  const parsed = dotenv.parse(raw);
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === 'string') process.env[k] = v;
  }
}
const node = process.execPath;

const ensure = spawnSync(node, [path.join(root, 'scripts/ensure-database-url.mjs')], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
if (ensure.status !== 0) {
  process.exit(ensure.status ?? 1);
}

const mainJs = path.join(root, 'apps/api/dist/apps/api/src/main.js');
const run = spawnSync(node, [mainJs], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
process.exit(run.status ?? 1);
