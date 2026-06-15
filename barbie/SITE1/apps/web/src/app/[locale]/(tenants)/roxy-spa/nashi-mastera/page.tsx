import { asset } from '@/lib/asset';
import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';
import { RoxyShell } from '@/components/tenant-sites/roxy/RoxyShell';

export const metadata = {
  title: 'Наши мастера — ROXY Men`s Relax Club',
  description: 'Мастера салона ROXY: реальные анкеты с фото. Эротический массаж в Москве.',
};

/**
 * (tenants)/roxy-spa/nashi-mastera — внутренняя страница тенанта roxy-spa в едином
 * стиле с главной (RoxyShell + roxy.css). Ростер — из NAS-каталога.
 */
export default async function Page() {
  const { data: girls } = await fetchPublicGirls('roxy-spa').catch(() => ({ data: [], total: 0 }));

  return (
    <RoxyShell>
      <section className="rose-bg" style={{ background: 'var(--bg-2)' }}>
        <div className="wrap">
          <h2 className="sec-title">Наши мастера</h2>
          <div className="mast-grid">
            {girls.map((g, i) => (
              <a className="mast" key={g.slug} href={asset("/roxy-spa/nashi-mastera")}>
                <div
                  className="img"
                  style={
                    g.photos[0]
                      ? { backgroundImage: `url(${photoUrl(g.photos[0])})` }
                      : { background: `linear-gradient(135deg,hsl(${(i * 47) % 360},40%,30%),#1a1320)` }
                  }
                />
                <div className="name">
                  {g.name}
                  {g.age ? ` ${g.age}` : ''}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </RoxyShell>
  );
}
