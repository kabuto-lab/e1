import { EventEmitter } from 'node:events';
import { request } from 'node:https';
import { requestTelegramApi } from './telegram-http.util';

jest.mock('node:https', () => ({ request: jest.fn() }));

describe('Telegram HTTPS transport', () => {
  const requestMock = request as jest.Mock;

  beforeEach(() => { requestMock.mockReset(); });

  it('posts UTF-8 JSON over IPv4 and preserves the Telegram response', async () => {
    const response = Object.assign(new EventEmitter(), { statusCode: 400, setEncoding: jest.fn() });
    const req = Object.assign(new EventEmitter(), {
      end: jest.fn().mockImplementation(() => {
        response.emit('data', '{"ok":false,"description":"chat not found"}');
        response.emit('end');
      }),
    });
    requestMock.mockImplementation((_options, onResponse) => { onResponse(response); return req; });

    await expect(requestTelegramApi('test-token', 'sendMessage', { text: 'Привет' })).resolves.toEqual({
      status: 400, body: '{"ok":false,"description":"chat not found"}',
    });
    expect(requestMock.mock.calls[0][0]).toMatchObject({
      hostname: 'api.telegram.org', path: '/bottest-token/sendMessage', method: 'POST', family: 4,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength('{"text":"Привет"}') },
      signal: expect.any(AbortSignal),
    });
    expect(req.end).toHaveBeenCalledWith('{"text":"Привет"}');
    expect(response.setEncoding).toHaveBeenCalledWith('utf8');
  });

  it('rejects connection errors so the notification service can log them', async () => {
    const req = Object.assign(new EventEmitter(), {
      end: jest.fn().mockImplementation(() => { req.emit('error', new Error('ETIMEDOUT')); }),
    });
    requestMock.mockReturnValue(req);
    await expect(requestTelegramApi('test-token', 'sendMessage', {})).rejects.toThrow('ETIMEDOUT');
  });

  it('rejects a response stream error instead of leaving the request pending', async () => {
    const response = Object.assign(new EventEmitter(), { setEncoding: jest.fn() });
    const req = Object.assign(new EventEmitter(), {
      end: jest.fn().mockImplementation(() => { response.emit('error', new Error('ECONNRESET')); }),
    });
    requestMock.mockImplementation((_options, onResponse) => { onResponse(response); return req; });
    await expect(requestTelegramApi('test-token', 'sendMessage', {})).rejects.toThrow('ECONNRESET');
  });
});
