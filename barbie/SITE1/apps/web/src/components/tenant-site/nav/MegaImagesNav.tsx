import type { PublicMenuItem, Tenant } from '@/lib/tenants';

interface Props {
  tenant: Tenant;
  items: { key: string; label: string; href: string; raw: PublicMenuItem | null }[];
}

/**
 * mega-images: горизонтальная навигация + dropdown с большими картинками услуг.
 * Children показываются на hover как карточки.
 */
export function MegaImagesNav({ tenant, items }: Props) {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur border-b"
      style={{
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
        borderColor: 'color-mix(in srgb, var(--body-color) 12%, transparent)',
      }}
    >
      <div className="container flex items-center justify-between py-6">
        <a
          href="#top"
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--head-color)', fontFamily: 'var(--head-font)' }}
        >
          {tenant.brand}
        </a>
        <nav className="hidden md:flex gap-1 text-sm">
          {items.map((item) => {
            const children = item.raw?.children ?? [];
            return (
              <div key={item.key} className="relative group">
                <a
                  href={item.href}
                  className="block px-4 py-2 uppercase tracking-wider hover:opacity-70"
                >
                  {item.label}
                  {children.length > 0 && <span className="ml-1 opacity-50">▾</span>}
                </a>
                {children.length > 0 && (
                  <div
                    className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 z-50"
                    style={{ minWidth: '500px' }}
                  >
                    <div
                      className="grid grid-cols-2 gap-3 p-4 rounded shadow-2xl"
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid color-mix(in srgb, var(--body-color) 15%, transparent)',
                      }}
                    >
                      {children.map((c) => (
                        <a
                          key={c.id}
                          href={c.href}
                          className="flex gap-3 p-2 rounded hover:opacity-70"
                          style={{
                            background: 'color-mix(in srgb, var(--body-color) 4%, transparent)',
                          }}
                        >
                          <div
                            className="w-16 h-16 rounded flex-shrink-0 flex items-center justify-center"
                            style={{
                              background: 'color-mix(in srgb, var(--acc-color) 20%, transparent)',
                              color: 'var(--acc-color)',
                              fontFamily: 'var(--head-font)',
                            }}
                          >
                            {c.imageKey ? (
                              <span className="text-xs">img</span>
                            ) : (
                              c.label.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: 'var(--head-color)' }}>
                              {c.label}
                            </div>
                            {c.payload?.description && (
                              <div className="text-xs opacity-60 line-clamp-2">{c.payload.description}</div>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
