/**
 * Auth Service - JWT аутентификация и авторизация
 */

import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { ModelsService } from '../models/models.service';
import { ManagersService } from '../managers/managers.service';
import type { User } from '@escort/db';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly modelsService: ModelsService,
    private readonly managersService: ManagersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Регистрация нового пользователя (login+password — единый identity для всех веб-ролей)
   */
  async register(
    login: string,
    password: string,
    role: 'client' | 'model' | 'manager' | 'admin' = 'client',
    userData?: {
      phone?: string;
      companyName?: string;
      contactMethod?: 'phone' | 'telegram' | 'email' | 'whatsapp';
      contactValue?: string;
    },
  ) {
    const user = await this.usersService.createUser({
      login,
      password,
      role,
      phone: role === 'client' ? userData?.phone : undefined,
      // Менеджер, выбравший email способом связи, получает его сразу на аккаунт.
      email: role === 'manager' && userData?.contactMethod === 'email' ? userData.contactValue : undefined,
    });

    if (role === 'model') {
      await this.modelsService.createFullProfile({
        displayName: login,
        userId: user.id,
        isPublished: false,
        contactMethod: userData?.contactMethod,
        contactValue: userData?.contactValue,
      });
    }

    if (role === 'manager') {
      const isPhone = userData?.contactMethod === 'phone';
      const isTelegram = userData?.contactMethod === 'telegram';
      const isWhatsapp = userData?.contactMethod === 'whatsapp';
      await this.managersService.createProfile(user.id, {
        fullName: login,
        companyName: userData?.companyName,
        phone: isPhone ? userData?.contactValue : undefined,
        telegramContact: isTelegram ? userData?.contactValue : undefined,
        contactWhatsapp: isWhatsapp ? userData?.contactValue : undefined,
      });
    }

    const tokens = await this.generateTokens(user, '');

    return {
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        status: user.status,
        subscriptionTier: user.subscriptionTier ?? 'none',
      },
      recoveryCode: user.recoveryCode,
      ...tokens,
    };
  }

  /**
   * Вход только по логину (телефон/email как identifier для входа не используются).
   */
  async login(identifier: string, password: string) {
    const user = await this.usersService.findByLogin(identifier);

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

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user, user.email ?? '');

    return {
      user: {
        id: user.id,
        login: user.login ?? null,
        phone: user.phone ?? null,
        email: user.email ?? null,
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

    // Без этой проверки блокировка не срабатывала бы, пока жив refresh-token: доступ по
    // истечении access-токена молча продлевался бы в обход users.status (см. login выше).
    if (user.status === 'suspended' || user.status === 'blacklisted') {
      throw new UnauthorizedException('Account is blocked');
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

  async logoutAllDevices(userId: string): Promise<void> {
    await this.usersService.updateTokensValidAfter(userId);
  }

  /**
   * Password-less восстановление: валидный код восстановления задаёт новый пароль.
   * Заодно отзывает все остальные сессии (сброс пароля = "возможно, я потерял контроль
   * над аккаунтом") и выпускает новый код взамен использованного (старый — одноразовый).
   */
  async recover(login: string, recoveryCode: string, newPassword: string) {
    const user = await this.usersService.findByLogin(login);
    if (!user) {
      throw new UnauthorizedException('Неверный логин или код восстановления');
    }

    const isValid = await this.usersService.verifyRecoveryCode(user, recoveryCode);
    if (!isValid) {
      throw new UnauthorizedException('Неверный логин или код восстановления');
    }

    await this.usersService.updatePassword(user.id, newPassword);
    await this.usersService.updateTokensValidAfter(user.id);
    const recoveryCodeNew = await this.usersService.setRecoveryCode(user.id);

    const updatedUser = await this.usersService.findById(user.id);
    const tokens = await this.generateTokens(updatedUser!, updatedUser!.email ?? '');

    return {
      user: {
        id: updatedUser!.id,
        login: updatedUser!.login ?? null,
        phone: updatedUser!.phone ?? null,
        email: updatedUser!.email ?? null,
        role: updatedUser!.role,
        status: updatedUser!.status,
        subscriptionTier: updatedUser!.subscriptionTier ?? 'none',
      },
      recoveryCode: recoveryCodeNew,
      ...tokens,
    };
  }

  /** Требует текущий пароль — угнанная, но залогиненная сессия не должна тихо перевыпустить код. */
  async regenerateRecoveryCode(userId: string, password: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await this.usersService.validatePassword(user, password);
    if (!isValid) {
      // 403, а не 401 — сессия валидна, ошибся только пароль-подтверждение; иначе authFetch
      // на повторных 401 тихо разлогинил бы (см. apps/web/lib/api-client.ts).
      throw new ForbiddenException('Неверный пароль');
    }

    return this.usersService.setRecoveryCode(userId);
  }
}
