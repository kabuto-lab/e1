/**
 * Выкачивает стоковые картинки (Unsplash + Picsum из stock-media-sources),
 * заливает в MinIO и создаёт строки media_files для каждой модели — публичный профиль
 * получает реальные cdn_url вместо хотлинков.
 *
 * Для каждой модели набор свой: общий пул ротируется по id (разная главная и порядок),
 * плюс несколько снимков Picsum с seed на этот профиль — не те же файлы, что у соседней анкеты.
 *
 * Требования: DATABASE_URL, Docker MinIO (или S3-совместимое), переменные как у API.
 *
 * Запуск из корня репозитория:
 *   cd apps/api && npx ts-node -r tsconfig-paths/register src/scripts/ingest-stock-media.ts
 *
 * Флаги:
 *   --force          — добавить стоки даже если у модели уже есть медиа
 *   --count=N        — не больше N файлов на модель (по порядку списка; по умолчанию все)
 *   --dry-run        — только скачать в кэш и вывести план, без S3/БД
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

import { sourcesForModelProfile, type StockSource } from './stock-media-sources';

function loadRootEnv(): void {
  const root = path.resolve(__dirname, '../../../../');
  const f = path.join(root, '.env');
  if (!fs.existsSync(f)) return;
  const text = fs.readFileSync(f, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadRootEnv();

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Короткий таймаут на «основной» URL — быстрее переключаемся на fallback (Unsplash/Picsum часто висят/блокируются). */
const FETCH_TIMEOUT_MS = 18_000;
const RETRIES_PER_URL = 1;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadOne(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function downloadWithFallbacks(
  primary: string,
  fallbacks: string[] = [],
): Promise<{ buffer: Buffer; usedUrl: string }> {
  const chain = [primary, ...fallbacks];
  let lastErr: Error | null = null;
  for (const url of chain) {
    for (let attempt = 0; attempt < RETRIES_PER_URL; attempt++) {
      try {
        const buffer = await downloadOne(url);
        return { buffer, usedUrl: url };
      } catch (e: unknown) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        if (attempt < RETRIES_PER_URL - 1) await sleep(500);
      }
    }
    await sleep(150);
  }
  throw lastErr ?? new Error('Download failed');
}

async function getBufferForSource(
  s: StockSource,
  cache: Map<string, Buffer>,
  log: Console,
): Promise<Buffer | undefined> {
  const hit = cache.get(s.key);
  if (hit) return hit;
  try {
    const { buffer, usedUrl } = await downloadWithFallbacks(s.url, s.fallbackUrls ?? []);
    cache.set(s.key, buffer);
    const kb = Math.round(buffer.length / 1024);
    const src =
      usedUrl === s.url ? 'primary' : usedUrl.includes('pravatar.cc') ? 'fallback pravatar' : 'fallback randomuser';
    log.log(`  OK ${s.key} (${kb} KB, ${src})`);
    await sleep(200);
    return buffer;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`  FAIL ${s.key}: ${msg}`);
    return undefined;
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const dryRun = argv.includes('--dry-run');
  let count: number | undefined;
  const c = argv.find((a) => a.startsWith('--count='));
  if (c) {
    const n = parseInt(c.split('=')[1], 10);
    if (!Number.isNaN(n) && n > 0) count = n;
  }
  return { force, dryRun, count };
}

