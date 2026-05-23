/**
 * Декодер `?td=base64(tokens)` — для preview-режима в /admin/projects.
 *
 * Цепочка: `ProjectCard.onPreview()` → `encodeTokensForPreview()` (см.
 * `projects-storage.ts`) пакует {bg, headColor, headFont, accColor, accFont,
 * bodyColor, bodyFont} в base64-JSON и подставляет в URL. Здесь — обратная
 * операция в server-component'ах тенантских страниц.
 *
 * Безопасность: ключи whitelist'нуты, чтобы случайный пейлоад не утёк в
 * inline-style. Любые поля кроме семи token-ключей игнорируются.
 */
import type { TenantDesignTokens } from './tenants';

type DesignTokenKey = Exclude<keyof TenantDesignTokens, 'navTemplate'>;

const ALLOWED_KEYS: ReadonlyArray<DesignTokenKey> = [
  'bg', 'headColor', 'headFont', 'accColor', 'accFont', 'bodyColor', 'bodyFont',
];

export function decodeTdParam(td: string | string[] | undefined): Partial<TenantDesignTokens> | undefined {
  if (!td || typeof td !== 'string') return undefined;
  try {
    const json = Buffer.from(td, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const out: Partial<TenantDesignTokens> = {};
    for (const k of ALLOWED_KEYS) {
      const v = (parsed as Record<string, unknown>)[k];
      if (typeof v === 'string' && v.length > 0 && v.length < 200) {
        out[k] = v;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } catch {
    return undefined;
  }
}
