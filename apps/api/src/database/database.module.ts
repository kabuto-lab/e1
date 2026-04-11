/**
 * Глобальный модуль БД: один клиент PostgreSQL на всё приложение.
 *
 * Провайдер 'DRIZZLE' — экземпляр drizzle-orm со схемой @escort/db. Сервисы внедряют его и выполняют
 * select/insert/update; данные уходят только в PostgreSQL (URL из ConfigService DATABASE_URL).
 *
 * DATABASE_URL берём в приоритете из корневого .env на диске: @nestjs/config отдаёт process.env
 * раньше файла, а PM2 может оставить устаревший DATABASE_URL после правок .env + ensure:database.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse as parseDotenv } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@escort/db';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

/** Значение DATABASE_URL из результата dotenv.parse (BOM в .env с Windows → ключ «\ufeffDATABASE_URL»). */
function pickDatabaseUrlFromParsed(parsed: Record<string, string>): string | undefined {
  const raw =
    parsed.DATABASE_URL ?? (parsed as Record<string, string>)['\ufeffDATABASE_URL'];
  if (!raw) return undefined;
  let s = stripBom(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

/** Как main.ts / app.module: первый существующий .env при подъёме от cwd (PM2: корень репо). */
function readDatabaseUrlFromRepositoryEnvFile(): string | undefined {
  const cwd = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? cwd : resolve(cwd, ...Array(depth).fill('..'));
    const envPath = resolve(base, '.env');
    if (!existsSync(envPath)) continue;
    const parsed = parseDotenv(stripBom(readFileSync(envPath, 'utf8')));
    const url = pickDatabaseUrlFromParsed(parsed);
    if (url) return url;
    // Файл есть, но строки подключения нет — смотрим .env выше по дереву (не залипаем на «пустом» корневом .env).
  }
  return undefined;
}

@Global()
@Module({
  providers: [
    {
      provide: 'DRIZZLE',
      useFactory: async (configService: ConfigService) => {
        const fromFile = readDatabaseUrlFromRepositoryEnvFile();
        const databaseUrl = fromFile ?? configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not defined');
        }
        if (fromFile) {
          process.env.DATABASE_URL = fromFile;
        }

        const client = postgres(databaseUrl, { max: 10 });
        await client`select 1 as bootstrap_ok`;
        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['DRIZZLE'],
})
export class DatabaseModule {}
