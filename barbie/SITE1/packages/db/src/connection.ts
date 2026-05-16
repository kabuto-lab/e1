/**
 * Postgres connection + Drizzle instance.
 *
 * Один pool на процесс. Используется в apps/api через DatabaseModule.
 * В тестах/скриптах — импорт `getDb()` напрямую.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let _client: ReturnType<typeof postgres> | null = null;
let _db: Database | null = null;

export function getClient(databaseUrl?: string): ReturnType<typeof postgres> {
  if (_client) return _client;
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  _client = postgres(url, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false, // совместимость с pgbouncer transaction mode (если внедрим)
  });
  return _client;
}

export function getDb(databaseUrl?: string): Database {
  if (_db) return _db;
  const client = getClient(databaseUrl);
  _db = drizzle(client, { schema });
  return _db;
}

/**
 * Закрыть pool (для graceful shutdown в Nest / тестов).
 */
export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 10 });
    _client = null;
    _db = null;
  }
}
