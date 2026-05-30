'use client';

/**
 * wfy-vacancies-api — типизированный клиент для /v1/wfy-admin/vacancies.
 *
 * Тенанты типа `wfy-city-dir`: вакансии (позиция + требования + условия). 409
 * TENANT_SITE_TYPE_MISMATCH когда тенант не того типа — UI рендерит
 * capability-block state; 409 WFY_VACANCY_CODE_TAKEN — дубль `code` в тенанте.
 *
 * requirements/conditions — массивы строк-пунктов (jsonb на бэке).
 */
import { apiFetch } from './api-client';

export interface WfyVacancy {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  summary: string | null;
  requirements: string[];
  conditions: string[];
  ord: number;
  createdAt: string;
  updatedAt: string;
}

export interface WfyVacancyListResponse {
  data: WfyVacancy[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateWfyVacancyPayload {
  code: string;
  title: string;
  summary?: string;
  requirements?: string[];
  conditions?: string[];
  ord?: number;
}

export interface UpdateWfyVacancyPayload {
  code?: string;
  title?: string;
  summary?: string | null;
  requirements?: string[];
  conditions?: string[];
  ord?: number;
}

export interface ListWfyVacanciesQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(q: ListWfyVacanciesQuery): string {
  const params = new URLSearchParams();
  if (q.q) params.set('q', q.q);
  if (q.limit !== undefined) params.set('limit', String(q.limit));
  if (q.offset !== undefined) params.set('offset', String(q.offset));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const wfyVacanciesApi = {
  list: (q: ListWfyVacanciesQuery = {}) =>
    apiFetch<WfyVacancyListResponse>(`/v1/wfy-admin/vacancies${buildQuery(q)}`),

  get: (id: string) => apiFetch<WfyVacancy>(`/v1/wfy-admin/vacancies/${id}`),

  create: (payload: CreateWfyVacancyPayload) =>
    apiFetch<WfyVacancy>('/v1/wfy-admin/vacancies', {
      method: 'POST',
      body: payload,
    }),

  update: (id: string, payload: UpdateWfyVacancyPayload) =>
    apiFetch<WfyVacancy>(`/v1/wfy-admin/vacancies/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  remove: (id: string) =>
    apiFetch<void>(`/v1/wfy-admin/vacancies/${id}`, { method: 'DELETE' }),
};
