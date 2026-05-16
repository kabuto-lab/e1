import type { Tenant } from '@/lib/tenants';

export function Rooms({ tenant }: { tenant: Tenant }) {
  return (
    <section
      id="section-1"
      className="container py-16 md:py-24 border-t"
      style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}
    >
      <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
        <h2 className="text-3xl md:text-5xl">
          {tenant.navigation[1] ?? 'Пространства'}
        </h2>
        <div className="text-xs uppercase tracking-[0.3em] opacity-50">
          {tenant.rooms.length} комнат
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tenant.rooms.map((r, i) => (
          <article
            key={i}
            className="p-8 border"
            style={{
              borderColor: 'color-mix(in srgb, var(--body-color) 20%, transparent)',
            }}
          >
            <div
              className="text-xs uppercase tracking-[0.3em] mb-4 opacity-60"
              style={{ color: 'var(--acc-color)' }}
            >
              · {String(i + 1).padStart(2, '0')} ·
            </div>
            <h3 className="text-xl md:text-2xl mb-4">{r.name}</h3>
            <p className="text-sm opacity-80 leading-relaxed">
              {r.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
