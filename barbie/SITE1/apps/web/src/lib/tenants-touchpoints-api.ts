'use client';

import { apiFetch, apiUpload } from './api-client';

export type TouchpointKey =
  | 'booking'
  | 'operator'
  | 'footer'
  | 'callWidget'
  | 'telegram'
  | 'quiz'
  | 'popup';

export interface TouchpointDto {
  key: TouchpointKey;
  enabled: boolean;
  label: string;
  value: string;
  imageKey: string | null;
  imageUrl: string | null;
  color: string | null;
}

export interface UpsertTouchpointPayload {
  enabled?: boolean;
  label?: string;
  value?: string;
  imageKey?: string | null;
  color?: string | null;
}

export interface TouchpointImageResult {
  key: string;
  imageKey: string;
  imageUrl: string;
}

/**
 * Slug тенанта для API выводится из `Project.domain` (снятие TLD) —
 * дековые `project.id` не всегда == slug, а `domain` совпадает со slug'ом
 * тенанта во всех 13 строках tenants. Напр. `dachaspa.ru` → `dachaspa`,
 * `5massage.ru` → `5massage`, `soho-spa.com` → `soho-spa`.
 */
export function tenantSlugFromDomain(domain: string): string {
  return domain.replace(/\.[a-z.]+$/i, '');
}

export const touchpointsApi = {
  list: (slug: string) =>
    apiFetch<TouchpointDto[]>(
      `/v1/platform/tenants/${encodeURIComponent(slug)}/touchpoints`,
    ),

  patch: (slug: string, key: TouchpointKey, payload: UpsertTouchpointPayload) =>
    apiFetch<TouchpointDto>(
      `/v1/platform/tenants/${encodeURIComponent(slug)}/touchpoints/${key}`,
      { method: 'PATCH', body: payload },
    ),

  uploadImage: (slug: string, key: TouchpointKey, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiUpload<TouchpointImageResult>(
      `/v1/platform/tenants/${encodeURIComponent(slug)}/touchpoints/${key}/image`,
      fd,
    );
  },
};
