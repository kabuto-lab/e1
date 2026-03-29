/**
 * Глобальный модуль БД: один клиент PostgreSQL на всё приложение.
 *
 * Провайдер 'DRIZZLE' — экземпляр drizzle-orm со схемой @escort/db. Сервисы внедряют его и выполняют
 * select/insert/update; данные уходят только в PostgreSQL (URL из ConfigService DATABASE_URL).
 */

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@escort/db';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

@Global()
@Module({
  providers: [
    {
      provide: 'DRIZZLE',
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is not defined');
        }

        const client = postgres(databaseUrl);
        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['DRIZZLE'],
})
export class DatabaseModule {}
