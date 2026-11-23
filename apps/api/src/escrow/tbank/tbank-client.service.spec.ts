import { ConfigService } from '@nestjs/config';
import { TbankClientService } from './tbank-client.service';
import { createHash } from 'crypto';

const PASSWORD = 'only-a-unit-test-fixture';
const config = (values: Record<string, string>) => ({ get: (key: string) => values[key] }) as ConfigService;
const payload = { Amount: 1111, OrderId: 'order-fixture', PaymentId: '123', Status: 'AUTHORIZED', Success: true, TerminalKey: 'terminal-fixture' };

describe('T-Bank signing and transport', () => {
  const client = new TbankClientService(config({ TBANK_TERMINAL_KEY: 'terminal-fixture', TBANK_PASSWORD: PASSWORD }));
  const fetchBefore = global.fetch;
  afterEach(() => { global.fetch = fetchBefore; jest.restoreAllMocks(); });

  it('signs sorted scalar values and excludes all nested notification objects', () => {
    const expected = createHash('sha256')
      .update('1111order-fixture' + PASSWORD + '123AUTHORIZEDtrueterminal-fixture').digest('hex');
    expect(client.signToken({ ...payload, Data: { ignored: true }, Receipt: {}, Shops: [], Token: 'ignored', Optional: null } as any, PASSWORD))
      .toBe(expected);
  });

  it('accepts the correct digest and rejects malformed or modified signatures', () => {
    const token = client.signToken(payload, PASSWORD);
    expect(client.verifyToken({ ...payload, Token: token })).toBe(true);
    expect(client.verifyToken({ ...payload, Token: token.toUpperCase() })).toBe(true);
    expect(client.verifyToken({ ...payload, Amount: 2222, Token: token })).toBe(false);
    for (const invalid of ['', '0'.repeat(63), 'z'.repeat(64), '00', null, 123]) {
      expect(client.verifyToken({ ...payload, Token: invalid } as any)).toBe(false);
    }
    expect(client.verifyToken(null as any)).toBe(false);
  });

  it('posts a signed two-stage Init with a deadline and never sends the password', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ Success: true, PaymentId: '123' }) });
    global.fetch = fetchMock;
    await client.init({ OrderId: 'fixture', Amount: 100, PayType: 'T', NotificationURL: 'https://example.test/webhook', SuccessURL: 'https://example.test/success', FailURL: 'https://example.test/fail' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/v2\/Init$/);
    const body = JSON.parse(options.body);
    expect(body.PayType).toBe('T');
    expect(body.Token).toMatch(/^[a-f0-9]{64}$/);
    expect(body.Password).toBeUndefined();
    expect(options.body).not.toContain(PASSWORD);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects missing configuration without making a bank request', async () => {
    const fetchMock = jest.fn(); global.fetch = fetchMock;
    const missing = new TbankClientService(config({}));
    await expect(missing.init({ OrderId: 'fixture', Amount: 100, PayType: 'T', NotificationURL: 'https://example.test/webhook', SuccessURL: 'https://example.test/success', FailURL: 'https://example.test/fail' }))
      .rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
