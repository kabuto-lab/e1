import { makeRegisterHandler } from './register';
import { ApiClient, ApiError } from '../api-client';

function makeCtx(fromId?: number, username?: string, languageCode?: string): any {
  const reply = jest.fn().mockResolvedValue(undefined);
  return {
    ctx: {
      from: fromId ? { id: fromId, username, language_code: languageCode } : undefined,
      reply,
    },
    reply,
  };
}

function mockApi(impl: Partial<ApiClient> = {}): ApiClient {
  return {
    consumeLinkToken: jest.fn(),
    loginByTelegramId: jest.fn(),
    registerByTelegram: jest.fn().mockResolvedValue({
      user: { id: 'uuid', role: 'client', status: 'active', telegramId: '42', telegramUsername: null },
      accessToken: 'x',
      refreshToken: 'y',
    }),
    ...impl,
  } as any;
}

describe('register handler', () => {
  it('replies with success + optional site URL on register', async () => {
    const api = mockApi();
    const handler = makeRegisterHandler(api, 'https://lovnge.com');
    const { ctx, reply } = makeCtx(42, 'alice', 'ru');
    await handler(ctx);

    expect(api.registerByTelegram).toHaveBeenCalledWith({
      telegramId: '42',
      telegramUsername: 'alice',
      telegramLanguageCode: 'ru',
      role: 'client',
    });
    const replyArg = reply.mock.calls[0][0] as string;
    expect(replyArg).toMatch(/Аккаунт создан/);
    expect(replyArg).toContain('https://lovnge.com/cabinet');
  });

  it('suggests /me when tgId already has account (409)', async () => {
    const api = mockApi({
      registerByTelegram: jest.fn().mockRejectedValue(new ApiError('exists', 409)) as any,
    });
    const handler = makeRegisterHandler(api);
    const { ctx, reply } = makeCtx(42);
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/уже есть аккаунт/);
  });

  it('reports service unavailable on 503', async () => {
    const api = mockApi({
      registerByTelegram: jest.fn().mockRejectedValue(new ApiError('not configured', 503)) as any,
    });
    const handler = makeRegisterHandler(api);
    const { ctx, reply } = makeCtx(42);
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/временно недоступна/);
  });

  it('asks to retry on unexpected error', async () => {
    const api = mockApi({
      registerByTelegram: jest.fn().mockRejectedValue(new Error('boom')) as any,
    });
    const handler = makeRegisterHandler(api);
    const { ctx, reply } = makeCtx(42);
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/через минуту/);
  });

  it('refuses when tgId cannot be determined', async () => {
    const api = mockApi();
    const handler = makeRegisterHandler(api);
    const { ctx, reply } = makeCtx(undefined);
    await handler(ctx);
    expect(api.registerByTelegram).not.toHaveBeenCalled();
    expect(reply.mock.calls[0][0]).toMatch(/Не удалось определить/);
  });
});
