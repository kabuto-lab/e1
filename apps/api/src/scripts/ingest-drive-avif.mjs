#!/usr/bin/env node
/**
 * Bulk import: folders of model photos → AVIF → MinIO → model_profiles + media_files.
 *
 * Layout:
 *   IMPORT_ROOT/
 *     models-manifest.json   # optional { models: [{ name, params, folder_id }] }
 *     models/<DisplayName>/*.{jpg,png,webp,…}
 *
 * Run from monorepo (deps: sharp, postgres, bcrypt, @aws-sdk/client-s3):
 *   cd apps/api && npm run ingest-drive-avif
 *   IMPORT_ROOT=/opt/mymuseclub/import npm run ingest-drive-avif -- --force
 *   npm run ingest-drive-avif -- --only=Лолита --force
 *   npm run ingest-drive-avif -- --dry-run
 *
 * Env: DATABASE_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY,
 *      MINIO_BUCKET, MINIO_PUBLIC_URL (for nginx /media → bucket root, no extra bucket segment).
 *
 * AVIF encode matches apps/api/src/profiles/avif.util.ts (quality 55, max 1600×2400).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.MYMUSE_REPO || path.resolve(__dirname, '../../../../');
const IMPORT_ROOT = process.env.IMPORT_ROOT || path.join(REPO, '.import');
const MODELS_DIR = process.env.MODELS_DIR || path.join(IMPORT_ROOT, 'models');
const MANIFEST = process.env.MANIFEST || path.join(IMPORT_ROOT, 'models-manifest.json');

const require = createRequire(path.join(REPO, 'package.json'));
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const postgres = require('postgres');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnv(path.join(REPO, '.env'));

const MEDIA_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif']);
const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function slugify(name) {
  const base = [...name.toLowerCase()]
    .map((ch) => CYR[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || `model-${crypto.randomBytes(3).toString('hex')}`;
}

function parseParams(raw) {
  if (!raw || typeof raw !== 'string') return {};
  const parts = raw.split('/').map((x) => x.trim().replace(',', '.'));
  const out = {};
  if (parts[0]) out.age = Number(parts[0]) || undefined;
  if (parts[1]) out.height = Number(parts[1]) || undefined;
  if (parts[2]) out.weight = Number(parts[2]) || undefined;
  if (parts[3]) out.bust = parts[3];
  return out;
}

function listPhotos(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => MEDIA_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f))
    .sort();
}

/** Same defaults as profiles/avif.util.ts */
async function toAvif(buf) {
  return sharp(buf, { failOn: 'none' })
    .rotate()
    .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
    .avif({ quality: 55, effort: 4, chromaSubsampling: '4:2:0' })
    .toBuffer();
}

