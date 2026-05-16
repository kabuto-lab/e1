import type { Tenant } from '@/lib/tenants';

export function Footer({ tenant }: { tenant: Tenant }) {
  const year = new Date().getFullYear();
  return (
    <footer
      className="container py-12 border-t mt-12 text-sm opacity-60"
      style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          © {year} {tenant.brand}. Все права защищены.
        </div>
        <div className="font-mono text-xs uppercase tracking-widest">
          {tenant.domain}
        </div>
      </div>
    </footer>
  );
}
