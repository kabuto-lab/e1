'use client';

/**
 * wfy-advantages-api — типизированный клиент для /v1/wfy-admin/advantages.
 *
 * Тенанты типа `wfy-city-dir`: блоки «преимущества» (иконка + заголовок +
 * описание), упорядоченные через `ord`. 409 TENANT_SITE_TYPE_MISMATCH когда
 * тенант не того типа — UI рендерит capability-block state.
 *
 * iconName — lucide-icon name или внутренний symbol-key (varchar 64); рендерится
 * блоком AdvantagesGrid в ED-редакторе. Cover-изображения у advantage нет
 * (в отличие от opportunities) — поэтому здесь нет media picker'а.
 */
import { apiFetch } from './api-client';

export interface WfyAdvantage {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  iconName: string | null;
  ord: number;
  createdAt: string;
  updatedAt: string;
}

export interface WfyAdvantageListResponse {
  data: WfyAdvantage[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateWfyAdvantagePayload {
  title: string;
  description?: string;
  iconName?: string;
  ord?: number;
}

export interface UpdateWfyAdvantagePayload {
  title?: string;
  description?: string | null;
  iconName?: string | null;
  ord?: number;
}

export interface ListWfyAdvantagesQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListWfyAdvantagesQuery): string {
  const params = new URLSearchParams();
  if (q.q) params.set('q', q.q);
  if (q.limit !== undefined) params.set('limit', String(q.limit));
  if (q.offset !== undefined) params.set('offset', String(q.offset));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const wfyAdvantagesApi = {
  list: (q: ListWfyAdvantagesQuery = {}) =>
    apiFetch<WfyAdvantageListResponse>(`/v1/wfy-admin/advantages${buildQuery(q)}`),

  get: (id: string) => apiFetch<WfyAdvantage>(`/v1/wfy-admin/advantages/${id}`),

  create: (payload: CreateWfyAdvantagePayload) =>
    apiFetch<WfyAdvantage>('/v1/wfy-admin/advantages', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: UpdateWfyAdvantagePayload) =>
    apiFetch<WfyAdvantage>(`/v1/wfy-admin/advantages/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiFetch<void>(`/v1/wfy-admin/advantages/${id}`, { method: 'DELETE' }),
};
