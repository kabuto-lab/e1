import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';
import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';

export const metadata = {
  title: 'Девушки — Soho Spa',
  description: 'Мастера эротического массажа Soho Spa — выбирайте по предпочтениям.',
};

export default async function Page() {
  const { data: girls } = await fetchPublicGirls('soho-spa').catch(() => ({ data: [], total: 0 }));
  return (
    <SohoShell>
      <section className="sec" style={{ marginTop: '70px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Мастера эротического массажа</div>
            <h2>Наши девушки</h2>
            <p>
              Каждая мастерица — профессионал своего дела. Выбирайте по предпочтениям или закажите
              подбор и получите +30 минут в подарок.
            </p>
          </div>
          <div className="grid g4">
            {girls.map((g) => (
              <div className="girl" key={g.slug}>
                <img
                  src={photoUrl(g.photos[0])}
                  alt={g.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="info">
                  <div className="nm">{g.name}</div>
                  <div className="params">
                    {g.age != null && (
                      <span>
                        Возраст <b>{g.age}</b>
                      </span>
                    )}
                    {g.breast != null && (
                      <span>
                        Грудь <b>{g.breast}</b>
                      </span>
                    )}
                    {g.height != null && (
                      <span>
                        Рост <b>{g.height}</b>
                      </span>
                    )}
                    {g.weight != null && (
                      <span>
                        Вес <b>{g.weight}</b>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <a href="/soho-spa/contacts" className="btn">
              Записаться
            </a>
            <a href="/soho-spa/visit" className="btn btn-ghost" style={{ marginLeft: '10px' }}>
              Заказать на выезд
            </a>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
