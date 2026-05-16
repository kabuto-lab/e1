import type { Tenant } from '@/lib/tenants';

export function Positioning({ tenant }: { tenant: Tenant }) {
  return (
    <section className="container py-16 md:py-24 border-t" style={{ borderColor: 'color-mix(in srgb, var(--body-color) 15%, transparent)' }}>
      <div className="max-w-3xl">
        <div
          className="text-xs uppercase tracking-[0.3em] mb-6"
          style={{ color: 'var(--acc-color)' }}
        >
          О ДОМЕ
        </div>
        <p className="text-lg md:text-xl leading-relaxed" style={{ color: 'var(--body-color)' }}>
          {tenant.positioning}
        </p>
      </div>
    </section>
  );
}
