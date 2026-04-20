/**
 * Unit-тесты AuthService для Telegram-методов (loginByTelegramId, registerByTelegram).
 *
 * UsersService и JwtService мочатся; реальная подпись JWT не нужна — проверяем
 * контракт: вызовы UsersService, обработку статусов, сборку response-объекта.
 */

import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import type { User } from '@escort/db';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    emailHash: null,
    phoneToken: null,
    passwordHash: null,
    role: 'client',
    subscriptionTier: 'none',
    status: 'active',
    clerkId: null,
    telegramId: 42n,
    telegramUsername: 'alice',
    telegramLanguageCode: 'ru',
    telegramLinkedAt: new Date('2026-04-20T10:00:00Z'),
    telegramNotificationPrefs: {},
    telegramDisclaimerAckedAt: null,
    lastLogin: null,
    deletedAt: null,
    createdAt: new Date('2026-04-20T09:00:00Z'),
    updatedAt: new Date('2026-04-20T10:00:00Z'),
    ...overrides,
  } as unknown as User;
}

async function buildService(overrides: {
  users?: Partial<UsersService>;
  config?: Record<string, string>;
}): Promise<AuthService> {
  const usersServiceMock: Partial<UsersService> = {
    findByTelegramId: jest.fn().mockResolvedValue(null),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
    createTelegramOnlyUser: jest.fn().mockResolvedValue(baseUser()),
    ...overrides.users,
  };
  const jwtServiceMock = {
    sign: jest.fn((payload: any) => `fake-jwt-${payload.type}`),
  };
  const configServiceMock = {
    getOrThrow: jest.fn((k: string) => overrides.config?.[k] ?? 'a'.repeat(64)),
    get: jest.fn((k: string) => overrides.config?.[k]),
  };

  const module = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: UsersService, useValue: usersServiceMock },
      { provide: JwtService, useValue: jwtServiceMock },
      { provide: ConfigService, useValue: configServiceMock },
    ],
  }).compile();
  return module.get(AuthService);
}

describe('AuthService — Telegram methods', () => {
  describe('loginByTelegramId', () => {
    it('throws 401 when no user found', async () => {
      const service = await buildService({ users: { findByTelegramId: jest.fn().mockResolvedValue(null) } });
      await expect(service.loginByTelegramId(42)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws 401 when user is suspended', async () => {
      const service = await buildService({
        users: { findByTelegramId: jest.fn().mockResolvedValue(baseUser({ status: 'suspended' })) },
      });
      await expect(service.loginByTelegramId(42)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws 401 when user is blacklisted', async () => {
      const service = await buildService({
        users: { findByTelegramId: jest.fn().mockResolvedValue(baseUser({ status: 'blacklisted' })) },
      });
      await expect(service.loginByTelegramId(42)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns user + tokens on success, updates lastLogin', async () => {
      const updateLastLogin = jest.fn();
      const service = await buildService({
        users: {
          findByTelegramId: jest.fn().mockResolvedValue(baseUser()),
          updateLastLogin,
        },
      });

      const result = await service.loginByTelegramId(42);
      expect(updateLastLogin).toHaveBeenCalledWith(USER_ID);
      expect(result.user).toMatchObject({
        id: USER_ID,
        role: 'client',
        status: 'active',
        telegramId: '42',
        telegramUsername: 'alice',
      });
      expect(result.accessToken).toBe('fake-jwt-access');
      expect(result.refreshToken).toBe('fake-jwt-refresh');
    });
  });

  describe('registerByTelegram', () => {
    it('creates TG-only user and returns tokens', async () => {
      const createTelegramOnlyUser = jest.fn().mockResolvedValue(baseUser({ telegramId: 777n, role: 'client' }));
      const service = await buildService({ users: { createTelegramOnlyUser } });

      const result = await service.registerByTelegram({
        telegramId: 777,
        telegramUsername: 'newbie',
        telegramLanguageCode: 'en',
      });

      expect(createTelegramOnlyUser).toHaveBeenCalledWith({
        telegramId: 777,
        telegramUsername: 'newbie',
        telegramLanguageCode: 'en',
      });
      expect(result.user.telegramId).toBe('777');
      expect(result.accessToken).toBe('fake-jwt-access');
    });

    it('propagates ConflictException from UsersService when tgId already taken', async () => {
      const err = new Error('conflict') as Error & { status: number };
      err.status = 409;
      const service = await buildService({
        users: { createTelegramOnlyUser: jest.fn().mockRejectedValue(err) },
      });
      await expect(service.registerByTelegram({ telegramId: 42 })).rejects.toBe(err);
    });
  });
});
