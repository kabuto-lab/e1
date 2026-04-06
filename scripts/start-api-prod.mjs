/**
 * Старт собранного API в проде: сначала проверка DATABASE_URL, затем main.js.
 * PM2 и npm run start:prod должны вызывать этот файл, чтобы БД проверялась всегда.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

const verify = spawnSync(node, [path.join(root, 'scripts/verify-database-url.mjs')], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
if (verify.status !== 0) {
  process.exit(verify.status ?? 1);
}

const mainJs = path.join(root, 'apps/api/dist/apps/api/src/main.js');
const run = spawnSync(node, [mainJs], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});
process.exit(run.status ?? 1);
