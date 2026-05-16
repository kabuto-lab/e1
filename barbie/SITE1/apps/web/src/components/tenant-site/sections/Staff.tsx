import type { Tenant } from '@/lib/tenants';

export function Staff({ tenant }: { tenant: Tenant }) {
  if (tenant.staff.length === 0) return null;
  return (
    <section
      id="section-0"
      className="container py-16 md:py-24 border-t"
      style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
    >
      <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
        <h2 className="text-3xl md:text-5xl">
          {tenant.navigation[0] ?? 'Состав'}
        </h2>
        <div className="text-xs uppercase tracking-[0.3em] opacity-50">
          {tenant.staff.length} участников
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tenant.staff.map((s, i) => (
          <article
            key={i}
            className="p-6"
            style={{
              background: 'color-mix(in srgb, var(--body-color) 4%, transparent)',
            }}
          >
            <div
              className="text-xs uppercase tracking-[0.3em] mb-3 opacity-50"
              style={{ color: 'var(--acc-color)' }}
            >
              {s.age != null ? `${s.age} y.o.` : '—'}
            </div>
            <h3 className="text-lg md:text-xl mb-2">{s.name}</h3>
            <div className="text-xs opacity-60 leading-snug">
              {s.tag}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
