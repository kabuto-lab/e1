import { type LookupAddress, promises as dns } from 'node:dns';
import { Agent, type Dispatcher } from 'undici';
import {
  BlockedHostError,
  assertHostnameAllowed,
  assertIpAllowed,
  parseExtraAllowedHosts,
} from './ip-guard';

/**
 * SafeFetch · the only allowed outbound HTTP for user-controlled URLs (SSRF
 * defence — NAS ADR-003).
 *
 * Layers of defence:
 *   1. Scheme allow-list (http/https only).
 *   2. Port allow-list (80/443 by default).
 *   3. Hostname check (block internal service names BEFORE DNS).
 *   4. DNS resolve → check every resolved IP against block-list.
 *   5. IP-pinning hook (see makePinnedDispatcher — currently a plain Agent).
 *   6. Redirect handling: re-validate every hop. Max N hops.
 *   7. Size cap: stream body and reject when bytes exceed limit.
 *   8. Content-type allow-list (caller decides for media vs html).
 *
 * Harvested from the Replikant migrator and decoupled from Nest DI: config is a
 * plain constructor argument instead of an injected env token. Pure class —
 * usable from API services, scripts, or a worker.
 */

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set([80, 443]);

export class SafeFetchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'BLOCKED_SCHEME'
      | 'BLOCKED_PORT'
      | 'BLOCKED_HOST'
      | 'TOO_MANY_REDIRECTS'
      | 'BODY_TOO_LARGE'
      | 'BAD_CONTENT_TYPE'
      | 'NETWORK'
      | 'HTTP_ERROR',
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface SafeFetchConfig {
  /** Default max bytes to read from any response body. */
  maxBytes: number;
  /** Default max redirect hops before TOO_MANY_REDIRECTS. */
  maxRedirects: number;
  /** Extra allowed hostnames — comma-separated string or array (lowercased). */
  extraAllowedHosts?: string | string[];
}

export interface SafeFetchOptions {
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  body?: string | Uint8Array | Buffer;
  /** Optional override per call; defaults to config.maxBytes. */
  maxBytes?: number;
  /** Optional content-type allow-list (substring match). Empty → all allowed. */
  allowContentTypes?: string[];
  /** Optional override per call; defaults to config.maxRedirects. */
  maxRedirects?: number;
  /** AbortSignal forwarded to undici. */
  signal?: AbortSignal;
}

export interface SafeFetchResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  finalUrl: string;
  contentType: string | null;
}

function normalizeAllowed(value: string | string[] | undefined): Set<string> {
  if (!value) return new Set();
  if (Array.isArray(value)) {
    return new Set(value.map((s) => s.trim().toLowerCase()).filter(Boolean));
  }
  return parseExtraAllowedHosts(value);
}

export class SafeFetch {
  private readonly defaultMaxBytes: number;
  private readonly defaultMaxRedirects: number;
  private readonly extraAllowed: Set<string>;

  constructor(config: SafeFetchConfig) {
    this.defaultMaxBytes = config.maxBytes;
    this.defaultMaxRedirects = config.maxRedirects;
    this.extraAllowed = normalizeAllowed(config.extraAllowedHosts);
  }

