import { request } from 'node:https';

/** Telegram-only transport: explicit IPv4 avoids fetch connection timeouts on the VPS. */
export function requestTelegramApi(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: string }> {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      family: 4,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      signal: AbortSignal.timeout(10_000),
    }, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { responseBody += chunk; });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: responseBody }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
