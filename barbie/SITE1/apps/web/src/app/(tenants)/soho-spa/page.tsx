import { asset } from '@/lib/asset';
import { SohoShell } from '@/components/tenant-sites/soho/SohoShell';
import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';

export const metadata = {
  title: 'Главная — Soho Spa',
  description: 'Салон эротического массажа в Москве: 7 комнат, джакузи, профессиональные мастера, индивидуальный подход и полная конфиденциальность.',
};

export default async function Page() {
  const { data: girls } = await fetchPublicGirls('soho-spa').catch(() => ({ data: [], total: 0 }));

  const PROGRAMS = [
    { n: 'Экспресс Люкс', dur: '30 мин', price: '4 500' },
    { n: 'Базовая', dur: '60 мин', price: '5 000' },
    { n: 'Повелитель', dur: '60 мин', price: '5 500' },
    { n: 'Соблазн', dur: '60 мин', price: '7 000' },
    { n: 'For women', dur: '60 мин', price: '9 000' },
    { n: 'Расширенная', dur: '90 мин', price: '13 000' },
    { n: 'Подружки Lux', dur: '120 мин', price: '45 000' },
    { n: 'VIP', dur: '90 мин', price: '17 000' },
  ];

  return (
    <SohoShell>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url('${asset('/tenants/soho-spa/glavnaya-1-863x1024.webp')}')` }} />
        <div className="wrap hero-in">
          <div className="kicker">Салон эротического массажа · Москва</div>
          <h1>Окунитесь в незабываемое наслаждение</h1>
          <p>7 просторных комнат с эксклюзивным интерьером, джакузи и профессиональные мастера. Индивидуальный подход и полная конфиденциальность.</p>
          <a href="/soho-spa/price" className="btn">Выбрать программу</a>
          <a href="/soho-spa/girls" className="btn btn-ghost" style={{ marginLeft: '10px' }}>Наши девушки</a>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head"><div className="kicker">Преимущества</div><h2>Почему у нас лучше</h2></div>
          <div className="grid g6">
            <div className="feat"><img src={asset("/tenants/soho-spa/jacuzzi.webp")} alt="Джакузи" /><h3>Джакузи</h3><p>в каждой комнате</p></div>
            <div className="feat"><img src={asset("/tenants/soho-spa/interier.webp")} alt="Интерьер" /><h3>7 комнат</h3><p>эксклюзивный интерьер</p></div>
            <div className="feat"><img src={asset("/tenants/soho-spa/persent.webp")} alt="Скидки" /><h3>Скидки</h3><p>система лояльности</p></div>
            <div className="feat"><img src={asset("/tenants/soho-spa/massage.webp")} alt="Массаж" /><h3>Спорт-массаж</h3><p>профессионально</p></div>
            <div className="feat"><img src={asset("/tenants/soho-spa/location.webp")} alt="Локация" /><h3>Локация</h3><p>удобное метро</p></div>
            <div className="feat"><img src={asset("/tenants/soho-spa/incognito.webp")} alt="Конфиденциальность" /><h3>Инкогнито</h3><p>конфиденциальность</p></div>
          </div>
        </div>
      </section>

      {/* GIRLS */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><div className="kicker">Мастера</div><h2>Наши девушки</h2></div>
          <div className="grid g3">
            {girls.slice(0, 6).map((g) => (
              <div className="girl" key={g.slug}>
                <img src={photoUrl(g.photos[0])} alt={g.name} loading="lazy" referrerPolicy="no-referrer" />
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
          <div style={{ textAlign: 'center', marginTop: '36px' }}><a href="/soho-spa/girls" className="btn btn-ghost">Смотреть ещё</a></div>
        </div>
      </section>

      {/* QUIZ CTA */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="split">
            <img src={asset("/tenants/soho-spa/poczelui.webp")} alt="Подбор мастера" />
            <div>
              <div className="kicker">Подбор</div>
              <h2 style={{ fontSize: '34px', textTransform: 'uppercase' }}>Не определились с выбором?</h2>
              <p>Отправьте заявку на подбор мастера и получите <b className="accent">+30 минут</b> на массаж в подарок! Учтём предпочтения по цвету волос, росту, телосложению и возрасту.</p>
              <div style={{ marginTop: '14px' }}>
                <span className="chip">Блондинка</span><span className="chip">Брюнетка</span><span className="chip">Рыжая</span><span className="chip">Русая</span>
              </div>
              <a href="/soho-spa/contacts" className="btn" style={{ marginTop: '22px' }}>Подобрать мастера</a>
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><div className="kicker">Прайс</div><h2>Программы</h2></div>
          <div className="grid g4">
            {PROGRAMS.map((p2) => (
              <div className="pcard" key={p2.n}>
                <div className="pname">{p2.n}</div>
                <div className="pdur">{p2.dur}</div>
                <div className="pprice">{p2.price} <small>₽</small></div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}><a href="/soho-spa/price" className="btn btn-ghost">Смотреть ещё</a></div>
        </div>
      </section>

      {/* SEO */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><div className="kicker">О салоне</div><h2>Эротический массаж в Soho Spa</h2></div>
          <div className="seo" style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
            <p>Эротический массаж — настоящее искусство, способное изменить ваше привычное представление о досуге. И если вы давно мечтали полноценно раскрепоститься, наши девушки вас не разочаруют. Позвольте себе отдых, о котором давно мечтали!</p>
            <p>Отдыхать в стенах Soho Spa — это очень приятно. Мы предлагаем нашим гостям самые лучшие условия и практикуем индивидуальный подход.</p>
          </div>
        </div>
      </section>

      {/* INTERIOR */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><div className="kicker">Атмосфера</div><h2>Интерьер</h2></div>
          <div className="grid g4 gal">
            <a href="/soho-spa/interier"><img src={asset("/tenants/soho-spa/IMG_7848-512x512.webp")} alt="Интерьер" /></a>
            <a href="/soho-spa/interier"><img src={asset("/tenants/soho-spa/IMG_7831-512x512.webp")} alt="Интерьер" /></a>
            <a href="/soho-spa/interier"><img src={asset("/tenants/soho-spa/IMG_7856-512x512.webp")} alt="Интерьер" /></a>
            <a href="/soho-spa/interier"><img src={asset("/tenants/soho-spa/IMG_7816-512x512.webp")} alt="Интерьер" /></a>
          </div>
          <div style={{ textAlign: 'center', marginTop: '36px' }}><a href="/soho-spa/interier" className="btn btn-ghost">Все интерьеры</a></div>
        </div>
      </section>

      {/* CONTACTS STRIP */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><div className="kicker">Где нас найти</div><h2>Контакты</h2></div>
          <div className="badges" style={{ fontSize: '18px' }}>
            <span>📍 <b>Москва</b>, пер. Малый Харитоньевский, 9/13с5</span>
            <span>🚇 <b>Чистые пруды</b> · Красные Ворота</span>
            <span>📞 <b>+7 (912) 076-97-90</b></span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px' }}><a href="/soho-spa/contacts" className="btn">Как добраться</a></div>
        </div>
      </section>
    </SohoShell>
  );
}
