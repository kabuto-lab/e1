/**
 * Per-tenant admin-module capability matrix.
 *
 * Each tenant has a `siteType` (column on `nas.tenants`) which determines which
 * admin modules render in the side rail and which `/admin/*` route paths are
 * allowed for that tenant context. See `MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md`
 * §3.3 for the matrix source-of-truth + product rationale.
 *
 * Invariants:
 *  - Every `SiteType` MUST appear in `CAPABILITIES`. The TypeScript
 *    `Record<SiteType, ...>` type enforces this at compile-time — adding a
 *    new SiteType to `packages/db/src/schema/tenants.ts` without updating
 *    this file is a build break (intentional).
 *  - The five "universal" modules (settings, domains, media, pages, leads)
 *    are present in every SiteType — the matrix encodes per-vertical
 *    additions, not the full surface.
 *  - This module is a pure-logic helper: no React, no fetch, no DOM. Safe to
 *    import from both RSC and Client Components, and from API code (server)
 *    if we ever want to mirror enforcement at the API gateway.
 */
import type { SiteType } from '@barbie-site1/db';

/**
 * All admin modules known to the platform. Adding a new module here triggers
 * a TS error in any `CAPABILITIES` entry that doesn't explicitly list it
 * (when used with `satisfies Record<SiteType, ReadonlyArray<AdminModule>>`).
 *
 * Naming convention: kebab-case, mirrors the URL slug in `/admin/<module>`.
 */
export type AdminModule =
  | 'settings'
  | 'domains'
  | 'media'
  | 'pages'
  | 'leads'
  | 'salons'
  | 'staff'
  | 'services'
  | 'rooms'
  | 'bookings'
  | 'city-pages'
  | 'partner-salons'
  | 'vacancies'
  | 'advantages';

/**
 * Modules every tenant gets regardless of vertical. Kept as a const so it can
 * be reused & introspected by tests.
 */
export const UNIVERSAL_MODULES: ReadonlyArray<AdminModule> = [
  'settings',
  'domains',
  'media',
  'pages',
  'leads',
] as const;

/**
 * Per-vertical additions. The full capability set for a SiteType is
 * `UNIVERSAL_MODULES ∪ VERTICAL_ADDITIONS[siteType]`.
 *
 * Source: MIGRATION_PLAN §3.3 capability matrix.
 */
const VERTICAL_ADDITIONS = {
  'salon-detail': ['salons', 'staff', 'services', 'rooms', 'bookings'],
  'wfy-city-dir': ['city-pages', 'partner-salons', 'vacancies', 'advantages'],
  'escort-catalog': ['staff'],
  'multi-salon-network': ['salons', 'staff', 'services', 'rooms', 'bookings'],
  'generic-cms': [],
} as const satisfies Record<SiteType, ReadonlyArray<AdminModule>>;

/**
 * Full capability map. Pre-computed at module load — a tenant-can check is
 * a `Set.has` (O(1)). Frozen to discourage accidental mutation in caller code.
 */
export const CAPABILITIES: Readonly<Record<SiteType, ReadonlySet<AdminModule>>> =
  Object.freeze(
    (Object.keys(VERTICAL_ADDITIONS) as SiteType[]).reduce(
      (acc, st) => {
        acc[st] = new Set<AdminModule>([
          ...UNIVERSAL_MODULES,
          ...VERTICAL_ADDITIONS[st],
        ]);
        return acc;
      },
      {} as Record<SiteType, ReadonlySet<AdminModule>>,
    ),
  );

/**
 * Whether a tenant of the given site type may access an admin module.
 *
 * Used by:
 *  - Rail / side-nav rendering (hide items the tenant cannot use)
 *  - Route guards on `/admin/<module>/*` pages (403 / redirect to /admin)
 *  - API endpoint enforcement (defence-in-depth — UI hiding ≠ authz)
 */
export function tenantCan(siteType: SiteType, module: AdminModule): boolean {
  return CAPABILITIES[siteType].has(module);
}

/**
 * Convenience inverse: list every module the tenant can access. Stable
 * iteration order (universals first, then verticals in declaration order).
 */
export function modulesFor(siteType: SiteType): ReadonlyArray<AdminModule> {
  return [...UNIVERSAL_MODULES, ...VERTICAL_ADDITIONS[siteType]];
}
