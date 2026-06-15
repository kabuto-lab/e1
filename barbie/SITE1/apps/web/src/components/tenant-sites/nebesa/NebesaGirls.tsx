import { getTranslations } from 'next-intl/server';
import { photoUrl } from '@/lib/public-girls-api';
import type { PublicGirl } from '@/lib/public-girls-api';

/**
 * NebesaGirls — фирменный листинг анкет тенанта nebesaspa (НЕБОСВОД) в едином
 * стиле сайта: секция .girls + flip-карточки .gcard (как на главной NebesaHome).
 * Презентационный серверный компонент; ростер передаётся пропсом. Используется
 * и на /nebesaspa/girls, и на /nebesaspa/models, чтобы вид совпадал со всем сайтом.
 */
export async function NebesaGirls({
  girls,
  titleKey = 'girls.title',
}: {
  girls: PublicGirl[];
  /** ключ перевода под nebesa.* (girls.title | girls.profiles) */
  titleKey?: string;
}) {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <section className="girls">
      <div className="wrap">
        <h1 className="h2">{t(titleKey)}</h1>
        {girls.length > 0 ? (
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
                        <img
                          src={photoUrl(g.photos[1] ?? g.photos[0])}
                          alt={g.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
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
                      {tc('meta.breast')}<b>{g.breast}</b>
                    </span>
                  )}
                  {g.weight != null && (
                    <span>
                      {tc('meta.weight')}<b>{g.weight}</b>
                    </span>
                  )}
                  {g.height != null && (
                    <span>
                      {tc('meta.height')}<b>{g.height}</b>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', marginTop: 24 }}>{t('girls.empty')}</p>
        )}
      </div>
    </section>
  );
}
