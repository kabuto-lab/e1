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
  /** Видео-ключи (mp4/webm) по порядку. */
  videos: string[];
}

interface PublicGirlsList {
  data: PublicGirl[];
  total: number;
}

const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:5110';

/** basePath под которым крутится фронт (prod: '/nas'; dev: ''). */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Префикс публичных фото (model-library в apps/web/public). С учётом basePath. */
export function photoUrl(key: string): string {
  if (!key) return '';
  if (key.startsWith('http')) return key;
  const path = key.startsWith('/') ? key : `/${key}`;
  return `${BASE_PATH}${path}`;
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

/** Одна публичная карточка по slug (профиль). null если 404. */
export async function fetchPublicGirl(slug: string): Promise<PublicGirl | null> {
  const res = await fetch(`${API_BASE}/v1/public/girls/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`API ${res.status} for public girl slug=${slug}`);
  }
  return (await res.json()) as PublicGirl;
}
