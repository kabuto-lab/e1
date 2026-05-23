'use client';

/**
 * cms-api — типизированный клиент CMS-страниц (admin-операции).
 *
 * Обёртки над `apiFetch` для tenant-admin: загрузка/создание/обновление/
 * публикация страницы. Все вызовы идут с auth и `X-Tenant-Slug`.
 *
 * Публичное SSR-чтение страницы — отдельно, в `cms-public.ts` (без auth,
 * серверный fetch): `apiFetch` клиентский и на сервере не вызывается.
 */
import { apiFetch } from './api-client';

export type CmsPageStatus = 'draft' | 'published' | 'archived';

/**
 * Блок тела страницы. M1 использует один блок `type='custom'`,
 * где `data.ed` — дерево `Section[]` редактора ED.
 */
export interface CmsBlock {
  type: string;
  data: Record<string, unknown>;
}

export interface CmsPageDTO {
  id: string;
  tenantId: string;
  slug: string;
  locale: string;
  title: string;
  body: CmsBlock[];
  status: CmsPageStatus;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCmsPagePayload {
  slug: string;
  locale: string;
  title: string;
  body: CmsBlock[];
}

/**
 * PATCH /v1/cms/pages/:id. `slug` сюда НЕ входит — он immutable (см.
 * UpdatePageDto на бэке); править slug через PATCH нельзя.
 */
export interface UpdateCmsPagePayload {
  title?: string;
  body?: CmsBlock[];
  locale?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImageKey?: string;
}

/** Загрузить страницу по id (включая draft) — для edit-flow. */
export function getPage(id: string, tenantSlug: string): Promise<CmsPageDTO> {
  return apiFetch<CmsPageDTO>(`/v1/cms/pages/${id}`, { tenantSlug });
}

/** Создать страницу. Бэкенд всегда ставит `status=draft`. */
export function createPage(
  tenantSlug: string,
  payload: CreateCmsPagePayload,
): Promise<CmsPageDTO> {
  return apiFetch<CmsPageDTO>('/v1/cms/pages', { method: 'POST', tenantSlug, body: payload });
}

/** Обновить страницу. `body` заменяется целиком. */
export function updatePage(
  id: string,
  tenantSlug: string,
  payload: UpdateCmsPagePayload,
): Promise<CmsPageDTO> {
  return apiFetch<CmsPageDTO>(`/v1/cms/pages/${id}`, {
    method: 'PATCH',
    tenantSlug,
    body: payload,
  });
}

/** Опубликовать страницу (`status=published`). */
export function publishPage(id: string, tenantSlug: string): Promise<CmsPageDTO> {
  return apiFetch<CmsPageDTO>(`/v1/cms/pages/${id}/publish`, { method: 'POST', tenantSlug });
}

/** Снять с публикации (`status=draft`). */
export function unpublishPage(id: string, tenantSlug: string): Promise<CmsPageDTO> {
  return apiFetch<CmsPageDTO>(`/v1/cms/pages/${id}/unpublish`, { method: 'POST', tenantSlug });
}

/** Архивировать (soft delete). */
export function archivePage(id: string, tenantSlug: string): Promise<CmsPageDTO> {
  return apiFetch<CmsPageDTO>(`/v1/cms/pages/${id}`, { method: 'DELETE', tenantSlug });
}

export interface ListPagesQuery {
  status?: CmsPageStatus;
  locale?: 'ru' | 'en';
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ListPagesResponse {
  data: CmsPageDTO[];
  total: number;
  limit: number;
  offset: number;
}

/** Список страниц тенанта (любой статус, фильтрация по `status`/`q`/`locale`). */
export function listPages(
  tenantSlug: string,
  query: ListPagesQuery = {},
): Promise<ListPagesResponse> {
  const usp = new URLSearchParams();
  if (query.status) usp.set('status', query.status);
  if (query.locale) usp.set('locale', query.locale);
  if (query.q) usp.set('q', query.q);
  if (typeof query.limit === 'number') usp.set('limit', String(query.limit));
  if (typeof query.offset === 'number') usp.set('offset', String(query.offset));
  const qs = usp.toString();
  return apiFetch<ListPagesResponse>(`/v1/cms/pages${qs ? `?${qs}` : ''}`, { tenantSlug });
}
