/**
 * ToolsService — site analyzer (parser/crawler).
 *
 * Берёт URL → fetch HTML → парсит regex'ами → возвращает структуру
 * (identity, typography, palette, structure, images).
 *
 * Безопасность:
 *  - HTTPS/HTTP only (валидация на DTO уровне).
 *  - SSRF protection: hostname резолвится через dns.lookup, и если хотя бы
 *    один IP попадает в private/loopback диапазоны — 400. Этим закрываем
 *    доступ к локальной инфраструктуре (БД, S3, чужому API, etc.).
 *  - DNS-rebinding pin: после валидации resolveAndAssertPublic возвращает
 *    конкретный IP, и fetchPinned делает TCP-connect именно к нему,
 *    проставляя `Host:` + TLS SNI = оригинальный hostname. Без этого
 *    attacker DNS мог бы вернуть public IP на наш lookup и private IP
 *    на повторный lookup внутри fetch (TOCTOU).
 *  - Redirect handling: ручной цикл + повторная валидация хоста и схемы
 *    на каждом hop, max 5 hops. Без этого public URL может 302-нуть
 *    в private IP (cloud metadata, internal API).
 *  - Body cap: 2MB — чтобы не утечь по памяти на гигантских HTML.
 *  - Timeout: 10s через AbortController.
 *
 * Без новых зависимостей — node:http/https + regex для парсинга. Это
 * намеренно: HTML мы не "валидируем", а извлекаем сигналы; brittle-regex
 * допустим. node:http/https нужен (вместо глобального fetch), потому что
 * только так можно зафиксировать connect-target IP отдельно от TLS SNI.
 */
import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { promises as dns } from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { isIP } from 'node:net';

import type { AnalyzeSiteDto } from './dto/analyze-site.dto';
import type {
  ColorEntryDto,
  GuessedRolesDto,
  ImageEntryDto,
  NavItemDto,
  PaletteDto,
  SiteAnalysisDto,
  StructureDto,
  TypographyDto,
} from './dto/site-analysis.dto';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'NAS-SiteAnalyzer/0.1 (+https://github.com/kabuto-lab)';

/**
 * Whitelist для fetchSafeBinary — типы, которые мы готовы хранить как медиа
 * (logos / favicons из bootstrap-импорта). Расширять осторожно: каждое значение
 * должно безопасно ехать в S3 + получать предсказуемый extension.
 */
const BINARY_MIME_WHITELIST = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);
const DEFAULT_BINARY_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Cap для fetchSafeText / fetchSafeJson — WP REST API endpoints с per_page=100
 * могут вернуть несколько MiB рендеренного HTML. 5 MiB достаточно для большинства
 * страниц, но защитимо.
 */
const DEFAULT_TEXT_MAX_BYTES = 5 * 1024 * 1024;

