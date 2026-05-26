/**
 * safe-fetch.ts — ADR-003 IMPL-A · WP-import SSRF allow-list helper.
 *
 * Single chokepoint for outbound HTTP in WP-import code path. All scripts/
 * services that fetch arbitrary URLs (live URL crawl, WXR attachment URLs,
 * Duplicator-extracted media references) MUST import `safeFetch` from this
 * module instead of `globalThis.fetch` / `node:https`.
 *
 * Enforces (per ADR-003 §Decision):
 *   • Scheme allow-list   — http: / https: only. Blocks file: gopher: ftp:
 *                            dict: data: javascript: ...
 *   • Host IP allow-list  — resolves hostname via dns.lookup({all:true}),
 *                            blocks RFC1918 + link-local + loopback + IPv6
 *                            reserved CIDRs + Docker service names.
 *   • IP-pinning          — defeats DNS-rebind: connect targets the
 *                            resolved IP literal, Host header preserves
 *                            the original hostname.
 *   • Redirect re-check   — each hop re-runs resolution + allow-list;
 *                            max 3 redirects.
 *   • Port allow-list     — 80/443 by default; up to 5 extra via env
 *                            WP_IMPORT_EXTRA_PORTS.
 *   • Body size cap       — 50 MB by default; env WP_IMPORT_MAX_BYTES.
 *   • Content-Type cap    — text/html, application/{rss+xml,xml,json,pdf,
 *                            octet-stream}, image/*, video/*, audio/*.
 *
 * Failure mode mitigations (per ADR-003 §F-S1..F-S4):
 *   F-S1 · TOCTOU between resolution and connect → IP-pin.
 *   F-S2 · IPv4-mapped IPv6 bypass (::ffff:10.0.0.1) → normalised.
 *   F-S3 · Service-name DNS (postgres, minio) → literal hostname check.
 *   F-S4 · Operator misconfigures WP_IMPORT_EXTRA_PORTS=* → validated at
 *          first call (max 5 integer ports), throws if malformed.
 *
 * Audit: every block emits a structured log (logger.warn) tagged
 * `wp-import-ssrf-block` with original URL + resolved IPs + block-reason.
 * Phase-1 audit_log_platform integration is a separate slot (ADR-004 / L4).
 *
 * Refs:
 *   • governance/adr/ADR-003-wp-import-ssrf-allowlist.md (Ratified 2026-05-26)
 *   • barbie/ENTITY.md §2.2 (multi-tenant safety), §11 (Sentinel mentality)
 */
import { promises as dns, type LookupAddress } from 'node:dns';
import { Agent as HttpAgent, request as httpRequest, type RequestOptions as HttpReqOpts } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest, type RequestOptions as HttpsReqOpts } from 'node:https';
import { URL } from 'node:url';
import { Logger } from '@nestjs/common';

const log = new Logger('safeFetch');

// ── Allow / block constants ──────────────────────────────────────────────────

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/** Default port allow-list. Extended at runtime by WP_IMPORT_EXTRA_PORTS. */
const DEFAULT_ALLOWED_PORTS = new Set<number>([80, 443]);

/** Hard-blocked hostnames — covers docker-compose service names common in
 *  NAS dev/prod (per ADR §F-S3). Matched LITERALLY before DNS resolution. */
const BLOCKED_LITERAL_HOSTS = new Set<string>([
  'postgres',
  'minio',
  'redis',
  'web',
  'api',
  'mailhog',
  'pgbouncer',
  // additional common service names
  'localhost',
  'host.docker.internal',
]);

/** Default 50 MB body cap. Override via env WP_IMPORT_MAX_BYTES. */
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

/** Allowed Content-Type prefixes / exact values. */
const ALLOWED_CONTENT_TYPES = [
  'text/html',
  'application/rss+xml',
  'application/atom+xml',
  'application/xml',
  'application/json',
  'application/pdf',
  'application/octet-stream',
  'image/',
  'video/',
  'audio/',
];

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 15_000;

// ── Errors ───────────────────────────────────────────────────────────────────

/** Base error for any safeFetch rejection. Has a stable `code` field for
 *  callers + auditors to discriminate on. */
