import type { Tenant } from '@/lib/tenants';
import { fetchPublicMenu } from '@/lib/tenants';
import { decodeTdParam } from '@/lib/td-overrides';
import { TenantBrandShell } from './TenantBrandShell';
import { Navigation } from './Navigation';
import { TenantEditFab } from './TenantEditFab';
import { Hero } from './sections/Hero';
import { Positioning } from './sections/Positioning';
import { Programs } from './sections/Programs';
import { Rooms } from './sections/Rooms';
import { Staff } from './sections/Staff';
import { Models } from './sections/Models';
import { Contacts } from './sections/Contacts';
import { Footer } from './sections/Footer';

interface TenantSiteShellProps {
  tenant: Tenant;
  /** ?td=base64(tokens) — preview-overrides из /admin/projects. */
  tdParam?: string;
}

export async function TenantSiteShell({ tenant, tdParam }: TenantSiteShellProps) {
  // Merge preview-overrides (?td=...) на defaults тенанта. Если td кривой —
  // decodeTdParam вернёт undefined, рендерится без изменений.
  const overrides = decodeTdParam(tdParam);
  const dt = overrides ? { ...tenant.designTokens, ...overrides } : tenant.designTokens;

  // Fetch live menu from API. If the slug is missing or API hiccups, fall back
  // to an empty menu — Navigation then synthesizes from tenant.navigation.
  const menu = tenant.slug
    ? await fetchPublicMenu(tenant.slug).catch(() => ({
        template: 'top-classic' as const,
        items: [],
      }))
    : { template: 'top-classic' as const, items: [] };

  // vertical-side template uses a fixed left sidebar (16rem) on desktop;
  // shift the main content right to make room. On mobile sidebar collapses.
  const layoutClass =
    menu.template === 'vertical-side' ? 'min-h-screen md:pl-64' : 'min-h-screen';

  return (
    <>
      <TenantBrandShell designTokens={dt} wrapperClassName={layoutClass}>
        <Navigation tenant={tenant} menu={menu} />
        <Hero tenant={tenant} />
        <Positioning tenant={tenant} />
        <Programs tenant={tenant} />
        <Rooms tenant={tenant} />
        <Staff tenant={tenant} />
        {/* Models — ростер из NAS-каталога (Class-G), server-fetch по slug.
            Рендерится только если у тенанта есть активные модели. */}
        <Models tenant={tenant} />
        <Contacts tenant={tenant} />
        <Footer tenant={tenant} />
      </TenantBrandShell>
      {tenant.slug && <TenantEditFab tenantSlug={tenant.slug} />}
    </>
  );
}
