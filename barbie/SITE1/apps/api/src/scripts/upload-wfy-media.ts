/* eslint-disable no-console */
/**
 * upload-wfy-media.ts — Phase B.2 · WP attachments → NAS media migration.
 *
 * Second pass on the `work-for-you` tenant: downloads each attachment URL
 * from the parsed WXR fixture, uploads it to MinIO (via the same S3-style
 * config the running API uses), inserts a `nas.media` row, then back-fills
 * `partner_salons.logo_media_id` + `wfy_opportunities.cover_image_key`
 * from the matched WP `attachment.wpId` references in `acf.json`.
 *
 * Idempotent: re-run skips any media row already present for this tenant
 * with the same key. Failed fetches (SafeFetchError or transport) log and
 * continue — one bad URL never aborts the batch.
 *
 * Refs:
 *  - MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase B.2
 *  - governance/adr/ADR-003-wp-import-ssrf-allowlist.md (Accepted 2026-05-26)
 *  - Session-plan 2026-05-26-1400-AVTONOM-track-C-B-A.md §3 chunk-3
 *
 * Prerequisites:
 *  - Migration 0004 applied (Phase A schema).
 *  - seed:wfy already ran (work-for-you tenant + wfy_* tables + partner_salons
 *    exist). This script ONLY does media + back-fill; it does NOT seed.
 *  - MinIO + Postgres docker stack running.
 *  - WXR-attachment URLs reachable (live WP source).
 *
 * Usage (from `barbie/SITE1/apps/api`):
 *   npx ts-node -r tsconfig-paths/register src/scripts/upload-wfy-media.ts
 */
import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename, extname } from 'node:path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { eq, and } from 'drizzle-orm';
import {
  getDb,
  closeDb,
  tenants,
  partnerSalons,
  wfyOpportunities,
  media,
  type Database,
} from '@barbie-site1/db';

import { safeFetch, SafeFetchError } from '../wp-import/safe-fetch';

// ── env bootstrap (climb the tree for SITE1 .env) ─────────────────────────

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

// ── constants ─────────────────────────────────────────────────────────────

export const TENANT_SLUG = 'work-for-you';
const MEDIA_MODULE = 'wfy-import';

const DEFAULT_PARSED_DIR = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'work4u',
  'packages',
  'migrator',
  'parsed',
);

// ── shape mirrors from work4u/packages/migrator/src/types.ts ──────────────

export interface ParsedAttachment {
  wpId: number;
  url: string;
  title: string;
  filename: string;
}

export interface ParsedWxr {
  attachments: ParsedAttachment[];
  // …other fields ignored
}

export interface AcfSalon {
  ord: number;
  name: string;
  logoWpId?: number;
  // …other fields ignored
}

export interface AcfOpportunity {
  ord: number;
  title: string;
  imageWpId?: number;
  // …other fields ignored
}

export interface AcfOptions {
  salons: AcfSalon[];
  opportunities: AcfOpportunity[];
  // …other fields ignored
}

// ── S3 client (matches apps/api/src/storage config keys) ──────────────────

interface S3Cfg {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

function readS3Config(): S3Cfg {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? 'us-east-1';
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false';
  if (!endpoint || !accessKey || !secretKey || !bucket) {
    throw new Error(
      'S3 config missing — set S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET',
    );
  }
  return { endpoint, region, accessKey, secretKey, bucket, forcePathStyle };
}

function buildS3Client(cfg: S3Cfg): S3Client {
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    forcePathStyle: cfg.forcePathStyle,
  });
}

// ── local source lookup (env WFY_LOCAL_SOURCE_DIRS) ────────────────────────
//
// Когда WP source URLs недоступны (например, work-for-you.ru offline или WP
// удалён), оператор может предоставить локальные директории с уже-скачанными
// файлами (Duplicator-extract, HTML-mirror folder, и т.п.). Скрипт рекурсивно
// ищет файл по basename(filename) — case-insensitive. Если найден — читает
// с диска, минуя safeFetch (и его SSRF allow-list — это OK для локальных
// файлов оператора).
//
// Env format: WFY_LOCAL_SOURCE_DIRS="path1;path2;path3" (semicolon-separated
// для Windows-совместимости; на POSIX тоже работает).

interface LocalIndex {
  /** Map<lowercased-basename, absolute-path>. Первое попадание выигрывает. */
  byName: Map<string, string>;
}

