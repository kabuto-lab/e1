/**
 * Runs SQL migrations without drizzle-kit CLI (avoids native crashes on some Windows setups).
 * Uses the same folder and journal as `drizzle-kit migrate`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (check repo root .env).');
  process.exit(1);
}

const migrationsFolder = path.join(__dirname, 'drizzle');

const client = postgres(url, { max: 1 });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder });
  console.log('Migrations finished successfully.');
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 10 });
}