export class SafeFetchError extends Error {
  constructor(
    public readonly code: SafeFetchErrorCode,
    message: string,
    public readonly url?: string,
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

export type SafeFetchErrorCode =
  | 'BLOCKED_SCHEME'
  | 'BLOCKED_HOST'
  | 'BLOCKED_IP'
  | 'BLOCKED_PORT'
  | 'BLOCKED_CONTENT_TYPE'
  | 'BODY_TOO_LARGE'
  | 'TOO_MANY_REDIRECTS'
  | 'INVALID_URL'
  | 'DNS_FAILURE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

// ── Public types ─────────────────────────────────────────────────────────────

export interface SafeFetchOptions {
  /** HTTP method. Default: GET. */
  method?: 'GET' | 'HEAD';
  /** Per-request timeout in ms. Default: 15_000. */
  timeoutMs?: number;
  /** Max body bytes. Default: DEFAULT_MAX_BYTES (or env override). */
  maxBytes?: number;
  /** Optional request headers (User-Agent etc.). Host header overridden. */
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  /** Final URL after redirects. */
  finalUrl: string;
}

// ── Env config (read once, validated) ────────────────────────────────────────

let cachedAllowedPorts: Set<number> | null = null;
function getAllowedPorts(): Set<number> {
  if (cachedAllowedPorts) return cachedAllowedPorts;
  const ports = new Set(DEFAULT_ALLOWED_PORTS);
  const extra = process.env.WP_IMPORT_EXTRA_PORTS;
  if (extra) {
    const parts = extra.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 5) {
      throw new SafeFetchError(
        'BLOCKED_PORT',
        `WP_IMPORT_EXTRA_PORTS exceeds max 5 entries (got ${parts.length}). ` +
          `Refusing to start — narrow the allow-list.`,
      );
    }
    for (const p of parts) {
      const n = Number.parseInt(p, 10);
      if (!Number.isFinite(n) || n < 1 || n > 65_535) {
        throw new SafeFetchError(
          'BLOCKED_PORT',
          `WP_IMPORT_EXTRA_PORTS contains non-integer / out-of-range value: ${p}`,
        );
      }
      ports.add(n);
    }
  }
  cachedAllowedPorts = ports;
  return ports;
}

function getMaxBytes(opt?: number): number {
  if (typeof opt === 'number') return opt;
  const env = process.env.WP_IMPORT_MAX_BYTES;
  if (!env) return DEFAULT_MAX_BYTES;
  const n = Number.parseInt(env, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

// ── IP CIDR helpers ──────────────────────────────────────────────────────────

/** Parse IPv4 dotted-quad → 32-bit integer. Returns null on malformed. */
function ipv4ToInt(ip: string): number | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = [m[1], m[2], m[3], m[4]].map(Number);
  for (const p of parts) {
    if (p < 0 || p > 255) return null;
  }
  return (parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3]) >>> 0;
}

/** Parse CIDR "10.0.0.0/8" → {base, mask}. */
function parseCidr4(cidr: string): { base: number; mask: number } | null {
  const [ip, prefix] = cidr.split('/');
  const base = ipv4ToInt(ip);
  const prefixN = Number.parseInt(prefix, 10);
  if (base === null || !Number.isFinite(prefixN) || prefixN < 0 || prefixN > 32) return null;
  const mask = prefixN === 0 ? 0 : (0xffffffff << (32 - prefixN)) >>> 0;
  return { base: base & mask, mask };
}

/** RFC1918 + link-local + loopback + reserved IPv4 CIDRs. */
const BLOCKED_IPV4_CIDRS = [
  '0.0.0.0/8',         // "this network"
  '10.0.0.0/8',        // RFC1918 private
  '100.64.0.0/10',     // CGNAT
  '127.0.0.0/8',       // loopback
  '169.254.0.0/16',    // link-local (AWS/GCP metadata at 169.254.169.254)
  '172.16.0.0/12',     // RFC1918 private
  '192.0.0.0/24',      // IETF protocol assignments
  '192.0.2.0/24',      // TEST-NET-1
  '192.168.0.0/16',    // RFC1918 private
  '198.18.0.0/15',     // benchmarking
  '198.51.100.0/24',   // TEST-NET-2
  '203.0.113.0/24',    // TEST-NET-3
  '224.0.0.0/4',       // multicast
  '240.0.0.0/4',       // reserved
  '255.255.255.255/32',// limited broadcast
].map(parseCidr4).filter((c): c is { base: number; mask: number } => c !== null);

function isBlockedIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // malformed → safer to block
  for (const c of BLOCKED_IPV4_CIDRS) {
    if ((n & c.mask) === c.base) return true;
  }
  return false;
}

/** Normalise IPv4-mapped IPv6 (::ffff:10.0.0.1) → "10.0.0.1". Returns null
 *  if not an IPv4-mapped address. */
function ipv4MappedToV4(ipv6: string): string | null {
  const m = ipv6.toLowerCase().match(/^::ffff:([0-9a-f.:]+)$/);
  if (!m) return null;
  const inner = m[1];
  // Already in dotted form (::ffff:1.2.3.4)?
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(inner)) return inner;
  // Hex pair form (::ffff:0102:0304) → decode
  const match = inner.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!match) return null;
  const hi = Number.parseInt(match[1], 16);
  const lo = Number.parseInt(match[2], 16);
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

