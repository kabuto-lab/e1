import { ConfigService } from '@nestjs/config';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { BotSecretGuard } from './bot-secret.guard';

function makeContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as any;
}

function makeConfig(secret: string | undefined): ConfigService {
  return {
    get: jest.fn((k: string) => (k === 'TELEGRAM_BOT_SECRET' ? secret : undefined)),
  } as any;
}

const VALID_SECRET = 'a'.repeat(32);

describe('BotSecretGuard', () => {
  it('throws 503 when TELEGRAM_BOT_SECRET is not configured', () => {
    const guard = new BotSecretGuard(makeConfig(undefined));
    expect(() => guard.canActivate(makeContext({ 'x-bot-secret': VALID_SECRET }))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws 401 when header is missing', () => {
    const guard = new BotSecretGuard(makeConfig(VALID_SECRET));
    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('throws 401 when header value mismatches (different length)', () => {
    const guard = new BotSecretGuard(makeConfig(VALID_SECRET));
    expect(() => guard.canActivate(makeContext({ 'x-bot-secret': 'a'.repeat(31) }))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws 401 when header value mismatches (same length, different content)', () => {
    const guard = new BotSecretGuard(makeConfig(VALID_SECRET));
    expect(() => guard.canActivate(makeContext({ 'x-bot-secret': 'b'.repeat(32) }))).toThrow(
      UnauthorizedException,
    );
  });

  it('returns true when header matches exactly', () => {
    const guard = new BotSecretGuard(makeConfig(VALID_SECRET));
    expect(guard.canActivate(makeContext({ 'x-bot-secret': VALID_SECRET }))).toBe(true);
  });
});
