/**
 * cms-public — серверное (SSR) чтение опубликованных CMS-страниц.
 *
 * Без 'use client' и без auth: публичный эндпоинт NAS, тенант резолвится
 * заголовком `X-Tenant-Slug`. Отдельно от `cms-api.ts` (тот клиентский,
 * через `apiFetch`) — здесь обычный серверный `fetch`, как `fetchPublicTenant`.
 */
import type { CmsPageDTO } from './cms-api';

/**
 * Внутренний адрес API для SSR. В dev Next.js ходит на localhost:5110
 * (SITE1 API, scheme '51xx'); в prod — `API_INTERNAL_URL` (внутренний хост API).
 * Совпадает с базой в `lib/tenants.ts`.
 */
const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:5110';

/**
 * Загружает опубликованную CMS-страницу по slug для тенанта (SSR).
 *
 * Возвращает `null`, если страницы нет или она не опубликована —
 * вызывающий роут сам решает, что показать вместо неё.
 */
export async function fetchPublicCmsPage(
  slug: string,
  tenantSlug: string,
  locale = 'ru',
): Promise<CmsPageDTO | null> {
  const res = await fetch(
    `${API_BASE}/v1/cms/pages/public/by-slug/${encodeURIComponent(slug)}?locale=${locale}`,
    { cache: 'no-store', headers: { 'X-Tenant-Slug': tenantSlug } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`cms-public: API ${res.status} slug=${slug} tenant=${tenantSlug}`);
  }
  return (await res.json()) as CmsPageDTO;
}
