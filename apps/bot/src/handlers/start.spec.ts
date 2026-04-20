/**
 * Тесты start-handler: проверяем маршруты сообщений без реального grammy-контекста.
 * Контекст — минимальный стаб с message.text, from.id/username/language_code, reply.
 */

import { makeStartHandler } from './start';
import { ApiClient, ApiError } from '../api-client';

function makeCtx(overrides: {
  text?: string;
  fromId?: number;
  username?: string;
  languageCode?: string;
}): any {
  const reply = jest.fn().mockResolvedValue(undefined);
  return {
    ctx: {
      message: { text: overrides.text ?? '' },
      from: overrides.fromId
        ? { id: overrides.fromId, username: overrides.username, language_code: overrides.languageCode }
        : undefined,
      reply,
    },
    reply,
  };
}

function mockApi(impl: Partial<ApiClient> = {}): ApiClient {
  return {
    consumeLinkToken: jest.fn().mockResolvedValue({
      userId: 'uuid',
      telegramId: '42',
      telegramUsername: null,
      telegramLinkedAt: new Date().toISOString(),
    }),
    loginByTelegramId: jest.fn(),
    registerByTelegram: jest.fn(),
    ...impl,
  } as any;
}

const VALID_TOKEN = 'a'.repeat(64);

describe('start handler', () => {
  it('replies with help text when /start has no payload', async () => {
    const api = mockApi();
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({ text: '/start', fromId: 42 });
    await handler(ctx);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply.mock.calls[0][0]).toMatch(/Этот бот — для привязки/);
    expect((api.consumeLinkToken as jest.Mock)).not.toHaveBeenCalled();
  });

  it('warns on unknown payload prefix', async () => {
    const api = mockApi();
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({ text: '/start foobar', fromId: 42 });
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/Не понял команду/);
  });

  it('rejects malformed token', async () => {
    const api = mockApi();
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({ text: '/start link_NOTAHEX', fromId: 42 });
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/Токен повреждён/);
    expect(api.consumeLinkToken).not.toHaveBeenCalled();
  });

  it('consumes valid token and confirms success', async () => {
    const api = mockApi();
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({
      text: `/start link_${VALID_TOKEN}`,
      fromId: 42,
      username: 'u',
      languageCode: 'ru',
    });
    await handler(ctx);
    expect(api.consumeLinkToken).toHaveBeenCalledWith({
      token: VALID_TOKEN,
      telegramId: '42',
      telegramUsername: 'u',
      telegramLanguageCode: 'ru',
    });
    expect(reply.mock.calls[0][0]).toMatch(/Готово/);
  });

  it('reports expired/used token on 400', async () => {
    const api = mockApi({
      consumeLinkToken: jest
        .fn()
        .mockRejectedValue(new ApiError('bad', 400)) as any,
    });
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({ text: `/start link_${VALID_TOKEN}`, fromId: 42 });
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/просрочен или уже использован/);
  });

  it('reports tgId collision on 409', async () => {
    const api = mockApi({
      consumeLinkToken: jest
        .fn()
        .mockRejectedValue(new ApiError('conflict', 409)) as any,
    });
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({ text: `/start link_${VALID_TOKEN}`, fromId: 42 });
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/уже привязан к другому аккаунту/);
  });

  it('falls back to generic error on unexpected failure', async () => {
    const api = mockApi({
      consumeLinkToken: jest.fn().mockRejectedValue(new Error('network')) as any,
    });
    const handler = makeStartHandler(api);
    const { ctx, reply } = makeCtx({ text: `/start link_${VALID_TOKEN}`, fromId: 42 });
    await handler(ctx);
    expect(reply.mock.calls[0][0]).toMatch(/ещё раз через минуту/);
  });
});
