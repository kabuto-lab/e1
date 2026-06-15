'use client';

import '@/styles/barbiespa.css';
import '@/styles/barbiespa-programs.css';
import { asset } from '@/lib/asset';
import { useState } from 'react';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * BarbiePrograms — страница «Программы» тенанта barbiespa (порт
 * barbie/barbiespa/programmy.html). Шапка/дровер/футер — общие с BarbieSpaHome
 * (классы .bs-site из barbiespa.css). Каталог программ/дополнений — статические
 * данные прототипа. Флоатинг — общий SiteTouchpoints (розовый).
 */

const ASSET = asset('/tenants/barbiespa');
const fmt = (n: number) => '₽ ' + n.toLocaleString('ru-RU');

const NAV: [string, string][] = [
  ['/barbiespa#masters', 'Наши мастера'],
  ['/barbiespa/programmy', 'Программы'],
  ['/barbiespa/programmy#addons', 'Дополнения'],
  ['/barbiespa#interior', 'Интерьер'],
  ['/barbiespa#contacts', 'Контакты'],
];

interface Cat {
  title: string;
  cls?: 'vip' | 'delux' | '';
  tag?: string;
  items: { n: string; img: string; p: [number, string][] }[];
}

const CATS: Cat[] = [
  {
    title: 'Основные программы',
    items: [
      { n: 'Розовый экспресс', img: 'nachalo.webp', p: [[5000, '30 мин']] },
      { n: 'Прикосновение Барби', img: 'mix.webp', p: [[5000, '60 мин']] },
      { n: 'Сладкий контроль', img: '968957.webp', p: [[5500, '60 мин']] },
      { n: 'Горячие желания', img: 'da200d36e9a2feb267c6cf61bf06f1b7.webp', p: [[7000, '60 мин']] },
    ],
  },
  {
    title: 'VIP программы',
    cls: 'vip',
    tag: 'VIP',
    items: [
      { n: 'Розовая чакра', img: 'hqrb51531017417.webp', p: [[13000, '60 мин'], [15000, '90 мин']] },
      { n: 'В твоей власти', img: 'e9y29rlwuaudrvz.webp', p: [[13000, '60 мин'], [15000, '90 мин']] },
      { n: 'Пенная фантазия', img: 'ekzotika.webp', p: [[13000, '75 мин'], [16000, '100 мин']] },
      { n: 'Сладкий поцелуй', img: 'devushki-s-dlinnymi-rusymi-volosami-44-foto-11.webp', p: [[16000, '70 мин']] },
    ],
  },
  {
    title: 'Программы для пар',
    items: [
      { n: 'Между нами', img: 'dlyapar.webp', p: [[10000, '60 мин']] },
      { n: 'Личное желание', img: 'for-couples-lux.webp', p: [[12000, '90 мин'], [16000, '120 мин']] },
      { n: 'Двойное искушение', img: 'kartinki-strast-38.webp', p: [[18000, '60 мин']] },
      { n: 'Личное пламя', img: 'photo_2026-02-13_16-20-02.webp', p: [[24000, '90 мин'], [34000, '120 мин']] },
      { n: 'Одно дыхание на двоих', img: 'photo_2026-02-13_16-19-59.webp', p: [[28000, '120 мин']] },
      { n: 'За гранью желаний', img: 'photo_2026-02-13_16-19-57.webp', p: [[40000, '120 мин']] },
    ],
  },
  {
    title: 'Программы для девушек',
    items: [
      { n: 'Lady`s relax', img: '5329ff70917363.5bb395b7b031e.webp', p: [[10000, '60 мин']] },
      { n: 'Йони массаж', img: 'joni.webp', p: [[13000, '75 мин']] },
      { n: 'Тёплый поцелуй', img: 'c4c173399ffc9e7e937e531bb66ffe8a.webp', p: [[25000, '120 мин']] },
      { n: 'Церемония Богини', img: '580e355f2f00b840532372b86a0de76d.webp', p: [[35000, '150 мин']] },
      { n: 'Miss X', img: 'miss-x.webp', p: [[45000, '90 мин']] },
    ],
  },
  {
    title: 'Delux программы',
    cls: 'delux',
    tag: 'DELUX',
    items: [
      { n: 'Слияние тел', img: '3030-scaled.webp', p: [[18000, '90 мин'], [22000, '120 мин']] },
      { n: 'Барби шоу', img: '1471247482k8gn4.webp', p: [[26000, '75 мин']] },
      { n: 'Роскошное Барби шоу', img: '4444.webp', p: [[40000, '90 мин']] },
      { n: 'Вечеринка искушений в Барби', img: '76789.webp', p: [[80000, '180 мин']] },
      { n: 'Всё включено', img: '333.webp', p: [[114000, '240 мин']] },
    ],
  },
];

