import type { Tenant } from '@/lib/tenants';

export function Programs({ tenant }: { tenant: Tenant }) {
  return (
    <section
      id="section-2"
      className="container py-16 md:py-24 border-t"
      style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
    >
      <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
        <h2 className="text-3xl md:text-5xl">
          {tenant.navigation[2] ?? 'Программы'}
        </h2>
        <div className="text-xs uppercase tracking-[0.3em] opacity-50">
          {tenant.programs.length} вариантов
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}>
        {tenant.programs.map((p, i) => (
          <article
            key={i}
            className="p-8 md:p-10"
            style={{ background: 'var(--bg)' }}
          >
            <div className="flex items-baseline justify-between mb-4 gap-4">
              <h3 className="text-xl md:text-2xl">{p.name}</h3>
              {p.price && (
                <div className="accent text-lg whitespace-nowrap" style={{ color: 'var(--acc-color)' }}>
                  {p.price}
                </div>
              )}
            </div>
            {p.duration && (
              <div className="text-xs uppercase tracking-wider mb-4 opacity-60">
                {p.duration}
              </div>
            )}
            <p className="text-sm md:text-base opacity-80 leading-relaxed">
              {p.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
