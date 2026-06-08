'use client';

import '@/styles/nebesa.css';
import { useEffect, useRef, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';
import { RainbowRing } from './RainbowRing';
import { NebesaClouds } from './NebesaClouds';
import { NebesaInterior } from './NebesaInterior';
import { NebesaFeatureIcon } from './NebesaFeatureIcon';
import { NebesaSmoothScroll } from './NebesaSmoothScroll';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * NebesaHome — bespoke-реплика прототипа NEBOSVOD
 * (barbie/NON_PROJECT/nebosvod-landing.html), публичная главная тенанта nebesaspa.
 * Контент снят с живого сайта nebesaspa.com (имена программ, контакты, часы,
 * метро Бауманская, фото-интерьеры). Ростер девушек — из NAS-каталога
 * (GET /v1/public/girls?tenant=nebesaspa). Светлая «небесная» тема.
 */

// HDR-интерьеры, выкачаны с nebesaspa.com в локальную статику
// public/tenants/nebesaspa/gallery/ — фолбэк для карточек девушек без фото.
const IMG = [
  '/tenants/nebesaspa/gallery/img_1727-hdr-scaled.jpg',
  '/tenants/nebesaspa/gallery/img_1820-hdr-scaled.jpg',
  '/tenants/nebesaspa/gallery/img_1932-hdr-scaled.jpg',
  '/tenants/nebesaspa/gallery/img_1984-hdr-scaled.jpg',
  '/tenants/nebesaspa/gallery/img_2103-hdr-scaled.jpg',
];

// Hero-слайдер — те же кадры, что в slider-big на nebesaspa.com, локализованы в webp
// (public/tenants/nebesaspa/hero/) → тот же origin, immutable-кэш Next, без рефетча с удалённого CDN.
const HERO_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const HERO_IMAGES = [
  `${HERO_BASE}/tenants/nebesaspa/hero/hero-1.webp`,
  `${HERO_BASE}/tenants/nebesaspa/hero/hero-2.webp`,
  `${HERO_BASE}/tenants/nebesaspa/hero/hero-3.webp`,
];
// coverflow: 3 копии для бесшовного цикла; доля ширины слайда = --slide-w в nebesa.css
const HERO_LEN = HERO_IMAGES.length;
const HERO_EXT = [...HERO_IMAGES, ...HERO_IMAGES, ...HERO_IMAGES];
const HERO_SLIDE_FRAC = 0.62;

// CTA-облака: n — номер картинки (cloud-N.webp), top — высота в секции, w — ширина,
// dur — длительность пролёта (меньше = быстрее; широкий разброс скоростей),
// delay — старт (отриц. = уже в пути), par — коэффициент параллакса (больше = сильнее),
// op — прозрачность, flip — зеркальное отражение.
const CTA_CLOUDS = [
  { n: 2, top: '8%', w: 320, dur: 95, delay: -20, par: 0.16, op: 0.92, flip: false },
  { n: 4, top: '22%', w: 210, dur: 70, delay: -40, par: 0.36, op: 0.82, flip: true },
  { n: 1, top: '14%', w: 430, dur: 180, delay: -90, par: 0.07, op: 0.85, flip: false },
  { n: 3, top: '46%', w: 280, dur: 115, delay: -55, par: 0.24, op: 0.8, flip: true },
  { n: 4, top: '62%', w: 150, dur: 60, delay: -25, par: 0.48, op: 0.78, flip: false },
  { n: 2, top: '76%', w: 300, dur: 150, delay: -70, par: 0.18, op: 0.82, flip: true },
  { n: 3, top: '32%', w: 380, dur: 210, delay: -120, par: 0.1, op: 0.76, flip: false },
  { n: 1, top: '54%', w: 175, dur: 80, delay: -35, par: 0.42, op: 0.8, flip: true },
  { n: 4, top: '88%', w: 250, dur: 135, delay: -60, par: 0.3, op: 0.76, flip: false },
  { n: 2, top: '40%', w: 125, dur: 64, delay: -15, par: 0.54, op: 0.7, flip: true },
];

// Дуга бегущей ленты миниатюр (offset-path): низшая точка в центре, края подняты.
const ARC_AVATAR = 116; // диаметр круглой миниатюры
const ARC_GAP = 48; // зазор между миниатюрами вдоль пути (расстояние между кругами)
const ARC_RISE = 120; // глубина прогиба: насколько центр ниже краёв (px) — крутизна дуги
const ARC_PAD = 220; // вынос пути за края экрана для бесшовного входа/выхода
const ARC_DUR = 68; // секунд на полный проход пути (медленнее = больше значение)

// путь к облаку (с учётом basePath /nas в prod)
const CLOUD = (n: number) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/tenants/nebesaspa/clouds/cloud-${n}.webp`;

// Программы — реальные названия с nebesaspa.com; цены/длительности
// репрезентативные (точный прайс — на детальных страницах /program/<slug>/).
const PROGRAMS = [
  { price: '6 000 ₽', dur: '60 мин', ttl: 'Слёзы небес', desc: 'Баланс телесного расслабления и эротического наслаждения. Глубокая проработка мышц плавно переходит в чувственные техники.' },
  { price: '8 000 ₽', dur: '60 мин', ttl: 'Повелитель Неба', desc: 'Программа для тех, кто любит контроль, подчинение и игру ролей. Атмосфера власти и полного доверия.' },
  { price: '7 000 ₽', dur: '60 мин', ttl: 'Жемчужный Горизонт', desc: 'Программа с участием двух мастериц либо женского дуэта из топ-составов салона. Двойное внимание и нежность.' },
  { price: '9 000 ₽', dur: '90 мин', ttl: 'Богиня Авроры', desc: 'Долгая программа с тайскими и чувственными техниками. Полное погружение и максимальное расслабление.' },
  { price: '12 000 ₽', dur: '120 мин', ttl: 'Галактика наслаждений', desc: 'Премиальная программа: спа-ритуал, пенная церемония и эксклюзивные техники в самом большом номере салона.' },
];

// Преимущества — порт блока s-seo-logo-list-features с nebesaspa.com (иконка + заголовок + текст).
// Иконки локализованы в public/tenants/nebesaspa/icons/*.svg (тёмные #16181D на прозрачном).
const FEATURES = [
  {
    lottie: 'sofa', // wired-outline-1608-sofa
    icon: 'cupid-alt', // статичный fallback
    ttl: 'Уникальные смежные комнаты',
    desc: 'Необычные интерьерные решения для пар, любителей «пикантных» программ и приватных вечеринок.',
  },
  {
    lottie: 'avatar-female', // wired-outline-269-avatar-female
    icon: 'eiffel-tower',
    ttl: 'Высококвалифицированные мастера',
    desc: 'Профессиональные мастера, прошедшие необходимое обучение и подготовку: массажисты, спа-специалисты, бьюти-эксперты, сексологи.',
  },
  {
    lottie: 'badge-ribbon', // wired-outline-3235-badge-ribbon
    icon: 'dolphin',
    ttl: 'Максимальная комплектация каждой комнаты',
    desc: 'Каждая комната оснащена гидромассажной ванной для двоих со светом и функцией ароматерапии.',
  },
  {
    lottie: 'da-vinci', // wired-outline-1971-da-vinci
    icon: 'tie',
    ttl: 'Персональные программы',
    desc: 'Доступна возможность подобрать индивидуальный сценарий под своё настроение: расслабление, эротика, парные и приватные программы.',
  },
];

const NAV = [
  { href: '#girls', label: 'Девушки' },
  { href: '#progs', label: 'Программы' },
  { href: '#progs', label: 'Дополнения' },
  { href: '#contacts', label: 'Контакты' },
  { href: '#contacts', label: 'Выезд' },
];

const TG_URL = 'https://t.me/NebosvodSpa';

interface NebesaHomeProps {
  girls: PublicGirl[];
  phone?: string;
  phoneHref?: string;
  address?: string;
}

export function NebesaHome({
  girls,
  phone = '8 (495) 492-4766',
  phoneHref = 'tel:+74954924766',
  address = 'Москва, м. Бауманская',
}: NebesaHomeProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [stripHover, setStripHover] = useState<number | null>(null);

  // CTA-облака: секционно-относительный параллакс (--par) — не зависит от
  // абсолютного scrollY, поэтому не уезжает за пределы секции. Горизонтальный
  // дрейф справа→налево — чисто CSS (разные animation-duration = разные скорости).
  const ctaRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = ctaRef.current;
    if (!section) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const rel = window.innerHeight / 2 - (r.top + r.height / 2); // 0 в центре экрана
      section.querySelectorAll<HTMLElement>('.cta-cloud').forEach((el) => {
        const p = parseFloat(el.dataset.par || '0');
        el.style.setProperty('--par', `${(rel * p).toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const shown = girls.slice(0, 8);
  // миниатюры моделей для карусели (фото из каталога); дублируем для бесшовного marquee
  const stripBase = girls.filter((g) => g.photos[0]).slice(0, 14);

  // ── HERO coverflow: слайды физически переезжают, соседи видны целиком, края тают
  //    в белый. Бесшовный цикл — 3 копии массива + бесанимационный snap в середину. ──
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  const [slideW, setSlideW] = useState(0);
  const [pos, setPos] = useState(HERO_LEN); // покой — средняя копия
  const [anim, setAnim] = useState(true);

  // меряем сцену и реальную ширину слайда (CSS-доля может меняться по брейкпоинтам)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      setStageW(el.clientWidth);
      const slide = el.querySelector('.hero-slide') as HTMLElement | null;
      if (slide) setSlideW(slide.clientWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // автопрокрутка: pos убывает → слайды едут слева направо.
  // В скрытой вкладке тик пропускаем: setInterval троттлится, но не стопится, а snap по
  // transitionend в фоне не приходит — иначе pos уезжает в большие минусы и hero белеет.
  // При возврате на вкладку без анимации пере-центрируем pos в среднюю копию.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setPos((p) => p - 1);
    }, 4500);
    const onVis = () => {
      if (document.hidden) return;
      setAnim(false);
      setPos((p) => HERO_LEN + (((p % HERO_LEN) + HERO_LEN) % HERO_LEN));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // после snap (anim=false) вернуть анимацию следующим кадром, чтобы прыжок не анимировался
  useEffect(() => {
    if (anim) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    return () => cancelAnimationFrame(r);
  }, [anim]);

  // доехали к краю расширенного списка → бесшумно вернуться в среднюю копию.
  // Реагируем только на transform самого трека (transitionend от слайдов всплывает — игнор).
  function onTrackEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    setPos((p) => {
      if (p < HERO_LEN) { setAnim(false); return p + HERO_LEN; }
      if (p >= 2 * HERO_LEN) { setAnim(false); return p - HERO_LEN; }
      return p;
    });
  }

  const activeImg = ((pos % HERO_LEN) + HERO_LEN) % HERO_LEN;
  const slidePx = slideW || stageW * HERO_SLIDE_FRAC; // measured, с фолбэком до первого замера
  const trackTx = stageW / 2 - (pos + 0.5) * slidePx;

  // ── Дуга ленты миниатюр: путь генерим по реальной ширине полосы ──
  const arcRef = useRef<HTMLDivElement>(null);
  const [arcW, setArcW] = useState(0);
  useEffect(() => {
    const el = arcRef.current;
    if (!el) return;
    const update = () => setArcW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Мобильная версия: круги мельче и ближе друг к другу (меньше диаметр + зазор),
  // дуга ниже. Переключаемся по ширине полосы (≈ ширине экрана).
  const arcMobile = arcW > 0 && arcW < 680;
  const arcAvatar = arcMobile ? 74 : ARC_AVATAR; // диаметр
  const arcGap = arcMobile ? 16 : ARC_GAP; // зазор вдоль пути
  const arcRise = arcMobile ? 80 : ARC_RISE; // глубина прогиба
  const arcEdgeOff = arcMobile ? 120 : 188; // опускание краёв от верха

  const arcR = arcAvatar / 2;
  const arcEdgeY = arcR + arcEdgeOff; // точки входа/выхода (края)
  const arcH = arcEdgeY + arcRise + arcR + 24; // высота полосы под прогиб
  const arcSpan = arcW + 2 * ARC_PAD; // полный горизонтальный путь (с выносом за края)
  // равномерно по ГОРИЗОНТАЛИ (а не по длине дуги) — иначе на крутых боках миниатюры
  // встают «стопкой», а на дне зияет дыра. y берём из параболы arcYAt(x).
  const arcN = arcW ? Math.max(4, Math.round(arcSpan / (arcAvatar + arcGap))) : 6;
  const arcItems = Array.from({ length: arcN }, (_, i) =>
    stripBase.length ? stripBase[i % stripBase.length] : null,
  );
  const arcYAt = (x: number) => {
    const u = Math.max(-1, Math.min(1, (x - arcW / 2) / (arcW / 2 || 1)));
    return arcEdgeY + arcRise * (1 - u * u); // центр (u=0) ниже, края (|u|=1) выше
  };
  const arcInitX = (i: number) => arcW + ARC_PAD - (arcSpan / arcN) * i;

  // rAF-движение: x едет с постоянной горизонтальной скоростью, y = парабола.
  const arcItemRefs = useRef<(HTMLElement | null)[]>([]);
  const arcPosRef = useRef<number[]>([]);
  const arcPausedRef = useRef(false);
  useEffect(() => {
    if (!arcW) return;
    const speed = arcSpan / (ARC_DUR * 1000); // px/мс
    arcPosRef.current = Array.from({ length: arcN }, (_, i) => arcInitX(i));
    let raf = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      const dt = last == null || arcPausedRef.current ? 0 : ts - last;
      last = ts;
      for (let i = 0; i < arcN; i++) {
        let x = arcPosRef.current[i] - speed * dt;
        if (x < -ARC_PAD) x += arcSpan; // бесшовный возврат за правый край
        arcPosRef.current[i] = x;
        const el = arcItemRefs.current[i];
        if (el) el.style.transform = `translate(${x - arcR}px, ${arcYAt(x) - arcR}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // arcW/arcN — единственные структурные зависимости; геометрия пересоберётся при ресайзе
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcW, arcN]);


  function scrollProgs(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('.pcard') as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + 24 : 320;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  return (
    <div className="nebesa-site" id="top">
      <SiteTouchpoints accent="#6aa7d8" />
      {/* Плавный скролл (Lenis) — те же параметры, что на salonmassage.ru */}
      <NebesaSmoothScroll />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap"
      />

      {/* Прозрачные облака по бокам с параллаксом */}
      <NebesaClouds />

      {/* HEADER */}
      <header className="hdr">
        <div className="wrap hdr-in">
          <div className="logo">NEBOSVOD</div>
          <nav className="nav">
            {NAV.map((n, i) => (
              <a key={i} href={n.href}>
                {n.label}
              </a>
            ))}
            <a href="#contacts" className="more">Ещё</a>
          </nav>
          <div className="hours">
            <div>
              <b>пн – чт:</b>
              <span>21:00 – 7:00</span>
            </div>
            <div>
              <b>пт – вс:</b>
              <span>Круглосуточно</span>
            </div>
          </div>
          <div className="contact">
            <div className="soc">
              <a className="tg" href={TG_URL} aria-label="Telegram">✈</a>
              <a className="wa" href="#contacts" aria-label="WhatsApp">✆</a>
            </div>
            <div className="phone">{phone}</div>
            <a className="btn btn-blue" href={phoneHref}>Записаться</a>
          </div>
        </div>
      </header>

      {/* HERO — coverflow: слайды переезжают, соседи видны целиком, края тают в белый */}
      <section className="hero">
        <div className="wrap">
          <div className="hero-stage" ref={stageRef}>
            <div
              className="hero-track"
              style={{
                transform: `translate3d(${trackTx}px, 0, 0)`,
                transition: anim ? 'transform .7s cubic-bezier(.4,0,.2,1)' : 'none',
              }}
              onTransitionEnd={onTrackEnd}
            >
              {HERO_EXT.map((src, i) => (
                <div className={`hero-slide${i === pos ? ' is-active' : ''}`} key={i}>
                  <div className="hero-slide-img" style={{ backgroundImage: `url("${src}")` }} />
                </div>
              ))}
            </div>

            {/* облака над слайдами (видны на фоне фото), параллакс — под краями и текстом */}
            <img className="hero-cloud a" data-speed="-0.38" src={CLOUD(2)} alt="" aria-hidden />
            <img className="hero-cloud b" data-speed="-0.1" src={CLOUD(3)} alt="" aria-hidden />

            {/* края тают в белый */}
            <div className="hero-fade l" />
            <div className="hero-fade r" />

            {/* фиксированный текстовый слой по центру */}
            <div className="hero-inner">
              <img
                className="hero-logo"
                src={`${HERO_BASE}/tenants/nebesaspa/nebesalogo2.svg`}
                alt="NEBOSVOD"
              />
              <div className="hero-sub">Спа-салон эротического массажа</div>
              <div className="hero-note">Работаем по предварительной записи</div>
              <div className="hero-cta">
                <a className="btn btn-blue" href={phoneHref}>Записаться</a>
              </div>
            </div>
          </div>

          <div className="dots">
            {HERO_IMAGES.map((_, i) => (
              <span
                key={i}
                className={i === activeImg ? 'dot active' : 'dot'}
                onClick={() => setPos(HERO_LEN + i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ЛЕНТА МИНИАТЮР МОДЕЛЕЙ — едут бесконечно по дуге (rAF): равномерно по горизонтали, y = парабола */}
      <section className="strip">
        <div className="arc" ref={arcRef} style={{ height: arcH }}>
          {arcItems.map((g, i) => {
            const src = g ? photoUrl(g.photos[0]) : IMG[i % IMG.length];
            const inner = (
              <>
                <div className="inner has-img" style={{ backgroundImage: `url("${src}")` }} />
                {stripHover === i && <RainbowRing />}
              </>
            );
            const x0 = arcInitX(i);
            const style: React.CSSProperties = {
              width: arcAvatar,
              height: arcAvatar,
              transform: `translate(${x0 - arcR}px, ${arcYAt(x0) - arcR}px)`,
            };
            const onEnter = () => {
              setStripHover(i);
              arcPausedRef.current = true;
            };
            const onLeave = () => {
              setStripHover((h) => (h === i ? null : h));
              arcPausedRef.current = false;
            };
            const setRef = (el: HTMLElement | null) => {
              arcItemRefs.current[i] = el;
            };
            return g ? (
              <a
                key={`${g.slug}-${i}`}
                ref={setRef}
                className="arc-card"
                href="/nebesaspa/models"
                title={g.name}
                style={style}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                {inner}
              </a>
            ) : (
              <div key={i} ref={setRef} className="arc-card" style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
                {inner}
              </div>
            );
          })}

          {/* края тают в белый — миниатюры исчезают, покидая экран */}
          <div className="arc-fade l" />
          <div className="arc-fade r" />
        </div>
      </section>

      {/* НАШИ ДЕВУШКИ */}
      <div className="wrap">
        <section className="girls" id="girls">
          <div className="wrap">
            <h2 className="h2">Наши девушки</h2>
            <div className="girls-grid">
              {shown.map((g) => (
                <article className="gcard" key={g.slug}>
                  <div className="pic">
                    <div className="flip">
                      <div className="face front">
                        {g.photos[0] && (
                          <img
                            src={photoUrl(g.photos[0])}
                            alt={g.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                      <div className="face back">
                        {(g.photos[1] ?? g.photos[0]) && (
                          <img
                            src={photoUrl(g.photos[1] ?? g.photos[0])}
                            alt={g.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                    </div>
                    <span className="pdot" />
                  </div>
                  <div className="nm">
                    {g.name}
                    {g.age ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> {g.age}</span> : null}
                  </div>
                  <div className="meta">
                    {g.breast != null && <span>Грудь<b>{g.breast}</b></span>}
                    {g.weight != null && <span>Вес<b>{g.weight}</b></span>}
                    {g.height != null && <span>Рост<b>{g.height}</b></span>}
                  </div>
                </article>
              ))}
            </div>
            <div className="girls-more">
              <a className="btn btn-blue" href="/nebesaspa/models">Смотреть всех</a>
            </div>
          </div>
        </section>
      </div>

      {/* CTA «НЕ ОПРЕДЕЛИЛИСЬ» */}
      <section className="cta" ref={ctaRef}>
        <div className="cta-clouds" aria-hidden>
          {CTA_CLOUDS.map((c, i) => (
            <div className="cta-cloud" key={i} data-par={c.par} style={{ top: c.top }}>
              <div
                className="cta-cloud-drift"
                style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
              >
                <img
                  src={photoUrl(`/tenants/nebesaspa/clouds/cloud-${c.n}.webp`)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: c.w,
                    opacity: c.op,
                    transform: c.flip ? 'scaleX(-1)' : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="cta-watermark serif">NEBOSVOD</div>
        <div className="cta-circle">
          <h3>Не определились с выбором?</h3>
          <p>Отправьте заявку на подбор мастера и получите <b>+30 минут</b> на массаж в подарок</p>
          <a className="btn btn-blue" href={phoneHref}>Записаться</a>
        </div>
      </section>

      {/* ПОПУЛЯРНЫЕ ПРОГРАММЫ */}
      <section className="progs" id="progs">
        <div className="wrap">
          <div className="progs-head">
            <h2 className="h2">Популярные программы</h2>
            <div className="progs-nav">
              <span className="count">{PROGRAMS.length} программ</span>
              <button onClick={() => scrollProgs(-1)} aria-label="Назад">‹</button>
              <button onClick={() => scrollProgs(1)} aria-label="Вперёд">›</button>
            </div>
          </div>
          <div className="progs-track-wrap">
            <div className="progs-track" ref={trackRef} style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
              {PROGRAMS.map((p) => (
                <article className="pcard" key={p.ttl}>
                  <div className="pic ph" />
                  <div className="price">
                    {p.price} <small>{p.dur}</small>
                  </div>
                  <div className="pttl">{p.ttl}</div>
                  <div className="pdesc">{p.desc}</div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* О САЛОНЕ + ПРЕИМУЩЕСТВА — две колонки: слева текст, справа 2×2 лотти-блоки.
          В блоках иконка флоатится, текст её обтекает. */}
      <section className="about">
        <div className="wrap">
          <div className="about-layout">
            <div className="about-text">
              <h2 className="h2">О салоне</h2>
              <p>Добро пожаловать в мир, где сбываются мечты и каждый миг наполнен волшебством! Наш салон эротического массажа — это не просто место, это оазис расслабления и наслаждения. Здесь вас ждут очаровательные массажистки, изысканная атмосфера и множество возможностей ощутить гармонию тела и души.</p>
              <p>Позвольте себе забыть о повседневной суете и погрузиться в уникальные программы, созданные специально для вашего удовольствия. Мы предлагаем не только эротический массаж, но и целый спектр дополнительных развлечений, которые сделают ваш отдых поистине незабываемым!</p>
              <p>Наши специалисты готовы реализовать ваши самые смелые желания, создавая атмосферу комфорта и доверия. И не волнуйтесь — всё, что происходит у нас, остаётся только между нами. Мы ценим ваше доверие и гарантируем полную конфиденциальность.</p>
              <p>NEBOSVOD — ваш ключ к неизведанным ощущениям и безмятежному отдыху. Дайте себе шанс отдохнуть на полную мощность и открыть для себя новые грани удовольствия!</p>
            </div>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <div className="feature" key={f.lottie}>
                  <NebesaFeatureIcon
                    name={f.lottie}
                    fallback={`${HERO_BASE}/tenants/nebesaspa/icons/${f.icon}.svg`}
                    size={96}
                  />
                  <div className="feature-ttl">{f.ttl}</div>
                  <div className="feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ИНТЕРЬЕРЫ — порт секции s-interior с nebesaspa.com (локальные webp + лайтбокс) */}
      <NebesaInterior />

      {/* FOOTER */}
      <footer className="foot" id="contacts">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="logo serif">NEBOSVOD</div>
              <p>Спа-салон эротического массажа. {address}. Работаем по предварительной записи. Полная конфиденциальность гарантирована.</p>
            </div>
            <div>
              <h4>Разделы</h4>
              <ul>
                <li><a href="#girls">Девушки</a></li>
                <li><a href="#progs">Программы</a></li>
                <li><a href="#progs">Дополнения</a></li>
                <li><a href="#contacts">Выезд</a></li>
              </ul>
            </div>
            <div>
              <h4>Часы работы</h4>
              <ul>
                <li><a href="#contacts">пн – чт: 21:00 – 7:00</a></li>
                <li><a href="#contacts">пт – вс: круглосуточно</a></li>
              </ul>
            </div>
            <div>
              <h4>Контакты</h4>
              <ul>
                <li><a href={phoneHref}>{phone}</a></li>
                <li><a href={TG_URL}>Telegram</a></li>
                <li><a href="#contacts">WhatsApp</a></li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 NEBOSVOD. Все права защищены.</span>
            <span>18+ · Услуги массажа</span>
          </div>
        </div>
      </footer>

      {/* CHAT WIDGET */}
    </div>
  );
}
