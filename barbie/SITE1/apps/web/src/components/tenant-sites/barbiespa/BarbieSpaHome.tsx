'use client';

import '@/styles/barbiespa.css';
import { asset } from '@/lib/asset';
import { useEffect, useRef, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { BarbieMasterCard } from './BarbieMasterCard';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * BarbieSpaHome — bespoke-реплика прототипа barbie/barbiespa/index.html под NAS
 * (CSS заскоуплен в barbiespa.css под .bs-site, ассеты в public/tenants/barbiespa).
 * Ростер мастеров — из общего NAS-каталога (GET /v1/public/girls?tenant=barbiespa),
 * а не из локального MASTERS прототипа. Флоатинг-чат прототипа заменён общим
 * SiteTouchpoints (розовый акцент), управляемым из деки /admin/projects.
 */

const ASSET = asset('/tenants/barbiespa');

const FEATURES = [
  { ic: 'list.svg', t: 'Большой выбор программ', d: 'В нашем салоне представлено более 20 программ на любой вкус.' },
  { ic: 'sweets.svg', t: 'Уютная атмосфера', d: 'Три VIP комнаты с джакузи и восемь комнат оснащенных душевыми кабинками. В каждой комнате кондиционер.' },
  { ic: 'gender.svg', t: 'Великолепные мастера', d: 'Профессиональные мастера релакса с волшебными руками и восхитительными формами. У нас более 15 мастеров в смену.' },
  { ic: 'lock.svg', t: 'Полная конфиденциальность', accent: true, d: 'Фото-видео съемка в салоне запрещена. Гости не пересекаются внутри салона.' },
  { ic: 'clock.svg', t: '24/7', d: 'Мы работаем 24 часа в сутки без праздников и выходных. Всё для вас дорогие мужчины!' },
  { ic: 'home.svg', t: 'Домашний уют', d: 'Махровые полотенца, одноразовое чистое белье, гели для душа и тапочки. Мы всё продумали.' },
];

const PROGRAMS = [
  {
    img: '1471247482k8gn4.webp',
    name: 'Горячие желания',
    prices: [['₽ 7 000', '60 мин']],
    lead: 'Яркая и сексуальная программа с акцентом на контакт, соблазн и свободу ощущений.',
    incl: 'В программу входит:',
    body: 'классический массаж; массаж стоп с горячими полотенцами; массаж головы и лица; тайский боди-массаж; стоун-терапия; нежные прикосновения; совместный душ; чувственный массаж лингама; выбор поз. В программе участвует 1 девушка.',
  },
  {
    img: 'hqrb51531017417.webp',
    name: 'Розовая чакра',
    prices: [
      ['₽ 13 000', '60 мин'],
      ['₽ 15 000', '90 мин'],
    ],
    lead: 'Глубокий VIP-формат Barbie. Медленный ритм, телесная близость и расширенные техники для максимального расслабления.',
    incl: 'В программу входит:',
    body: 'классический массаж; массаж стоп с горячими полотенцами; массаж головы и лица; тайский боди-массаж; стоун-терапия; нежные прикосновения; совместный душ; чувственный массаж лингама; выбор поз; урологический массаж. В программе участвует 1 девушка.',
  },
  {
    img: 'krasivye-damochki-59-foto-20-1024x576.webp',
    name: 'Барби шоу',
    prices: [['₽ 26 000', '75 мин']],
    lead: 'Эстетичное шоу с двумя девушками. Синхронность, визуал и яркие эмоции.',
    incl: 'Во время сеанса вы получите:',
    body: 'массаж в 4 руки; стоун-терапия; массаж головы и лица; тайский боди массаж; нежные прикосновения; душ в объятиях девушек; массаж лингама; лёгкое лесби-шоу. В программе участвует 2 мастера.',
  },
];

const NAV = [
  ['#masters', 'Наши мастера'],
  ['/barbiespa/programmy', 'Программы'],
  ['#interior', 'Интерьер'],
  ['#', 'Выезд на дом'],
  ['#', 'Мальчишник'],
  ['#interior', 'Видео из салона'],
  ['#', 'Акции'],
  ['#contacts', 'Контакты'],
];

const PICK_STRIP = ['img_8124-768x1024.webp', 'lara_4-768x1024.webp', 'nana_5-768x1024.webp', 'linda_2-768x1024.webp'];

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

interface BarbieSpaHomeProps {
  girls: PublicGirl[];
  phone?: string;
  phoneHref?: string;
  address?: string;
}

export function BarbieSpaHome({
  girls,
  phone = '8 (499) 520-0310',
  phoneHref = 'tel:+74995200310',
  address = 'Москва, Каланчевская 32/58 с1',
}: BarbieSpaHomeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lbVideo, setLbVideo] = useState<string | null>(null);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const teaser = girls.slice(0, 8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Параллакс hero-фото: едет в ПРОТИВОПОЛОЖНУЮ сторону от мыши, медленно и с
  // задержкой (rAF-лерп: текущее значение плавно догоняет целевое).
  useEffect(() => {
    const STRENGTH = 28; // макс. сдвиг, px
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const rx = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
      const ry = e.clientY / window.innerHeight - 0.5;
      tx = -rx * 2 * STRENGTH; // минус = в противоположную сторону
      ty = -ry * 2 * STRENGTH;
    };
    const loop = () => {
      cx += (tx - cx) * 0.045; // малый коэффициент → медленное «догоняющее» движение
      cy += (ty - cy) * 0.045;
      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) scale(1.06)`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="bs-site"
      id="top"
      style={{
        ['--bs-banner' as string]: `url(${ASSET}/banner.webp)`,
        ['--bs-tg' as string]: `url(${ASSET}/da200d36e9a2feb267c6cf61bf06f1b7.webp)`,
      }}
    >
      <SiteTouchpoints accent="#ec1c8f" />

      {/* HEADER */}
      <header className={scrolled ? 'bs-header solid' : 'bs-header'}>
        <div className="h-left">
          <div className="menu-btn" onClick={() => setMenuOpen(true)}>
            <span className="ln">
              <i />
              <i />
              <i />
            </span>{' '}
            МЕНЮ
          </div>
          <LangSwitcher accent="#ec1c8f" />
        </div>
        <a href="#top" className="logo">
          <div className="b display">BARBIE</div>
          <div className="s">SPA</div>
        </a>
        <div className="h-right">
          <a href={phoneHref} className="phone">
            {phone}
          </a>
          <a href="#contacts" className="contacts">
            Контакты
          </a>
          <svg className="pin" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </div>
      </header>

      {/* DRAWER */}
      <div className={menuOpen ? 'overlay open' : 'overlay'} onClick={() => setMenuOpen(false)} />
      <aside className={menuOpen ? 'drawer open' : 'drawer'}>
        <span className="close" onClick={() => setMenuOpen(false)}>
          ×
        </span>
        <nav>
          {NAV.map(([href, label], i) => (
            <a key={i} href={asset(href)} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" ref={heroBgRef} />
        <div className="inner">
          <h1>
            Салон эротического массажа
            <br />в центре Москвы
          </h1>
          <div className="badge-pink">Откройте дверь в мир невероятного наслаждения!</div>
          <div>
            <a href="#contacts" className="btn-out">
              Записаться
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features wrap">
        <h2 className="sec-title">Наши преимущества</h2>
        <p className="lead">Мы работаем для Вас предоставляя обслуживание на высшем уровне</p>
        <p className="disc">
          Салон не оказывает услуг интимного характера. Не пытайтесь договориться. Посещая наш салон вы соглашаетесь с
          правилами нашего заведения.
        </p>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div className="feat" key={f.t}>
              <div className="bar" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ico" src={`${ASSET}/${f.ic}`} alt="" />
              <h3 className={f.accent ? 'ttl-accent' : undefined}>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MASTERS */}
      <section className="masters wrap" id="masters">
        <h2 className="sec-title">Наши мастера</h2>
        <div className="m-grid">
          {teaser.map((g) => (
            <BarbieMasterCard key={g.slug} girl={g} onPlay={setLbVideo} />
          ))}
        </div>
        <div className="m-all">
          <a href={asset("/barbiespa/models")} className="btn-out">
            Все мастера
          </a>
        </div>
      </section>

      {/* PICK CTA */}
      <section className="pick">
        <div className="strip">
          {PICK_STRIP.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={`${ASSET}/${p}`} alt="" />
          ))}
        </div>
        <div className="inner">
          <h2>Не определились с выбором?</h2>
          <p>Отправьте заявку на подбор мастера и получите +30 минут на массаж в подарок!</p>
          <a href="#contacts" className="btn-out">
            Подобрать
          </a>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="programs wrap" id="programs">
        <h2 className="sec-title">Популярные программы</h2>
        <div className="p-grid">
          {PROGRAMS.map((p) => (
            <div className="p-card" key={p.name}>
              <div className="img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ASSET}/${p.img}`} alt={p.name} />
              </div>
              <div className="p-body">
                <h3>{p.name}</h3>
                {p.prices.map(([rub, dur], i) => (
                  <div className="p-price" key={i}>
                    <span className="row">
                      <span className="p-rub">{rub}</span>
                    </span>
                    <span className="row">
                      <ClockIcon />
                      {dur}
                    </span>
                  </div>
                ))}
                <p className="p-desc">
                  {p.lead}
                  <br />
                  <span className="incl">{p.incl}</span> {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INTERIOR */}
      <section className="interior wrap" id="interior">
        <h2 className="sec-title">Интерьер</h2>
        <div className="int-grid">
          <video
            src={`${ASSET}/czenzura-logo.mp4`}
            poster={`${ASSET}/photo_2024-07-19_13-53-48.webp`}
            controls
            playsInline
            preload="none"
          />
          <div className="int-text">
            <h3>Салон эротического массажа Barbie Spa</h3>
            <p>
              Наши девочки любого мужчину сведут с ума, уж будьте в этом уверены! Но вам это несомненно понравится! В
              Barbie Spa вы точно сможете найти мастерицу на свой вкус, ведь в заведении работает более 100 красоток
              разных типажей.
            </p>
            <p>
              Еще одно наше преимущество – это доступность. Салон располагается в самом центре Москвы, куда можно
              доехать хоть на личном, хоть на общественном транспорте. Рядом с заведением есть и удобная парковка.
            </p>
            <p>
              Внутреннее убранство и программы вас тоже не разочаруют. Но убедиться в этом вы сможете лишь одним
              способом! Записавшись к нам на сеанс…
            </p>
          </div>
        </div>
      </section>

      {/* TELEGRAM */}
      <section className="tg">
        <div className="inner">
          <h2>Узнайте о наших новых девушках и акциях первыми!</h2>
          <p>Подписывайтесь на наш телеграм-канал и отдыхайте с комфортом!</p>
          <a href="#contacts" className="btn-fill">
            Подписаться
          </a>
        </div>
      </section>

      {/* SEO */}
      <section className="seo">
        <div className="wrap">
          <h2>Массажный салон Barbie SPA приглашает всех мужчин!</h2>
          <p className="disc">
            Салон не оказывает услуг интимного характера. Не пытайтесь договориться. Посещая наш салон вы соглашаетесь с
            правилами нашего заведения.
          </p>
          <p>
            Салон Barbie приглашает представителей сильного пола замечательно провести время, полноценно расслабиться и
            отдохнуть, забыть на время обо всех заботах и проблемах, получить массу незабываемых впечатлений. Вас ждут
            комфортные локации с уютным интерьером, чудесная атмосфера и профессиональный эротический массаж, который
            выполняют роскошные девушки с обворожительными формами.
          </p>
          <p>
            Наш салон эротического массажа предлагает клиентам комфортные комнаты с просторной уютной кроватью, душевой
            кабиной. Мы предлагаем эротический массаж для мужчин с разными вкусами, интересами, предпочтениями —
            несколько программ, позволяющих каждому найти лучший вариант.
          </p>
        </div>
      </section>

      {/* CONTACTS */}
      <section className="contacts" id="contacts">
        <div className="map">
          <iframe
            loading="lazy"
            title="map"
            src="https://yandex.ru/map-widget/v1/?ll=37.650%2C55.778&z=15&pt=37.650,55.778,pm2rdm"
            allowFullScreen
          />
        </div>
        <div className="c-card">
          <h3>Наши контакты</h3>
          <a href={phoneHref} className="ph">
            {phone}
          </a>
          <div className="row">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec1c8f" strokeWidth="2">
              <path d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>{' '}
            {address}
          </div>
          <div className="row">
            <span className="m">М</span> Проспект Мира
          </div>
          <div className="row">
            <span className="m">М</span> Комсомольская
          </div>
          <div className="row">
            <span className="m">М</span> Красные ворота
          </div>
          <a href="mailto:barbiespa@yandex.ru" className="mail">
            BARBIESPA@YANDEX.RU
          </a>
          <a href="#contacts" className="btn-out">
            Записаться
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bs-footer">
        <div className="wrap f-grid">
          <div>
            <a href="#masters">Наши мастера</a>
            <a href="#">Дополнения</a>
            <a href="#">Выезд на дом</a>
            <a href="#">Мальчишник</a>
          </div>
          <div>
            <a href="#programs">Программы</a>
            <a href="#interior">Интерьер</a>
            <a href="#">Акции</a>
            <a href="#contacts">Контакты</a>
          </div>
          <div className="f-logo">
            <div className="b display">BARBIE</div>
            <div className="s">SPA</div>
            <div className="f-soc">
              <i>TG</i>
              <i>VK</i>
              <i>WA</i>
              <i>IG</i>
            </div>
            <div className="copy">© 2026 · Barbie spa Салон</div>
          </div>
        </div>
      </footer>

      {/* LIGHTBOX */}
      {lbVideo && (
        <div
          className="bs-site-lb"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName !== 'VIDEO') setLbVideo(null);
          }}
        >
          <span className="x" onClick={() => setLbVideo(null)}>
            ×
          </span>
          <video src={lbVideo} controls playsInline autoPlay />
        </div>
      )}
    </div>
  );
}