/** Block list for IPv6. Conservative: block everything not a global unicast.
 *  '::ffff:N.N.N.N' is normalised to IPv4 and re-checked through v4 list. */
function isBlockedIPv6(ip: string): boolean {
  const v4 = ipv4MappedToV4(ip);
  if (v4 !== null) return isBlockedIPv4(v4);
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true; // any / loopback
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9')
    || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  if (lower.startsWith('ff')) return true; // multicast
  return false;
}

function isBlockedIp(ip: string, family: 4 | 6): boolean {
  return family === 4 ? isBlockedIPv4(ip) : isBlockedIPv6(ip);
}

// ── Validation pass ──────────────────────────────────────────────────────────

interface ResolvedTarget {
  url: URL;
  host: string;
  port: number;
  ip: string;
  family: 4 | 6;
}

async function validateAndResolve(rawUrl: string): Promise<ResolvedTarget> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError('INVALID_URL', `Cannot parse URL: ${rawUrl}`, rawUrl);
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    audit('BLOCKED_SCHEME', rawUrl, url.protocol);
    throw new SafeFetchError('BLOCKED_SCHEME', `Scheme not allowed: ${url.protocol}`, rawUrl);
  }

  const host = url.hostname.toLowerCase();
  if (!host) {
    throw new SafeFetchError('INVALID_URL', `URL has empty hostname: ${rawUrl}`, rawUrl);
  }

  // F-S3: block literal docker-compose service names BEFORE DNS resolution.
  if (BLOCKED_LITERAL_HOSTS.has(host)) {
    audit('BLOCKED_HOST', rawUrl, host);
    throw new SafeFetchError('BLOCKED_HOST', `Literal hostname blocked: ${host}`, rawUrl);
  }

  // Reject numeric IP literals — force the resolution path so allow-list runs.
  // (User-supplied IP literals are nearly always SSRF attempts in WP-import.)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || host.includes(':')) {
    // Still validate through allow-list directly.
    const family: 4 | 6 = host.includes(':') ? 6 : 4;
    if (isBlockedIp(host, family)) {
      audit('BLOCKED_IP', rawUrl, host);
      throw new SafeFetchError('BLOCKED_IP', `IP literal blocked: ${host}`, rawUrl);
    }
  }

  // Port check.
  const port = url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80;
  if (!getAllowedPorts().has(port)) {
    audit('BLOCKED_PORT', rawUrl, String(port));
    throw new SafeFetchError(
      'BLOCKED_PORT',
      `Port not in allow-list: ${port} (allowed: ${[...getAllowedPorts()].join(',')})`,
      rawUrl,
    );
  }

  // DNS resolve (F-S1 mitigation: family:0 gets BOTH v4+v6; all:true gets
  // every record; we check EVERY one against block-list; pin the first
  // allowed for connect).
  let records: LookupAddress[];
  try {
    records = await dns.lookup(host, { all: true, family: 0 });
  } catch (err) {
    throw new SafeFetchError(
      'DNS_FAILURE',
      `DNS lookup failed for ${host}: ${(err as Error).message}`,
      rawUrl,
    );
  }
  if (records.length === 0) {
    throw new SafeFetchError('DNS_FAILURE', `DNS returned no records for ${host}`, rawUrl);
  }

  // EVERY record must pass. Even one blocked IP rejects the whole URL —
  // attacker could craft DNS with mixed records to bypass.
  for (const r of records) {
    const family = (r.family === 6 ? 6 : 4) as 4 | 6;
    if (isBlockedIp(r.address, family)) {
      audit('BLOCKED_IP', rawUrl, `${host} → ${r.address}`);
      throw new SafeFetchError(
        'BLOCKED_IP',
        `Hostname resolves to blocked IP: ${host} → ${r.address}`,
        rawUrl,
      );
    }
  }

  // Pin the first allowed record.
  const pinned = records[0];
  return {
    url,
    host,
    port,
    ip: pinned.address,
    family: (pinned.family === 6 ? 6 : 4) as 4 | 6,
  };
}

// ── Audit ────────────────────────────────────────────────────────────────────

function audit(reason: SafeFetchErrorCode, url: string, detail: string): void {
  log.warn(
    `wp-import-ssrf-block · reason=${reason} url=${url} detail=${detail}`,
  );
}

// ── Single-hop fetch (no redirect handling) ──────────────────────────────────

interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  /** Location header (for redirect handling), if any. */
  location?: string;
}

