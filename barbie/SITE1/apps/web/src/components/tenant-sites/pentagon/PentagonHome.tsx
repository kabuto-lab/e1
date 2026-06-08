import '@/styles/pentagon.css';
import { fetchPublicGirls, photoUrl } from '@/lib/public-girls-api';
import { SmAgeGate } from '../salonmassage/SmAgeGate';
import { PentagonHero, type HeroItem } from './PentagonHero';
import { PentagonBookingForm } from './PentagonBookingForm';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * PentagonHome — публичная главная тенанта pentagon. Реплика лендинга
 * NON_PROJECT/pentagon-landing.html средствами NAS (CSS заскоуплен в
 * pentagon.css под .pg-site). Ростер девушек — из общего каталога NAS
 * (GET /v1/public/girls?tenant=pentagon). Hero — веерная видео-карусель из
 * моделей, у которых есть видео. Блок «Интерьер» — фото из бэкапа pentagon.ru.
 */

const PHONE = '+7 (912) 076-97-49';

const PROGRAMS = [
  { ic: '❖', t: 'Классический массаж', d: 'Расслабляющая программа для снятия напряжения.', p: '5 000 ₽', m: '60 минут' },
  { ic: '✺', t: 'SPA-программа', d: 'Комплексный уход: массаж, ароматерапия, забота о теле.', p: '8 000 ₽', m: '90 минут' },
  { ic: '❀', t: 'Программа для двоих', d: 'Совместный сеанс в отдельных апартаментах.', p: '12 000 ₽', m: '90 минут' },
  { ic: '✦', t: 'VIP-программа', d: 'Индивидуальная программа премиум-уровня.', p: '15 000 ₽', m: '120 минут' },
  { ic: '◗', t: 'Тайский массаж', d: 'Традиционные техники глубокой проработки.', p: '6 000 ₽', m: '75 минут' },
  { ic: '❖', t: 'Авторская программа', d: 'Сеанс по вашему сценарию.', p: 'индивидуально', m: 'по записи' },
];

// 9 фото интерьера (вытащены из бэкапа pentagon.ru). Мозаичная раскладка.
const INTERIOR = Array.from({ length: 9 }, (_, i) => `/tenants/pentagon/interior/${String(i + 1).padStart(2, '0')}.webp`);
const INT_CLASS = ['int big', 'int', 'int', 'int wide', 'int', 'int', 'int wide', 'int', 'int'];

const posterOf = (videoKey: string) => videoKey.replace(/\.(mp4|webm|mov)$/i, '.webp');

