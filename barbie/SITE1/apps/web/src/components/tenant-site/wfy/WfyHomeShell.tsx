/**
 * WfyHomeShell — fallback главная для тенантов site_type='wfy-city-dir'.
 *
 * RSC. Принимает уже-загруженный WfyBundle (см. lib/wfy-public.ts) и
 * рендерит секции: hero (tenant.name) → cities grid → advantages → opps →
 * partner salons → CTA. Минимальная вёрстка под NAS palette; ED-based
 * замена ожидается в Phase F (Data-blocks).
 *
 * Связано с MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C.
 */
import Link from 'next/link';
import type {
  WfyBundle,
  WfyCityPage,
  WfyOpportunity,
  WfyAdvantage,
  PartnerSalon,
} from '@/lib/wfy-public';

export function WfyHomeShell({ bundle }: { bundle: WfyBundle }) {
  const { tenant, cities, opportunities, advantages, partnerSalons } = bundle;
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Hero name={tenant.name} citiesCount={cities.length} />
      {advantages.length > 0 && <AdvantagesGrid items={advantages} />}
      {cities.length > 0 && <CitiesGrid tenantSlug={tenant.slug} cities={cities} />}
      {opportunities.length > 0 && <OpportunitiesGrid items={opportunities} />}
      {partnerSalons.length > 0 && <PartnerSalonsGrid items={partnerSalons} />}
      <Footer tenantName={tenant.name} />
    </main>
  );
}

function Hero({ name, citiesCount }: { name: string; citiesCount: number }) {
  return (
    <section className="border-b border-white/10 px-6 py-20">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">{name}</h1>
        <p className="mt-4 text-lg text-white/70">
          Работа для девушек в&nbsp;{citiesCount} городах — администраторы, массажистки, хостес.
        </p>
        <p className="mt-1 text-sm text-white/50">
          Ежедневные выплаты, иногородним предоставляем жильё, свободный график.
        </p>
      </div>
    </section>
  );
}

function AdvantagesGrid({ items }: { items: WfyAdvantage[] }) {
  return (
    <section className="border-b border-white/10 px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold">Почему работать у&nbsp;нас</h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a, i) => (
            <li key={a.id} className="border border-white/10 p-5">
              <div className="text-sm font-mono text-white/40">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="mt-2 text-base font-semibold">{a.title}</div>
              {a.description && (
                <div className="mt-2 text-sm text-white/60">{a.description}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CitiesGrid({
  tenantSlug,
  cities,
}: {
  tenantSlug: string;
  cities: WfyCityPage[];
}) {
  return (
    <section className="border-b border-white/10 px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold">Города</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cities.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${tenantSlug}/${c.slug}`}
                className="block border border-white/10 px-4 py-3 transition-colors hover:border-[#D4AF37] hover:text-[#D4AF37]"
              >
                {c.cityName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OpportunitiesGrid({ items }: { items: WfyOpportunity[] }) {
  return (
    <section className="border-b border-white/10 px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold">Заработай на&nbsp;…</h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((o) => (
            <li key={o.id} className="border border-white/10 p-6">
              <div className="text-sm text-white/40">{o.title}</div>
              {o.headline && (
                <div className="mt-2 text-2xl font-semibold text-[#D4AF37]">
                  {o.headline}
                </div>
              )}
              {o.description && (
                <div className="mt-3 text-sm text-white/60">{o.description}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PartnerSalonsGrid({ items }: { items: PartnerSalon[] }) {
  return (
    <section className="border-b border-white/10 px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold">Партнёрские салоны</h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <li key={s.id} className="border border-white/10 p-5">
              <div className="text-base font-semibold">{s.name}</div>
              {s.address && <div className="mt-1 text-sm text-white/60">{s.address}</div>}
              {s.phone && (
                <a href={`tel:${s.phone}`} className="mt-2 block text-sm text-white/70">
                  {s.phone}
                </a>
              )}
              {s.externalLink && (
                <a
                  href={s.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-[#D4AF37]"
                >
                  {s.externalLink.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer({ tenantName }: { tenantName: string }) {
  return (
    <footer className="px-6 py-10">
      <div className="mx-auto max-w-5xl text-center text-xs text-white/40">
        © {new Date().getFullYear()} {tenantName} ·{' '}
        <Link href="policy" className="hover:text-white/70">
          Политика конфиденциальности
        </Link>
      </div>
    </footer>
  );
}
