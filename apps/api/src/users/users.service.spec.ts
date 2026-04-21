/**
 * Фокус: Telegram-методы в UsersService (findByTelegramId, linkTelegramIdentity,
 * createTelegramOnlyUser). Drizzle-builder мочится рекурсивной цепочкой;
 * где нужен результат — управляем через mockResolvedValue/Once.
 */

import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

/** Умный drizzle-стаб: все "builder"-методы возвращают сам стаб, терминалы — мок-значения. */
function makeDbStub() {
  const chain: any = {};
  // Selects
  chain.select = jest.fn(() => chain);
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve([])); // default empty
  chain.offset = jest.fn(() => Promise.resolve([]));
  // Inserts
  chain.insert = jest.fn(() => chain);
  chain.values = jest.fn(() => chain);
  // Updates
  chain.update = jest.fn(() => chain);
  chain.set = jest.fn(() => chain);
  // Terminal
  chain.returning = jest.fn(() => Promise.resolve([]));
  return chain;
}

async function buildService(db: any): Promise<UsersService> {
  const module = await Test.createTestingModule({
    providers: [UsersService, { provide: 'DRIZZLE', useValue: db }],
  }).compile();
  return module.get(UsersService);
}

describe('UsersService — Telegram methods', () => {
  describe('findByTelegramId', () => {
    it('converts number|string|bigint → bigint and returns first row', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([{ id: USER_ID, telegramId: 42n }]));
      const service = await buildService(db);

      await expect(service.findByTelegramId(42)).resolves.toEqual({ id: USER_ID, telegramId: 42n });
      await expect(service.findByTelegramId('42')).resolves.toEqual({ id: USER_ID, telegramId: 42n });
      await expect(service.findByTelegramId(42n)).resolves.toEqual({ id: USER_ID, telegramId: 42n });
    });

    it('returns null when no row', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([]));
      const service = await buildService(db);
      await expect(service.findByTelegramId(42)).resolves.toBeNull();
    });
  });

  describe('linkTelegramIdentity', () => {
    it('throws ConflictException if tgId already belongs to another user', async () => {
      const db = makeDbStub();
      // findByTelegramId returns occupant with different id
      db.limit = jest.fn(() => Promise.resolve([{ id: OTHER_USER_ID }]));
      const service = await buildService(db);

      await expect(
        service.linkTelegramIdentity(USER_ID, { telegramId: 42 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates user and returns row when tgId free (idempotent path)', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([])); // no occupant
      db.returning = jest.fn(() =>
        Promise.resolve([
          {
            id: USER_ID,
            telegramId: 42n,
            telegramUsername: 'lovnge_user',
            telegramLanguageCode: 'ru',
            telegramLinkedAt: new Date(),
          },
        ]),
      );
      const service = await buildService(db);

      const updated = await service.linkTelegramIdentity(USER_ID, {
        telegramId: 42,
        telegramUsername: 'lovnge_user',
        telegramLanguageCode: 'en-US',
      });
      expect(updated.id).toBe(USER_ID);
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramId: 42n,
          telegramUsername: 'lovnge_user',
          telegramLanguageCode: 'en', // "en-US" → "en"
          telegramLinkedAt: expect.any(Date),
        }),
      );
    });

    it('idempotent: same tgId linked to SAME user → no conflict, proceeds to update', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([{ id: USER_ID }])); // occupant is the same user
      db.returning = jest.fn(() => Promise.resolve([{ id: USER_ID, telegramId: 42n }]));
      const service = await buildService(db);

      await expect(
        service.linkTelegramIdentity(USER_ID, { telegramId: 42 }),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when user row not found after update', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([]));
      db.returning = jest.fn(() => Promise.resolve([])); // update hit 0 rows
      const service = await buildService(db);

      await expect(
        service.linkTelegramIdentity(USER_ID, { telegramId: 42 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('normalizes unknown language_code → ru', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([]));
      db.returning = jest.fn(() => Promise.resolve([{ id: USER_ID }]));
      const service = await buildService(db);

      await service.linkTelegramIdentity(USER_ID, {
        telegramId: 42,
        telegramLanguageCode: 'de',
      });
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ telegramLanguageCode: 'ru' }),
      );
    });
  });

  describe('unlinkTelegramIdentity', () => {
    it('nullifies tg fields for user with passwordHash and returns updated row', async () => {
      const db = makeDbStub();
      // findById → user with passwordHash (normal email+password account linked to TG)
      db.limit = jest.fn(() =>
        Promise.resolve([
          { id: USER_ID, passwordHash: 'hashed', telegramId: 42n, telegramUsername: 'u' },
        ]),
      );
      db.returning = jest.fn(() =>
        Promise.resolve([
          {
            id: USER_ID,
            passwordHash: 'hashed',
            telegramId: null,
            telegramUsername: null,
            telegramLinkedAt: null,
          },
        ]),
      );
      const service = await buildService(db);

      const result = await service.unlinkTelegramIdentity(USER_ID);
      expect(result.telegramId).toBeNull();
      expect(db.set).toHaveBeenCalledWith({
        telegramId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
      });
    });

    it('throws BadRequestException for TG-only user (no passwordHash)', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() =>
        Promise.resolve([
          { id: USER_ID, passwordHash: null, telegramId: 42n, telegramUsername: 'tgonly' },
        ]),
      );
      const service = await buildService(db);

      await expect(service.unlinkTelegramIdentity(USER_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([]));
      const service = await buildService(db);

      await expect(service.unlinkTelegramIdentity(USER_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createTelegramOnlyUser', () => {
    it('rejects when tgId already occupied', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([{ id: OTHER_USER_ID }]));
      const service = await buildService(db);

      await expect(
        service.createTelegramOnlyUser({ telegramId: 42 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates user with role=client by default, status=active, sets telegramLinkedAt', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([])); // no occupant
      db.returning = jest.fn(() =>
        Promise.resolve([{ id: USER_ID, role: 'client', status: 'active', telegramId: 42n }]),
      );
      const service = await buildService(db);

      const created = await service.createTelegramOnlyUser({
        telegramId: 42,
        telegramUsername: 'newbie',
      });
      expect(created.role).toBe('client');
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'client',
          status: 'active',
          telegramId: 42n,
          telegramUsername: 'newbie',
          telegramLanguageCode: 'ru',
          telegramLinkedAt: expect.any(Date),
        }),
      );
    });

    it('accepts role=model override', async () => {
      const db = makeDbStub();
      db.limit = jest.fn(() => Promise.resolve([]));
      db.returning = jest.fn(() => Promise.resolve([{ id: USER_ID, role: 'model' }]));
      const service = await buildService(db);

      await service.createTelegramOnlyUser({ telegramId: 42, role: 'model' });
      expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ role: 'model' }));
    });
  });
});