function rawFetch(target: ResolvedTarget, opt: Required<SafeFetchOptions>): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = target.url.protocol === 'https:';
    // IP-pin: hostname in the request goes to the resolved IP, but Host header
    // keeps the original hostname so TLS SNI + virtual-host routing work.
    const baseOpts = {
      host: target.ip,
      port: target.port,
      path: `${target.url.pathname}${target.url.search}`,
      method: opt.method,
      headers: {
        ...opt.headers,
        Host: target.host + (
          (isHttps && target.port !== 443) || (!isHttps && target.port !== 80)
            ? `:${target.port}`
            : ''
        ),
      },
      timeout: opt.timeoutMs,
    };

    // Branch on scheme: https.RequestOptions adds `servername` (TLS SNI) +
    // accepts https.Agent; http.RequestOptions does neither.
    const req = isHttps
      ? httpsRequest({
          ...baseOpts,
          servername: target.host,
          agent: new HttpsAgent({ keepAlive: false }),
        } satisfies HttpsReqOpts, onResponse)
      : httpRequest({
          ...baseOpts,
          agent: new HttpAgent({ keepAlive: false }),
        } satisfies HttpReqOpts, onResponse);

    function onResponse(res: import('node:http').IncomingMessage): void {
      const status = res.statusCode ?? 0;
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) {
        if (typeof v === 'string') headers[k.toLowerCase()] = v;
        else if (Array.isArray(v)) headers[k.toLowerCase()] = v.join(', ');
      }
      const location = headers['location'];

      // Stream body with byte cap.
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > opt.maxBytes) {
          req.destroy();
          reject(new SafeFetchError(
            'BODY_TOO_LARGE',
            `Response exceeds ${opt.maxBytes} bytes`,
            target.url.toString(),
          ));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({ status, headers, body: Buffer.concat(chunks), location });
      });
      res.on('error', (err) => {
        reject(new SafeFetchError('NETWORK_ERROR', err.message, target.url.toString()));
      });
    }

    req.on('timeout', () => {
      req.destroy();
      reject(new SafeFetchError(
        'TIMEOUT',
        `Request timed out after ${opt.timeoutMs}ms`,
        target.url.toString(),
      ));
    });
    req.on('error', (err) => {
      reject(new SafeFetchError('NETWORK_ERROR', err.message, target.url.toString()));
    });

    req.end();
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a URL with SSRF allow-list enforcement, IP-pinning, redirect
 * re-validation, body-size cap, and content-type filtering.
 *
 * @throws {SafeFetchError} with `code` discriminator on any policy reject.
 * @throws {SafeFetchError} with code='NETWORK_ERROR' on transport failure.
 *
 * Successful response is returned; non-2xx HTTP statuses are NOT thrown —
 * the caller decides how to handle them.
 */
export async function safeFetch(
  rawUrl: string,
  options?: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const opt: Required<SafeFetchOptions> = {
    method: options?.method ?? 'GET',
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBytes: getMaxBytes(options?.maxBytes),
    headers: options?.headers ?? {},
  };

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = await validateAndResolve(currentUrl);
    const res = await rawFetch(target, opt);

    // 3xx with Location → re-validate and loop.
    if (res.status >= 300 && res.status < 400 && res.location) {
      if (hop === MAX_REDIRECTS) {
        audit('TOO_MANY_REDIRECTS', rawUrl, `${hop + 1} hops`);
        throw new SafeFetchError(
          'TOO_MANY_REDIRECTS',
          `Exceeded ${MAX_REDIRECTS} redirect hops`,
          rawUrl,
        );
      }
      currentUrl = new URL(res.location, currentUrl).toString();
      continue;
    }

    // Final response — content-type check.
    const ctRaw = res.headers['content-type'] ?? '';
    const ct = ctRaw.split(';')[0].trim().toLowerCase();
    if (ct && !ALLOWED_CONTENT_TYPES.some((allow) => ct.startsWith(allow))) {
      audit('BLOCKED_CONTENT_TYPE', target.url.toString(), ct);
      throw new SafeFetchError(
        'BLOCKED_CONTENT_TYPE',
        `Content-Type not in allow-list: ${ct}`,
        target.url.toString(),
      );
    }

    return {
      status: res.status,
      headers: res.headers,
      body: res.body,
      finalUrl: target.url.toString(),
    };
  }

  // Unreachable — loop body always returns or throws.
  throw new SafeFetchError('TOO_MANY_REDIRECTS', 'unreachable', rawUrl);
}

// ── Test exports (internal — used by safe-fetch.spec.ts) ─────────────────────

/** @internal — exported for unit tests; not part of the public surface. */
export const __testing = {
  ipv4ToInt,
  parseCidr4,
  isBlockedIPv4,
  isBlockedIPv6,
  ipv4MappedToV4,
  validateAndResolve,
  getAllowedPorts,
  resetCachedPorts: () => { cachedAllowedPorts = null; },
};
