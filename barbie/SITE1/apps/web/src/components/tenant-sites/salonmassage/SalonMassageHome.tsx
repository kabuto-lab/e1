import '@/styles/salonmassage.css';
import { asset } from '@/lib/asset';
import { fetchPublicGirls } from '@/lib/public-girls-api';
import {
  fetchPublicTouchpoints,
  touchpointHref,
  isExternalHref,
} from '@/lib/public-touchpoints-api';
import { SmAgeGate } from './SmAgeGate';
import { SmHeader } from './SmHeader';
import { SmBookingForm } from './SmBookingForm';
import { SmModelCard } from './SmModelCard';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { ShinyCtaFx } from './ShinyCtaFx';

/**
 * SalonMassageHome — реплика главной статического сайта imperiumSpa/salonmassage
 * под стек NAS (1:1 вёрстка из barbie/imperiumSpa/generate-site.py + _style.css,
 * заскоупленного в salonmassage.css под .sm-site).
 *
 * Единственное отличие от статики: ростер девушек тянется из общего пула NAS
 * (раздел «Модели», GET /v1/public/girls?tenant=imperiumspa), а не из локальных
 * selected-models.json. Текст — RU (i18n RU/EN/ZH отложен).
 *
 * Видео-фоны лежат в public/tenants/salonmassage/. Sticky-stacked секции — чисто
 * CSS (position:sticky), без JS-скролл-движка.
 */

const ASSET = asset('/tenants/salonmassage');

const SERVICES = [
  { n: 'Классический массаж', d: 'Расслабляющая программа для снятия напряжения.', price: '5 000', dur: '60' },
  { n: 'SPA-программа', d: 'Комплексный уход: массаж, ароматерапия, забота о теле.', price: '8 000', dur: '90' },
  { n: 'Программа для двоих', d: 'Совместный сеанс в отдельных апартаментах.', price: '12 000', dur: '90' },
  { n: 'VIP-программа', d: 'Индивидуальная программа премиум-уровня.', price: '15 000', dur: '120' },
  { n: 'Тайский массаж', d: 'Традиционные техники глубокой проработки.', price: '6 000', dur: '75' },
  { n: 'Авторская программа', d: 'Сеанс по вашему сценарию.', price: '', dur: '' },
];

const ADVANTAGES = [
  { ic: '✦', t: 'Конфиденциальность', d: 'Полная анонимность каждого визита.' },
  { ic: '⌂', t: 'Уютные апартаменты', d: 'Девять номеров с авторским интерьером.' },
  { ic: '✺', t: 'Профессионализм', d: 'Только опытные сертифицированные мастера.' },
  { ic: '◗', t: 'Круглосуточно', d: 'Принимаем гостей 24 часа, без выходных.' },
];

function SecVid({ name, eager = false }: { name: string; eager?: boolean }) {
  // Все фоновые видео: autoPlay + muted + loop (браузер сам стартует/зацикливает,
  // отдельный lazy-движок не нужен). eager только повышает preload для hero.
  return (
    <video
      className="secv"
      autoPlay
      muted
      loop
      playsInline
      preload={eager ? 'auto' : 'metadata'}
      poster={`${ASSET}/video-${name}.webp`}
    >
      <source src={`${ASSET}/video-${name}.mp4`} type="video/mp4" />
    </video>
  );
}

