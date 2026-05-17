/**
 * Persistence для editable design tokens карточки тенанта.
 *
 * Сейчас — localStorage (как в dashboard-2077.html, чтобы preview iframe
 * мог читать `?td=base64(tokens)`). Когда API получит endpoint
 * `PUT /v1/tenants/:slug/design-tokens` — переключим эти функции на
 * сетевой вызов с сохранением сигнатуры.
 */

import type { ProjectTokens } from './projects-data';

export type SavedTokens = Partial<ProjectTokens> & {
  /** data: URL SVG логотипа, если был загружен */
  logo?: string;
};

const KEY_PREFIX = 'tenant-design-';

function key(domain: string): string {
  return KEY_PREFIX + domain;
}

export function loadTokens(domain: string): SavedTokens {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key(domain));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTokens(domain: string, tokens: SavedTokens): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key(domain), JSON.stringify(tokens));
    return true;
  } catch {
    return false;
  }
}

/** Base64-encode tokens for iframe preview URL (?td=...). UTF-8 safe. */
export function encodeTokensForPreview(tokens: SavedTokens): string {
  const json = JSON.stringify(tokens);
  // btoa needs Latin-1 — encodeURIComponent → escape gets us UTF-8 safe bytes.
  return btoa(unescape(encodeURIComponent(json)));
}
