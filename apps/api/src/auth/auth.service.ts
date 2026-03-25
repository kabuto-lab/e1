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
    
    const tokens = await this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email,
        role: user.role,
        status: user.status,
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

    const tokens = await this.generateTokens(user);
    
    return {
      user: {
        id: user.id,
        email,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  /**
   * Обновить токены
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const refreshTokenPayload = await this.verifyToken(refreshToken, 'refresh');
    
    if (refreshTokenPayload.sub !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    
    return tokens;
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
  private async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user.id, user.role, 'access'),
      this.signToken(user.id, user.role, 'refresh'),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Подписать токен
   */
  private async signToken(userId: string, role: string, type: 'access' | 'refresh') {
    const payload = {
      sub: userId,
      role,
      type,
    };

    const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
    const expiresIn = type === 'access' ? '15m' : '7d';

    return this.jwtService.sign(payload, {
      secret,
      expiresIn,
      issuer: 'lovnge-api',
      audience: 'lovnge-client',
    });
  }

  /**
   * Проверить токен
   */
  private async verifyToken(token: string, type: 'access' | 'refresh') {
    const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
    
    const payload = await this.jwtService.verifyAsync(token, { secret });
    
    if (payload.type !== type) {
      throw new UnauthorizedException('Invalid token type');
    }

    return payload;
  }
}
