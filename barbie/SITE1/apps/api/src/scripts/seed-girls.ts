/* eslint-disable no-console */
/**
 * seed-girls.ts — импорт каталога моделей (Class-G `girls`) из
 * barbiespa-анкет (WP-экспорт) в NAS.
 *
 * Источник параметров: `src/scripts/girls-seed-data.json` (сгенерирован
 * `_SALON/extract_models.py` из WP `nashi-mastera`). Фото — сканируются из
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
import { sql, notInArray } from 'drizzle-orm';
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
  params: {
    age: number | null;
    height: number | null;
    weight: number | null;
    breast: number | null;
    silicon: boolean;
    vip?: boolean;
    nameEn?: string;
  };
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

// Видео модели — отдельный subdir model-library/<slug>/video/NN.(mp4|webm).
// Сканируется с диска, как и фото → params.videoKeys переживает re-seed.
function videosFor(slug: string): string[] {
  const dir = resolve(PUBLIC_LIB, slug, 'video');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d+\.(mp4|webm)$/i.test(f))
    .sort()
    .map((f) => `model-library/${slug}/video/${f}`);
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
    const videoKeys = videosFor(r.slug);

    // Без фото — модель скрыта (active:false), чтобы не отдавать битые карточки
    // на публичные сайты. В /admin анкета остаётся видимой (с бейджем «скрыта»).
    // videoKeys пишем только если есть (не засоряем params пустым массивом).
    const params = {
      ...r.params,
      active: mediaKeys.length > 0,
      ...(videoKeys.length ? { videoKeys } : {}),
    };

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

  // Полный re-import: barbiespa — источник правды. Удаляем модели, которых нет
  // в текущем наборе (старый salonmassage-каталог).
  const keepSlugs = rows.map((r) => r.slug);
  const removed = await db
    .delete(girls)
    .where(notInArray(girls.slug, keepSlugs))
    .returning({ slug: girls.slug });
  if (removed.length) {
    console.log(`  removed ${removed.length} orphan girls: ${removed.map((r) => r.slug).join(', ')}`);
  }

  console.log(`✓ girls seeded: ${inserted} inserted, ${updated} updated, ${rows.length} total · ${totalPhotos} photos`);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
