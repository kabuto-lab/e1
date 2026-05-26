/**
 * WfyCityShell — страница одного города для wfy-city-dir тенантов.
 *
 * RSC. Принимает уже-найденный city + список vacancies (общий для всего
 * тенанта — work-for-you предлагает один и тот же набор позиций в каждом
 * городе). Hero показывает city.headline; ниже — vacancies в форме
 * accordion'а; затем подвал.
 *
 * Связано с MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §8 Phase C.
 */
import Link from 'next/link';
import type { WfyCityPage, WfyVacancy } from '@/lib/wfy-public';

export function WfyCityShell({
  tenantSlug,
  city,
  vacancies,
}: {
  tenantSlug: string;
  city: WfyCityPage;
  vacancies: WfyVacancy[];
}) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Header tenantSlug={tenantSlug} />
      <Hero city={city} />
      {vacancies.length > 0 && <VacanciesList items={vacancies} />}
      <Footer />
    </main>
  );
}

function Header({ tenantSlug }: { tenantSlug: string }) {
  return (
    <header className="border-b border-white/10 px-6 py-4">
      <div className="mx-auto max-w-5xl">
        <Link href={`/${tenantSlug}`} className="text-sm text-white/60 hover:text-white">
          ← Все города
        </Link>
      </div>
    </header>
  );
}

function Hero({ city }: { city: WfyCityPage }) {
  return (
    <section className="border-b border-white/10 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold tracking-tight">
          {city.headline ?? city.cityName}
        </h1>
        {city.description && (
          <p className="mt-4 max-w-3xl text-base text-white/70">{city.description}</p>
        )}
      </div>
    </section>
  );
}

function VacanciesList({ items }: { items: WfyVacancy[] }) {
  return (
    <section className="border-b border-white/10 px-6 py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold">Вакансии</h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <li key={v.id} className="border border-white/10 p-5">
              <div className="text-base font-semibold">{v.title}</div>
              {v.summary && (
                <div className="mt-2 text-sm text-white/60">{v.summary}</div>
              )}
              {v.conditions.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-white/70">
                  {v.conditions.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#D4AF37]">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
              {v.requirements.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-white/40">
                    Требования
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-white/60">
                    {v.requirements.map((r, i) => (
                      <li key={i}>· {r}</li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-10">
      <div className="mx-auto max-w-5xl text-center text-xs text-white/40">
        © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
