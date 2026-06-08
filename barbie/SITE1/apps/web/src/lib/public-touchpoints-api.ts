/**
 * Public touchpoints API — точки касания тенанта для рендера публичного сайта.
 * Server-side fetch, без auth. Источник:
 *   GET /v1/public/tenants/by-slug/<slug>/touchpoints  (только enabled).
 *
 * Редактируются platform-admin'ом в деке /admin/projects. Шаблоны сайтов
 * (salonmassage, …) читают enabled-точки и рендерят CTA/попап/плавающий чат.
 */

export interface PublicTouchpoint {
  key: string;
  enabled: boolean;
  label: string;
  value: string;
  imageKey: string | null;
  imageUrl: string | null;
  color: string | null;
}

const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:5110';

export async function fetchPublicTouchpoints(
  slug: string,
): Promise<Record<string, PublicTouchpoint>> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/public/tenants/by-slug/${encodeURIComponent(slug)}/touchpoints`,
      { cache: 'no-store' },
    );
    if (!res.ok) return {};
    const list = (await res.json()) as PublicTouchpoint[];
    const map: Record<string, PublicTouchpoint> = {};
    for (const t of list) map[t.key] = t;
    return map;
  } catch {
    return {};
  }
}

/**
 * Нормализация цели точки касания в href:
 *   http/https/tel/mailto/якорь — как есть;
 *   @username — в https://t.me/username;
 *   похоже на телефон — в tel:.
 */
export function touchpointHref(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '#';
  if (/^(https?:|tel:|mailto:|#)/i.test(v)) return v;
  if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`;
  if (/^[+\d][\d\s()\-]{5,}$/.test(v)) return `tel:${v.replace(/[^+\d]/g, '')}`;
  return v;
}

export function isExternalHref(href: string): boolean {
  return /^https?:/i.test(href);
}
