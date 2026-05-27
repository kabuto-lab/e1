'use client';

/**
 * wfy-opportunities-api — типизированный клиент для /v1/wfy-admin/opportunities.
 *
 * Тенанты типа `wfy-city-dir`: карточки «заработай на …». 409
 * TENANT_SITE_TYPE_MISMATCH когда тенант не того типа — UI рендерит
 * capability-block state.
 *
 * coverImageKey — S3 key string (не FK на media); media uploaded через
 * /v1/media/upload с module='wfy-opp'.
 */
import { apiFetch } from './api-client';

export interface WfyOpportunity {
  id: string;
  tenantId: string;
  title: string;
  headline: string | null;
  description: string | null;
  coverImageKey: string | null;
  ord: number;
  createdAt: string;
  updatedAt: string;
}

export interface WfyOpportunityListResponse {
  data: WfyOpportunity[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateWfyOpportunityPayload {
  title: string;
  headline?: string;
  description?: string;
  coverImageKey?: string;
  ord?: number;
}

export interface UpdateWfyOpportunityPayload {
  title?: string;
  headline?: string | null;
  description?: string | null;
  coverImageKey?: string | null;
  ord?: number;
}

export interface ListWfyOpportunitiesQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListWfyOpportunitiesQuery): string {
  const params = new URLSearchParams();
  if (q.q) params.set('q', q.q);
  if (q.limit !== undefined) params.set('limit', String(q.limit));
  if (q.offset !== undefined) params.set('offset', String(q.offset));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const wfyOpportunitiesApi = {
  list: (q: ListWfyOpportunitiesQuery = {}) =>
    apiFetch<WfyOpportunityListResponse>(`/v1/wfy-admin/opportunities${buildQuery(q)}`),

  get: (id: string) => apiFetch<WfyOpportunity>(`/v1/wfy-admin/opportunities/${id}`),

  create: (payload: CreateWfyOpportunityPayload) =>
    apiFetch<WfyOpportunity>('/v1/wfy-admin/opportunities', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: UpdateWfyOpportunityPayload) =>
    apiFetch<WfyOpportunity>(`/v1/wfy-admin/opportunities/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiFetch<void>(`/v1/wfy-admin/opportunities/${id}`, { method: 'DELETE' }),
};
