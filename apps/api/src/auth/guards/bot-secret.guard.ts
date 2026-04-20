/**
 * BotSecretGuard — защищает серверные эндпоинты, которые дёргает Telegram-бот
 * (POST /auth/telegram/consume, POST /auth/telegram/login).
 *
 * Проверяет заголовок `x-bot-secret` против TELEGRAM_BOT_SECRET из env.
 * timingSafeEqual — чтобы исключить timing-атаку.
 *
 * Если TELEGRAM_BOT_SECRET не задан в env → эндпоинт возвращает 503
 * (фича отключена), чтобы в dev случайно не открыть линковку без секрета.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class BotSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('TELEGRAM_BOT_SECRET');
    if (!expected) {
      throw new ServiceUnavailableException(
        'Telegram linking is not configured: TELEGRAM_BOT_SECRET is not set',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = (req.headers['x-bot-secret'] ?? '') as string;

    if (!provided || typeof provided !== 'string') {
      throw new UnauthorizedException('Missing x-bot-secret header');
    }

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid bot secret');
    }

    return true;
  }
}
