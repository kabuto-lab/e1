'use client';

import '@/styles/barbiespa.css';
import { asset } from '@/lib/asset';
import { useEffect, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';
import { BarbieMasterCard } from './BarbieMasterCard';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { LangSwitcher } from '../shared/LangSwitcher';
import { montserrat, manrope } from './fonts';
import { BarbieAgeGate } from './BarbieAgeGate';

/**
 * BarbieSpaHome — bespoke-реплика прототипа barbie/barbiespa/index.html под NAS
 * (CSS заскоуплен в barbiespa.css под .bs-site, ассеты в public/tenants/barbiespa).
 * Ростер мастеров — из общего NAS-каталога (GET /v1/public/girls?tenant=barbiespa),
 * а не из локального MASTERS прототипа. Флоатинг-чат прототипа заменён общим
 * SiteTouchpoints (розовый акцент), управляемым из деки /admin/projects.
 */

const ASSET = asset('/tenants/barbiespa');

// Превью-сетки 3×3, выезжающие при наведении на колонку «преимущества».
const FEAT_PROGRAMS = [
  'nachalo.webp', 'mix.webp', '968957.webp',
  'hqrb51531017417.webp', 'e9y29rlwuaudrvz.webp', 'ekzotika.webp',
  'dlyapar.webp', '1471247482k8gn4.webp', 'joni.webp',
];
const FEAT_INTERIORS = [
  'photo_2024-07-19_13-53-48.webp', 'photo_2024-07-19_14-31-23.webp', 'photo_2026-02-13_16-19-57.webp',
  'photo_2026-02-13_16-19-59.webp', 'photo_2026-02-13_16-20-02.webp', 'photo_2026-02-28_11-24-55-768x1024.webp',
  'photo_2026-02-28_11-24-56-768x1024.webp', 'photo_2026-02-28_11-24-58-768x1024.webp', 'photo_2026-02-28_11-25-00-768x1024.webp',
];

// «Наши преимущества» — split-hover-панели: у каждой колонки свой фон (bg),
// при наведении фон колонки разворачивается на всю секцию. Из 6 исходных
// преимуществ оставлены 4 (убраны «24/7» и «Домашний уют»). reveal — что
// выезжает снизу при наведении: сетка 3×3 + кнопка «Подробнее» (href).
// 4-й блок (конфиденциальность) пока без reveal.
const FEATURES = [
  { ic: 'list.svg', bg: 'col-programs.webp', t: 'Большой выбор программ', d: 'В нашем салоне представлено более 20 программ на любой вкус.', reveal: 'programs' as const, href: '/barbiespa/programmy' },
  { ic: 'sweets.svg', bg: 'col-atmosphere.webp', t: 'Уютная атмосфера', d: 'Три VIP комнаты с джакузи и восемь комнат с душевыми кабинками. В каждой комнате кондиционер.', reveal: 'interiors' as const, href: '/barbiespa#interior' },
  { ic: 'gender.svg', bg: 'col-masters.webp', t: 'Великолепные мастера', d: 'Профессиональные мастера релакса с волшебными руками. У нас более 15 мастеров в смену.', reveal: 'masters' as const, href: '/barbiespa/models' },
  { ic: 'lock.svg', bg: 'col-privacy.webp', accent: true, t: 'Полная конфиденциальность', d: 'Фото-видео съёмка в салоне запрещена. Гости не пересекаются внутри салона.' },
];

// Меняющийся хвост подзаголовка «Наши преимущества» (постоянная часть — в JSX).
const PERKS = [
  'большой выбор программ',
  'уютную атмосферу',
  'великолепных мастеров',
  'полную конфиденциальность',
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
  phone = '+7 (912) 076-81-28',
  phoneHref = 'tel:+79120768128',
  address = 'Москва, Каланчевская 32/58 с1',
}: BarbieSpaHomeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lbVideo, setLbVideo] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  // индекс колонки «преимуществ», на которую наведён курсор (её фон разворачивается на всю секцию)
  const [featHover, setFeatHover] = useState<number | null>(null);
  const [perkIdx, setPerkIdx] = useState(0);
  const teaser = girls.slice(0, 8);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Циклическая смена хвоста подзаголовка преимуществ.
  useEffect(() => {
    const t = setInterval(() => setPerkIdx((i) => (i + 1) % PERKS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className={`bs-site ${montserrat.variable} ${manrope.variable}`}
      id="top"
      style={{
        ['--bs-banner' as string]: `url(${ASSET}/barbie_bg-scaled.webp)`,
        ['--bs-tg' as string]: `url(${ASSET}/da200d36e9a2feb267c6cf61bf06f1b7.webp)`,
      }}
    >
      <BarbieAgeGate />
      <SiteTouchpoints accent="#ec1c8f" />

      {/* HEADER */}
      <header className={scrolled ? 'bs-header solid' : 'bs-header'}>
        <div className="h-left">
          <div className="menu-btn" onClick={() => setMenuOpen(true)}>
            <span className="ln">
              <i />
              <i />
              <i />
            </span>
            <span className="menu-label">МЕНЮ</span>
          </div>
          <span className="bs-lang"><LangSwitcher accent="#ec1c8f" /></span>
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
            <a key={i} href={asset(href)} onClick={() => setMenuOpen(false)} style={{ ['--i' as string]: i }}>
              {label}
            </a>
          ))}
        </nav>
      </aside>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          {/* видео-фон с ping-pong (forward+reverse запечён в файл → обычный loop).
              Десктоп — landscape; телефон — отдельный портретный файл (поворот 90CW запечён). */}
          <video className="hero-vid hero-vid-d" autoPlay muted loop playsInline poster={`${ASSET}/hero-poster.webp`}>
            <source src={`${ASSET}/hero-pingpong.webm`} type="video/webm" />
            <source src={`${ASSET}/hero-pingpong.mp4`} type="video/mp4" />
          </video>
          <video className="hero-vid hero-vid-m" autoPlay muted loop playsInline poster={`${ASSET}/hero-poster-m.webp`}>
            <source src={`${ASSET}/hero-pingpong-m.webm`} type="video/webm" />
            <source src={`${ASSET}/hero-pingpong-m.mp4`} type="video/mp4" />
          </video>
        </div>
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

      {/* FEATURES — split-hover-панели: фон наведённой колонки на всю секцию */}
      <section className="features-x">
        <div className="wrap fx-head">
          <h2 className="sec-title">Наши преимущества</h2>
          <p className="lead">
            Мы работаем для Вас предоставляя{' '}
            <span className="lead-rot" key={perkIdx}>{PERKS[perkIdx]}</span>
          </p>
        </div>
        <div className={`fx-panels${featHover !== null ? ' is-hovered' : ''}`} onMouseLeave={() => setFeatHover(null)}>
          {/* полноширинные фоны: по одному на колонку, проявляется фон наведённой */}
          {FEATURES.map((f, i) => (
            <div
              key={`bg-${f.t}`}
              className="fx-bg"
              aria-hidden
              style={{ backgroundImage: `url(${ASSET}/features/${f.bg})`, opacity: featHover === i ? 1 : 0 }}
            />
          ))}
          {FEATURES.map((f, i) => (
            <div
              className="fx-col"
              key={f.t}
              onMouseEnter={() => setFeatHover(i)}
              style={{ ['--fx-bg' as string]: `url(${ASSET}/features/${f.bg})` }}
            >
              <div className="fx-col-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fx-ico" src={`${ASSET}/${f.ic}`} alt="" />
                <h3 className={f.accent ? 'fx-accent' : undefined}>{f.t}</h3>
                <p className="fx-desc">{f.d}</p>
                {f.reveal && (
                  <div className="fx-reveal">
                    <div className="fx-grid">
                      {(f.reveal === 'masters'
                        ? girls
                            .slice(0, 9)
                            .map((g) => (g.photos?.[0] ? photoUrl(g.photos[0]) : null))
                        : (f.reveal === 'programs' ? FEAT_PROGRAMS : FEAT_INTERIORS).map((n) => `${ASSET}/${n}`)
                      )
                        .filter((src): src is string => !!src)
                        .map((src, idx) => (
                          <a
                            key={idx}
                            className="fx-sq"
                            href={asset(f.href ?? '#')}
                            aria-label={f.t}
                            style={{ backgroundImage: `url(${src})` }}
                          />
                        ))}
                    </div>
                    {f.href && (
                      <a href={asset(f.href)} className="btn-out fx-more">
                        Подробнее
                      </a>
                    )}
                  </div>
                )}
              </div>
              {/* затемнение неактивных сегментов при наведении на соседний */}
              <span className="fx-dim" aria-hidden />
            </div>
          ))}
        </div>
        <p className="wrap fx-disc">
          Салон не оказывает услуг интимного характера. Не пытайтесь договориться. Посещая наш салон вы соглашаетесь с
          правилами нашего заведения.
        </p>
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
          <div className={seoOpen ? 'seo-body open' : 'seo-body'}>
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

          <h3>Особенности эротического массажа</h3>
          <p>
            Переоценить важность этой процедуры невозможно. Эротический массаж включает приемы классического варианта,
            обеспечивающие мощные полезные эффекты. Профессиональная массажистка постукиваниями, надавливаниями,
            пощипываниями:
          </p>
          <ul>
            <li>восстановит процессы кровообращения;</li>
            <li>устранит застой крови;</li>
            <li>поможет мышцам качественно расслабиться.</li>
          </ul>
          <p>Это избавит от ощущения усталости, зарядит положительной энергией, вызовет прилив бодрости.</p>
          <p>
            Полному расслаблению, романтическому настрою, получению максимально приятных ощущений способствует
            соответствующая обстановка. Наш салон эротического массажа предлагает клиентам комфортные комнаты с просторной
            уютной кроватью, душевой кабиной. При желании перед сеансом можно расположиться в мягком кресле, выпить любимый
            напиток и посмотреть шоу.
          </p>

          <h3>Программы в салоне эротического массажа Barbie</h3>
          <p>
            Мы предлагаем эротический массаж для мужчин с разными вкусами, интересами, предпочтениями. В перечне услуг
            несколько программ, позволяющим каждому найти лучший вариант:
          </p>
          <ul>
            <li>
              «Господин», «Властелин», «VIP-персона» — программы для волевых мужчин, желающих насладиться полным
              господством, диктовать свои условия. Массаж выполняется одной или двумя девушками, количество, вид
              удовольствий не ограничиваются.
            </li>
            <li>
              «Ветка сакуры» непременно заинтересует почитателей неординарных, топовых удовольствий. Эксклюзивный массаж
              выполняют девушки, обеспечивающие невероятные ощущения пальчиками ног. «Ветка сакуры» предоставляет
              возможность провести незабываемый вечер.
            </li>
            <li>
              «Высший пилотаж», «Клубничка», «Двойняшки» — оптимальный выбор для тех, кто предпочитает получать в жизни
              все по максимуму. В этих программах много дополнительных услуг, позволяющих получить невероятные эмоции.
            </li>
            <li>
              «Стандарт», «Классический релакс», «Для пар» — сеансы максимального расслабления, приятного отдыха,
              получения заряда энергии.
            </li>
            <li>
              «Мальчишник» — специальная программа для женихов, желающих устроить незабываемое прощание с холостяцкой
              жизнью в кругу своих друзей.
            </li>
          </ul>
          <p>
            Эротический массаж для мужчин в нашем салоне проводится в комфортных условиях, в атмосфере, располагающей к
            получению наслаждений.
          </p>

          <h3>Спектр дополнительных услуг эротического массажа для мужчин</h3>
          <p>
            Бытует убеждение, что эротический массаж обязательно заканчивается определенными услугами. Это распространенное
            заблуждение. В салон Barbie приходят клиенты, желающие хорошо расслабиться, получить приятные ощущения,
            улучшить самочувствие, благодаря умелым действиям профессиональных специалистов.
          </p>
          <p>
            У нас работают красивые девушки с обворожительными формами. Но все они имеют специальное образование и большой
            практический опыт массажа. Это позволяет им обеспечивать клиентам не только замечательные ощущения, но и
            оздоровительный эффект.
          </p>
          <p>
            Наш салон эротического массажа предлагает несколько дополнительных услуг, позволяющих доставить клиентам
            максимальное удовольствие. Вы можете заказать:
          </p>
          <ul>
            <li>использование мягких игрушек, позволяющих получить полноценное удовольствие;</li>
            <li>в помощницы к массажистке молодую ассистентку для яркости ощущений;</li>
            <li>приятное общение с девушкой, которая будет выполнять процедуру;</li>
            <li>восточный массаж.</li>
          </ul>
          <p>
            Также эротический массаж в нашем салоне включает и другие дополнения. Их подробное описание предлагается перед
            сеансом.
          </p>
          <p>
            Мы строго придерживаемся правил, соблюдаем законодательство, предписания, касающиеся отношений между клиентами
            и персоналом. Поэтому клиентам, которые считают, что эротический массаж предусматривает определенные услуги, мы
            вынуждены отказать в предоставлении услуг.
          </p>

          <h3>Идеальные условия для эротического массажа в Москве в салоне Barbie</h3>
          <p>
            Эротический массаж Москва предлагает в нескольких заведениях. Но не всегда клиенты остаются довольны оказанными
            услугами. Дело в том, что обязательным условием для этой процедуры является создание соответствующих условий,
            способствующих качественной релаксации.
          </p>
          <p>
            Наш салон предлагает эротический массаж на высоком уровне. Добиваться таких результатов, обеспечивать
            безупречный сервис каждому клиенту позволяет не только высокая квалификация наших мастериц, но и идеальные
            условия. Мы не ограничиваем в выборе времени посещения салона. У каждого мужчины есть возможность выбрать
            наиболее удобные часы для сеанса, соответствующие его биологическому ритму.
          </p>
          <p>Получению наслаждений, качественному расслаблению способствуют:</p>
          <ul>
            <li>комфортная температура в комнатах, создающая отличные условия для релаксации;</li>
            <li>умиротворяющее звуковое сопровождение в виде спокойных приятных мелодий, природных шумов;</li>
            <li>приглушенный свет, создаваемый небольшими светильниками, бра, свечами;</li>
            <li>приятные тактильные ощущения, обеспечиваемые нежной, мягкой текстурой поверхностей мебели.</li>
          </ul>
          <p>
            Если вы хотите получить качественный эротический массаж в Москве, отвлечься от проблем, салон Barbie исполнит
            эти желания. Опытные массажистки подберут нужные приемы для смущенного новичка и искушенного гурмана.
          </p>
            {!seoOpen && <div className="seo-fade" />}
          </div>
          <button type="button" className="seo-toggle btn-out" onClick={() => setSeoOpen((v) => !v)}>
            {seoOpen ? 'Свернуть' : 'Читать полностью'}
          </button>
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
