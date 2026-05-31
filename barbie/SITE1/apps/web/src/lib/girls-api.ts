'use client';

/**
 * girls-api — клиент глобального каталога моделей (Class-G), /v1/girls.
 *
 * Глобальный ресурс (без тенанта). params — свободный объект:
 *   { age, height, weight, breast, silicon, active, inactiveMedia: string[] }
 * mediaKeys — полный упорядоченный список путей фото (публичные пути статики:
 * 'model-library/<slug>/NN.webp' → рендерится как '/'+key).
 */
import { apiFetch } from './api-client';

export interface GirlParams {
  age?: number;
  height?: number | null;
  weight?: number | null;
  breast?: number | null;
  silicon?: boolean;
  active?: boolean;
  inactiveMedia?: string[];
  /** Слаги тенантов, где модель активна. Отсутствие массива = активна на всех (legacy). */
  activeTenants?: string[];
  [k: string]: unknown;
}

export interface Girl {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  params: GirlParams;
  mediaKeys: string[];
  ord: number;
  createdAt: string;
  updatedAt: string;
}

export interface GirlListResponse {
  data: Girl[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateGirlPayload {
  name?: string;
  description?: string | null;
  params?: GirlParams;
  mediaKeys?: string[];
  ord?: number;
}

/** Публичный URL фото из ключа каталога. */
export function mediaUrl(key: string): string {
  return key.startsWith('/') || key.startsWith('http') ? key : `/${key}`;
}

export const girlsApi = {
  list: (q: { q?: string; limit?: number; offset?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.q) p.set('q', q.q);
    if (q.limit !== undefined) p.set('limit', String(q.limit));
    if (q.offset !== undefined) p.set('offset', String(q.offset));
    const s = p.toString();
    return apiFetch<GirlListResponse>(`/v1/girls${s ? `?${s}` : ''}`);
  },
  get: (id: string) => apiFetch<Girl>(`/v1/girls/${id}`),
  update: (id: string, payload: UpdateGirlPayload) =>
    apiFetch<Girl>(`/v1/girls/${id}`, { method: 'PATCH', body: payload }),
};
