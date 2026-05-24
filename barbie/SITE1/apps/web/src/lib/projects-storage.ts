/**
 * Persistence для editable design tokens карточки тенанта.
 *
 * Источник правды — API `/v1/platform/tenants/:slug/design-tokens`.
 * localStorage используется как cache:
 *  - На load: при network error возвращаем cache, чтобы UI не пустел.
 *  - На успешный read/save: обновляем cache.
 *
 * `logo` (data: URL SVG, загруженный через `<input type="file">`) пока живёт
 * только в localStorage — `logoKey` API ожидает S3-ключ, а medi-uploader
 * (/admin/media) ещё не сделан. Когда сделаем — заменим data URL на upload→key.
 *
 * `encodeTokensForPreview()` остаётся sync — нужен в момент клика "Превью"
 * для встраивания в URL `?td=base64(...)`.
 */

import type { ProjectTokens } from './projects-data';
import {
  tenantDesignTokensApi,
  type DesignTokensResponse,
  type UpdateDesignTokensPayload,
} from './tenants-design-tokens-api';
import { ApiError } from './api-client';

export type SavedTokens = Partial<ProjectTokens> & {
  /** data: URL SVG логотипа (live-only, не отправляется в API пока нет /admin/media) */
  logo?: string;
};

const KEY_PREFIX = 'tenant-design-';

function cacheKey(cacheId: string): string {
  return KEY_PREFIX + cacheId;
}

function readCache(cacheId: string): SavedTokens {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(cacheKey(cacheId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cacheId: string, tokens: SavedTokens): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cacheKey(cacheId), JSON.stringify(tokens));
  } catch {
    /* localStorage quota / disabled — silently ignore */
  }
}

function fromApi(resp: DesignTokensResponse): SavedTokens {
  return {
    bg: resp.bg,
    headColor: resp.headColor,
    headFont: resp.headFont,
    accColor: resp.accColor,
    accFont: resp.accFont,
    bodyColor: resp.bodyColor,
    bodyFont: resp.bodyFont,
  };
}

function toApiPayload(tokens: SavedTokens): UpdateDesignTokensPayload {
  // Only token fields; `logo` (data URL) пока не маппится в logoKey.
  const out: UpdateDesignTokensPayload = {};
  if (tokens.bg !== undefined)        out.bg = tokens.bg;
  if (tokens.headColor !== undefined) out.headColor = tokens.headColor;
  if (tokens.headFont !== undefined)  out.headFont = tokens.headFont;
  if (tokens.accColor !== undefined)  out.accColor = tokens.accColor;
  if (tokens.accFont !== undefined)   out.accFont = tokens.accFont;
  if (tokens.bodyColor !== undefined) out.bodyColor = tokens.bodyColor;
  if (tokens.bodyFont !== undefined)  out.bodyFont = tokens.bodyFont;
  return out;
}

export interface LoadResult {
  tokens: SavedTokens;
  /** true если данные получены из API (свежий source-of-truth) */
  fromServer: boolean;
}

/**
 * Load design tokens: пытается API, при ошибке падает в localStorage cache.
 *
 * @param slug    canonical tenant slug (как в БД, e.g. 'pentagon')
 * @param cacheId ключ для localStorage cache (обычно совпадает с domain)
 */
export async function loadTokens(
  slug: string,
  cacheId: string = slug,
): Promise<LoadResult> {
  try {
    const resp = await tenantDesignTokensApi.get(slug);
    const tokens = fromApi(resp);
    // Сохраняем logo из cache (data URL живёт локально, см. модуль-комментарий).
    const local = readCache(cacheId);
    if (local.logo) tokens.logo = local.logo;
    writeCache(cacheId, tokens);
    return { tokens, fromServer: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Тенанта нет в БД — нет смысла читать cache, но и фейлить не надо.
      return { tokens: readCache(cacheId), fromServer: false };
    }
    // Network / 5xx — fallback to cache, чтобы UI не пустел.
    return { tokens: readCache(cacheId), fromServer: false };
  }
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  /** Свежий снапшот из API при успехе */
  tokens?: SavedTokens;
}

/**
 * Save design tokens: PATCH в API; при успехе обновляет localStorage cache.
 *
 * @param slug    canonical tenant slug
 * @param tokens  merged in-memory tokens (включая logo data URL, если есть)
 * @param cacheId ключ для localStorage cache
 */
export async function saveTokens(
  slug: string,
  tokens: SavedTokens,
  cacheId: string = slug,
): Promise<SaveResult> {
  try {
    const resp = await tenantDesignTokensApi.patch(slug, toApiPayload(tokens));
    const fresh = fromApi(resp);
    if (tokens.logo) fresh.logo = tokens.logo;
    writeCache(cacheId, fresh);
    return { ok: true, tokens: fresh };
  } catch (err) {
    const message =
      err instanceof ApiError
        ? err.body.message ?? `API ${err.status}`
        : err instanceof Error
        ? err.message
        : 'unknown';
    return { ok: false, error: message };
  }
}

/** Base64-encode tokens for iframe preview URL (?td=...). UTF-8 safe. */
export function encodeTokensForPreview(tokens: SavedTokens): string {
  const json = JSON.stringify(tokens);
  return btoa(unescape(encodeURIComponent(json)));
}
