/**
 * Auth Module - JWT аутентификация + Telegram web-first линковка (§Q2)
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuthGuardsModule } from './guards/auth-guards.module';
import { BotSecretGuard } from './guards/bot-secret.guard';
import { TelegramLinkTokenService } from './telegram-link-token.service';

@Module({
  imports: [
    UsersModule,
    AuthGuardsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' as any },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, TelegramLinkTokenService, BotSecretGuard],
  controllers: [AuthController],
  exports: [AuthService, TelegramLinkTokenService],
})
export class AuthModule {}
