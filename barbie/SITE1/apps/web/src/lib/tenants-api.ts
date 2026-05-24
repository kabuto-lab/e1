'use client';

import { apiFetch } from './api-client';

export interface BootstrapDesign {
  bg: string;
  headColor: string;
  headFont: string;
  accColor: string;
  accFont: string;
  bodyColor: string;
  bodyFont: string;
}

export interface BootstrapMenuItem {
  label: string;
  href: string;
  sortOrder: number;
}

export interface BootstrapTenantPayload {
  slug: string;
  name: string;
  sourceUrl: string;
  customDomain?: string;
  design: BootstrapDesign;
  menuItems: BootstrapMenuItem[];
  faviconUrl?: string;
}

export interface BootstrapTenantResult {
  id: string;
  slug: string;
  name: string;
  bootstrapSourceUrl: string;
  customDomain?: string | null;
  menuItemsCreated: number;
  faviconKey?: string;
  faviconError?: string;
  createdAt: string;
}

export type TenantStatus = 'active' | 'suspended' | 'archived';

export interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  primaryDomain?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTenantsQuery {
  status?: TenantStatus;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ListTenantsResponse {
  data: TenantSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateTenantPayload {
  name?: string;
  status?: TenantStatus;
  primaryDomain?: string;
}

export const tenantsApi = {
  bootstrap: (payload: BootstrapTenantPayload) =>
    apiFetch<BootstrapTenantResult>('/v1/platform/tenants/bootstrap', {
      method: 'POST',
      body: payload,
    }),

  list: (query: ListTenantsQuery = {}) => {
    const usp = new URLSearchParams();
    if (query.status) usp.set('status', query.status);
    if (query.q) usp.set('q', query.q);
    if (typeof query.limit === 'number') usp.set('limit', String(query.limit));
    if (typeof query.offset === 'number') usp.set('offset', String(query.offset));
    const qs = usp.toString();
    return apiFetch<ListTenantsResponse>(`/v1/platform/tenants${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) =>
    apiFetch<TenantSummary>(`/v1/platform/tenants/${encodeURIComponent(id)}`),

  update: (id: string, payload: UpdateTenantPayload) =>
    apiFetch<TenantSummary>(`/v1/platform/tenants/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
    }),

  archive: (id: string) =>
    apiFetch<TenantSummary>(`/v1/platform/tenants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
