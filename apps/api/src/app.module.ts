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

import { join } from 'path';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Из apps/api/{src|dist}: два уровня вверх = apps/, три = корень монорепы (где лежит .env).
      // join(__dirname, '../../.env') ошибочно указывал на apps/.env и мог подменять DATABASE_URL.
      envFilePath: join(__dirname, '../../../.env'),
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
