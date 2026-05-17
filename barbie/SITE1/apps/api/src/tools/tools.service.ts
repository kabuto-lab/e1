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
  ImageEntryDto,
  PaletteDto,
  SiteAnalysisDto,
  StructureDto,
  TypographyDto,
} from './dto/site-analysis.dto';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'NAS-SiteAnalyzer/0.1 (+https://github.com/kabuto-lab)';

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

    return {
      identity,
      typography,
      palette,
      structure,
      images,
      notes,
    };
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
          Accept: 'text/html,*/*;q=0.8',
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
          const remaining = MAX_BYTES - bytes;
          if (chunk.length > remaining) {
            chunks.push(chunk.subarray(0, remaining));
            bytes = MAX_BYTES;
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
