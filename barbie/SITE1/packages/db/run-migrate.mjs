/**
 * Standalone migration runner — обходит native crashes drizzle-kit на части Windows-машин.
 * Использует ту же папку миграций и журнал, что и `drizzle-kit migrate`.
 *
 * Запуск: node ./run-migrate.mjs (или `npm run db:migrate`)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// сначала корневой .env SITE1 (общий), затем локальный (если есть) — local overrides win
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (check barbie/SITE1/.env — копия с .env.example).');
  process.exit(1);
}

const migrationsFolder = path.join(__dirname, 'drizzle');

const client = postgres(url, { max: 1 });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder });
  console.log('[migrate] applied successfully.');
} catch (err) {
  console.error('[migrate] failed:', err);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 10 });
}
