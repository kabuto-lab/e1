/**
 * wfy-public.ts — public fetchers для wfy-city-dir тенантов.
 *
 * RSC-side: hits NestJS `GET /v1/public/tenants/by-slug/{slug}/wfy-bundle`.
 * Один запрос возвращает всё: tenant, cities, opportunities, advantages,
 * partnerSalons, vacancies. 404 если тенант не активен или site_type ≠
 * 'wfy-city-dir'.
 *
 * Все типы дублируются из API response — слабый contract, но web не
 * импортирует apps/api напрямую (monorepo boundary). При расширении API-
 * shape нужно синхронизировать здесь.
 *
 * Refs:
 *   - apps/api/src/tenants/public-tenants.controller.ts (getWfyBundle)
 *   - MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C
 */

const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:5110';

export interface WfyTenant {
  id: string;
  slug: string;
  name: string;
  primaryDomain: string | null;
  siteType: string;
}

export interface WfyCityPage {
  id: string;
  tenantId: string;
  slug: string;
  cityName: string;
  region: string | null;
  country: string;
  headline: string | null;
  description: string | null;
  extras: {
    metaTitle?: string;
    metaDescription?: string;
    heroImageKey?: string;
  };
  status: string;
  ord: number;
}

export interface WfyOpportunity {
  id: string;
  tenantId: string;
  title: string;
  headline: string | null;
  description: string | null;
  coverImageKey: string | null;
  ord: number;
}

export interface WfyAdvantage {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  iconName: string | null;
  ord: number;
}

export interface WfyVacancy {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  summary: string | null;
  requirements: string[];
  conditions: string[];
  ord: number;
}

export interface PartnerSalon {
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
}

export interface WfyBundle {
  tenant: WfyTenant;
  cities: WfyCityPage[];
  opportunities: WfyOpportunity[];
  advantages: WfyAdvantage[];
  partnerSalons: PartnerSalon[];
  vacancies: WfyVacancy[];
}

export class WfyBundleNotFoundError extends Error {
  constructor(public readonly slug: string, public readonly reason: string) {
    super(`Wfy bundle unavailable for slug='${slug}': ${reason}`);
  }
}

/**
 * Fetch the bundle. Throws WfyBundleNotFoundError on 404, regular Error
 * on other failures.
 */
export async function fetchWfyBundle(slug: string): Promise<WfyBundle> {
  const res = await fetch(`${API_BASE}/v1/public/tenants/by-slug/${slug}/wfy-bundle`, {
    cache: 'no-store',
  });
  if (res.status === 404) {
    const body = await res.json().catch(() => ({}));
    throw new WfyBundleNotFoundError(slug, body?.code ?? 'NOT_FOUND');
  }
  if (!res.ok) {
    throw new Error(`API ${res.status} for wfy-bundle slug=${slug}`);
  }
  return (await res.json()) as WfyBundle;
}
