import type { PublicMenu, Tenant } from '@/lib/tenants';
import { TopClassicNav } from './nav/TopClassicNav';
import { MegaImagesNav } from './nav/MegaImagesNav';
import { VerticalSideNav } from './nav/VerticalSideNav';

interface NavigationProps {
  tenant: Tenant;
  menu: PublicMenu;
}

/**
 * Dispatches to one of three template-specific nav components based on
 * tenant_design_tokens.nav_template (delivered via the public menu API).
 *
 * If the API menu is empty (e.g., menu not yet seeded for a tenant), synthesises
 * items from the static `tenant.navigation` array.
 */
export function Navigation({ tenant, menu }: NavigationProps) {
  const items =
    menu.items.length > 0
      ? menu.items.map((m) => ({ key: m.id, label: m.label, href: m.href, raw: m }))
      : tenant.navigation.map((label, i) => ({
          key: `static-${i}`,
          label,
          href: `#section-${i}`,
          raw: null,
        }));

  switch (menu.template) {
    case 'mega-images':
      return <MegaImagesNav tenant={tenant} items={items} />;
    case 'vertical-side':
      return <VerticalSideNav tenant={tenant} items={items} />;
    case 'top-classic':
    default:
      return <TopClassicNav tenant={tenant} items={items} />;
  }
}
