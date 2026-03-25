/**
 * App Module - Root module
 *
 * Production-grade security hardening:
 * - AuthGuardsModule: JWT + RBAC guards
 * - RateLimitModule: DDoS protection
 * - AuditLogger: 152-ФЗ compliant logging
 * - AntiLeakService: Contact sharing prevention
 *
 * @see IMPLEMENTATION_PLAN.html - Phase 1-4
 */

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

// Security modules
import { AuthGuardsModule } from './auth/guards/auth-guards.module';
import { RateLimitModule } from './security/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
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
  ],
})
export class AppModule {}
