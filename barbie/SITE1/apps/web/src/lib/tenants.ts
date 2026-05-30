import rawData from '../../../../data/tenants-real-content.json';

export type TenantAesthetic =
  | 'tactical'
  | 'cozy'
  | 'y2k'
  | 'ethereal'
  | 'neo-imperial'
  | 'brutalist'
  | 'rococo'
  | 'cyberpunk'
  | 'loft';

export interface TenantProgram {
  name: string;
  duration: string | null;
  price: string | null;
  description: string;
}

export interface TenantRoom {
  name: string;
  description: string;
}

export interface TenantStaff {
  name: string;
  tag: string;
  age: number | null;
}

export interface TenantDesignTokens {
  bg: string;
  headColor: string;
  headFont: string;
  accColor: string;
  accFont: string;
  bodyColor: string;
  bodyFont: string;
  navTemplate?: 'top-classic' | 'mega-images' | 'vertical-side';
}

export interface TenantAddress {
  city: string | null;
  street: string | null;
  metro: string | null;
}

export interface TenantSocial {
  telegram: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

export interface Tenant {
  id?: string;
  slug?: string;
  name?: string;
  /** Vertical of the tenant — drives the admin rail module set. */
  siteType?: string;
  primaryDomain?: string | null;
  domain: string;
  brand: string;
  tagline: string;
  positioning: string;
  address: TenantAddress;
  phones: string[];
  workingHours: string | null;
  programs: TenantProgram[];
  rooms: TenantRoom[];
  staff: TenantStaff[];
  designTokens: TenantDesignTokens;
  navigation: string[];
  social: TenantSocial;
  aesthetic: TenantAesthetic | string;
}

interface TenantsBundle {
  generated: string;
  source: string;
  tenants: Tenant[];
}

const data = rawData as unknown as TenantsBundle;

export function getTenantByDomain(domain: string): Tenant {
  const t = data.tenants.find((x) => x.domain === domain);
  if (!t) throw new Error(`Tenant not found: ${domain}`);
  return t;
}

export function listTenants(): Tenant[] {
  return data.tenants;
}

export function domainToSlug(domain: string): string {
  return domain.replace(/\.(ru|com)$/, '');
}

/**
 * Public API base. In dev SSR, Next.js calls localhost:5110 directly.
 * In prod, set API_INTERNAL_URL to the internal API host (e.g., http://api:5110
 * in docker, or the prod hostname).
 */
const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:5110';

/**
 * Fetch tenant landing data from the API by slug.
 * Server-side: called from page.tsx during SSR.
 * Disables cache during dev so DB edits reflect immediately; switch to
 * `next: { revalidate: 60 }` for prod once we have CDN.
 */
export async function fetchPublicTenant(slug: string): Promise<Tenant> {
  const res = await fetch(`${API_BASE}/v1/public/tenants/by-slug/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} for tenant slug=${slug}`);
  }
  return (await res.json()) as Tenant;
}

// ─── Public menu API ────────────────────────────────────────────────────────

export type NavTemplate = 'top-classic' | 'mega-images' | 'vertical-side';

export interface PublicMenuItem {
  id: string;
  parentId: string | null;
  label: string;
  href: string;
  icon: string | null;
  imageKey: string | null;
  sortOrder: number;
  locale: string;
  payload?: {
    description?: string;
    badge?: string;
    openInNewTab?: boolean;
    highlight?: boolean;
  } | null;
  children: PublicMenuItem[];
}

export interface PublicMenu {
  template: NavTemplate;
  items: PublicMenuItem[];
}

/**
 * Fetch tenant's main navigation from the API.
 * Falls back to an empty menu if the API is unreachable — caller decides
 * whether to fall back further (e.g., synthesize from tenant.navigation strings).
 */
export async function fetchPublicMenu(slug: string): Promise<PublicMenu> {
  const res = await fetch(`${API_BASE}/v1/public/tenants/${slug}/menu`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 404) {
      return { template: 'top-classic', items: [] };
    }
    throw new Error(`API ${res.status} for menu slug=${slug}`);
  }
  return (await res.json()) as PublicMenu;
}
