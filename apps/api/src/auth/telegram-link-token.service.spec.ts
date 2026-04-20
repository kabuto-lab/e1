/**
 * Unit-тесты TelegramLinkTokenService.
 *
 * DRIZZLE мочится не как строгий builder, а как рекурсивный стаб: каждый метод
 * в цепочке (`.update().set().where().returning()`) возвращает thisArg, кроме
 * финального (`.returning()` / `.values()`), который резолвится mock-значением.
 */

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { TelegramLinkTokenService } from './telegram-link-token.service';

const VALID_TOKEN_HEX = 'a'.repeat(64);
const USER_ID = '11111111-1111-4111-8111-111111111111';

type ChainStub = {
  insert: jest.Mock;
  values: jest.Mock;
  update: jest.Mock;
  set: jest.Mock;
  where: jest.Mock;
  returning: jest.Mock;
  delete: jest.Mock;
};

function makeDbStub(overrides: Partial<{ returning: unknown[]; insertResolves: boolean }> = {}): ChainStub {
  const chain: any = {};
  chain.insert = jest.fn(() => chain);
  chain.values = jest.fn(() => Promise.resolve(undefined));
  chain.update = jest.fn(() => chain);
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() =>
    Promise.resolve(overrides.returning ?? [{ userId: USER_ID }]),
  );
  chain.delete = jest.fn(() => chain);
  return chain;
}

function makeConfigStub(values: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as any;
}

async function buildService(
  db: ChainStub,
  config: ConfigService,
): Promise<TelegramLinkTokenService> {
  const module = await Test.createTestingModule({
    providers: [
      TelegramLinkTokenService,
      { provide: 'DRIZZLE', useValue: db },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();
  return module.get(TelegramLinkTokenService);
}

describe('TelegramLinkTokenService', () => {
  describe('createLinkToken', () => {
    it('creates token, computes expiresAt from TTL env, returns deep link when bot username set', async () => {
      const db = makeDbStub();
      const config = makeConfigStub({
        TELEGRAM_LINK_TOKEN_TTL_SEC: '600',
        TELEGRAM_BOT_USERNAME: 'my_bot',
      });
      const service = await buildService(db, config);

      const before = Date.now();
      const result = await service.createLinkToken(USER_ID);
      const after = Date.now();

      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      expect(result.deepLink).toBe(`https://t.me/my_bot?start=link_${result.token}`);
      // expiresAt ≈ now + 600s
      const expiresMs = result.expiresAt.getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 600_000);
      expect(expiresMs).toBeLessThanOrEqual(after + 600_000);

      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          token: result.token,
          expiresAt: result.expiresAt,
        }),
      );
    });

    it('returns deepLink=null when TELEGRAM_BOT_USERNAME is not set', async () => {
      const db = makeDbStub();
      const config = makeConfigStub({ TELEGRAM_LINK_TOKEN_TTL_SEC: '300' });
      const service = await buildService(db, config);

      const result = await service.createLinkToken(USER_ID);
      expect(result.deepLink).toBeNull();
    });

    it('falls back to 300s TTL when env var missing', async () => {
      const db = makeDbStub();
      const config = makeConfigStub({});
      const service = await buildService(db, config);

      const before = Date.now();
      const result = await service.createLinkToken(USER_ID);
      const after = Date.now();

      const expiresMs = result.expiresAt.getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 300_000);
      expect(expiresMs).toBeLessThanOrEqual(after + 300_000);
    });
  });

  describe('consumeToken', () => {
    it('rejects invalid format (wrong length)', async () => {
      const service = await buildService(makeDbStub(), makeConfigStub());
      await expect(service.consumeToken('tooShort')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects invalid format (non-hex chars)', async () => {
      const service = await buildService(makeDbStub(), makeConfigStub());
      await expect(service.consumeToken('z'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns userId when UPDATE matches a row', async () => {
      const db = makeDbStub({ returning: [{ userId: USER_ID }] });
      const service = await buildService(db, makeConfigStub());

      const result = await service.consumeToken(VALID_TOKEN_HEX);
      expect(result.userId).toBe(USER_ID);
      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ consumedAt: expect.any(Date) }));
    });

    it('throws 400 when UPDATE returns no rows (already used / expired / nonexistent)', async () => {
      const db = makeDbStub({ returning: [] });
      const service = await buildService(db, makeConfigStub());

      await expect(service.consumeToken(VALID_TOKEN_HEX)).rejects.toThrow(
        /invalid, expired, or already used/,
      );
    });

    it('kicks off cleanup but does not await it (lazy best-effort)', async () => {
      const db = makeDbStub({ returning: [{ userId: USER_ID }] });
      const service = await buildService(db, makeConfigStub());

      await service.consumeToken(VALID_TOKEN_HEX);
      // delete (cleanup) invoked on the same chain
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
