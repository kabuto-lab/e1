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

export const tenantsApi = {
  bootstrap: (payload: BootstrapTenantPayload) =>
    apiFetch<BootstrapTenantResult>('/v1/platform/tenants/bootstrap', {
      method: 'POST',
      body: payload,
    }),
};