/** Recursively walk dir, indexing every regular file by lowercased basename. */
function indexDirectory(root: string, accumulator: Map<string, string>): void {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return; // unreadable — silently skip
  }
  for (const entry of entries) {
    const abs = join(root, entry);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      indexDirectory(abs, accumulator);
    } else if (stat.isFile()) {
      const key = entry.toLowerCase();
      // First-occurrence wins (operator orders dirs by preference).
      if (!accumulator.has(key)) accumulator.set(key, abs);
    }
  }
}

export function buildLocalIndex(dirs: readonly string[]): LocalIndex {
  const byName = new Map<string, string>();
  for (const d of dirs) {
    if (!d) continue;
    const abs = resolve(d);
    if (!existsSync(abs)) {
      console.warn(`[upload-wfy-media] WFY_LOCAL_SOURCE_DIRS entry not found: ${abs}`);
      continue;
    }
    indexDirectory(abs, byName);
  }
  return { byName };
}

export function getLocalSourceDirs(): string[] {
  const raw = process.env.WFY_LOCAL_SOURCE_DIRS;
  if (!raw) return [];
  // Split on ';' only — ':' is a valid drive-letter separator on Windows
  // (C:/path) so it cannot be a path separator there. POSIX users with
  // multiple paths use ';' too — single character is portable.
  return raw.split(';').map((s) => s.trim()).filter(Boolean);
}

/** Lookup a filename in the local index. Returns absolute path or null. */
export function resolveLocalSource(filename: string, index: LocalIndex): string | null {
  return index.byName.get(basename(filename).toLowerCase()) ?? null;
}

/** Cheap MIME guess from extension. Used for local-file uploads where we
 *  don't have a Content-Type header. Falls back to application/octet-stream. */
export function guessMimeFromExt(filename: string): string {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.png':               return 'image/png';
    case '.gif':               return 'image/gif';
    case '.webp':              return 'image/webp';
    case '.svg':               return 'image/svg+xml';
    case '.mp4':               return 'video/mp4';
    case '.webm':              return 'video/webm';
    case '.mp3':               return 'audio/mpeg';
    case '.ogg':               return 'audio/ogg';
    case '.pdf':               return 'application/pdf';
    default:                   return 'application/octet-stream';
  }
}

// ── key normaliser ────────────────────────────────────────────────────────

/** Make a media key SAFE for both the S3 layer and the
 *  `media_key_tenant_prefix_check` DB CHECK constraint.
 *  Result: `tenant/{tenantId}/wfy-import/{wpId}-{slug-of-filename}`.
 */
export function buildMediaKey(tenantId: string, wpId: number, filename: string): string {
  const slug = filename
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return `tenant/${tenantId}/${MEDIA_MODULE}/${wpId}-${slug}`;
}

// ── parsed source loader ──────────────────────────────────────────────────

export interface ParsedSource {
  attachments: ParsedAttachment[];
  acf: AcfOptions;
}

export function readParsedSources(parsedDir = DEFAULT_PARSED_DIR): ParsedSource {
  const wxrPath = resolve(parsedDir, 'wxr.json');
  const acfPath = resolve(parsedDir, 'acf.json');
  if (!existsSync(wxrPath) || !existsSync(acfPath)) {
    throw new Error(
      `Parsed sources not found at ${parsedDir}. Expected wxr.json + acf.json. ` +
        `Run the work4u migrator's parse step first.`,
    );
  }
  const wxr = JSON.parse(readFileSync(wxrPath, 'utf8')) as ParsedWxr;
  const acf = JSON.parse(readFileSync(acfPath, 'utf8')) as AcfOptions;
  return { attachments: wxr.attachments ?? [], acf };
}

// ── tenant resolve ────────────────────────────────────────────────────────

export async function resolveTenantId(db: Database): Promise<string> {
  const rows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);
  const id = rows[0]?.id;
  if (!id) {
    throw new Error(
      `Tenant slug='${TENANT_SLUG}' not found. Run \`npm run seed:wfy\` first.`,
    );
  }
  return id;
}

// ── attachment upload (single, idempotent) ────────────────────────────────

export interface UploadOutcome {
  wpId: number;
  mediaId: string;
  key: string;
  /** 'inserted' = newly downloaded + uploaded + inserted;
   *  'skipped'  = media row already existed for this tenant+key;
   *  'failed'   = fetch or upload threw, error logged. */
  status: 'inserted' | 'skipped' | 'failed';
  error?: string;
  /** When status='inserted', whether source was local-disk or remote fetch.
   *  Useful for operator triage when WP source URL is offline. */
  sourceHint?: 'local';
}

