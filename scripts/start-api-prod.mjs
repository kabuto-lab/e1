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

/** Nest с path mapping на packages/db даёт вложенный dist; без symlink — плоский dist/main.js. */
function resolveApiMainJs(repoRoot) {
  const candidates = [
    path.join(repoRoot, 'apps/api/dist/apps/api/src/main.js'),
    path.join(repoRoot, 'apps/api/dist/main.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const mainJs = resolveApiMainJs(root);
if (!mainJs) {
  console.error(
    '[start-api-prod] Нет собранного entrypoint API. Ожидались файлы:\n' +
      '  apps/api/dist/apps/api/src/main.js (монорепо + @escort/db через paths)\n' +
      '  или apps/api/dist/main.js\n' +
      'Соберите API из корня репозитория: npm run build --workspace=@escort/api',
  );
  process.exit(1);
}

const run = spawnSync(node, [mainJs], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
process.exit(run.status ?? 1);
