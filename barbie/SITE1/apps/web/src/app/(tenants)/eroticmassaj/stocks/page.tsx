import { EroticmassajShell } from '@/components/tenant-sites/eroticmassaj/EroticmassajShell';

export const metadata = { title: 'Акции — PODIUM SPA' };

export default function Page() {
  return (
    <EroticmassajShell>
      <section className="art-hero">
        <div className="container">
          <span className="tagline">Podium SPA</span>
          <h1>Акции</h1>
          <p className="lead" style={{ marginTop: '14px' }}>Уникальные предложения для вас.</p>
        </div>
      </section>

      <section style={{ paddingTop: '10px' }}>
        <div className="container">
          <div className="grid g3">
            <a className="promo-card" href="/eroticmassaj/stock-bilet">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/oblozhka-1.webp" alt="" />
              <div className="pbody">
                <h3>Счастливый билет</h3>
                <p>Беспроигрышная лотерея!</p>
                <span className="dur accent">Подробнее →</span>
              </div>
            </a>
            <a className="promo-card" href="/eroticmassaj/stock-koktejl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/vecherinka-koktejlnaya-1.webp" alt="" />
              <div className="pbody">
                <h3>Коктейльная вечеринка!</h3>
                <p>Каждый четверг — коктейльная вечеринка в Podium spa.</p>
                <span className="dur accent">Подробнее →</span>
              </div>
            </a>
            <a className="promo-card" href="/eroticmassaj/stock-women">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/solyarij-1.webp" alt="" />
              <div className="pbody">
                <h3>Мы рады не только мужчинам..</h3>
                <p>Приятный бонус для милых дам!</p>
                <span className="dur accent">Подробнее →</span>
              </div>
            </a>
            <a className="promo-card" href="/eroticmassaj/stock-akcziya4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/vip-programmy.webp" alt="" />
              <div className="pbody">
                <h3>Днём с огнём!</h3>
                <p>Приятный бонус для любителей отдохнуть по будням.</p>
                <span className="dur accent">Подробнее →</span>
              </div>
            </a>
            <a className="promo-card" href="/eroticmassaj/stock-eshhyo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tenants/eroticmassaj/lesbi.webp" alt="" />
              <div className="pbody">
                <h3>Двойной экстаз</h3>
                <p>Специально для наших мужчин — массаж в 4 руки в подарок!</p>
                <span className="dur accent">Подробнее →</span>
              </div>
            </a>
          </div>
          <div className="age-note">На сайте представлены фото/видео эротического содержания, а также информация об услугах, оказываемых лицам, достигшим 18 лет.</div>
        </div>
      </section>
    </EroticmassajShell>
  );
}
