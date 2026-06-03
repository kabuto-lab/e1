import '@/styles/pentagon.css';
import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';
import { SmAgeGate } from '@/components/tenant-sites/salonmassage/SmAgeGate';

export const metadata = {
  title: 'Анкеты — PENTAGON spa salon',
  description: 'Все анкеты девушек салона Pentagon — с фото и параметрами.',
};

/** Полный листинг анкет тенанта pentagon (из общего каталога NAS). */
export default async function PentagonModelsPage() {
  const { data: girls } = await fetchPublicGirls('pentagon').catch(() => ({ data: [], total: 0 }));
  const shown = girls.filter((g) => g.photos.length);

  return (
    <div className="pg-site" id="top">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" />
      <SmAgeGate />
      <header className="pg-header scrolled">
        <div className="wrap nav">
          <a href="/pentagon" className="brand">
            <span className="word">PENTAGON</span>
            <span className="sub">spa salon</span>
          </a>
          <nav className="menu">
            <a href="/pentagon#programs">Программы</a>
            <a href="/pentagon#interior">Интерьер</a>
            <a href="/pentagon#contacts" className="muted">Контакты</a>
          </nav>
          <a href="/pentagon" className="btn btn-ghost" style={{ marginLeft: 'auto' }}>← На главную</a>
        </div>
      </header>

      <section className="sec" style={{ paddingTop: 140, borderTop: 'none' }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Наша команда</span>
            <h2>Все анкеты</h2>
            <p>{shown.length} девушек · фото и параметры. Деликатный подбор под ваши пожелания.</p>
          </div>
          <div className="girls">
            {shown.map((g) => (
              <div key={g.slug} className="girl">
                {g.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl(g.photos[0])} alt={g.name} loading="lazy" />
                )}
                {g.silicon && <span className="tag">silicone</span>}
                <div className="meta">
                  <h3>{g.name}</h3>
                  <span>
                    {g.age != null ? `${g.age} лет` : ''}
                    {g.height != null ? ` · ${g.height} см` : ''}
                    {g.breast != null ? ` · грудь ${g.breast}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
