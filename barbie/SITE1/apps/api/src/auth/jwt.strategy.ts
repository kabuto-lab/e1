/**
 * JwtStrategy — валидирует Bearer token, преобразует payload в AuthenticatedUser
 * и кладёт в req.user (стандартное поведение passport).
 *
 * Подключается через PassportModule + JwtAuthGuard.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser, JwtPayload } from './types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('jwt.secret');
    if (!secret) throw new Error('JWT_SECRET is not configured');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** Вызывается после успешной проверки подписи. Возвращаемое значение → req.user. */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub || !payload?.kind) {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token payload invalid' });
    }
    return {
      id: payload.sub,
      email: payload.email,
      kind: payload.kind,
      tenantId: payload.tenantId,
      salonId: payload.salonId,
      role: payload.role,
    };
  }
}