interface UploadDeps {
  db: Database;
  s3: S3Client;
  bucket: string;
  fetcher?: typeof safeFetch; // injectable for tests
  /** Pre-built local index. Pass empty if no local sources configured. */
  localIndex?: LocalIndex;
}

/** Process ONE attachment. Idempotent: if media row exists for this
 *  (tenant_id, key), short-circuits without fetching. */
export async function uploadOneAttachment(
  deps: UploadDeps,
  tenantId: string,
  att: ParsedAttachment,
): Promise<UploadOutcome> {
  const key = buildMediaKey(tenantId, att.wpId, att.filename);
  const fetcher = deps.fetcher ?? safeFetch;

  // Check existing media row first — fast path for re-runs.
  const existing = await deps.db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.tenantId, tenantId), eq(media.key, key)))
    .limit(1);
  if (existing.length > 0) {
    return { wpId: att.wpId, mediaId: existing[0].id, key, status: 'skipped' };
  }

  try {
    let body: Buffer;
    let ct: string;
    let source: 'local' | 'fetch';

    // Local-file lookup first (operator-supplied dirs via WFY_LOCAL_SOURCE_DIRS).
    const localPath = deps.localIndex
      ? resolveLocalSource(att.filename, deps.localIndex)
      : null;

    if (localPath) {
      body = readFileSync(localPath);
      ct = guessMimeFromExt(att.filename);
      source = 'local';
    } else {
      const res = await fetcher(att.url, { method: 'GET' });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`HTTP ${res.status} for ${att.url}`);
      }
      const hdr = (res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!hdr.startsWith('image/') && !hdr.startsWith('video/') && !hdr.startsWith('audio/')) {
        throw new Error(`Unexpected Content-Type '${hdr}' for ${att.url} — expected image|video|audio/*`);
      }
      body = res.body;
      ct = hdr;
      source = 'fetch';
    }

    await deps.s3.send(
      new PutObjectCommand({
        Bucket: deps.bucket,
        Key: key,
        Body: body,
        ContentType: ct,
        CacheControl: 'public, max-age=2592000',
      }),
    );

    const [inserted] = await deps.db
      .insert(media)
      .values({
        tenantId,
        key,
        mime: ct,
        size: BigInt(body.length),
        alt: att.title ?? null,
        module: MEDIA_MODULE,
        status: 'ready',
      })
      .returning({ id: media.id });

    return {
      wpId: att.wpId,
      mediaId: inserted.id,
      key,
      status: 'inserted',
      // hint for caller logging
      ...(source === 'local' ? { sourceHint: 'local' as const } : {}),
    };
  } catch (err) {
    const msg = err instanceof SafeFetchError
      ? `[${err.code}] ${err.message}`
      : (err as Error).message;
    console.error(`  ❌ ${att.url}: ${msg}`);
    return { wpId: att.wpId, mediaId: '', key, status: 'failed', error: msg };
  }
}

// ── FK back-fill passes ───────────────────────────────────────────────────

/** Build wpId → mediaId map from successful outcomes only. */
function buildMediaMap(outcomes: UploadOutcome[]): Map<number, { id: string; key: string }> {
  const map = new Map<number, { id: string; key: string }>();
  for (const o of outcomes) {
    if (o.status !== 'failed' && o.mediaId) {
      map.set(o.wpId, { id: o.mediaId, key: o.key });
    }
  }
  return map;
}

/** Back-fill `partner_salons.logo_media_id` by matching AcfSalon.ord →
 *  partner_salons.ord. ord is set by seed-wfy-tenant per AcfSalon source
 *  order, so this is a stable identifier for cross-source FK link. */
export async function backfillPartnerSalonLogos(
  db: Database,
  tenantId: string,
  salons: AcfSalon[],
  mediaMap: Map<number, { id: string; key: string }>,
): Promise<number> {
  let updated = 0;
  for (const s of salons) {
    if (!s.logoWpId) continue;
    const mediaRow = mediaMap.get(s.logoWpId);
    if (!mediaRow) continue;
    await db
      .update(partnerSalons)
      .set({ logoMediaId: mediaRow.id })
      .where(and(eq(partnerSalons.tenantId, tenantId), eq(partnerSalons.ord, s.ord)));
    updated++;
  }
  return updated;
}

