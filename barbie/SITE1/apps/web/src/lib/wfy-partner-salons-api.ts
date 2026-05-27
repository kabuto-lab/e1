'use client';

/**
 * wfy-partner-salons-api — типизированный клиент для /v1/wfy-admin/partner-salons.
 *
 * Тенанты типа `wfy-city-dir`: каталог партнёрских салонов (карточка с лого,
 * адресом, ссылкой на внешний сайт). 409 TENANT_SITE_TYPE_MISMATCH когда тенант
 * не того типа — UI рендерит capability-block state, см. page.tsx.
 *
 * logoMediaId — UUID медиа из общей nas.media. Сервер проверяет принадлежность
 * текущему тенанту (404 MEDIA_NOT_FOUND при cross-tenant).
 */
import { apiFetch } from './api-client';

export interface WfyPartnerSalon {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  externalLink: string | null;
  logoMediaId: string | null;
  ord: number;
  createdAt: string;
  updatedAt: string;
}

export interface WfyPartnerSalonListResponse {
  data: WfyPartnerSalon[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateWfyPartnerSalonPayload {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  externalLink?: string;
  logoMediaId?: string;
  ord?: number;
}

export interface UpdateWfyPartnerSalonPayload {
  name?: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  externalLink?: string | null;
  logoMediaId?: string | null;
  ord?: number;
}

export interface ListWfyPartnerSalonsQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListWfyPartnerSalonsQuery): string {
  const params = new URLSearchParams();
  if (q.q) params.set('q', q.q);
  if (q.limit !== undefined) params.set('limit', String(q.limit));
  if (q.offset !== undefined) params.set('offset', String(q.offset));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const wfyPartnerSalonsApi = {
  list: (q: ListWfyPartnerSalonsQuery = {}) =>
    apiFetch<WfyPartnerSalonListResponse>(`/v1/wfy-admin/partner-salons${buildQuery(q)}`),

  get: (id: string) => apiFetch<WfyPartnerSalon>(`/v1/wfy-admin/partner-salons/${id}`),

  create: (payload: CreateWfyPartnerSalonPayload) =>
    apiFetch<WfyPartnerSalon>('/v1/wfy-admin/partner-salons', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: UpdateWfyPartnerSalonPayload) =>
    apiFetch<WfyPartnerSalon>(`/v1/wfy-admin/partner-salons/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiFetch<void>(`/v1/wfy-admin/partner-salons/${id}`, { method: 'DELETE' }),
};
