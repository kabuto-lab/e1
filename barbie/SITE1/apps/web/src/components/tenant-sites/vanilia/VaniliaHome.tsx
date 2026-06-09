'use client';

import '@/styles/vanilia.css';
import { asset } from '@/lib/asset';
import { useEffect, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';
import { RevealLines } from './RevealLines';
import { GlassReveal } from './GlassReveal';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * VaniliaHome — bespoke-реплика статического прототипа VANILIA
 * (barbie/vanilia/index.html), рендерит публичную главную тенанта 5massage.
 * Ростер девушек тянется из общего NAS-каталога (GET /v1/public/girls?tenant=5massage);
 * телефон/адрес — из данных тенанта, иначе дефолты прототипа. Тема dark/light —
 * локальный тумблер на корневой обёртке.
 */

// Медиа выкачано с сайта-донора 5massage.ru в локальную статику
// apps/web/public/tenant/5massage/ — больше не хотлинкаем чужой сайт.
const IMG = {
  hero: asset('/tenant/5massage/shabl.webp'),
  promoFortune: asset('/tenant/5massage/3d.webp'),
  promoTelegram: asset('/tenant/5massage/3d1.webp'),
  promoLoyalty: asset('/tenant/5massage/3d-1.webp'),
  promoNew: asset('/tenant/5massage/image-1910.webp'),
  ctaPick: asset('/tenant/5massage/image-1910.webp'),
  gallery1: asset('/tenant/5massage/1-1024x683-1.webp'),
  gallery2: asset('/tenant/5massage/2-1024x683-1.webp'),
  heartLeft: asset('/tenant/5massage/heart-left.webp'),
  heartRight: asset('/tenant/5massage/heart-right.webp'),
};

const NAV = [
  { href: '#girls', label: 'Девушки' },
  { href: '#programs', label: 'Услуги' },
  { href: '#why', label: 'Выезд' },
  { href: '#cert', label: 'Сертификат' },
  { href: '#contacts', label: 'Контакты' },
];

// Программы и фото — с сайта-донора 5massage.ru (services.html). Фото —
// донорские ассеты, сконвертированы в webp (/tenants/5massage/*).
const PROGRAMS = [
  {
    nm: 'Шёлковое прикосновение',
    price: '5 000₽',
    dur: '60 мин',
    desc: 'Глубокий расслабляющий массаж всего тела с мягким погружением в чувственную атмосферу. Тепло камней, аромат цитрусов и проработка.',
    ph: '/tenants/5massage/dsc_0651-684x1024.webp',
  },
  {
    nm: 'Мягкое желание',
    price: '5 000₽',
    dur: '30 мин',
    desc: 'Идеальный первый шаг в мир эротического массажа. Коротко, ясно и чувственно — с акцентом на телесный контакт и удовольствие.',
    ph: '/tenants/5massage/2025-07-14-09.29.52-682x1024.webp',
  },
  {
    nm: 'Аква-Гармония',
    price: '6 000₽',
    dur: '60 мин',
    desc: 'Баланс телесного расслабления и эротического наслаждения. Глубокая проработка мышц плавно переходит в чувственные техники.',
    ph: '/tenants/5massage/photo_2026-01-20_19-05-06-682x1024.webp',
  },
  {
    nm: 'Мой господин',
    price: '8 000₽',
    dur: '60 мин',
    desc: 'Программа для тех, кто любит контроль, подчинение и игру ролей. Атмосфера власти и полного доверия.',
    ph: '/tenants/5massage/img_4666-676x1024.webp',
  },
  {
    nm: 'Клубничное искушение',
    price: '9 000₽',
    dur: '60 / 90 мин',
    desc: 'Сладкая программа с акцентом на удовольствие. 60 минут — 9 000₽, 90 минут — 13 000₽.',
    ph: '/tenants/5massage/iskushenie.webp',
  },
  {
    nm: 'Между нами',
    price: '10 000₽',
    dur: '60 мин',
    desc: 'Мягкая и комфортная программа для первого знакомства с форматом «для двоих». Акцент на расслабление и телесную гармонию.',
    ph: '/tenants/5massage/vanilia-love-14.webp',
  },
];

const TgIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.8 16.3l-.4 4c.5 0 .8-.2 1.1-.5l2.5-2.4 5.2 3.8c1 .5 1.6.3 1.9-.9L23 4.4c.3-1.4-.5-2-1.4-1.6L2 10.4c-1.4.5-1.3 1.3-.2 1.6l5 1.6L18.5 6c.5-.4 1-.2.6.2z" />
  </svg>
);
const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20z" />
  </svg>
);

