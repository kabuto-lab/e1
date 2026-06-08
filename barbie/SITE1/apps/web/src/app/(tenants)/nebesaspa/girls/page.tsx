import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';
import { NebesaShell } from '@/components/tenant-sites/nebesa/NebesaShell';

export const metadata = {
  title: 'Наши девушки — НЕБОСВОД · спа-салон эротического массажа',
  description: 'Анкеты мастеров салона НЕБОСВОД: реальные фото и параметры. Работаем 24/7 по записи.',
};

/**
 * (tenants)/nebesaspa/girls — внутренняя страница тенанта nebesaspa в едином
 * стиле с главной (NebesaShell + nebesa.css). Ростер — из NAS-каталога.
 */
export default async function Page() {
  const { data: girls } = await fetchPublicGirls('nebesaspa').catch(() => ({ data: [], total: 0 }));

  return (
    <NebesaShell>
      <section className="girls">
        <div className="wrap">
          <h2 className="h2">Наши девушки</h2>
          <div className="girls-grid">
            {girls.map((g) => (
              <article className="gcard" key={g.slug}>
                <div className="pic">
                  <div className="flip">
                    <div className="face front">
                      {g.photos[0] && (
                        <img src={photoUrl(g.photos[0])} alt={g.name} loading="lazy" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div className="face back">
                      {(g.photos[1] ?? g.photos[0]) && (
                        <img src={photoUrl(g.photos[1] ?? g.photos[0])} alt={g.name} loading="lazy" referrerPolicy="no-referrer" />
                      )}
                    </div>
                  </div>
                  <span className="pdot" />
                </div>
                <div className="nm">
                  {g.name}
                  {g.age ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> {g.age}</span> : null}
                </div>
                <div className="meta">
                  {g.breast != null && (
                    <span>
                      Грудь<b>{g.breast}</b>
                    </span>
                  )}
                  {g.weight != null && (
                    <span>
                      Вес<b>{g.weight}</b>
                    </span>
                  )}
                  {g.height != null && (
                    <span>
                      Рост<b>{g.height}</b>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </NebesaShell>
  );
}
