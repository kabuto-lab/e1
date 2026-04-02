/**
 * Корневой модуль NestJS: подключает конфиг, БД, доменные модули и ограничение частоты запросов.
 *
 * Порядок загрузки: ConfigModule (читает .env из корня репозитория) → DatabaseModule (провайдер DRIZZLE)
 * → модули с контроллерами (HTTP-маршруты вешаются на приложение в main.ts).
 *
 * Поток запроса: HTTP → Controller → Service → @Inject('DRIZZLE') → PostgreSQL;
 * файлы профилей: Profiles/Media → presigned URL → клиент грузит в MinIO → confirm → снова API/БД.
 *
 * Карта проекта: docs/CODEBASE_GUIDE.md
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ModelsModule } from './models/models.module';
import { ClientsModule } from './clients/clients.module';
import { BookingsModule } from './bookings/bookings.module';
import { EscrowModule } from './escrow/escrow.module';
import { ReviewsModule } from './reviews/reviews.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { MediaModule } from './media/media.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SettingsModule } from './settings/settings.module';

// Security modules
import { AuthGuardsModule } from './auth/guards/auth-guards.module';
import { RateLimitModule } from './security/rate-limit.config';

/** Как loadRepositoryEnvFile в main.ts: первый найденный .env при подъёме от cwd (PM2: корень репозитория). */
function resolveEnvFilePath(): string {
  const cwd = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const base = depth === 0 ? cwd : resolve(cwd, ...Array(depth).fill('..'));
    const envPath = resolve(base, '.env');
    if (existsSync(envPath)) return envPath;
  }
  return resolve(cwd, '.env');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePath(),
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AuthGuardsModule,
    RateLimitModule,
    ModelsModule,
    ClientsModule,
    BookingsModule,
    EscrowModule,
    ReviewsModule,
    BlacklistModule,
    MediaModule,
    ProfilesModule,
    SettingsModule,
  ],
})
export class AppModule {}
