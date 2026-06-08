'use client';

import '@/styles/roxy.css';
import { useEffect, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * RoxyHome — bespoke-реплика главной тенанта ROXY (Men's Relax Club).
 * 1:1 с прототипом `barbie/roxy/index.html`, но ростер (hero-стрип + «Наши
 * мастера») тянется из общего NAS-каталога моделей (Class-G), а не из заглушек.
 * Статичные блоки (преимущества/программы/акция/о нас/контакты) — копия
 * прототипа; позже выносятся в NAS-управляемый контент.
 */

const CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4l3 2" />
  </svg>
);

const ADVANTAGES = [
  { icon: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 8h6M9 12h6M9 16h4" /></>, h: 'Большой выбор программ', p: 'В нашем салоне представлено более 20 программ на любой вкус.' },
  { icon: <><path d="M12 3c1.5 2 1 4-0.5 5.5C10 10 9 12 11 14" /><path d="M5 21h14M7 21v-3a5 5 0 0 1 10 0v3" /></>, h: 'Уютная атмосфера', p: 'ТРИ VIP-комнаты с джакузи и ВОСЕМЬ комнат с душевыми кабинками. В каждой комнате кондиционер.' },
  { icon: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M8 12v4M16 12v4" /></>, h: 'Великолепные девушки', p: 'Профессиональные мастера релакса с волшебными руками. У ROXY 20 девушек в смену.' },
  { icon: <><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, h: 'Полная конфиденциальность', p: 'Фото- и видеосъёмка в салоне запрещена. Гости не пересекаются внутри салона.' },
  { icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, h: '24/7', p: 'Мы работаем круглосуточно, без праздников и выходных. Всё для вас, мужчины!' },
  { icon: <><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>, h: 'Домашний уют', p: 'Махровые полотенца, одноразовое чистое бельё, гели для душа и тапочки. Мы всё продумали.' },
];

const PROGRAMS = [
  { ph: 'linear-gradient(135deg,#3a2e34,#171318)', name: 'НАЧАЛО', price: '₽ 5 000', dur: '60 мин', desc: 'Доводящая до предела всех мыслимых и немыслимых ощущений программа позволит вам прикоснуться к вершине полной релаксации.' },
  { ph: 'linear-gradient(135deg,#2e3640,#14181d)', name: 'MIX', price: '₽ 4 500', dur: '30 мин', desc: 'Почувствуй сквозь пелену мягкой ароматной пены нежные прикосновения тела обнажённого ангела.' },
  { ph: 'linear-gradient(135deg,#3a3038,#16121a)', name: 'MIX+', price: '₽ 5 500', dur: '60 мин', desc: 'Растворитесь в удовольствии вместе с прекрасной девушкой.' },
];

const GAL_TONES = ['#7a2f2f', '#9b2f6b', '#7a2f6b', '#aa2f8a', '#5a2f7a', '#9b2f4f', '#6b2f8a', '#aa3f9a', '#7a3f6b', '#8a2f5a', '#aa2f7a', '#6b2f5a'];

function fallbackTone(i: number): string {
  const hue = (i * 53) % 360;
  return `linear-gradient(160deg,hsl(${hue},22%,42%),hsl(${hue},18%,16%))`;
}

interface RoxyHomeProps {
  girls: PublicGirl[];
  phone?: string;
  phoneHref?: string;
  address?: string;
}

export function RoxyHome({ girls, phone = '8 (499) 757-2501', phoneHref = 'tel:+74997572501', address = 'Москва, Каланчевская 32/58' }: RoxyHomeProps) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // hero-стрип: до 10 моделей с центральной «R»-плашкой в середине
  const strip = girls.slice(0, 10);
  const stripMid = Math.floor(strip.length / 2);
  // мастера: до 12
  const masters = girls.slice(0, 12);

  return (
    <div className="roxy-site" id="top">
      <SiteTouchpoints accent="#38bdf8" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@500;600&display=swap"
      />

      {/* HEADER */}
      <header className={solid ? 'rx-header solid' : 'rx-header'}>
        <div className="nav-left">
          <div className="burger" onClick={() => setOpen(true)}>
            <span className="lines"><i /><i /><i /></span>
            <span>МЕНЮ</span>
          </div>
          <LangSwitcher accent="#38bdf8" />
        </div>
        <a href="#top" className="logo">
          <div className="mark gold-text">ROXY</div>
          <div className="sub">MEN&apos;S RELAX CLUB</div>
        </a>
        <div className="nav-right">
          <a className="phone" href={phoneHref}>{phone}</a>
          <a className="contacts-link" href="#contacts">КОНТАКТЫ</a>
          <svg className="pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <h1>Салон эротического массажа</h1>
          <div className="lead">Эротический массаж в Москве</div>
          <div className="badge">Самые ТОПОВЫЕ девочки!</div>
          <div><a href="#contacts" className="btn-outline">Записаться</a></div>
        </div>
        <div className="strip">
          {strip.map((g, i) => (
            <span key={`s-${i}`} style={{ display: 'contents' }}>
              {i === stripMid && (
                <div className="cell center"><div className="r">R</div></div>
              )}
              <div
                className="cell"
                style={g.photos[0] ? { backgroundImage: `url(${photoUrl(g.photos[0])})` } : { background: fallbackTone(i) }}
              >
                <span>{g.name}</span>
              </div>
            </span>
          ))}
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="rose-bg" id="advantages">
        <div className="wrap">
          <h2 className="sec-title">Наши преимущества</h2>
          <p className="sec-sub">Мы работаем для Вас, предоставляя обслуживание на высшем уровне</p>
          <p className="sec-sub" style={{ marginTop: 8, fontSize: 14 }}>
            Салон не оказывает услуг интимного характера. Посещая наш салон, вы соглашаетесь с правилами заведения.
          </p>
          <div className="adv-grid">
            {ADVANTAGES.map((a, i) => (
              <div className="adv" key={i}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>{a.icon}</svg>
                <h3>{a.h}</h3>
                <div className="bar" />
                <p>{a.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="rose-bg" id="programs" style={{ background: 'var(--bg-2)' }}>
        <div className="wrap">
          <h2 className="sec-title">Программы</h2>
          <div className="prog-grid">
            {PROGRAMS.map((p, i) => (
              <div className="prog" key={i}>
                <div className="ph" style={{ background: p.ph }} />
                <div className="body">
                  <div className="name">{p.name}</div>
                  <div className="meta">
                    <span>{p.price}</span>
                    <span>{CLOCK} {p.dur}</span>
                  </div>
                  <p className="desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="center-btn"><a href="#contacts" className="btn-outline">Все программы</a></div>
        </div>
      </section>

      {/* PROMO */}
      <section className="promo" id="promo">
        <div className="box">
          <div className="tag">Акция</div>
          <h2>ДНЕМ С ОГНЕМ!</h2>
          <p>Приятный бонус любителям отдохнуть по будням!</p>
        </div>
      </section>

      {/* GALLERY */}
      <section className="rose-bg" id="interiors">
        <div className="wrap">
          <h2 className="sec-title">Интерьеры</h2>
          <div className="gal-grid">
            {GAL_TONES.map((c, i) => (
              <div key={i} className="cell" style={{ background: `linear-gradient(135deg,${c},#1a1320)` }} />
            ))}
          </div>
          <div className="center-btn"><a href="#contacts" className="btn-outline">Все фото</a></div>
        </div>
      </section>

      {/* MASTERS */}
      <section className="rose-bg" id="masters" style={{ background: 'var(--bg-2)' }}>
        <div className="wrap">
          <h2 className="sec-title">Наши мастера</h2>
          <div className="mast-grid">
            {masters.map((g, i) => (
              <a className="mast" key={i} href="/roxy-spa/models">
                <div
                  className="img"
                  style={g.photos[0] ? { backgroundImage: `url(${photoUrl(g.photos[0])})` } : { background: fallbackTone(i) }}
                />
                <div className="name">{g.name}</div>
              </a>
            ))}
          </div>
          <div className="center-btn"><a href="/roxy-spa/models" className="btn-outline">Все девушки</a></div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="rose-bg" id="about">
        <div className="wrap">
          <div className="about">
            <h2>Топовые девушки ждут вас в салоне ROXY</h2>
            <p>Салон не оказывает услуг интимного характера. Не пытайтесь договориться. Посещая наш салон, вы соглашаетесь с правилами нашего заведения.</p>
            <p>Эротический массаж — достойная альтернатива, позволяющая получить неземное наслаждение от ласковых рук и умелых движений профессиональной массажистки. Вам гарантирован полный релакс и масса чувственных удовольствий.</p>
            <div style={{ marginTop: 8 }}><a href="#contacts" className="btn-outline">Подробнее</a></div>
          </div>
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" style={{ padding: 0 }}>
        <div className="contacts">
          <div className="info">
            <h2>НАШИ КОНТАКТЫ</h2>
            <a className="c-phone" href={phoneHref}>{phone}</a>
            <div className="addr">📍 {address}</div>
            <div className="metro">
              <span className="m"><span className="dot" style={{ background: '#f97300' }} /> Проспект Мира</span>
              <span className="m"><span className="dot" style={{ background: '#e2231a' }} /> Комсомольская</span>
              <span className="m"><span className="dot" style={{ background: '#a02080' }} /> Красные ворота</span>
            </div>
          </div>
          <div className="map">
            <div className="pin-big">📍</div>
            <small>карта (плейсхолдер · Yandex/Google Maps)</small>
          </div>
        </div>
      </section>

      <footer className="rx-footer">
        <div className="gold-text">ROXY</div>
        <div style={{ marginTop: 8 }}>© ROXY Men&apos;s Relax Club · {new Date().getFullYear()}</div>
      </footer>


      {/* DRAWER */}
      <div className={open ? 'scrim open' : 'scrim'} onClick={() => setOpen(false)} />
      <nav className={open ? 'drawer open' : 'drawer'}>
        <div className="close" onClick={() => setOpen(false)}>&times;</div>
        <a href="#masters" onClick={() => setOpen(false)}>Наши мастера</a>
        <a href="#programs" onClick={() => setOpen(false)}>Программы</a>
        <a href="#interiors" onClick={() => setOpen(false)}>Интерьеры</a>
        <a href="/roxy-spa/vyezd" onClick={() => setOpen(false)}>Выезд на дом</a>
        <a href="#promo" onClick={() => setOpen(false)}>Акции</a>
        <a href="#contacts" onClick={() => setOpen(false)}>Контакты</a>
        <a href="/roxy-spa/vacancies" onClick={() => setOpen(false)}>Работа</a>
        <a href="/roxy-spa/malchishnik" onClick={() => setOpen(false)}>Мальчишник</a>
        <div className="book"><a href="#contacts" onClick={() => setOpen(false)}>Записаться</a></div>
      </nav>
    </div>
  );
}
