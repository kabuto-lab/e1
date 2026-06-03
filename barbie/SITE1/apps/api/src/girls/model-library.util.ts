/**
 * Резолв пути к статике каталога моделей `apps/web/public/model-library`.
 *
 * Каталог `girls` хранит фото как публичные пути статики Next (а не S3) —
 * см. seed-girls.ts. API пишет загруженные webp сюда, Next отдаёт их статикой.
 *
 * Резолв робастен к dev (ts-node, cwd=apps/api) и prod (compiled dist, иной
 * layout/cwd): env `MODEL_LIBRARY_DIR` имеет приоритет; иначе walk-up от cwd в
 * поисках `apps/web/public`. Без зависимости от `__dirname` (ломается в dist).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function modelLibraryDir(): string {
  const fromEnv = process.env.MODEL_LIBRARY_DIR;
  if (fromEnv) return fromEnv;

  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const pub = resolve(dir, 'apps', 'web', 'public');
    if (existsSync(pub)) return resolve(pub, 'model-library');
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // Фолбэк — относительно cwd (создастся при первой записи).
  return resolve(process.cwd(), 'apps', 'web', 'public', 'model-library');
}
