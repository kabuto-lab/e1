import type { PublicMenuItem, Tenant } from '@/lib/tenants';

interface Props {
  tenant: Tenant;
  items: { key: string; label: string; href: string; raw: PublicMenuItem | null }[];
}

/**
 * vertical-side: боковая навигация (sidebar), иконки + текст, 2 уровня вложенности.
 * Sidebar fixed на десктопе слева, на мобильном — collapses в top bar (CSS-only).
 */
export function VerticalSideNav({ tenant, items }: Props) {
  return (
    <>
      {/* Mobile: top bar with brand. На десктопе скрыт. */}
      <header
        className="md:hidden sticky top-0 z-50 backdrop-blur border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
          borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)',
        }}
      >
        <div className="container flex items-center justify-between py-4">
          <a
            href="#top"
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--head-color)', fontFamily: 'var(--head-font)' }}
          >
            {tenant.brand}
          </a>
          {tenant.phones[0] && (
            <a
              href={`tel:${tenant.phones[0].replace(/[^+\d]/g, '')}`}
              className="text-xs font-mono"
            >
              {tenant.phones[0]}
            </a>
          )}
        </div>
      </header>

      {/* Desktop sidebar — fixed left, 16rem wide */}
      <aside
        className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 md:p-6 md:border-r overflow-y-auto z-40"
        style={{
          background: 'color-mix(in srgb, var(--bg) 95%, var(--body-color) 5%)',
          borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)',
        }}
      >
        <a
          href="#top"
          className="text-2xl font-bold tracking-tight mb-10"
          style={{ color: 'var(--head-color)', fontFamily: 'var(--head-font)' }}
        >
          {tenant.brand}
        </a>

        <nav className="flex flex-col gap-1 flex-1">
          {items.map((item) => {
            const raw = item.raw;
            const children = raw?.children ?? [];
            return (
              <div key={item.key}>
                <a
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded text-sm hover:opacity-70"
                  style={{
                    background: 'color-mix(in srgb, var(--body-color) 5%, transparent)',
                  }}
                >
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono"
                    style={{
                      background: 'color-mix(in srgb, var(--acc-color) 20%, transparent)',
                      color: 'var(--acc-color)',
                    }}
                  >
                    {raw?.icon ? raw.icon.slice(0, 2) : item.label.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate uppercase tracking-wider">{item.label}</span>
                </a>
                {children.length > 0 && (
                  <div className="ml-9 mt-1 flex flex-col gap-1 mb-2">
                    {children.map((c) => (
                      <a
                        key={c.id}
                        href={c.href}
                        className="text-xs opacity-70 hover:opacity-100 py-1 truncate"
                      >
                        — {c.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {tenant.phones[0] && (
          <a
            href={`tel:${tenant.phones[0].replace(/[^+\d]/g, '')}`}
            className="block text-sm font-mono pt-4 mt-4 border-t"
            style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
          >
            {tenant.phones[0]}
          </a>
        )}
      </aside>
    </>
  );
}