/** Back-fill `wfy_opportunities.cover_image_key`. Note: this column is a
 *  STRING (S3 key) not a media-FK, so we store the key directly. */
export async function backfillOpportunityCovers(
  db: Database,
  tenantId: string,
  opps: AcfOpportunity[],
  mediaMap: Map<number, { id: string; key: string }>,
): Promise<number> {
  let updated = 0;
  for (const o of opps) {
    if (!o.imageWpId) continue;
    const mediaRow = mediaMap.get(o.imageWpId);
    if (!mediaRow) continue;
    await db
      .update(wfyOpportunities)
      .set({ coverImageKey: mediaRow.key })
      .where(and(eq(wfyOpportunities.tenantId, tenantId), eq(wfyOpportunities.ord, o.ord)));
    updated++;
  }
  return updated;
}

// ── orchestrator ──────────────────────────────────────────────────────────

export interface UploadOptions {
  parsedDir?: string;
  /** Inject for tests; defaults to globalThis-bound safeFetch + real S3. */
  fetcher?: typeof safeFetch;
}

export interface UploadReport {
  tenantId: string;
  attachments: number;
  inserted: number;
  skipped: number;
  failed: number;
  partnerSalonLogosLinked: number;
  opportunityCoversLinked: number;
}

export async function runUploadWfyMedia(
  db: Database,
  s3: S3Client,
  bucket: string,
  opts: UploadOptions = {},
): Promise<UploadReport> {
  const { attachments, acf } = readParsedSources(opts.parsedDir);
  const tenantId = await resolveTenantId(db);

  console.log(`[upload-wfy-media] tenant=${TENANT_SLUG} (${tenantId})`);
  console.log(`[upload-wfy-media] attachments=${attachments.length}`);

  const localDirs = getLocalSourceDirs();
  const localIndex = buildLocalIndex(localDirs);
  if (localDirs.length > 0) {
    console.log(
      `[upload-wfy-media] local source dirs (${localDirs.length}); indexed ${localIndex.byName.size} files`,
    );
  }

  const outcomes: UploadOutcome[] = [];
  for (const att of attachments) {
    const o = await uploadOneAttachment(
      { db, s3, bucket, fetcher: opts.fetcher, localIndex },
      tenantId,
      att,
    );
    outcomes.push(o);
    const sym = o.status === 'inserted'
      ? (o.sourceHint === 'local' ? '✓ (local)' : '✓ (fetch)')
      : o.status === 'skipped' ? '·' : '❌';
    console.log(`  ${sym} wpId=${att.wpId} ${att.filename}`);
  }

  const inserted = outcomes.filter((o) => o.status === 'inserted').length;
  const skipped = outcomes.filter((o) => o.status === 'skipped').length;
  const failed = outcomes.filter((o) => o.status === 'failed').length;

  const mediaMap = buildMediaMap(outcomes);
  const partnerSalonLogosLinked = await backfillPartnerSalonLogos(
    db,
    tenantId,
    acf.salons ?? [],
    mediaMap,
  );
  const opportunityCoversLinked = await backfillOpportunityCovers(
    db,
    tenantId,
    acf.opportunities ?? [],
    mediaMap,
  );

  return {
    tenantId,
    attachments: attachments.length,
    inserted,
    skipped,
    failed,
    partnerSalonLogosLinked,
    opportunityCoversLinked,
  };
}

// ── CLI entry ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const db = getDb();
  const cfg = readS3Config();
  const s3 = buildS3Client(cfg);
  try {
    const report = await runUploadWfyMedia(db, s3, cfg.bucket);
    console.log('');
    console.log('────────────────────────────────────────────');
    console.log(`  Inserted: ${report.inserted}`);
    console.log(`  Skipped:  ${report.skipped}`);
    console.log(`  Failed:   ${report.failed}`);
    console.log(`  Partner-salon logos linked: ${report.partnerSalonLogosLinked}`);
    console.log(`  Opportunity covers linked:  ${report.opportunityCoversLinked}`);
    console.log('────────────────────────────────────────────');
    if (report.failed > 0) {
      console.warn(`⚠️  ${report.failed} attachment(s) failed — re-run to retry.`);
      process.exitCode = 1;
    }
  } finally {
    s3.destroy();
    await closeDb();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[upload-wfy-media] fatal:', err);
    process.exit(1);
  });
}