function publicUrlFor(key, publicBase, bucket) {
  if (/\/media$/i.test(publicBase)) return `${publicBase}/${key}`;
  return `${publicBase}/${bucket}/${key}`;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg
    ? onlyArg
        .split('=')
        .slice(1)
        .join('=')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing (.env in repo root)');
    process.exit(1);
  }

  const endpointRaw = process.env.MINIO_ENDPOINT || '127.0.0.1:9000';
  const s3Endpoint = endpointRaw.startsWith('http') ? endpointRaw : `http://${endpointRaw}`;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET || 'escort-media';
  const publicBase = (process.env.MINIO_PUBLIC_URL || s3Endpoint).replace(/\/$/, '');

  if (!fs.existsSync(MODELS_DIR)) {
    console.error(`MODELS_DIR not found: ${MODELS_DIR}`);
    process.exit(1);
  }

  const byName = new Map();
  if (fs.existsSync(MANIFEST)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    for (const m of manifest.models || []) byName.set(m.name, m);
  }

  let folders = fs
    .readdirSync(MODELS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, 'ru'));
  if (only?.length) {
    folders = folders.filter((n) => only.includes(n) || only.includes(slugify(n)));
  }

  console.log(`folders=${folders.length} modelsDir=${MODELS_DIR} dry=${dry} force=${force} only=${only || '-'}`);
  console.log(`s3=${s3Endpoint} bucket=${bucket} public=${publicBase}`);

  if (dry) {
    for (const name of folders) {
      const n = listPhotos(path.join(MODELS_DIR, name)).length;
      console.log(`  ${name}: ${n} photos`);
    }
    process.exit(0);
  }

  const s3 = new S3Client({
    endpoint: s3Endpoint,
    region: 'us-east-1',
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const seedPasswordHash = await bcrypt.hash('SeedModelNotForLogin!', 10);
  const [admin] = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`;
  const [mgr] = await sql`SELECT id FROM users WHERE role = 'manager' ORDER BY created_at ASC LIMIT 1`;

  let createdProfiles = 0;
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of folders) {
    const photos = listPhotos(path.join(MODELS_DIR, name));
    if (photos.length === 0) {
      console.log(`SKIP empty ${name}`);
      skipped++;
      continue;
    }

    const meta = byName.get(name) || { name, params: '' };
    const attrs = parseParams(meta.params);
    const slug = slugify(name);
    const physicalAttributes = {
      age: attrs.age,
      height: attrs.height,
      weight: attrs.weight,
      bust: attrs.bust,
      city: 'Москва',
      country: 'Россия',
      outcall: true,
    };

    console.log(`\n=== ${name} slug=${slug} photos=${photos.length}`);

    try {
      let [existing] = await sql`SELECT id, user_id FROM model_profiles WHERE slug = ${slug} LIMIT 1`;
      let modelId;
      let ownerId;

      if (existing) {
        modelId = existing.id;
        ownerId = existing.user_id;
        if (force) {
          await sql`DELETE FROM media_files WHERE model_id = ${modelId} AND storage_key LIKE ${'drive/' + modelId + '/%'}`;
          console.log(`  force: cleared prior drive/* media`);
        } else {
          const [{ n }] = await sql`SELECT count(*)::int AS n FROM media_files WHERE model_id = ${modelId}`;
          if (n > 0) {
            console.log(`  already has ${n} media — skip (use --force)`);
            skipped++;
            continue;
          }
        }
      } else {
        const email = `drive-${slug}@mymuse.import`;
        const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
        let [user] = await sql`SELECT id FROM users WHERE email_hash = ${emailHash} LIMIT 1`;
        if (!user) {
          [user] = await sql`
            INSERT INTO users (email_hash, email, password_hash, role, status, full_name, created_at, updated_at)
            VALUES (${emailHash}, ${email}, ${seedPasswordHash}, 'model', 'active', ${name}, NOW(), NOW())
            RETURNING id
          `;
        }
        ownerId = user.id;

        const [row] = await sql`
          INSERT INTO model_profiles (
            user_id, manager_id, display_name, slug,
            elite_status, verification_status,
            psychotype_tags, languages, physical_attributes,
            biography, availability_status, rating_reliability,
            is_published, published_at, photo_count,
            created_at, updated_at
          ) VALUES (
            ${ownerId},
            ${mgr?.id ?? null},
            ${name},
            ${slug},
            false,
            'verified',
            ${sql.json([])},
            ${sql.json(['ru'])},
            ${sql.json(physicalAttributes)},
            ${'Выезд. Анкета импортирована с Drive.'},
            'online',
            ${'4.80'},
            true,
            NOW(),
            ${photos.length},
            NOW(),
            NOW()
          )
          RETURNING id
        `;
        modelId = row.id;
        createdProfiles++;
        console.log(`  profile created ${modelId}`);
      }

      let firstCdn = null;
      let sort = 0;
      for (let i = 0; i < photos.length; i++) {
        const src = photos[i];
        const raw = fs.readFileSync(src);
        let avif;
        try {
          avif = await toAvif(raw);
        } catch (e) {
          console.error(`  AVIF fail ${path.basename(src)}: ${e.message}`);
          failed++;
          continue;
        }
        const key = `drive/${modelId}/${String(i + 1).padStart(2, '0')}-${slug}.avif`;
        const cdnUrl = publicUrlFor(key, publicBase, bucket);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: avif,
            ContentType: 'image/avif',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        await sql`
          INSERT INTO media_files (
            owner_id, model_id, file_type, mime_type, file_size,
            storage_key, bucket, cdn_url, sort_order,
            is_public_visible, moderation_status, is_verified,
            metadata, created_at, updated_at
          ) VALUES (
            ${ownerId}, ${modelId}, 'photo', 'image/avif', ${avif.length},
            ${key}, ${bucket}, ${cdnUrl}, ${sort},
            true, 'approved', true,
            ${sql.json({ originalName: path.basename(src), importedFrom: 'ingest-drive-avif' })},
            NOW(), NOW()
          )
        `;
        if (!firstCdn) firstCdn = cdnUrl;
        sort += 1;
        uploaded += 1;
        process.stdout.write(`  +${path.basename(src)} → ${Math.round(avif.length / 1024)}KB avif\n`);
      }

      if (firstCdn) {
        await sql`
          UPDATE model_profiles
          SET main_photo_url = ${firstCdn},
              photo_count = ${sort},
              is_published = true,
              published_at = COALESCE(published_at, NOW()),
              verification_status = 'verified',
              availability_status = 'online',
              updated_at = NOW()
          WHERE id = ${modelId}
        `;
      }
      console.log(`  OK media=${sort}`);
    } catch (e) {
      console.error(`  FAIL ${name}: ${e.message || e}`);
      failed++;
    }
  }

  await sql.end();
  console.log('\n=== DONE ===');
  console.log({ createdProfiles, uploaded, skipped, failed, admin: admin?.id, manager: mgr?.id });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
