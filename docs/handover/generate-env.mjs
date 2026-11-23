import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const repo = path.resolve(process.argv[2] || '.');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
if (manifest.name !== 'escort-platform') throw Error('Pass the MyMuse repository root');
const filename = path.join(repo, '.env');
if (fs.existsSync(filename)) throw Error('.env already exists; keep it and configure local settings manually');
const secret = size => randomBytes(size).toString('hex');
const dbPassword = secret(24), minioSecret = secret(24);
const values = {
  NODE_ENV: 'development', POSTGRES_PASSWORD: dbPassword,
  DATABASE_URL: `postgresql://mymuse_dev:${dbPassword}@127.0.0.1:15434/mymuse_dev`,
  REDIS_URL: 'redis://127.0.0.1:16384', JWT_SECRET: secret(32), JWT_REFRESH_SECRET: secret(32), ENCRYPTION_KEY: secret(32),
  JWT_ACCESS_EXPIRATION: '15m', JWT_REFRESH_EXPIRATION: '7d',
  MINIO_ENDPOINT: '127.0.0.1:19004', MINIO_PRESIGN_ENDPOINT: '127.0.0.1:19004',
  MINIO_ACCESS_KEY: 'mymuse_dev', MINIO_SECRET_KEY: minioSecret, MINIO_BUCKET: 'escort-media',
  MINIO_PUBLIC_URL: 'http://127.0.0.1:19004', NEXT_PUBLIC_MINIO_PUBLIC_URL: 'http://127.0.0.1:19004',
  PORT: '3000', HOST: '127.0.0.1', API_URL: 'http://127.0.0.1:3000', FRONTEND_URL: 'http://localhost:3001',
  API_PROXY_UPSTREAM: 'http://127.0.0.1:3000', INTERNAL_API_URL: 'http://127.0.0.1:3000',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3001', ALLOWED_ORIGINS: 'http://localhost:3001,http://127.0.0.1:3001',
  SMTP_HOST: '127.0.0.1', SMTP_PORT: '11026', SMTP_FROM: 'dev@example.invalid', CONTACT_FORM_TO_EMAIL: 'inbox@example.invalid',
  TON_INDEXER_ENABLED: 'false',
};
fs.writeFileSync(filename, '# Local development only. Contains no production credentials.\n' + Object.entries(values).map(([k,v]) => `${k}=${v}`).join('\n') + '\n', {flag: 'wx', mode: 0o600});
console.log('Created local .env. Telegram, T-Bank and TON credentials are deliberately absent.');
