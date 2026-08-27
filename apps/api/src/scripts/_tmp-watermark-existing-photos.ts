/**
 * Одноразовый скрипт: наложить водяной знак «My Muse» (см. profiles/watermark.util.ts)
 * на все УЖЕ загруженные фото моделей — те, что были в media_files ДО того, как
 * наложение подключили в ProfilesService.confirmUpload (см. коммит с watermark.util.ts).
 *
 * ВАЖНО: запускать РОВНО ОДИН РАЗ. Повторный прогон наложит знак ещё раз поверх уже
 * нанесённого — на выходе будет заметно более плотный/грязный текст в углу, а не тот
 * же аккуратный вид. Флага "уже с водяным знаком" в схеме нет специально — это разовая
 * миграция данных, не постоянная часть бизнес-логики.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/_tmp-watermark-existing-photos.ts
 */

import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { applyWatermark } from '../profiles/watermark.util';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

for (let depth = 0; depth < 8; depth++) {
  const envPath = resolve(__dirname, ...Array(depth).fill('..'), '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const bucket = process.env.MINIO_BUCKET || 'escort-media';
  const internalEndpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `http://${internalEndpoint}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED' as const,
  });

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const rows: Array<{ id: string; storage_key: string; mime_type: string }> = await sql`
      SELECT id, storage_key, mime_type FROM media_files WHERE file_type = 'photo'
    `;

    console.log(`Найдено фото: ${rows.length}. Начинаю наложение водяного знака...`);

    let done = 0;
    const failed: string[] = [];

    for (const row of rows) {
      try {
        const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: row.storage_key }));
        const original = await streamToBuffer(got.Body);
        const watermarked = await applyWatermark(original);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: row.storage_key,
            Body: watermarked,
            ContentType: row.mime_type,
          }),
        );
        done++;
        console.log(`[${done}/${rows.length}] OK — ${row.storage_key}`);
      } catch (err: any) {
        failed.push(row.storage_key);
        console.error(`FAILED — ${row.storage_key}: ${err?.message ?? err}`);
      }
    }

    console.log(`\nГотово. Успешно: ${done}/${rows.length}.`);
    if (failed.length > 0) {
      console.log(`Не удалось (${failed.length}):`);
      for (const key of failed) console.log(`  - ${key}`);
    }

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    console.error('Failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

main();
