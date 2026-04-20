/**
 * Auth Service - JWT аутентификация и авторизация
 */

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import type { User } from '@escort/db';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Регистрация нового пользователя
   */
  async register(email: string, password: string, role: 'client' | 'model' | 'admin' = 'client') {
    const user = await this.usersService.createUser(email, password, role);
    
    const tokens = await this.generateTokens(user, email);
    
    return {
      user: {
        id: user.id,
        email,
        role: user.role,
        status: user.status,
        subscriptionTier: user.subscriptionTier ?? 'none',
      },
      ...tokens,
    };
  }

  /**
   * Вход пользователя
   */
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'suspended' || user.status === 'blacklisted') {
      throw new UnauthorizedException('Account is blocked');
    }

    const isValid = await this.usersService.validatePassword(user, password);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Обновить lastLogin
    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user, email);
    
    return {
      user: {
        id: user.id,
        email,
        role: user.role,
        status: user.status,
        subscriptionTier: user.subscriptionTier ?? 'none',
      },
      ...tokens,
    };
  }

  /**
   * Регистрация TG-only пользователя (bot-side).
   * Бот вызывает, когда /start приходит от tgId, которого нет в БД. Создаёт user
   * с role=client (или model, если передано), сразу выдаёт пару JWT.
   *
   * CHECK users_staff_credentials_check в БД не даст создать staff-роль этим путём.
   */
  async registerByTelegram(payload: {
    telegramId: bigint | number | string;
    telegramUsername?: string | null;
    telegramLanguageCode?: string | null;
    role?: 'client' | 'model';
  }) {
    const user = await this.usersService.createTelegramOnlyUser(payload);
    const tokens = await this.generateTokens(user, '');

    return {
      user: {
        id: user.id,
        email: '',
        role: user.role,
        status: user.status,
        subscriptionTier: user.subscriptionTier ?? 'none',
        telegramId: user.telegramId ? user.telegramId.toString() : null,
        telegramUsername: user.telegramUsername,
      },
      ...tokens,
    };
  }

  /**
   * Вход по Telegram ID (web-first линковка, §Q2).
   * Вызывается ТОЛЬКО с бот-секретом (BotSecretGuard на контроллере). Никаких
   * email/password — идентичность даёт tgId, которому уже соответствует row в users.
   * Если tgId не найден — 401, бот показывает «нет аккаунта, сначала /start link_<token>».
   */
  async loginByTelegramId(telegramId: bigint | number | string) {
    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      throw new UnauthorizedException('No user linked to this Telegram ID');
    }
    if (user.status === 'suspended' || user.status === 'blacklisted') {
      throw new UnauthorizedException('Account is blocked');
    }

    await this.usersService.updateLastLogin(user.id);

    // В payload email может быть NULL у TG-only users — пустая строка как фолбэк.
    const tokens = await this.generateTokens(user, '');

    return {
      user: {
        id: user.id,
        email: '',
        role: user.role,
        status: user.status,
        subscriptionTier: user.subscriptionTier ?? 'none',
        telegramId: user.telegramId ? user.telegramId.toString() : null,
        telegramUsername: user.telegramUsername,
      },
      ...tokens,
    };
  }

  /**
   * Обновить токены — extract userId from the refresh token itself
   */
  async refreshTokens(refreshToken: string) {
    const payload = await this.verifyToken(refreshToken, 'refresh');
    
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return await this.generateTokens(user, payload.email);
  }

  /**
   * Валидация JWT токена для guards
   */
  async validateToken(token: string): Promise<{ userId: string; role: string } | null> {
    try {
      const payload = await this.verifyToken(token, 'access');
      return { userId: payload.sub, role: payload.role };
    } catch {
      return null;
    }
  }

  /**
   * Сгенерировать пару токенов
   */
  private async generateTokens(user: User, email?: string) {
    const tier = user.subscriptionTier ?? 'none';
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user.id, user.role, 'access', email, tier),
      this.signToken(user.id, user.role, 'refresh', email, tier),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Подписать токен
   */
  private async signToken(
    userId: string,
    role: string,
    type: 'access' | 'refresh',
    email?: string,
    subscriptionTier?: string,
  ) {
    const payload = {
      sub: userId,
      email: email || '',
      role,
      type,
      subscriptionTier: subscriptionTier ?? 'none',
    };

    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const expiresIn = type === 'access' ? '15m' : '7d';

    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
      issuer: 'lovnge-api',
      audience: 'lovnge-client',
    });
  }

  private async verifyToken(token: string, type: 'access' | 'refresh') {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    
    const payload = await this.jwtService.verifyAsync(token, { secret });
    
    if (payload.type !== type) {
      throw new UnauthorizedException('Invalid token type');
    }

    return payload;
  }
}
