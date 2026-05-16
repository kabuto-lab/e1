import type { PublicMenu, Tenant } from '@/lib/tenants';

interface NavigationProps {
  tenant: Tenant;
  menu: PublicMenu;
}

/**
 * Top navigation bar. Prefers menu items from API (DB-backed). Falls back
 * to the static `tenant.navigation` array if the menu is empty — e.g.
 * for a tenant where menu items haven't been seeded yet, or if the API
 * fetch failed (handled upstream in TenantSiteShell).
 */
export function Navigation({ tenant, menu }: NavigationProps) {
  const items =
    menu.items.length > 0
      ? menu.items.map((m) => ({ key: m.id, label: m.label, href: m.href }))
      : tenant.navigation.map((label, i) => ({
          key: `static-${i}`,
          label,
          href: `#section-${i}`,
        }));

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
    >
      <div className="container flex items-center justify-between py-5">
        <a
          href="#top"
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--head-color)', fontFamily: 'var(--head-font)' }}
        >
          {tenant.brand}
        </a>
        <nav className="hidden md:flex gap-8 text-sm uppercase tracking-wider">
          {items.map((item) => (
            <a key={item.key} href={item.href} className="hover:opacity-70">
              {item.label}
            </a>
          ))}
        </nav>
        {tenant.phones[0] && (
          <a
            href={`tel:${tenant.phones[0].replace(/[^+\d]/g, '')}`}
            className="hidden md:block text-sm font-mono"
          >
            {tenant.phones[0]}
          </a>
        )}
      </div>
    </header>
  );
}
