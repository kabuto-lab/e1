'use client';

import '@/styles/barbiespa.css';
import { asset } from '@/lib/asset';
import { useEffect, useState } from 'react';
import type { PublicGirl } from '@/lib/public-girls-api';
import { photoUrl } from '@/lib/public-girls-api';
import { BarbieMasterCard } from './BarbieMasterCard';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { BARBIESPA_TOUCHPOINTS } from './barbiespa-contacts';
import { montserrat, manrope } from './fonts';
import { BarbieHeader } from './BarbieHeader';
import { BarbieAgeGate } from './BarbieAgeGate';
import { BarbiePromo } from './BarbiePromo';

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

const PICK_STRIP = ['img_8124-768x1024.webp', 'lara_4-768x1024.webp', 'nana_5-768x1024.webp', 'linda_2-768x1024.webp'];

// «Популярные программы» — Magnific-style слайдер: фон-слайд меняется на картинку
// активной программы, список имён едет вверх и раз в 6 с встаёт напротив «прицела».
const PROG_SLIDES: { n: string; img: string; price: string; dur: string; tag?: string }[] = [
  { n: 'Розовая чакра', img: 'hqrb51531017417.webp', price: '₽ 13 000', dur: '60 мин', tag: 'VIP' },
  { n: 'Горячие желания', img: 'da200d36e9a2feb267c6cf61bf06f1b7.webp', price: '₽ 7 000', dur: '60 мин' },
  { n: 'Пенная фантазия', img: 'ekzotika.webp', price: '₽ 13 000', dur: '75 мин', tag: 'VIP' },
  { n: 'Слияние тел', img: '3030-scaled.webp', price: '₽ 18 000', dur: '90 мин', tag: 'DELUX' },
  { n: 'Miss X', img: 'miss-x.webp', price: '₽ 45 000', dur: '90 мин' },
  { n: 'В твоей власти', img: 'e9y29rlwuaudrvz.webp', price: '₽ 13 000', dur: '60 мин', tag: 'VIP' },
  { n: 'Личное желание', img: 'for-couples-lux.webp', price: '₽ 12 000', dur: '90 мин' },
  { n: 'Барби шоу', img: 'krasivye-damochki-59-foto-20-1024x576.webp', price: '₽ 26 000', dur: '75 мин', tag: 'DELUX' },
];
const PROG_N = PROG_SLIDES.length;
const PROG_INTERVAL = 6000;

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
  const [lbVideo, setLbVideo] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  // индекс колонки «преимуществ», на которую наведён курсор (её фон разворачивается на всю секцию)
  const [featHover, setFeatHover] = useState<number | null>(null);
  const [perkIdx, setPerkIdx] = useState(0);
  // Секция «Популярные программы» — бесконечный Magnific-ролл.
  // progTick — монотонный счётчик (не modulo): лента из 3 копий имён едет вверх,
  // активная позиция = progTick. Стартуем со средней копии, а дойдя до 3-й —
  // тихо (без анимации, progSnap) прыгаем на среднюю → бесшовный вечный цикл.
  const [progTick, setProgTick] = useState(PROG_N);
  const [progSnap, setProgSnap] = useState(false);
  const progActive = progTick % PROG_N;
  const prog = PROG_SLIDES[progActive];
  const teaser = girls.slice(0, 8);

  // Циклическая смена хвоста подзаголовка преимуществ.
  useEffect(() => {
    const t = setInterval(() => setPerkIdx((i) => (i + 1) % PERKS.length), 2600);
    return () => clearInterval(t);
  }, []);

  // Автопрокрутка: имя встаёт напротив «прицела» раз в 6 с (вечно вперёд).
  useEffect(() => {
    const id = setInterval(() => setProgTick((t) => t + 1), PROG_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Бесшовный возврат: достигнув 3-й копии — после доезда анимации тихо
  // отматываем на одну копию назад (та же картинка, но без видимого скачка).
  useEffect(() => {
    if (progTick < PROG_N * 2) return;
    const t = setTimeout(() => {
      setProgSnap(true);
      setProgTick((x) => x - PROG_N);
    }, 900);
    return () => clearTimeout(t);
  }, [progTick]);

  // После тихого прыжка возвращаем анимацию (через 2 кадра).
  useEffect(() => {
    if (!progSnap) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setProgSnap(false)));
    return () => cancelAnimationFrame(r);
  }, [progSnap]);

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
      <BarbiePromo />
      <SiteTouchpoints tp={BARBIESPA_TOUCHPOINTS} accent="#ec1c8f" />

      {/* HEADER + главное меню — общий компонент barbiespa (BarbieHeader) */}
      <BarbieHeader transparentOnTop phone={phone} phoneHref={phoneHref} />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          {/* видео-фон: исходник — портретный magnific, ping-pong (forward+reverse
              запечён в файл → бесшовный loop). Десктоп — поворот 90° CCW запечён
              (портрет → landscape); телефон — портрет как есть. */}
          <video className="hero-vid hero-vid-d" autoPlay muted loop playsInline poster={`${ASSET}/hero-girl-poster.webp`}>
            <source src={`${ASSET}/hero-girl.mp4`} type="video/mp4" />
          </video>
          <video className="hero-vid hero-vid-m" autoPlay muted loop playsInline poster={`${ASSET}/hero-girl-m-poster.webp`}>
            <source src={`${ASSET}/hero-girl-m.mp4`} type="video/mp4" />
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
            Мы работаем для Вас предоставляя
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

      {/* PROGRAMS — Magnific-style слайдер: фон = картинка активной программы,
          ролл имён едет вверх и встаёт напротив «прицела» (▶) раз в 6 с */}
      <section className="prog-x" id="programs">
        <div className="px-bg">
          {PROG_SLIDES.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.img}
              src={`${ASSET}/${s.img}`}
              alt=""
              className={i === progActive ? 'on' : undefined}
              loading="lazy"
            />
          ))}
        </div>
        <div className="px-overlay" />

        <div className="wrap px-inner">
          <div className="px-left">
            <div className="kicker">Популярные программы</div>
            <h2>
              Выберите свой
              <br />
              ритуал наслаждения
            </h2>
            <div className="px-meta" key={progActive}>
              <span className="px-price">{prog.price}</span>
              <span className="px-dur">
                <ClockIcon /> {prog.dur}
              </span>
              {prog.tag && <span className={`px-tag ${prog.tag === 'DELUX' ? 'gold' : ''}`}>{prog.tag}</span>}
            </div>
            <a href={asset('/barbiespa/programmy')} className="btn-out px-cta">
              Все программы
            </a>
          </div>

          <div className="px-right">
            <span className="px-pointer" aria-hidden />
            <ul
              className="px-list"
              style={{ ['--px-idx' as string]: progTick, transition: progSnap ? 'none' : undefined }}
            >
              {Array.from({ length: PROG_N * 3 }).map((_, r) => (
                <li
                  key={r}
                  className={r === progTick ? 'on' : undefined}
                  onClick={() => setProgTick(Math.floor(progTick / PROG_N) * PROG_N + (r % PROG_N))}
                >
                  {PROG_SLIDES[r % PROG_N].n}
                </li>
              ))}
            </ul>
          </div>
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
            <div className="int-thumbs">
              {['interior/int-01.webp', 'interior/int-02.webp', 'interior/int-03.webp', 'interior/int-04.webp'].map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={`${ASSET}/${p}`} alt="Интерьер салона Barbie Spa" loading="lazy" />
              ))}
            </div>
            <a href={asset('/barbiespa/intereryi')} className="btn-out int-more-btn">Подробнее</a>
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
            <a href={asset('/barbiespa/stati')}>Статьи</a>
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