async function main() {
  const log = console;
  const { force, dryRun, count } = parseArgs();

  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL не задан (.env в корне репозитория).');
    process.exit(1);
  }

  const endpointRaw = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const s3Endpoint = endpointRaw.startsWith('http') ? endpointRaw : `http://${endpointRaw}`;
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
  const bucket = process.env.MINIO_BUCKET || 'escort-media';
  const publicUrl = (process.env.MINIO_PUBLIC_URL || s3Endpoint).replace(/\/$/, '');

  const cache = new Map<string, Buffer>();
  log.log(
    'Режим: на каждую модель — свой порядок общего пула + уникальные picsum-seed; скачивание по мере нужды (кэш по key).',
  );

  if (dryRun) {
    log.log('[dry-run] Скачивание образца (один условный profile id), без MinIO и БД.');
    const sample = sourcesForModelProfile('00000000-0000-0000-0000-000000000001');
    const want = count ? sample.slice(0, count) : sample;
    for (const s of want) {
      await getBufferForSource(s, cache, log);
    }
    log.log(`[dry-run] В кэше: ${cache.size} / ${want.length} ключей.`);
    process.exit(0);
  }

  const s3 = new S3Client({
    endpoint: s3Endpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  const [fallbackUser] = await sql<{ id: string }[]>`
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
  `;
  if (!fallbackUser) {
    log.error('В БД нет ни одного пользователя (нужен owner_id для media_files).');
    await sql.end();
    process.exit(1);
  }
  const fallbackOwnerId = fallbackUser.id;

  const models = await sql<
    { id: string; user_id: string | null; display_name: string; slug: string | null; main_photo_url: string | null }[]
  >`
    SELECT id, user_id, display_name, slug, main_photo_url FROM model_profiles ORDER BY display_name
  `;

  let modelsTouched = 0;
  let rowsInserted = 0;

  for (const model of models) {
    const [{ n: existing }] = await sql<[{ n: string }]>`
      SELECT count(*)::text AS n FROM media_files WHERE model_id = ${model.id}
    `;
    const existingN = parseInt(existing, 10);
    if (existingN > 0 && !force) {
      log.log(`Пропуск ${model.display_name} (${model.slug || model.id}): уже ${existingN} медиа (используйте --force)`);
      continue;
    }

    if (existingN > 0 && force) {
      const prefix = `stock/${model.id}/`;
      await sql`
        DELETE FROM media_files
        WHERE model_id = ${model.id} AND storage_key LIKE ${prefix + '%'}
      `;
      log.log(`  --force: удалены прежние stock/* для ${model.display_name}`);
    }

    const ownerId = model.user_id || fallbackOwnerId;
    let firstCdn: string | null = null;
    let sort = 0;

    let sources = sourcesForModelProfile(model.id);
    if (count) sources = sources.slice(0, count);

    for (const s of sources) {
      const buf = await getBufferForSource(s, cache, log);
      if (!buf) continue;

      const storageKey = `stock/${model.id}/${s.key}.${s.ext}`;
      const cdnUrl = `${publicUrl}/${bucket}/${storageKey}`;

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: storageKey,
            Body: buf,
            ContentType: s.mime,
          }),
        );
      } catch (e: any) {
        log.error(`PutObject ${storageKey}: ${e?.message || e}`);
        continue;
      }

      const meta = { source: s.key, importedFrom: 'ingest-stock-media' };
      await sql`
        INSERT INTO media_files (
          owner_id,
          model_id,
          file_type,
          mime_type,
          file_size,
          storage_key,
          bucket,
          cdn_url,
          sort_order,
          is_public_visible,
          moderation_status,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          ${ownerId},
          ${model.id},
          'photo',
          ${s.mime},
          ${buf.length},
          ${storageKey},
          ${bucket},
          ${cdnUrl},
          ${sort},
          true,
          'approved',
          ${sql.json(meta)},
          NOW(),
          NOW()
        )
      `;
      if (!firstCdn) firstCdn = cdnUrl;
      sort += 1;
      rowsInserted += 1;
    }

    if (firstCdn && (!model.main_photo_url || force)) {
      await sql`
        UPDATE model_profiles
        SET main_photo_url = ${firstCdn}, updated_at = NOW()
        WHERE id = ${model.id}
      `;
      log.log(`  main_photo_url обновлён для ${model.display_name}`);
    }

    if (sort > 0) {
      modelsTouched += 1;
      log.log(`✓ ${model.display_name}: добавлено ${sort} файлов`);
    }
  }

  await sql.end();
  log.log('---');
  log.log(`Готово. Моделей обновлено: ${modelsTouched}, строк media_files: ${rowsInserted}`);
  log.log(`Публичный URL префикс: ${publicUrl}/${bucket}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