interface FetchResponse {
  status: number;
  headers: Map<string, string>;
  bodyBytes: Buffer;
  truncated: boolean;
}

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  async analyzeSite(dto: AnalyzeSiteDto): Promise<SiteAnalysisDto> {
    const startedAt = Date.now();
    const url = dto.url.trim();

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException({ code: 'INVALID_URL' });
    }

    let resolved = await this.resolveAndAssertPublic(parsed.hostname);

    const notes: string[] = [];

    // ── fetch (manual redirect + per-hop SSRF validation + pinned IP) ───
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let lastResponse: FetchResponse | null = null;
    let currentUrl = parsed;

    try {
      for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
        const response = await this.fetchPinned(
          currentUrl,
          resolved.address,
          resolved.family,
          controller.signal,
        );

        // Not a redirect → keep response and proceed to body parsing.
        if (response.status < 300 || response.status >= 400) {
          lastResponse = response;
          break;
        }

        const loc = response.headers.get('location');
        if (!loc) {
          lastResponse = response;
          break; // 3xx without Location — treat as terminal.
        }

        if (hops === MAX_REDIRECTS) {
          throw new BadRequestException({ code: 'TOO_MANY_REDIRECTS' });
        }

        let nextUrl: URL;
        try {
          nextUrl = new URL(loc, currentUrl);
        } catch {
          throw new BadRequestException({ code: 'INVALID_REDIRECT' });
        }
        if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
          throw new BadRequestException({ code: 'REDIRECT_SCHEME_FORBIDDEN' });
        }

        resolved = await this.resolveAndAssertPublic(nextUrl.hostname);
        notes.push(`Redirect ${response.status} → ${nextUrl.toString()}`);
        currentUrl = nextUrl;
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof HttpException) throw err;
      if (err instanceof Error && (err.name === 'AbortError' || (err as NodeJS.ErrnoException).code === 'ABORT_ERR')) {
        throw new RequestTimeoutException({ code: 'FETCH_TIMEOUT' });
      }
      throw new BadRequestException({
        code: 'FETCH_FAILED',
        message: err instanceof Error ? err.message : String(err),
      });
    }
    clearTimeout(timer);

    if (!lastResponse) {
      throw new BadRequestException({ code: 'NO_BODY' });
    }

    if (lastResponse.truncated) {
      notes.push(`Body truncated at ${MAX_BYTES} bytes`);
    }
    const html = lastResponse.bodyBytes.toString('utf-8');
    const bytes = lastResponse.bodyBytes.length;

    const finalUrl = currentUrl.toString();
    const baseHref = this.extractBaseHref(html) ?? finalUrl;

    // ── parse ─────────────────────────────────────────────────────────────
    const identity = this.parseIdentity(html, baseHref);
    identity.url = url;
    identity.finalUrl = finalUrl;
    identity.httpStatus = lastResponse.status;
    identity.bytesFetched = bytes;
    identity.durationMs = Date.now() - startedAt;

    const typography = this.parseTypography(html, baseHref);
    const palette = this.parsePalette(html);
    const structure = this.parseStructure(html);
    const images = this.parseImages(html, baseHref);
    const navigation = this.parseNavigation(html, baseHref);
    const isSpa = this.detectIsSpa(structure, images);
    const guessedRoles = this.guessRoleColors(palette.hex);

    if (isSpa) {
      notes.push('Page looks like SPA-shell (no h1/sections, few images) — content may be JS-rendered.');
    }
    if (navigation.length === 0) {
      notes.push('No <nav>/<header> menu found — wizard will fall back to default skeleton.');
    }

    return {
      identity,
      typography,
      palette,
      structure,
      images,
      navigation,
      isSpa,
      guessedRoles,
      notes,
    };
  }

  // ── public binary fetcher (reused by MediaService.fetchAndStoreUrl) ────

  /**
   * Fetch a public URL with the same SSRF/redirect/timeout protections as
   * `analyzeSite`, but for arbitrary binary content (favicons, logos imported
   * during tenant bootstrap). Content-Type must pass `BINARY_MIME_WHITELIST`.
   *
   * Размер captpured за один проход (стримим через тот же fetchPinned, ограничены
   * `opts.maxBytes` (default 2 MiB)). Возвращает финальный URL после redirects,
   * чтобы caller мог корректно построить S3 key с extension'ом.
   */
  async fetchSafeBinary(
    url: string,
    opts: { maxBytes?: number } = {},
  ): Promise<{ contentType: string; bytes: Buffer; finalUrl: string }> {
    const maxBytes = opts.maxBytes ?? DEFAULT_BINARY_MAX_BYTES;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException({ code: 'INVALID_URL' });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException({ code: 'SCHEME_FORBIDDEN' });
    }

    let resolved = await this.resolveAndAssertPublic(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let currentUrl = parsed;
    try {
      for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
        const response = await this.fetchPinned(
          currentUrl,
          resolved.address,
          resolved.family,
          controller.signal,
          maxBytes,
        );

        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get('location');
          if (!loc) {
            throw new BadRequestException({ code: 'REDIRECT_NO_LOCATION' });
          }
          if (hops === MAX_REDIRECTS) {
            throw new BadRequestException({ code: 'TOO_MANY_REDIRECTS' });
          }
          let nextUrl: URL;
          try {
            nextUrl = new URL(loc, currentUrl);
          } catch {
            throw new BadRequestException({ code: 'INVALID_REDIRECT' });
          }
          if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
            throw new BadRequestException({ code: 'REDIRECT_SCHEME_FORBIDDEN' });
          }
          resolved = await this.resolveAndAssertPublic(nextUrl.hostname);
          currentUrl = nextUrl;
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          throw new BadRequestException({
            code: 'FETCH_STATUS',
            status: response.status,
          });
        }

        const rawCt = response.headers.get('content-type') ?? 'application/octet-stream';
        const contentType = rawCt.split(';')[0].trim().toLowerCase();
        if (!BINARY_MIME_WHITELIST.has(contentType)) {
          throw new BadRequestException({
            code: 'CONTENT_TYPE_FORBIDDEN',
            contentType,
            allowed: [...BINARY_MIME_WHITELIST],
          });
        }
        if (response.truncated) {
          throw new BadRequestException({ code: 'BINARY_TOO_LARGE', max: maxBytes });
        }
        return {
          contentType,
          bytes: response.bodyBytes,
          finalUrl: currentUrl.toString(),
        };
      }
      throw new BadRequestException({ code: 'TOO_MANY_REDIRECTS' });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || (err as NodeJS.ErrnoException).code === 'ABORT_ERR')
      ) {
        throw new RequestTimeoutException({ code: 'FETCH_TIMEOUT' });
      }
      throw new BadRequestException({
        code: 'FETCH_FAILED',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * SSRF-safe текстовый fetch — то же что fetchSafeBinary, но без MIME-whitelist'а
   * (caller сам валидирует). Возвращает текст (UTF-8) + headers + status + finalUrl.
   * Используется fetchSafeJson и WpImportService для GET /wp-json endpoints.
   */
  async fetchSafeText(
    url: string,
    opts: { maxBytes?: number } = {},
  ): Promise<{ text: string; finalUrl: string; status: number; headers: Map<string, string> }> {
    const maxBytes = opts.maxBytes ?? DEFAULT_TEXT_MAX_BYTES;

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException({ code: 'INVALID_URL' });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException({ code: 'SCHEME_FORBIDDEN' });
    }

    let resolved = await this.resolveAndAssertPublic(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let currentUrl = parsed;
    try {
      for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
        const response = await this.fetchPinned(
          currentUrl,
          resolved.address,
          resolved.family,
          controller.signal,
          maxBytes,
        );

        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get('location');
          if (!loc) throw new BadRequestException({ code: 'REDIRECT_NO_LOCATION' });
          if (hops === MAX_REDIRECTS) {
            throw new BadRequestException({ code: 'TOO_MANY_REDIRECTS' });
          }
          let nextUrl: URL;
          try {
            nextUrl = new URL(loc, currentUrl);
          } catch {
            throw new BadRequestException({ code: 'INVALID_REDIRECT' });
          }
          if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
            throw new BadRequestException({ code: 'REDIRECT_SCHEME_FORBIDDEN' });
          }
          resolved = await this.resolveAndAssertPublic(nextUrl.hostname);
          currentUrl = nextUrl;
          continue;
        }

        if (response.status < 200 || response.status >= 300) {
          throw new BadRequestException({
            code: 'FETCH_STATUS',
            status: response.status,
          });
        }
        if (response.truncated) {
          throw new BadRequestException({ code: 'TEXT_TOO_LARGE', max: maxBytes });
        }
        return {
          text: response.bodyBytes.toString('utf8'),
          finalUrl: currentUrl.toString(),
          status: response.status,
          headers: response.headers,
        };
      }
      throw new BadRequestException({ code: 'TOO_MANY_REDIRECTS' });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || (err as NodeJS.ErrnoException).code === 'ABORT_ERR')
      ) {
        throw new RequestTimeoutException({ code: 'FETCH_TIMEOUT' });
      }
      throw new BadRequestException({
        code: 'FETCH_FAILED',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET + JSON.parse поверх fetchSafeText. Возвращает headers (для X-WP-Total). */
  async fetchSafeJson<T = unknown>(
    url: string,
    opts: { maxBytes?: number } = {},
  ): Promise<{ data: T; finalUrl: string; headers: Map<string, string> }> {
    const res = await this.fetchSafeText(url, opts);
    try {
      const data = JSON.parse(res.text) as T;
      return { data, finalUrl: res.finalUrl, headers: res.headers };
    } catch {
      throw new BadRequestException({ code: 'INVALID_JSON' });
    }
  }

  /**
   * WP-probe: пробует `/wp-json` (root index) + count'ит pages/media/posts/menus
   * через X-WP-Total. Возвращает `{ isWp, restApiUrl, counts, siteName, description }`.
   * Если /wp-json отдаёт 4xx/5xx или не парсится — isWp=false (но мы не считаем
   * это ошибкой: caller покажет пользователю "fall back to design-only bootstrap").
   */
  async probeWordPress(url: string): Promise<{
    isWp: boolean;
    restApiUrl: string | null;
    counts: { pages: number; media: number; posts: number; menus: number };
    siteName: string | null;
    description: string | null;
    notes: string[];
  }> {
    const notes: string[] = [];
    const base = url.replace(/\/+$/, '');

    // Step 1: probe /wp-json root
    let api: { url?: string; name?: string; description?: string; namespaces?: string[] };
    let restApiUrl: string;
    try {
      const res = await this.fetchSafeJson<typeof api>(`${base}/wp-json`);
      api = res.data;
      restApiUrl = typeof api?.url === 'string' ? api.url.replace(/\/+$/, '') : `${base}/wp-json`;
    } catch (err) {
      notes.push(
        `Не удалось получить /wp-json: ${err instanceof Error ? err.message : 'unknown'}.`,
      );
      return {
        isWp: false,
        restApiUrl: null,
        counts: { pages: 0, media: 0, posts: 0, menus: 0 },
        siteName: null,
        description: null,
        notes,
      };
    }

    const namespaces = Array.isArray(api?.namespaces) ? api.namespaces : [];
    const hasWpV2 = namespaces.includes('wp/v2');
    if (!hasWpV2) {
      notes.push('REST root отдаёт ответ, но без `wp/v2` namespace. Скорее всего не WP.');
      return {
        isWp: false,
        restApiUrl,
        counts: { pages: 0, media: 0, posts: 0, menus: 0 },
        siteName: typeof api?.name === 'string' ? api.name : null,
        description: typeof api?.description === 'string' ? api.description : null,
        notes,
      };
    }

    // Step 2: count via per_page=1 + X-WP-Total header
    async function countAt(self: ToolsService, path: string): Promise<number> {
      try {
        const r = await self.fetchSafeJson<unknown>(`${restApiUrl}${path}?per_page=1`);
        const total = r.headers.get('x-wp-total');
        if (total && /^\d+$/.test(total)) return Number(total);
        // Если header отсутствует — судим по тому что массив непустой
        return Array.isArray(r.data) && r.data.length > 0 ? -1 : 0;
      } catch {
        return 0;
      }
    }

    const [pages, media, posts] = await Promise.all([
      countAt(this, '/wp/v2/pages'),
      countAt(this, '/wp/v2/media'),
      countAt(this, '/wp/v2/posts'),
    ]);

    // Menus: WP не отдаёт меню через /wp/v2 — нужен plugin (WP REST API Menus)
    // или нативный /wp/v2/menus (WP 5.9+). Пробуем оба.
    let menus = 0;
    try {
      const r = await this.fetchSafeJson<unknown[]>(`${restApiUrl}/wp/v2/menus`);
      if (Array.isArray(r.data)) menus = r.data.length;
    } catch {
      try {
        const r = await this.fetchSafeJson<unknown[]>(`${restApiUrl}/menus/v1/menus`);
        if (Array.isArray(r.data)) menus = r.data.length;
      } catch {
        notes.push('Menus endpoint не найден (требуется WP 5.9+ или плагин WP REST API Menus).');
      }
    }

    return {
      isWp: true,
      restApiUrl,
      counts: { pages, media, posts, menus },
      siteName: typeof api?.name === 'string' ? api.name : null,
      description: typeof api?.description === 'string' ? api.description : null,
      notes,
    };
  }

  /**
   * Public wrapper над `resolveAndAssertPublic` — для ScreenshotService и
   * других callee'ов, которым нужна SSRF-pre-validation перед собственным
   * HTTP/headless-fetch'ем. Бросает 400 BadRequest при private IP / mismatch.
   *
   * Внимание: TOCTOU остаётся для callee, который сам резолвит DNS повторно
   * (например, Playwright/Chromium). Mitigation — caller должен пинить IP
   * через --host-resolver-rules или аналог, иначе attacker DNS может вернуть
   * другой адрес между нашим check'ом и реальным connect'ом.
   */
  async assertPublicHost(hostname: string): Promise<void> {
    await this.resolveAndAssertPublic(hostname);
  }

  // ── SSRF / private-ip blocker ──────────────────────────────────────────

  /**
   * Resolves a hostname and validates every IP is public. Returns ONE pinned
   * IP for downstream connect. Caller must dial that IP directly (см.
   * fetchPinned) — иначе DNS-rebinding TOCTOU: первый lookup → public,
   * второй (внутри глобального fetch) → private.
   */
  private async resolveAndAssertPublic(
    hostname: string,
  ): Promise<{ address: string; family: 4 | 6 }> {
    // Literal IP — check directly, no DNS needed.
    const ipv = isIP(hostname);
    if (ipv) {
      if (this.isPrivate(hostname, ipv)) {
        throw new BadRequestException({ code: 'PRIVATE_IP_FORBIDDEN' });
      }
      return { address: hostname, family: ipv as 4 | 6 };
    }

    // Disallow common local-only hostnames outright.
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lvh.me') ||
      hostname === 'lvh.me'
    ) {
      throw new BadRequestException({ code: 'LOCAL_HOSTNAME_FORBIDDEN' });
    }

    let records: { address: string; family: number }[];
    try {
      records = await dns.lookup(hostname, { all: true });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException({ code: 'DNS_LOOKUP_FAILED' });
    }
    for (const r of records) {
      if (this.isPrivate(r.address, r.family)) {
        throw new BadRequestException({
          code: 'PRIVATE_IP_FORBIDDEN',
          message: `${hostname} resolves to private IP ${r.address}`,
        });
      }
    }

    // Prefer IPv4 for broader connectivity; fall back to whatever was returned.
    const pick = records.find((r) => r.family === 4) ?? records[0];
    return { address: pick.address, family: pick.family as 4 | 6 };
  }

  /**
   * Opens an HTTP(S) request to `pinnedIp` (the IP we just validated),
   * but keeps `Host:` header + TLS SNI = `parsed.hostname` so the remote
   * server returns the correct vhost+certificate. This blocks DNS rebinding
   * because we never re-resolve the hostname between validation and connect.
   */
  private fetchPinned(
    parsed: URL,
    pinnedIp: string,
    family: 4 | 6,
    signal: AbortSignal,
    maxBytes: number = MAX_BYTES,
  ): Promise<FetchResponse> {
    return new Promise((resolve, reject) => {
      const lib = parsed.protocol === 'https:' ? https : http;
      const port = parsed.port
        ? Number(parsed.port)
        : parsed.protocol === 'https:'
          ? 443
          : 80;

      let settled = false;
      const finish = (val: FetchResponse) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const req = lib.request({
        host: pinnedIp,
        family,
        port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        servername: parsed.hostname, // TLS SNI = original hostname
        headers: {
          Host: parsed.host, // virtual-host routing
          'User-Agent': USER_AGENT,
          Accept: 'text/html,image/*,*/*;q=0.8',
        },
        signal,
      });

      req.on('error', fail);
      req.on('response', (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        let truncated = false;

        const buildResponse = (): FetchResponse => {
          const headers = new Map<string, string>();
          for (const [k, v] of Object.entries(res.headers)) {
            if (v == null) continue;
            headers.set(k.toLowerCase(), Array.isArray(v) ? v.join(', ') : String(v));
          }
          return {
            status: res.statusCode ?? 0,
            headers,
            bodyBytes: Buffer.concat(chunks),
            truncated,
          };
        };

        res.on('data', (chunk: Buffer) => {
          if (truncated) return;
          const remaining = maxBytes - bytes;
          if (chunk.length > remaining) {
            chunks.push(chunk.subarray(0, remaining));
            bytes = maxBytes;
            truncated = true;
            res.destroy();
            return;
          }
          chunks.push(chunk);
          bytes += chunk.length;
        });
        res.on('end', () => finish(buildResponse()));
        res.on('close', () => finish(buildResponse())); // backstop after destroy
        res.on('error', fail);
      });

      req.end();
    });
  }

  private isPrivate(addr: string, family: number): boolean {
    if (family === 4) {
      const parts = addr.split('.').map((p) => Number(p));
      if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 0) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
      return false;
    }
    // IPv6: blunt block — link-local fe80::/10, loopback ::1, ULA fc00::/7, mapped IPv4
    const low = addr.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fe80')) return true;
    if (low.startsWith('fc') || low.startsWith('fd')) return true;
    if (low.startsWith('::ffff:')) {
      // mapped IPv4 — strip and recurse
      const v4 = low.slice('::ffff:'.length);
      return this.isPrivate(v4, 4);
    }
    return false;
  }

  // ── parsers ────────────────────────────────────────────────────────────

  private extractBaseHref(html: string): string | null {
    const m = html.match(/<base[^>]+href\s*=\s*["']([^"']+)["']/i);
    return m ? m[1] : null;
  }

  private parseIdentity(html: string, baseHref: string) {
    const title = this.firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim();
    const lang = this.firstMatch(html, /<html[^>]*\blang\s*=\s*["']([^"']+)["']/i);
    const description = this.metaContent(html, 'name', 'description');
    const ogTitle = this.metaContent(html, 'property', 'og:title');
    const ogDescription = this.metaContent(html, 'property', 'og:description');
    const ogImageRaw = this.metaContent(html, 'property', 'og:image');
    const faviconRaw = this.firstMatch(
      html,
      /<link[^>]+rel\s*=\s*["'][^"']*(?:icon|shortcut\s+icon)[^"']*["'][^>]+href\s*=\s*["']([^"']+)["']/i,
    );

    return {
      url: '',
      finalUrl: '',
      httpStatus: 0,
      bytesFetched: 0,
      durationMs: 0,
      title: title ? decodeEntities(title) : undefined,
      description,
      lang,
      ogTitle,
      ogDescription,
      ogImage: ogImageRaw ? this.resolve(ogImageRaw, baseHref) : undefined,
      favicon: faviconRaw ? this.resolve(faviconRaw, baseHref) : undefined,
    };
  }

  private parseTypography(html: string, baseHref: string): TypographyDto {
    // font-family declarations inside <style> blocks and inline style="..."
    const families = new Set<string>();
    const stylesText = this.collectStyleText(html);
    const inlineStyles = [...html.matchAll(/style\s*=\s*["']([^"']*)["']/gi)]
      .map((m) => m[1])
      .join('\n');
    const combined = stylesText + '\n' + inlineStyles;

    for (const m of combined.matchAll(/font-family\s*:\s*([^;{}"']+)/gi)) {
      // first family from comma list
      const first = m[1].split(',')[0].trim().replace(/^["']|["']$/g, '');
      if (first && first.length < 64) families.add(first);
    }

    const stylesheetUrls = [
      ...html.matchAll(
        /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']([^"']+)["']/gi,
      ),
    ].map((m) => this.resolve(m[1], baseHref));

    const googleFonts = new Set<string>();
    for (const url of stylesheetUrls) {
      if (url.includes('fonts.googleapis.com')) {
        const familyParam = url.match(/[?&]family=([^&]+)/g) || [];
        for (const f of familyParam) {
          const decoded = decodeURIComponent(f.replace(/^[?&]family=/, ''));
          // multi-family: split by `&family=` was already separated by regex
          const name = decoded.split(':')[0].replace(/\+/g, ' ');
          if (name) googleFonts.add(name);
        }
      }
    }

    return {
      fontFamilies: [...families].slice(0, 12),
      googleFonts: [...googleFonts].slice(0, 12),
      stylesheets: stylesheetUrls.slice(0, 12),
    };
  }

  private parsePalette(html: string): PaletteDto {
    const all = this.collectStyleText(html) + '\n' +
      [...html.matchAll(/style\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]).join('\n');

    const hexCounts = new Map<string, number>();
    for (const m of all.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
      const v = '#' + m[1].toUpperCase();
      // Skip 1/2-char hex artefacts and obvious ID anchors (#main, #app)
      if (![3, 4, 6, 8].includes(m[1].length)) continue;
      hexCounts.set(v, (hexCounts.get(v) ?? 0) + 1);
    }

    const rgbCounts = new Map<string, number>();
    for (const m of all.matchAll(/rgba?\(\s*[^)]+\)/gi)) {
      const norm = m[0].replace(/\s+/g, '').toLowerCase();
      rgbCounts.set(norm, (rgbCounts.get(norm) ?? 0) + 1);
    }

    const topN = (map: Map<string, number>, n: number): ColorEntryDto[] =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([value, count]) => ({ value, count }));

    return {
      hex: topN(hexCounts, 16),
      rgb: topN(rgbCounts, 10),
    };
  }

  private parseStructure(html: string): StructureDto {
    const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      stripTags(m[1]).slice(0, 200),
    );
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
      stripTags(m[1]).slice(0, 200),
    );
    const h3Count = (html.match(/<h3[\b\s>]/gi) || []).length;
    const sectionCount =
      (html.match(/<section[\b\s>]/gi) || []).length;

    // CTA-like buttons: <button>, <a class="...btn|cta|button...">
    const ctaTexts: string[] = [];
    for (const m of html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)) {
      const t = stripTags(m[1]).trim();
      if (t && t.length < 80) ctaTexts.push(t);
    }
    for (const m of html.matchAll(
      /<a\s+[^>]*class\s*=\s*["'][^"']*(?:btn|cta|button)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      const t = stripTags(m[1]).trim();
      if (t && t.length < 80) ctaTexts.push(t);
    }

    return {
      h1Count: h1.length,
      h2Count: h2.length,
      h3Count,
      sectionCount,
      h1Texts: dedupe(h1).slice(0, 5),
      h2Texts: dedupe(h2).slice(0, 10),
      ctaTexts: dedupe(ctaTexts).slice(0, 10),
    };
  }

  private parseImages(html: string, baseHref: string): ImageEntryDto[] {
    const list: ImageEntryDto[] = [];
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const src =
        tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ??
        tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!src) continue;
      // skip inline data: and SVG-noise
      if (/^data:/i.test(src)) continue;
      const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1];
      list.push({ src: this.resolve(src, baseHref), alt: alt ? decodeEntities(alt) : undefined });
      if (list.length >= 20) break;
    }
    return list;
  }

  /**
   * Извлекает пункты меню из всех `<nav>` и `<header>` блоков. Это даёт
   * tenant-bootstrap wizard'у sensible default для `tenant_menu_items` —
   * пользователь после увидит preview и сможет редактировать.
   *
   * Эвристика:
   *  - Скрейпит `<a href="…">text</a>` внутри nav/header.
   *  - Drops: hash-anchors (#…), javascript:/mailto:/tel:, пустой текст,
   *    дубликаты по (label,href).
   *  - depth = 0 для top-level пунктов; 1 для тех, что лежат внутри nested `<ul>`.
   *  - Cap 30 шт. — больше не имеет смысла, тенант разберёт вручную.
   *
   * Regex-парсинг намеренный (без cheerio): brittle, но HTML мы не валидируем,
   * а извлекаем сигналы, и зависимостей хочется минимум (см. top-of-file comment).
   */
  private parseNavigation(html: string, baseHref: string): NavItemDto[] {
    const blocks: string[] = [];
    for (const m of html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi)) blocks.push(m[1]);
    for (const m of html.matchAll(/<header\b[^>]*>([\s\S]*?)<\/header>/gi)) blocks.push(m[1]);

    const items: NavItemDto[] = [];
    const seen = new Set<string>();

    for (const block of blocks) {
      // Сначала собираем nested-anchors (внутри <ul><ul> / <li><ul>): они имеют depth=1.
      const nestedRegions: string[] = [];
      for (const m of block.matchAll(/<ul\b[^>]*>([\s\S]*?)<\/ul>\s*<\/li>/gi)) {
        nestedRegions.push(m[1]);
      }
      // Дополнительно: <ul> внутри <li> на любой глубине.
      for (const m of block.matchAll(/<li\b[^>]*>[\s\S]*?<ul\b[^>]*>([\s\S]*?)<\/ul>/gi)) {
        nestedRegions.push(m[1]);
      }
      const nestedHtml = nestedRegions.join('\n');

      for (const m of block.matchAll(
        /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      )) {
        const href = m[1].trim();
        const label = stripTags(m[2]).trim();
        if (!label || label.length > 120) continue;
        if (href.length === 0 || href.length > 500) continue;
        if (href.startsWith('#')) continue;
        if (/^(javascript|mailto|tel):/i.test(href)) continue;

        const absHref = this.resolve(href, baseHref);
        const key = `${label.toLowerCase()}|${absHref.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const depth = nestedHtml.includes(m[0]) ? 1 : 0;
        items.push({ label: decodeEntities(label), href: absHref, depth });
        if (items.length >= 30) return items;
      }
    }
    return items;
  }

  /**
   * Heuristic: page is likely a SPA-shell (e.g. CRA/Vite root div), where actual
   * content is rendered client-side and our regex-parser sees only an empty
   * skeleton. Wizard surfaces this as a warning so the operator can decide.
   *
   * Сознательно не запускаем headless Chromium — это резкий jump по сложности
   * (Puppeteer, dockerization, +500MB). Для нескольких сайтов в год — overkill.
   */
  private detectIsSpa(structure: StructureDto, images: ImageEntryDto[]): boolean {
    return structure.h1Count === 0 && structure.sectionCount === 0 && images.length < 3;
  }

  /**
   * Guess which palette colors map to the three role slots in `tenant_design_tokens`:
   *   - bg   → lightest hex (luminance > 0.85)
   *   - head → darkest hex (luminance < 0.25)
   *   - acc  → most saturated hex (HSV.S)
   *
   * Если ничего подходящего не нашли — возвращаем дефолты NAS (как в TenantsService.createTenant).
   * Пользователь видит swatches и может override'ить через color-picker.
   */
  private guessRoleColors(hexEntries: ColorEntryDto[]): GuessedRolesDto {
    const fallback: GuessedRolesDto = { bg: '#FFFFFF', head: '#0A0A0A', acc: '#D4AF37' };
    if (hexEntries.length === 0) return fallback;

    type Hsv = { h: number; s: number; v: number };
    const parseHex = (hex: string): { r: number; g: number; b: number } | null => {
      const m = hex.match(/^#([0-9A-Fa-f]{3,8})$/);
      if (!m) return null;
      let v = m[1];
      if (v.length === 3) v = v.split('').map((c) => c + c).join('');
      if (v.length === 4) v = v.split('').map((c) => c + c).join('').slice(0, 6);
      if (v.length === 8) v = v.slice(0, 6);
      if (v.length !== 6) return null;
      return {
        r: parseInt(v.slice(0, 2), 16),
        g: parseInt(v.slice(2, 4), 16),
        b: parseInt(v.slice(4, 6), 16),
      };
    };
    const toLuminance = (r: number, g: number, b: number): number => {
      // Перцептивная luminance (Rec. 709), normalize в [0,1].
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    const toHsv = (r: number, g: number, b: number): Hsv => {
      const rn = r / 255, gn = g / 255, bn = b / 255;
      const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
      const d = max - min;
      let h = 0;
      if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      const s = max === 0 ? 0 : d / max;
      return { h, s, v: max };
    };

    type Scored = { value: string; luminance: number; sat: number; count: number };
    const scored: Scored[] = [];
    for (const entry of hexEntries) {
      const rgb = parseHex(entry.value);
      if (!rgb) continue;
      scored.push({
        value: entry.value,
        luminance: toLuminance(rgb.r, rgb.g, rgb.b),
        sat: toHsv(rgb.r, rgb.g, rgb.b).s,
        count: entry.count,
      });
    }
    if (scored.length === 0) return fallback;

    const bg = scored.filter((s) => s.luminance > 0.85).sort((a, b) => b.count - a.count)[0]?.value
      ?? [...scored].sort((a, b) => b.luminance - a.luminance)[0].value;

    const head = scored.filter((s) => s.luminance < 0.25).sort((a, b) => b.count - a.count)[0]?.value
      ?? [...scored].sort((a, b) => a.luminance - b.luminance)[0].value;

    const accCandidates = [...scored].sort((a, b) => b.sat - a.sat);
    const acc = accCandidates.find((s) => s.value !== bg && s.value !== head)?.value
      ?? accCandidates[0]?.value
      ?? fallback.acc;

    return { bg, head, acc };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private collectStyleText(html: string): string {
    return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
      .map((m) => m[1])
      .join('\n');
  }

  private firstMatch(s: string, re: RegExp): string | undefined {
    const m = s.match(re);
    return m ? m[1] : undefined;
  }

  private metaContent(html: string, attr: 'name' | 'property', value: string): string | undefined {
    const re = new RegExp(
      `<meta[^>]+${attr}\\s*=\\s*["']${escapeRegex(value)}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
      'i',
    );
    const m1 = html.match(re);
    if (m1) return decodeEntities(m1[1]);
    const re2 = new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${escapeRegex(value)}["']`,
      'i',
    );
    const m2 = html.match(re2);
    return m2 ? decodeEntities(m2[1]) : undefined;
  }

  private resolve(href: string, base: string): string {
    try {
      return new URL(href, base).toString();
    } catch {
      return href;
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…');
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
