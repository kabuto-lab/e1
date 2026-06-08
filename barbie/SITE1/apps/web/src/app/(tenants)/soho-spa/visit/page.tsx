import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';
import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';

export const metadata = {
  title: 'Выезд — Soho Spa',
  description: 'Эротический массаж на выезд по Москве от 10 000 ₽. Мастер приедет к вам домой или в отель.',
};

export default async function Page() {
  const { data: girls } = await fetchPublicGirls('soho-spa').catch(() => ({ data: [], total: 0 }));

  return (
    <SohoShell>
      <section className="hero" style={{ minHeight: '60vh' }}>
        <div
          className="hero-bg"
          style={{ backgroundImage: "url('/tenants/soho-spa/6b807bdb2f190db77a2329f08ff51496.webp')" }}
        />
        <div className="wrap hero-in">
          <div className="kicker">Выезд по Москве</div>
          <h1>Эротический массаж на выезд от 10 000 ₽</h1>
          <p>
            Эротический массаж на выезд может позволить себе каждый мужчина. Мастер приедет к вам домой
            или в отель в удобное время.
          </p>
          <a href="/soho-spa/contacts" className="btn">Заказать выезд</a>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Мастера</div>
            <h2>Массажистки на выезд</h2>
            <p>Наши девушки покорят вас!</p>
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
                    {g.age != null && <span>Возраст <b>{g.age}</b></span>}
                    {g.breast != null && <span>Грудь <b>{g.breast}</b></span>}
                    {g.height != null && <span>Рост <b>{g.height}</b></span>}
                    {g.weight != null && <span>Вес <b>{g.weight}</b></span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Прайс</div>
            <h2>Программы на выезд</h2>
          </div>
          <div className="grid g3">
            <div className="pcard">
              <div className="pname">Выезд · Базовая</div>
              <div className="pdur">60 мин</div>
              <div className="pprice">10 000 <small>₽</small></div>
            </div>
            <div className="pcard">
              <div className="pname">Выезд · Расширенная</div>
              <div className="pdur">90 мин</div>
              <div className="pprice">15 000 <small>₽</small></div>
            </div>
            <div className="pcard">
              <div className="pname">Выезд · VIP</div>
              <div className="pdur">120 мин</div>
              <div className="pprice">22 000 <small>₽</small></div>
            </div>
          </div>
          <p className="lead" style={{ textAlign: 'center', margin: '30px auto 0' }}>
            Не нашли интересующую вас программу? Позвоните — составим индивидуальный сценарий.
          </p>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="sec-head">
            <div className="kicker">Просто</div>
            <h2>Как заказать массаж на выезд?</h2>
          </div>
          <div className="steps">
            <div className="step">
              <span className="n" />
              <div>
                <h3>Позвоните или напишите</h3>
                <p>+7 (912) 076-97-90 — в Telegram или WhatsApp.</p>
              </div>
            </div>
            <div className="step">
              <span className="n" />
              <div>
                <h3>Выберите мастера и программу</h3>
                <p>Администратор подскажет, кто свободен сейчас.</p>
              </div>
            </div>
            <div className="step">
              <span className="n" />
              <div>
                <h3>Назовите адрес и время</h3>
                <p>Москва и ближайшее Подмосковье. Конфиденциальность гарантирована.</p>
              </div>
            </div>
            <div className="step">
              <span className="n" />
              <div>
                <h3>Встречайте мастера</h3>
                <p>Девушка приедет с необходимыми принадлежностями.</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 30 }}>
            <a href="/soho-spa/contacts" className="btn">Заказать выезд</a>
          </div>
        </div>
      </section>
    </SohoShell>
  );
}
