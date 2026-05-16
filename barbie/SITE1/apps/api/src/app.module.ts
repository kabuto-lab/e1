/**
 * AppModule — корневой модуль NestJS приложения.
 *
 * Текущее состояние (Phase 0 bootstrap):
 *   - ConfigModule (global, читает .env через configuration.ts)
 *   - DatabaseModule (global, Drizzle pool)
 *   - HealthController
 *
 * По мере роста — раскомментируй / добавляй:
 *   - TenantContextModule (Stage 5) — ALS + TenantGuard + TenantResolverMiddleware
 *   - AuthModule (Stage 7) — JWT, refresh, passport
 *   - TenantsModule, SalonsModule, ServicesModule, StaffModule, ClientsModule,
 *     AppointmentsModule, MediaModule, CmsModule, MenuModule — фичевые модули
 */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { TenantContextModule } from './tenant-context/tenant-context.module';
import { TenantResolverMiddleware } from './tenant-context/tenant-resolver.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120, // 120 req/min на IP — базовая защита
      },
    ]),
    DatabaseModule,
    TenantContextModule,
    // AuthModule — Stage 7
    // TenantsModule, SalonsModule, ... — далее
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