const ADDONS: { n: string; pr: string; img: string }[] = [
  { n: 'Клубничка', pr: '1 000', img: '1696533974_gas-kvas-com-p-kartinki-klubnichka-9-1024x819-1.webp' },
  { n: 'Контроль окончания', pr: '1 000', img: '1704279188_staisha-top-p-krovat-s-naruchnikami-dlya-ruk-krasivo-41-e1712760984530-1024x652-1.webp' },
  { n: 'Поцелуи по телу', pr: '1 000', img: 'poczelui-1024x683-1.webp' },
  { n: 'Прикосновения', pr: '1 500', img: 'miniatiura-1024x678-1.webp' },
  { n: 'Фетиш', pr: '1 500', img: '3erwc2w-e1712759830964-1024x699-1.webp' },
  { n: 'Второй релакс', pr: '2 000', img: '1422134401_1662617501-1024x682-1.webp' },
  { n: 'Игрушки', pr: '2 000', img: 'how-sex-toys-are-made.webp' },
  { n: 'Джакузи / Сауна / Хамам', pr: '3 000', img: 'image_2024-04-10_16-54-33-1024x1015-1.webp' },
  { n: 'Яйцо тенге', pr: '3 000', img: 'image_2024-04-10_15-03-38.webp' },
  { n: 'Массаж простаты', pr: '3 000', img: '58ddf6a1-e229-4a32-a930-161825706005.webp' },
  { n: 'Пип-шоу', pr: '3 000–5 000', img: 'krasivye-devushki-v-posteli-78-foto-31-1024x768-1.webp' },
  { n: 'Страпон', pr: '5 000', img: '04668682-c49e-4558-916f-f9e2eeae5268.webp' },
];

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

interface Props {
  phone?: string;
  phoneHref?: string;
}

export function BarbiePrograms({ phone = '+7 (912) 076-81-28', phoneHref = 'tel:+79120768128' }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="bs-site"
      id="top"
      style={{
        ['--bs-banner' as string]: `url(${ASSET}/banner.webp)`,
        ['--bs-tg' as string]: `url(${ASSET}/da200d36e9a2feb267c6cf61bf06f1b7.webp)`,
        ['--bs-cert' as string]: `url(${ASSET}/sert-fic.webp)`,
      }}
    >
      <SiteTouchpoints accent="#ec1c8f" />

      {/* HEADER (всегда solid на внутренней странице) */}
      <header className="bs-header solid">
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
        <a href={asset("/barbiespa")} className="logo">
          <div className="b display">BARBIE</div>
          <div className="s">SPA</div>
        </a>
        <div className="h-right">
          <a href={phoneHref} className="phone">
            {phone}
          </a>
          <a href={asset("/barbiespa#contacts")} className="contacts">
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

      {/* PAGE HEAD */}
      <section className="page-head wrap">
        <div className="crumbs">
          <a href={asset("/barbiespa")}>Главная</a> — Программы
        </div>
        <h1>
          Наши <span>программы</span>
        </h1>
        <div className="notice">
          <p>
            Если вы хотите попасть к любимому мастеру, <b>бронируйте время заранее!</b>
          </p>
          <p>
            Дорогие гости! На данный момент оплата за услуги принимается <b>только наличными</b> — просим
            заблаговременно снять в банкомате нужную сумму.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <main className="wrap">
        {CATS.map((cat) => (
          <section className="cat" key={cat.title}>
            <h2 className={`cat-title ${cat.cls ?? ''}`}>
              {cat.title}
              {cat.tag ? <small> {cat.tag}</small> : null}
            </h2>
            <div className="pp-grid">
              {cat.items.map((it) => (
                <div className="pp-card" key={it.n}>
                  <div className="pp-media">
                    {cat.tag ? <span className={`pp-tag ${cat.cls ? 'gold' : ''}`}>{cat.tag}</span> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${ASSET}/${it.img}`} loading="lazy" alt={it.n} />
                  </div>
                  <div className="pp-body">
                    <div className="pp-name">{it.n}</div>
                    <div className="pp-prices">
                      {it.p.map(([rub, dur], i) => (
                        <div className="pp-row" key={i}>
                          <span className="pp-rub">{fmt(rub)}</span>
                          <span className="pp-dur">
                            <ClockIcon />
                            {dur}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pp-more">
                      <a href={phoneHref}>Подробнее →</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ADD-ONS */}
      <section className="addons wrap" id="addons">
        <div className="cat-title">Дополнительно в Barbie Spa</div>
        <div className="ao-grid">
          {ADDONS.map((a) => (
            <div className="ao-card" key={a.n}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ASSET}/${a.img}`} loading="lazy" alt={a.n} />
              <div className="ao-body">
                <span className="ao-name">{a.n}</span>
                <span className="ao-price">₽ {a.pr}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CERT CTA */}
      <section className="cert">
        <div className="inner">
          <h2>Подарочные сертификаты в нашем салоне!</h2>
          <p>Приобретите сертификат на любую сумму — отличный подарок к любому празднику.</p>
          <a href={phoneHref} className="btn-fill">
            Подробнее
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bs-footer pg">
        <div className="wrap f-grid">
          <div>
            <a href={asset("/barbiespa#masters")}>Наши мастера</a>
            <a href={asset("/barbiespa/programmy#addons")}>Дополнения</a>
            <a href={asset("/barbiespa")}>Главная</a>
          </div>
          <div>
            <a href={asset("/barbiespa/programmy")}>Программы</a>
            <a href={asset("/barbiespa#interior")}>Интерьер</a>
            <a href={asset("/barbiespa#contacts")}>Контакты</a>
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
    </div>
  );
}
