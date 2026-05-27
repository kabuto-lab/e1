'use client';

/**
 * wfy-cities-api — типизированный клиент для /v1/wfy-admin/cities.
 *
 * Тенанты типа `wfy-city-dir`: каталог городов work-for-you (~57 строк seed).
 * 409 TENANT_SITE_TYPE_MISMATCH когда тенант не того типа — UI должен отрендерить
 * понятный пустой state, см. /admin/wfy/cities/page.tsx.
 */
import { apiFetch } from './api-client';

export type WfyCityStatus = 'draft' | 'published' | 'archived';

export interface WfyCityExtras {
  metaTitle?: string;
  metaDescription?: string;
  heroImageKey?: string;
  customBlocks?: Array<{ type: string; data: Record<string, unknown> }>;
}

export interface WfyCity {
  id: string;
  tenantId: string;
  slug: string;
  cityName: string;
  region: string | null;
  country: string;
  headline: string | null;
  description: string | null;
  extras: WfyCityExtras;
  status: WfyCityStatus;
  ord: number;
  createdAt: string;
  updatedAt: string;
}

export interface WfyCityListResponse {
  data: WfyCity[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateWfyCityPayload {
  slug: string;
  cityName: string;
  region?: string;
  country?: string;
  headline?: string;
  description?: string;
  extras?: WfyCityExtras;
  status?: WfyCityStatus;
  ord?: number;
}

export type UpdateWfyCityPayload = Partial<CreateWfyCityPayload>;

export interface ListWfyCitiesQuery {
  status?: WfyCityStatus;
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListWfyCitiesQuery): string {
  const params = new URLSearchParams();
  if (q.status) params.set('status', q.status);
  if (q.q) params.set('q', q.q);
  if (q.limit !== undefined) params.set('limit', String(q.limit));
  if (q.offset !== undefined) params.set('offset', String(q.offset));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const wfyCitiesApi = {
  list: (q: ListWfyCitiesQuery = {}) =>
    apiFetch<WfyCityListResponse>(`/v1/wfy-admin/cities${buildQuery(q)}`),

  get: (id: string) => apiFetch<WfyCity>(`/v1/wfy-admin/cities/${id}`),

  create: (payload: CreateWfyCityPayload) =>
    apiFetch<WfyCity>('/v1/wfy-admin/cities', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: UpdateWfyCityPayload) =>
    apiFetch<WfyCity>(`/v1/wfy-admin/cities/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiFetch<void>(`/v1/wfy-admin/cities/${id}`, { method: 'DELETE' }),
};
