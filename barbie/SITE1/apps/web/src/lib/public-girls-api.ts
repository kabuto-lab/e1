/**
 * Public girls API — каталог моделей для сайтов тенантов.
 * Server-side fetch (SSR в секции Models). Без auth.
 *
 * Источник: GET /v1/public/girls?tenant=<slug> (см.
 * apps/api/src/girls/public-girls.controller.ts). Возвращает только активные
 * карточки и уже отфильтрованные видимые фото.
 */

export interface PublicGirl {
  slug: string;
  name: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  breast: number | null;
  silicon: boolean;
  description: string | null;
  /** Видимые фото-ключи по порядку; обложка первая. */
  photos: string[];
}

interface PublicGirlsList {
  data: PublicGirl[];
  total: number;
}

const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:5110';

/** Префикс публичных фото (model-library в apps/web/public). */
export function photoUrl(key: string): string {
  if (!key) return '';
  if (key.startsWith('http') || key.startsWith('/')) return key;
  return `/${key}`;
}

export async function fetchPublicGirls(tenantSlug: string): Promise<PublicGirlsList> {
  const res = await fetch(
    `${API_BASE}/v1/public/girls?tenant=${encodeURIComponent(tenantSlug)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error(`API ${res.status} for public girls tenant=${tenantSlug}`);
  }
  return (await res.json()) as PublicGirlsList;
}