export async function SalonMassageHome({ slug = 'imperiumspa' }: { slug?: string } = {}) {
  const [{ data: girls }, tp] = await Promise.all([
    fetchPublicGirls('imperiumspa').catch(() => ({ data: [], total: 0 })),
    fetchPublicTouchpoints(slug),
  ]);
  const teaser = girls.slice(0, 8);
  const total = girls.length;

  // Точки касания из деки /admin/projects (tenant_touchpoints).
  const booking = tp.booking;
  const bookingHref = booking?.value ? touchpointHref(booking.value) : '#contacts';
  const footer = tp.footer;
  const footerHref = footer?.value ? touchpointHref(footer.value) : '';

  return (
    <div className="sm-site" id="top">
      <ShinyCtaFx />
      <SmAgeGate />
      <SmHeader />
      <SiteTouchpoints tp={tp} />

      <div className="page">
        {/* hero */}
        <div className="hero">
          <SecVid name="models" eager />
          <div className="hero-in">
            <div className="kicker">Москва · с 2019 года</div>
            <h1>
              Искусство массажа<br />
              <em>для истинных ценителей</em>
            </h1>
            <p>
              Закрытый салон для отдыха и восстановления. Уютные апартаменты,
              профессиональные мастера, безупречная конфиденциальность.
            </p>
            <div className="hero-cta">
              <a
                href={bookingHref}
                className="shiny-cta"
                {...(booking?.value && isExternalHref(bookingHref)
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                <i className="blind" />
                <span>{booking?.label || 'Записаться на сеанс'}</span>
              </a>
              <a href="/imperiumspa/models" className="btn btn-ghost">
                Смотреть анкеты
              </a>
            </div>
          </div>
        </div>

        {/* девушки */}
        <section id="models" className="sec-vid">
          <SecVid name="hero" />
          <div className="wrap center">
            <div className="kicker">Наша команда</div>
            <div className="stitle">Наши девушки</div>
            <p className="lead">{total} анкет с фото и параметрами.</p>
            <div className="mgrid" style={{ marginTop: 48 }}>
              {teaser.map((g) => (
                <SmModelCard key={g.slug} girl={g} />
              ))}
            </div>
            <div style={{ marginTop: 48 }}>
              <a href="/imperiumspa/models" className="shiny-cta">
                <i className="blind" />
                <span>Все {total} анкет</span>
              </a>
            </div>
          </div>
        </section>

        {/* услуги */}
        <section id="services" className="sec-vid">
          <SecVid name="services" />
          <div className="wrap center">
            <div className="kicker">Программы</div>
            <div className="stitle">Наши услуги</div>
            <p className="lead">Каждая программа — продуманный сценарий отдыха.</p>
            <div className="grid g3" style={{ textAlign: 'left' }}>
              {SERVICES.map((s) => (
                <div className="card" key={s.n}>
                  <div className="ic">❖</div>
                  <h3>{s.n}</h3>
                  <p>{s.d}</p>
                  <div className="price">
                    {s.price ? (
                      <>
                        <b>от {s.price} ₽</b>
                        <span>{s.dur} минут</span>
                      </>
                    ) : (
                      <>
                        <b>индивидуально</b>
                        <span>по записи</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* контакты + преимущества */}
        <section id="contacts" className="sec-vid">
          <div className="wrap">
            <div className="adv" id="advantages">
              <div className="grid g4">
                {ADVANTAGES.map((a) => (
                  <div className="item" key={a.t}>
                    <div className="ic">{a.ic}</div>
                    <h3>{a.t}</h3>
                    <p>{a.d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="center" style={{ marginBottom: 54 }}>
              <div className="kicker">Запись</div>
              <div className="stitle">Контакты и бронирование</div>
            </div>
            <div className="contacts-grid">
              <div className="cinfo">
                <div className="row">
                  <div className="ic">☉</div>
                  <div>
                    <div className="k">Адрес</div>
                    <div className="v">Москва, м. Красные Ворота</div>
                  </div>
                </div>
                <div className="row">
                  <div className="ic">☎</div>
                  <div>
                    <div className="k">Телефон</div>
                    <div className="v">+7 (495) 000-00-00</div>
                  </div>
                </div>
                <div className="row">
                  <div className="ic">⏱</div>
                  <div>
                    <div className="k">Часы работы</div>
                    <div className="v">Круглосуточно, без выходных</div>
                  </div>
                </div>
                <div className="row">
                  <div className="ic">✉</div>
                  <div>
                    <div className="k">Сайт</div>
                    <div className="v">salonmassage.ru</div>
                  </div>
                </div>
              </div>
              <SmBookingForm />
            </div>
          </div>
        </section>
      </div>

      {/* footer */}
      <footer className="sm-footer">
        <div className="wrap">
          <div className="fcols">
            <div>
              <div className="logo">SALON<b>&middot;</b>MASSAGE</div>
              <p>Премиальный салон массажа в центре Москвы.</p>
            </div>
            <div>
              <h4>Разделы</h4>
              <ul>
                <li><a href="#services">Услуги</a></li>
                <li><a href="/imperiumspa/models">Анкеты</a></li>
                <li><a href="#contacts">Контакты</a></li>
              </ul>
            </div>
            <div>
              <h4>Контакты</h4>
              <ul>
                <li>+7 (495) 000-00-00</li>
                <li>Москва, Красные Ворота</li>
                {footer?.value && (
                  <li>
                    <a
                      href={footerHref}
                      style={{ color: '#c8a96a' }}
                      {...(isExternalHref(footerHref)
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {footer.label || 'Связаться'}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="fbot">
            <div>
              <span className="age">18+</span>
              Сайт не является публичной офертой.
            </div>
            <div>&copy; 2026 salonmassage.ru</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
