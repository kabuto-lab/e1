import type { PublicMenuItem, Tenant } from '@/lib/tenants';

interface Props {
  tenant: Tenant;
  items: { key: string; label: string; href: string; raw: PublicMenuItem | null }[];
}

/**
 * top-classic: горизонтальная навигация в шапке, текст-only, 1 уровень.
 */
export function TopClassicNav({ tenant, items }: Props) {
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
