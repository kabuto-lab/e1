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
  aesthetic: TenantAesthetic;
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