export async function PentagonHome() {
  const { data: girls } = await fetchPublicGirls('pentagon').catch(() => ({ data: [], total: 0 }));
  const total = girls.length;
  const teaser = girls.filter((g) => g.photos.length).slice(0, 8);
  const heroItems: HeroItem[] = girls
    .filter((g) => g.videos.length)
    .slice(0, 7)
    .map((g) => ({ slug: g.slug, name: g.name, video: photoUrl(g.videos[0]), poster: photoUrl(posterOf(g.videos[0])) }));

  return (
    <div className="pg-site" id="top">
      <SiteTouchpoints accent="#dc2626" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" />
      <SmAgeGate />

      {/* header */}
      <header className="pg-header">
        <div className="wrap nav">
          <a href="#top" className="brand">
            <span className="word">PENTAGON</span>
            <span className="sub">spa salon</span>
          </a>
          <nav className="menu">
            <a href="#girls">Девушки</a>
            <a href="#programs">Программы</a>
            <a href="#interior">Интерьер</a>
            <a href="#stag">Мальчишник</a>
            <a href="#outcall">Выезд</a>
            <a href="#contacts" className="muted">Контакты</a>
          </nav>
          <div className="hours">
            <div className="hour"><span className="lbl">пн-чт:</span><span className="val">13:00–07:00</span></div>
            <div className="hour"><span className="lbl">птн-вс:</span><span className="val">24 часа</span></div>
          </div>
          <LangSwitcher accent="#dc2626" />
          <a href={`tel:${PHONE.replace(/[^\d+]/g, '')}`} className="phone">{PHONE}</a>
          <a href="#contacts" className="btn btn-light">Записаться</a>
        </div>
      </header>

      {/* hero */}
      <section className="hero" id="hero">
        <div className="wrap hero-in">
          <div className="hero-copy">
            <span className="spark" style={{ top: '18%', left: '46%' }}>✦</span>
            <span className="spark" style={{ top: '8%', left: '30%', animationDelay: '.6s' }}>✦</span>
            <span className="spark" style={{ top: '64%', left: '20%', animationDelay: '1.2s' }}>✧</span>
            <div className="hero-watermark">PENTAGON<small>SPA SALON</small></div>
            <h1>Спа-салон эротического массажа</h1>
            <p className="lead">Работаем по предварительной записи · Москва, центр</p>
            <div className="hero-cta">
              <a href="#contacts" className="btn btn-light">Записаться</a>
              <a href="#girls" className="btn btn-ghost">Наши девушки</a>
            </div>
          </div>
          {heroItems.length > 0 ? (
            <PentagonHero items={heroItems} />
          ) : (
            <div className="stage"><div className="deck" /></div>
          )}
        </div>
      </section>

      {/* девушки */}
      <section className="sec" id="girls">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Наша команда</span>
            <h2>Девушки</h2>
            <p>Каждая анкета — с фото и параметрами. Деликатный подбор под ваши пожелания.</p>
          </div>
          <div className="girls">
            {teaser.map((g, i) => (
              <a key={g.slug} href="/pentagon/models" className="girl">
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
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <a href="/pentagon/models" className="btn btn-accent">Все {total} анкет</a>
          </div>
        </div>
      </section>

      {/* программы */}
      <section className="sec" id="programs">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Программы</span>
            <h2>Наши услуги</h2>
            <p>Каждая программа — продуманный сценарий отдыха и расслабления.</p>
          </div>
          <div className="progs">
            {PROGRAMS.map((s) => (
              <div className="prog" key={s.t}>
                <div className="ic">{s.ic}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <div className="price"><b>{s.p}</b><span>{s.m}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* интерьер */}
      <section className="sec" id="interior">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Атмосфера</span>
            <h2>Наш интерьер</h2>
            <p>Дизайнерский ремонт, качественные материалы и мебель на заказ — в каждом из залов.</p>
          </div>
          <div className="ints">
            {INTERIOR.map((src, i) => (
              <div className={INT_CLASS[i] ?? 'int'} key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(src)} alt={`Интерьер Pentagon ${i + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* мальчишник */}
      <section className="sec" id="stag">
        <div className="wrap split">
          <div className="vis" />
          <div>
            <span className="kicker">Особый повод</span>
            <h2>Мальчишник</h2>
            <p>Незабываемый вечер для жениха и компании. Отдельный зал, индивидуальный сценарий и полная конфиденциальность.</p>
            <ul>
              <li>Приватный зал на вашу компанию</li>
              <li>Программа по вашему сценарию</li>
              <li>Бар и кальян по запросу</li>
              <li>Трансфер из любой точки города</li>
            </ul>
            <a href="#contacts" className="btn btn-light">Обсудить вечер</a>
          </div>
        </div>
      </section>

      {/* выезд */}
      <section className="sec" id="outcall">
        <div className="wrap split rev">
          <div className="vis" />
          <div>
            <span className="kicker">К вам или в отель</span>
            <h2>Выезд</h2>
            <p>Приедем туда, где удобно вам — домой, в отель или апартаменты. Дискретно и точно в назначенное время.</p>
            <ul>
              <li>Москва и область, 24 часа</li>
              <li>Подача от 40 минут</li>
              <li>Полная анонимность визита</li>
              <li>Оплата удобным способом</li>
            </ul>
            <a href="#contacts" className="btn btn-light">Вызвать мастера</a>
          </div>
        </div>
      </section>

      {/* сертификат */}
      <section className="sec" id="cert">
        <div className="wrap">
          <div className="cert">
            <div>
              <span className="kicker">Подарок</span>
              <h2>Подарочный сертификат</h2>
              <p>Изысканный подарок без лишних слов. Сертификат на любую сумму — получатель сам выберет программу и удобное время.</p>
              <div style={{ marginTop: 28 }}><a href="#contacts" className="btn btn-accent">Оформить сертификат</a></div>
            </div>
            <div className="cert-card">
              <div className="w">PENTAGON</div>
              <div>
                <div className="amount">10 000 ₽</div>
                <div className="small">подарочный сертификат</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* контакты */}
      <section className="sec" id="contacts">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Запись</span>
            <h2>Контакты и бронирование</h2>
            <p>Оставьте заявку — администратор перезвонит и подтвердит время.</p>
          </div>
          <div className="contacts">
            <div>
              <div className="crow"><div className="ic">☎</div><div><div className="k">Телефон</div><div className="v">{PHONE}</div></div></div>
              <div className="crow"><div className="ic">☉</div><div><div className="k">Адрес</div><div className="v">Москва, центр</div></div></div>
              <div className="crow"><div className="ic">⏱</div><div><div className="k">Часы работы</div><div className="v">пн-чт 13:00–07:00 · птн-вс круглосуточно</div></div></div>
              <div className="crow"><div className="ic">✆</div><div><div className="k">WhatsApp / Telegram</div><div className="v">по номеру телефона</div></div></div>
              <div className="map" style={{ marginTop: 26 }} />
            </div>
            <PentagonBookingForm />
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="pg-footer">
        <div className="wrap">
          <div className="fcols">
            <div>
              <div className="word">PENTAGON</div>
              <div className="sub">spa salon</div>
              <p>Спа-салон эротического массажа. Работаем по предварительной записи.</p>
            </div>
            <div>
              <h4>Разделы</h4>
              <ul>
                <li><a href="#girls">Девушки</a></li>
                <li><a href="#programs">Программы</a></li>
                <li><a href="#interior">Интерьер</a></li>
                <li><a href="#stag">Мальчишник</a></li>
                <li><a href="#outcall">Выезд</a></li>
              </ul>
            </div>
            <div>
              <h4>Контакты</h4>
              <ul>
                <li>{PHONE}</li>
                <li>Москва, центр</li>
                <li>Круглосуточно (птн-вс)</li>
              </ul>
            </div>
            <div>
              <h4>Время работы</h4>
              <ul>
                <li>пн-чт: 13:00–07:00</li>
                <li>птн-вс: 24 часа</li>
              </ul>
            </div>
          </div>
          <div className="fbot">
            <div><span className="age">18+</span>Сайт не является публичной офертой.</div>
            <div>© 2026 PENTAGON spa salon</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
