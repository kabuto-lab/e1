import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';
import { VaniliaShell } from '@/components/tenant-sites/vanilia/VaniliaShell';

export const metadata = {
  title: 'Наши девушки — Vanilia · салон эротического массажа в Москве',
  description: 'Анкеты мастеров салона Vanilia: реальные фото, параметры. Работаем 24/7 по записи.',
};

/**
 * (tenants)/5massage/girls — внутренняя страница тенанта 5massage (Vanilia),
 * в едином стиле с главной (VaniliaShell + vanilia.css). Ростер — из NAS-каталога.
 */
export default async function Page() {
  const { data: girls } = await fetchPublicGirls('5massage').catch(() => ({ data: [], total: 0 }));

  return (
    <VaniliaShell>
      <section>
        <div className="wrap">
          <div className="panel-sec">
            <h2 className="center">
              Наши девушки <span style={{ color: 'var(--accent)' }}>({girls.length})</span>
            </h2>
            <div className="girls">
              {girls.map((g, i) => (
                <div className="girl" key={g.slug}>
                  <div className="ph">
                    {g.photos[0] ? (
                      <img referrerPolicy="no-referrer" src={photoUrl(g.photos[0])} alt={g.name} />
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: `linear-gradient(160deg,hsl(${(i * 47) % 360},30%,38%),#1a1020)`,
                        }}
                      />
                    )}
                  </div>
                  <div className="nm">
                    {g.name}
                    {g.age ? ` ${g.age}` : ''}
                  </div>
                  <div className="params">
                    {g.breast != null && (
                      <span>
                        Грудь{' '}
                        <b>
                          {g.breast}
                          {g.silicon ? <span className="sil"> silicon</span> : ''}
                        </b>
                      </span>
                    )}
                    {g.weight != null && (
                      <span>
                        Вес <b>{g.weight}</b>
                      </span>
                    )}
                    {g.height != null && (
                      <span>
                        Рост <b>{g.height}</b>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </VaniliaShell>
  );
}
