import type { Tenant } from '@/lib/tenants';

export function Navigation({ tenant }: { tenant: Tenant }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}>
      <div className="container flex items-center justify-between py-5">
        <a href="#top" className="text-2xl font-bold tracking-tight" style={{ color: 'var(--head-color)', fontFamily: 'var(--head-font)' }}>
          {tenant.brand}
        </a>
        <nav className="hidden md:flex gap-8 text-sm uppercase tracking-wider">
          {tenant.navigation.map((item, i) => (
            <a key={i} href={`#section-${i}`} className="hover:opacity-70">
              {item}
            </a>
          ))}
        </nav>
        {tenant.phones[0] && (
          <a href={`tel:${tenant.phones[0].replace(/[^+\d]/g, '')}`} className="hidden md:block text-sm font-mono">
            {tenant.phones[0]}
          </a>
        )}
      </div>
    </header>
  );
}