interface VaniliaHomeProps {
  girls: PublicGirl[];
  phone?: string;
  phoneHref?: string;
  address?: string;
}

export function VaniliaHome({
  girls,
  phone = '+7 912 076-72-23',
  phoneHref = 'tel:+79120767223',
  address = 'Москва, Лучников переулок, 7/4с5',
}: VaniliaHomeProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [menuOpen, setMenuOpen] = useState(false);

  // Десктоп: при скролле вниз показываем фиксированный кластер (бургер+логотип)
  // в левом-верхнем углу экрана — он въезжает, логотип с лёгкой задержкой (CSS),
  // и стоит статично поверх контента. position:fixed не зависит от sticky/overflow.
  // На мобиле (<1025) эффекта нет.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const THRESH = 80;
    const onScroll = () => {
      setScrolled(window.innerWidth >= 1025 && window.scrollY > THRESH);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Hero виден сразу (above-the-fold) — запускаем волну на маунте.
  // Двойной rAF: первый кадр гарантированно рисует скрытое состояние, второй
  // навешивает .in — так transition проигрывается в любом браузере.
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setHeroIn(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);

  // Разбивает строку на буквы (слова — inline-block, чтобы не рвались при
  // переносе). Каждая буква получает свою transition-delay через счётчик блока,
  // так что весь блок «печатается» сквозной волной. Фабрика — чтобы у каждого
  // блока был свой счётчик (иначе задержки накапливались бы между блоками).
  const STAGGER = 0.025; // 25мс между буквами
  const makeSplit = () => {
    const c = { i: 0 };
    return (text: string) =>
      text.split(' ').flatMap((word, wi, arr) => {
        const w = (
          <span className="rw" key={`w${wi}`}>
            {Array.from(word).map((ch, ci) => (
              <span
                className="ltr"
                style={{ transitionDelay: `${(c.i++ * STAGGER).toFixed(3)}s` }}
                key={ci}
              >
                {ch}
              </span>
            ))}
          </span>
        );
        return wi < arr.length - 1 ? [w, ' '] : [w];
      });
  };
  const splitHero = makeSplit();

  // Лёгкий 3D-tilt карточки-сертификата: наклон следует за курсором.
  // Меняем transform напрямую на узле (без state) — без лишних ре-рендеров.
  const TILT_MAX = 12; // макс. угол наклона, deg (+30% к прежним 9)
  const tiltCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateX(${(-py * 2 * TILT_MAX).toFixed(2)}deg) rotateY(${(px * 2 * TILT_MAX).toFixed(2)}deg)`;
  };
  const resetTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
  };

  const shown = girls.slice(0, 8);

  return (
    <div className="vanilia-site" data-theme={theme} id="top">
      <SiteTouchpoints accent="#caa15a" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Great+Vibes&display=swap"
      />

      {/* HEADER */}
      <header className={scrolled ? 'is-scrolled' : undefined}>
        <div className="wrap hdr">
          <a href="#top" className="logo">
            Vanilia
            <small>SPA SALON</small>
          </a>
          <button className="burger" aria-label="Меню" onClick={() => setMenuOpen(true)}>
            <i />
            <i />
            <i />
          </button>
          <nav className="main">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hdr-right">
            <button
              className="round-btn"
              title="Тема"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? (
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              ) : (
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                </svg>
              )}
            </button>
            <LangSwitcher accent="#caa15a" />
            <a href="#contacts" title="Telegram">
              <span className="ico" style={{ display: 'inline-block' }}>
                <TgIcon />
              </span>
            </a>
            <a href="#contacts" title="WhatsApp">
              <span className="ico" style={{ display: 'inline-block' }}>
                <WaIcon />
              </span>
            </a>
            <a className="phone" href={phoneHref}>
              {phone}
            </a>
          </div>
        </div>
      </header>

      {/* Угловой кластер при скролле (desktop): фиксирован в левом-верхнем углу,
          въезжает; логотип с задержкой (CSS). Бургер открывает то же меню. */}
      <div className={scrolled ? 'corner-pin show' : 'corner-pin'} aria-hidden={!scrolled}>
        <button className="burger" aria-label="Меню" onClick={() => setMenuOpen(true)}>
          <i />
          <i />
          <i />
        </button>
        <a href="#top" className="logo">
          Vanilia
          <small>SPA SALON</small>
        </a>
      </div>

      {/* HERO — фоновое видео во весь экран + текстура-оверлей, текст поверх */}
      <section className="hero">
        <div className="hero-stage">
          <video
            className="hero-video"
            src={asset('/tenant/5massage/posledovatelnost-01_1.mp4')}
            poster={asset('/tenant/5massage/2025-03-19_09-56-22.webp')}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="hero-overlay" />
          <div className={`hero-cap txt-reveal${heroIn ? ' in' : ''}`}>
            <h1>{splitHero('Салон эротического массажа')}</h1>
            <p>Работаем по предварительной записи</p>
            <a href={phoneHref} className="btn">
              Записаться
            </a>
          </div>
        </div>
      </section>

      {/* ОТКРОВЕННЫЙ ПОКАЗ */}
      <section>
        <div className="wrap split">
          <div className="imgs glass">
            {/* Запотевшее стекло витрины: фото за матовым стеклом, курсор/палец
                «протирает» чистый круг. Только чистые фото без водяного знака. */}
            <GlassReveal girls={girls} intervalMs={4200} />
          </div>
          <div>
            <span className="pill-badge">Видно будет всё, но только не вас!</span>
            <RevealLines as="h2">Откровенный показ девушек за стеклом</RevealLines>
            <div className="sub">Сохраняем анонимность каждого гостя!</div>
            <a href={phoneHref} className="btn">
              Записаться
            </a>
          </div>
        </div>
        <div className="wrap">
          <div className="stats">
            <div className="stat">
              <div className="circ">
                <b>18+</b>
              </div>
              <span>Только для совершеннолетних</span>
            </div>
            <div className="stat">
              <div className="circ">
                <b>20</b>
              </div>
              <span>20 девочек каждый день</span>
            </div>
            <div className="stat">
              <div className="circ">
                <b>24</b>
              </div>
              <span>24 часа в сутки без выходных</span>
            </div>
            <div className="stat">
              <div className="circ">
                <b>✓</b>
              </div>
              <span>Работаем по предварительной записи</span>
            </div>
          </div>
        </div>
      </section>

      {/* НАШИ ДЕВУШКИ */}
      <section id="girls">
        <div className="wrap">
          <div className="panel-sec">
            <RevealLines as="h2" className="center">
              Наши девушки <span style={{ color: 'var(--accent)' }}>({girls.length})</span>
            </RevealLines>
            <div className="girls">
              {shown.map((g, i) => (
                <div className="girl" key={g.slug}>
                  <div className="ph">
                    {g.photos[0] ? (
                      <img referrerPolicy="no-referrer" src={photoUrl(g.photos[0])} alt={g.name} />
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: `linear-gradient(160deg,hsl(${(i * 47) % 360},30%,38%),#1a1020)`,
                        }}
                      />
                    )}
                  </div>
                  <div className="dots">
                    <i className="on" />
                    <i />
                    <i />
                  </div>
                  <div className="nm">
                    {g.name}
                    {g.age ? ` ${g.age}` : ''}
                  </div>
                  <div className="params">
                    {g.breast != null && (
                      <span>
                        Грудь{' '}
                        <b>
                          {g.breast}
                          {g.silicon ? <span className="sil"> silicon</span> : ''}
                        </b>
                      </span>
                    )}
                    {g.weight != null && (
                      <span>
                        Вес <b>{g.weight}</b>
                      </span>
                    )}
                    {g.height != null && (
                      <span>
                        Рост <b>{g.height}</b>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <a href={asset("/5massage/models")} className="btn">
                Смотреть всех девушек
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PROMO */}
      <section>
        <div className="wrap promo">
          <div className="card">
            <div className="txt">
              <RevealLines as="h3">
                Колесо фортуны.
                <br />
                Беспроигрышная лотерея
              </RevealLines>
              <p>Получай подарки при каждом посещении!</p>
              <a href="#contacts" className="btn btn-ghost btn-sm">
                Подробнее
              </a>
            </div>
            <div className="pic" style={{ backgroundImage: `url("${IMG.promoFortune}")` }} />
          </div>
          <div className="card hl">
            <div className="txt">
              <RevealLines as="h3">Доступ в закрытый телеграм канал с секретными видео</RevealLines>
              <p>Хотите увидеть конфиденциальные фото и видео новых девочек?</p>
              <a href="#contacts" className="btn btn-sm">
                Подробнее
              </a>
            </div>
            <div className="pic" style={{ backgroundImage: `url("${IMG.promoTelegram}")` }} />
          </div>
          <div className="card">
            <div className="txt">
              <RevealLines as="h3">Установите карту лояльности и копите баллы!</RevealLines>
              <a href="#contacts" className="btn btn-ghost btn-sm">
                Подробнее
              </a>
            </div>
            <div className="pic" style={{ backgroundImage: `url("${IMG.promoLoyalty}")` }} />
          </div>
          <div className="card">
            <div className="txt">
              <RevealLines as="h3">+5 новых девочек каждый день</RevealLines>
              <p>Находим для вас с любовью!</p>
              <a href="#girls" className="btn btn-ghost btn-sm">
                Подробнее
              </a>
            </div>
            <div className="pic" style={{ backgroundImage: `url("${IMG.promoNew}")` }} />
          </div>
        </div>
      </section>

      {/* НЕ ОПРЕДЕЛИЛИСЬ */}
      <section>
        <div className="wrap cta-pick">
          <div className="pic" style={{ backgroundImage: `url("${IMG.ctaPick}")` }} />
          <div>
            <RevealLines as="h2">Не определились с выбором?</RevealLines>
            <p>Отправьте заявку на подбор мастера и получите +30 минут на массаж в подарок!</p>
            <a href={phoneHref} className="btn">
              Подобрать
            </a>
          </div>
        </div>
      </section>

      {/* ПОПУЛЯРНЫЕ ПРОГРАММЫ */}
      <section id="programs">
        <div className="wrap">
          <div className="panel-sec">
            <div className="sec-head">
              <RevealLines as="h2">Популярные программы</RevealLines>
              <div className="counter">
                1 / {PROGRAMS.length}
                <button className="round-btn">←</button>
                <button className="round-btn">→</button>
              </div>
            </div>
            <div className="prog-grid">
              {PROGRAMS.map((p) => (
                <div className="prog" key={p.nm}>
                  <div className="ph">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset(p.ph)} alt={p.nm} loading="lazy" />
                  </div>
                  <div className="nm">{p.nm}</div>
                  <div className="price">
                    {p.price} <span>{p.dur}</span>
                  </div>
                  <div className="desc">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ПОЧЕМУ VANILIA */}
      <section id="why">
        <div className="wrap">
          <div className="why">
            <RevealLines as="h2">Почему стоит выбрать салон эротического массажа Vanilia?</RevealLines>
            <div>
              <p>Наш салон эротического массажа — нечто большее, чем обычное место для отдыха.</p>
              <p>
                У нас работает более 50 великолепных мастеров релакса, которые на профессиональном уровне
                владеют техниками, представленными в заведении. Все анкеты реальны.
              </p>
              <p>
                Конечно, вы не будете огорчены и услугами, у нас их уйма! Есть программы на любой вкус — от
                классических до самых смелых.
              </p>
            </div>
            <div>
              <p>Наслаждаться ими вы будете в комфортных апартаментах с просторной кроватью и ванной!</p>
              <p>
                Хотите побывать в одном из самых топовых мест столицы? Тогда наш салон эротического массажа вас
                точно не разочарует!
              </p>
            </div>
          </div>
          <div className="why gallery" style={{ display: 'grid' }}>
            <span className="nav-arrow l">←</span>
            <div className="ph" style={{ backgroundImage: `url("${IMG.gallery1}")` }} />
            <div className="ph" style={{ backgroundImage: `url("${IMG.gallery2}")` }} />
            <span className="nav-arrow r">→</span>
          </div>
        </div>
      </section>

      {/* СЕРТИФИКАТЫ */}
      <section id="cert">
        <div className="wrap">
          <div className="cert">
            <div className="ccard-orbit">
              <div className="ccard" onMouseMove={tiltCard} onMouseLeave={resetTilt}>
                <div className="script">Vanilia</div>
                <div className="num">
                  Подарочный
                  <br />
                  сертификат
                  <br />
                  #00001
                </div>
              </div>
            </div>
            <img
              className="heart"
              src={photoUrl('/tenant/vanilia-cert-heart.webp')}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="ctxt">
              <RevealLines as="h2">Подарочные сертификаты в нашем салоне</RevealLines>
              <RevealLines as="p">Приобретите сертификат на любую сумму</RevealLines>
              <a href="#contacts" className="btn">
                Подробнее
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section style={{ padding: '20px 0' }}>
        <div className="wrap disc">
          <img
            className="heart-b"
            src={IMG.heartLeft}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="bar">
            Салон не оказывает услуги интим характера<span className="excl">!</span>
          </div>
          <img
            className="heart-b"
            src={IMG.heartRight}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="contacts">
        <div className="wrap">
          <RevealLines as="h2">Контакты</RevealLines>
          <div className="c-cols">
            <div>
              <div className="lab">Адрес</div>
              {address}
              <div className="metro" style={{ marginTop: 8 }}>
                М. Лубянка
                <br />
                М. Китай-город
              </div>
            </div>
            <div>
              <div className="lab">Телефон</div>
              <a href={phoneHref}>{phone}</a>
              <div className="c-msg">
                <a className="tg" href="#contacts" aria-label="Telegram">
                  <TgIcon />
                </a>
                <a className="wa" href="#contacts" aria-label="WhatsApp">
                  <WaIcon />
                </a>
              </div>
            </div>
            <div>
              <div className="lab">Наш телеграм-канал</div>
              <a href="#contacts" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                Подписаться
              </a>
            </div>
            <div />
          </div>
          <div className="map">Карта (Yandex / Google Maps — плейсхолдер)</div>
        </div>
        <div className="wrap">
          <footer>
            <span>2016–2026 © 5massage.ru · все права защищены</span>
            <a href="#top">Политика конфиденциальности</a>
          </footer>
        </div>
      </section>

      {/* DRAWER */}
      <div className={menuOpen ? 'scrim open' : 'scrim'} onClick={() => setMenuOpen(false)} />
      <nav className={menuOpen ? 'drawer open' : 'drawer'}>
        <span className="close" onClick={() => setMenuOpen(false)}>
          ×
        </span>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
