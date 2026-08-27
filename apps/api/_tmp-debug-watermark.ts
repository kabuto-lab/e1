import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

for (let depth = 0; depth < 8; depth++) {
  const envPath = resolve(__dirname, ...Array(depth).fill('..'), '.env');
  if (existsSync(envPath)) { dotenv.config({ path: envPath }); break; }
}

async function main() {
  const bucket = process.env.MINIO_BUCKET || 'escort-media';
  const internalEndpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  console.log('endpoint:', internalEndpoint, 'bucket:', bucket);
  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: `http://${internalEndpoint}`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
  });
  try {
    const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'uploads/1786020828323-hero-bg.webp' }));
    console.log('OK, contentType:', got.ContentType, 'len:', got.ContentLength);
  } catch (e) {
    console.log('RAW ERROR OBJECT:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }
}
main();
