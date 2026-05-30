/* eslint-disable no-console */
/**
 * seed-girls.ts — импорт каталога моделей (Class-G `girls`) из
 * salonmassage-реплики в NAS.
 *
 * Источник параметров: `src/scripts/girls-seed-data.json` (сгенерирован
 * `_gen-girls-seed.mjs` из HTML-анкет). Фото — сканируются из
 * `apps/web/public/model-library/<slug>/NN.webp` (ассеты уже скопированы в
 * проект), поэтому mediaKeys всегда совпадают с тем, что реально лежит.
 *
 * Идемпотентно: upsert по `slug`. Параметры пишутся в `params` jsonb
 * (age/height/weight/breast/silicon + active), фото — в `media_keys` как
 * публичные пути `model-library/<slug>/NN.webp`.
 *
 * NB: схема `girls.media_keys` задумана под S3-ключи MinIO; здесь — публичные
 * пути статики Next (MVP). Перевод на MinIO — отдельный шаг (см. SESSION_LOG).
 *
 * Usage (from `barbie/SITE1/apps/api`):
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-girls.ts
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { getDb, closeDb, girls } from '@barbie-site1/db';

function loadEnv(): void {
  const cwd = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? cwd : resolve(cwd, ...Array(depth).fill('..'));
    const envPath = resolve(base, '.env');
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
      return;
    }
  }
}
loadEnv();

interface SeedRow {
  slug: string;
  name: string;
  params: { age: number; height: number | null; weight: number | null; breast: number | null; silicon: boolean };
}

const DATA_PATH = resolve(__dirname, 'girls-seed-data.json');
const PUBLIC_LIB = resolve(__dirname, '../../../web/public/model-library');

function photosFor(slug: string): string[] {
  const dir = resolve(PUBLIC_LIB, slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d+\.webp$/.test(f)) // base photos only (NN.webp), not NN-lg.webp
    .sort()
    .map((f) => `model-library/${slug}/${f}`);
}

async function main(): Promise<void> {
  const rows = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as SeedRow[];
  const db = getDb();

  let inserted = 0;
  let updated = 0;
  let totalPhotos = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const mediaKeys = photosFor(r.slug);
    totalPhotos += mediaKeys.length;

    const params = { ...r.params, active: true };

    const result = await db
      .insert(girls)
      .values({ slug: r.slug, name: r.name, params, mediaKeys, ord: i })
      .onConflictDoUpdate({
        target: girls.slug,
        set: { name: r.name, params, mediaKeys, ord: i, updatedAt: sql`now()` },
      })
      .returning({ id: girls.id, createdAt: girls.createdAt, updatedAt: girls.updatedAt });

    const row = result[0];
    if (row && row.createdAt.getTime() === row.updatedAt.getTime()) inserted++;
    else updated++;

    if (mediaKeys.length === 0) console.warn(`  ⚠ ${r.slug}: нет фото в public/model-library`);
  }

  console.log(`✓ girls seeded: ${inserted} inserted, ${updated} updated, ${rows.length} total · ${totalPhotos} photos`);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