  /**
   * Fetch a user-controlled URL with full SSRF + size guards.
   * Returns the full response body buffered in memory (bounded by maxBytes).
   * For streaming (e.g. media downloads to object storage), use streamTo().
   */
  async fetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResponse> {
    const maxBytes = opts.maxBytes ?? this.defaultMaxBytes;
    const maxRedirects = opts.maxRedirects ?? this.defaultMaxRedirects;

    let currentUrl = rawUrl;
    let redirectsLeft = maxRedirects;

    // Manual redirect handling — undici's redirect:'follow' wouldn't re-validate hops.
    while (true) {
      const { resolvedIp, parsed } = await this.preflight(currentUrl);

      const dispatcher = this.makePinnedDispatcher(parsed.hostname, resolvedIp);
      let res: Dispatcher.ResponseData;
      try {
        res = await (await import('undici')).request(currentUrl, {
          method: opts.method ?? 'GET',
          headers: { Host: parsed.host, ...(opts.headers ?? {}) },
          body: opts.body,
          dispatcher,
          signal: opts.signal,
          bodyTimeout: 60_000,
          headersTimeout: 30_000,
        });
      } catch (err: unknown) {
        throw new SafeFetchError(
          `Network error fetching ${currentUrl}: ${(err as Error).message}`,
          'NETWORK',
        );
      }

      // Handle redirect chain — re-validate next hop.
      if (res.statusCode >= 300 && res.statusCode < 400) {
        const location = res.headers['location'];
        if (!location || Array.isArray(location)) {
          throw new SafeFetchError('Redirect without location header', 'NETWORK', res.statusCode);
        }
        if (redirectsLeft <= 0) {
          throw new SafeFetchError(
            `Max redirects (${maxRedirects}) exceeded at ${currentUrl}`,
            'TOO_MANY_REDIRECTS',
          );
        }
        redirectsLeft -= 1;
        // Discard body of redirect response.
        res.body.dump().catch(() => undefined);
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (res.statusCode >= 400) {
        // Capture limited error body for caller diagnostics (intentionally unused).
        const buf = await this.collectBounded(res.body, Math.min(maxBytes, 4096));
        void buf;
        throw new SafeFetchError(
          `HTTP ${res.statusCode} fetching ${currentUrl}`,
          'HTTP_ERROR',
          res.statusCode,
        );
      }

      // Content-type guard (caller-defined allow-list).
      const contentType = this.headerValue(res.headers['content-type']);
      if (opts.allowContentTypes && opts.allowContentTypes.length > 0) {
        const matched = opts.allowContentTypes.some(
          (allowed) => contentType !== null && contentType.toLowerCase().includes(allowed.toLowerCase()),
        );
        if (!matched) {
          res.body.dump().catch(() => undefined);
          throw new SafeFetchError(
            `Content-Type "${contentType ?? '(none)'}" not in allow-list`,
            'BAD_CONTENT_TYPE',
            res.statusCode,
          );
        }
      }

      const body = await this.collectBounded(res.body, maxBytes);

      return {
        status: res.statusCode,
        headers: this.flattenHeaders(res.headers),
        body,
        finalUrl: currentUrl,
        contentType,
      };
    }
  }

  /**
   * Stream a user-controlled URL into a writable async sink (e.g. object-storage
   * putObject stream). Same SSRF guards as fetch(). No buffering — bounded by maxBytes.
   */
  async streamTo(
    rawUrl: string,
    sink: (chunk: Buffer) => void | Promise<void>,
    opts: SafeFetchOptions = {},
  ): Promise<{ status: number; finalUrl: string; contentType: string | null; bytes: number }> {
    const maxBytes = opts.maxBytes ?? this.defaultMaxBytes;
    const maxRedirects = opts.maxRedirects ?? this.defaultMaxRedirects;

    let currentUrl = rawUrl;
    let redirectsLeft = maxRedirects;

    while (true) {
      const { resolvedIp, parsed } = await this.preflight(currentUrl);
      const dispatcher = this.makePinnedDispatcher(parsed.hostname, resolvedIp);

      const { request } = await import('undici');
      const res = await request(currentUrl, {
        method: opts.method ?? 'GET',
        headers: { Host: parsed.host, ...(opts.headers ?? {}) },
        dispatcher,
        signal: opts.signal,
        bodyTimeout: 5 * 60_000,
        headersTimeout: 30_000,
      });

      if (res.statusCode >= 300 && res.statusCode < 400) {
        const location = res.headers['location'];
        if (!location || Array.isArray(location)) {
          throw new SafeFetchError('Redirect without location', 'NETWORK', res.statusCode);
        }
        if (redirectsLeft <= 0) {
          throw new SafeFetchError('Max redirects exceeded', 'TOO_MANY_REDIRECTS');
        }
        redirectsLeft -= 1;
        res.body.dump().catch(() => undefined);
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      if (res.statusCode >= 400) {
        res.body.dump().catch(() => undefined);
        throw new SafeFetchError(`HTTP ${res.statusCode}`, 'HTTP_ERROR', res.statusCode);
      }

      const contentType = this.headerValue(res.headers['content-type']);
      if (opts.allowContentTypes && opts.allowContentTypes.length > 0) {
        const ok = opts.allowContentTypes.some(
          (a) => contentType !== null && contentType.toLowerCase().includes(a.toLowerCase()),
        );
        if (!ok) {
          res.body.dump().catch(() => undefined);
          throw new SafeFetchError(
            `Content-Type "${contentType ?? '(none)'}" rejected`,
            'BAD_CONTENT_TYPE',
            res.statusCode,
          );
        }
      }

      let bytes = 0;
      for await (const chunk of res.body) {
        const buf = chunk as Buffer;
        bytes += buf.byteLength;
        if (bytes > maxBytes) {
          throw new SafeFetchError(
            `Body exceeded ${maxBytes} bytes (current: ${bytes})`,
            'BODY_TOO_LARGE',
            res.statusCode,
          );
        }
        await sink(buf);
      }

      return {
        status: res.statusCode,
        finalUrl: currentUrl,
        contentType,
        bytes,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────

  private async preflight(rawUrl: string): Promise<{ parsed: URL; resolvedIp: string }> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new SafeFetchError(`Invalid URL: ${rawUrl}`, 'BLOCKED_HOST');
    }

    if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
      throw new SafeFetchError(`Scheme "${parsed.protocol}" not allowed`, 'BLOCKED_SCHEME');
    }

    const port = Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);
    if (!ALLOWED_PORTS.has(port)) {
      throw new SafeFetchError(`Port ${port} not allowed`, 'BLOCKED_PORT');
    }

    try {
      assertHostnameAllowed(parsed.hostname, this.extraAllowed);
    } catch (err: unknown) {
      if (err instanceof BlockedHostError) {
        throw new SafeFetchError(err.message, 'BLOCKED_HOST');
      }
      throw err;
    }

    // DNS resolve to pin the IP (defeats rebinding).
    let resolved: LookupAddress;
    try {
      resolved = await dns.lookup(parsed.hostname, { family: 0, verbatim: true });
    } catch (err: unknown) {
      throw new SafeFetchError(
        `DNS resolution failed for ${parsed.hostname}: ${(err as Error).message}`,
        'BLOCKED_HOST',
      );
    }

    try {
      assertIpAllowed(resolved.address);
    } catch (err: unknown) {
      if (err instanceof BlockedHostError) {
        throw new SafeFetchError(err.message, 'BLOCKED_HOST');
      }
      throw err;
    }

    return { parsed, resolvedIp: resolved.address };
  }

  /**
   * Currently returns a fresh undici Agent — no custom IP pinning.
   *
   * The preflight() DNS check is still the primary SSRF guard. DNS-rebinding
   * (attacker flips DNS between our resolve and undici's connect) is the
   * remaining gap — to be closed via explicit DNS pre-resolve and a verified
   * `connect:` IP. Undici 7's connect.lookup signature needs investigation
   * before re-enabling pinning.
   */
  private makePinnedDispatcher(_hostname: string, _pinnedIp: string): Agent {
    return new Agent();
  }

  private async collectBounded(
    body: AsyncIterable<unknown>,
    maxBytes: number,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body) {
      const buf = chunk as Buffer;
      total += buf.byteLength;
      if (total > maxBytes) {
        throw new SafeFetchError(
          `Body exceeded ${maxBytes} bytes (current: ${total})`,
          'BODY_TOO_LARGE',
        );
      }
      chunks.push(buf);
    }
    return Buffer.concat(chunks, total);
  }

  private headerValue(h: string | string[] | undefined): string | null {
    if (!h) return null;
    return Array.isArray(h) ? h[0] ?? null : h;
  }

  private flattenHeaders(h: Record<string, string | string[] | undefined>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(h)) {
      if (v === undefined) continue;
      out[k] = Array.isArray(v) ? v.join(', ') : v;
    }
    return out;
  }
}
