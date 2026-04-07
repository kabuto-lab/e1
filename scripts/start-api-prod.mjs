/**
 * Старт собранного API в проде: ensure (проверка + при 28P01 ALTER в Docker), затем main.js.
 * Частая ситуа на VPS: пароль в томе Postgres и в .env снова разъехались — без ensure API падает в 503.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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
