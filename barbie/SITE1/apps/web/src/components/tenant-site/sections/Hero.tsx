import type { Tenant } from '@/lib/tenants';

export function Hero({ tenant }: { tenant: Tenant }) {
  return (
    <section id="top" className="container py-24 md:py-32">
      <div className="max-w-4xl">
        <div
          className="text-xs uppercase tracking-[0.3em] mb-6 opacity-60"
          style={{ color: 'var(--acc-color)', fontFamily: 'var(--acc-font)' }}
        >
          {tenant.aesthetic} · est. mmxxvi
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8">{tenant.brand}</h1>
        <p
          className="accent text-xl md:text-2xl mb-12 max-w-2xl"
          style={{ fontStyle: 'italic' }}
        >
          {tenant.tagline}
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#section-3"
            className="inline-block px-8 py-4 border-2 text-sm uppercase tracking-widest font-semibold"
            style={{ borderColor: 'var(--acc-color)', color: 'var(--acc-color)' }}
          >
            {tenant.navigation[3] ?? 'Бронь'}
          </a>
          {tenant.social.telegram && (
            <a
              href={`https://t.me/${tenant.social.telegram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 text-sm uppercase tracking-widest font-semibold opacity-70 hover:opacity-100"
            >
              Telegram
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
