import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';
import { PentagonShell } from '@/components/tenant-sites/pentagon/PentagonShell';

export const metadata = {
  title: 'Девушки — PENTAGON spa salon',
  description: 'Анкеты мастеров салона PENTAGON: реальные фото и параметры. Деликатный подбор.',
};

/**
 * (tenants)/pentagon/girl — внутренняя страница тенанта pentagon в едином стиле
 * с главной (PentagonShell + pentagon.css). Ростер — из NAS-каталога.
 */
export default async function Page() {
  const { data: girls } = await fetchPublicGirls('pentagon').catch(() => ({ data: [], total: 0 }));

  return (
    <PentagonShell>
      <section className="sec" id="girls">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Наша команда</span>
            <h2>Девушки</h2>
            <p>Каждая анкета — с фото и параметрами. Деликатный подбор под ваши пожелания.</p>
          </div>
          <div className="girls">
            {girls.map((g, i) => (
              <a key={g.slug} href="/pentagon/girl" className="girl">
                {g.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl(g.photos[0])} alt={g.name} loading="lazy" />
                )}
                {i < 2 && <span className="tag">new</span>}
                <div className="meta">
                  <h3>{g.name}</h3>
                  <span>
                    {g.age != null ? `${g.age} лет` : ''}
                    {g.height != null ? ` · ${g.height} см` : ''}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PentagonShell>
  );
}
