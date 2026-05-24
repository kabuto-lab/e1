'use client';

import { apiFetch } from './api-client';

export interface DesignTokensResponse {
  tenantId: string;
  bg: string;
  headColor: string;
  headFont: string;
  accColor: string;
  accFont: string;
  bodyColor: string;
  bodyFont: string;
  logoKey: string | null;
  logoAlt: string | null;
  faviconKey: string | null;
  navTemplate: 'top-classic' | 'mega-images' | 'vertical-side';
  updatedAt: string;
}

export interface UpdateDesignTokensPayload {
  bg?: string;
  headColor?: string;
  headFont?: string;
  accColor?: string;
  accFont?: string;
  bodyColor?: string;
  bodyFont?: string;
  logoKey?: string;
  logoAlt?: string;
  faviconKey?: string;
  navTemplate?: 'top-classic' | 'mega-images' | 'vertical-side';
}

export const tenantDesignTokensApi = {
  get: (slug: string) =>
    apiFetch<DesignTokensResponse>(
      `/v1/platform/tenants/${encodeURIComponent(slug)}/design-tokens`,
    ),

  patch: (slug: string, payload: UpdateDesignTokensPayload) =>
    apiFetch<DesignTokensResponse>(
      `/v1/platform/tenants/${encodeURIComponent(slug)}/design-tokens`,
      { method: 'PATCH', body: payload },
    ),
};
