'use client';

import { asset } from '@/lib/asset';
import '@/styles/eroticmassaj.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * EroticmassajShell — обёртка тенанта eroticmassaj (PODIUM SPA, full clone
 * site-clones/eroticmassaj, .em-site, красный акцент #c73b3b). Шапка
 * .site-header + дровер + футер .site-footer + LangSwitcher + SiteTouchpoints
 * (вместо прототипного .float).
 */

const ACCENT = '#c73b3b';
const PHONE = '+7 912 076-80-78';
const PHONE_HREF = 'tel:+79120768078';

const NAV: [string, string][] = [
  ['/eroticmassaj', 'Главная'],
  ['/eroticmassaj#programs', 'Программы'],
  ['/eroticmassaj#girls', 'Девушки'],
  ['/eroticmassaj/stocks', 'Акции'],
  ['/eroticmassaj/stock-bilet', 'Счастливый билет'],
  ['/eroticmassaj/stock-koktejl', 'Коктейльная вечеринка'],
  ['/eroticmassaj/stock-women', 'Мы рады не только мужчинам'],
  ['/eroticmassaj/stock-akcziya4', 'Днём с огнём'],
  ['/eroticmassaj/stock-eshhyo', 'Двойной экстаз'],
  ['/eroticmassaj/contacts', 'Контакты / Сертификаты'],
];

export function EroticmassajShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="em-site" id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap"
      />

      <header className="site-header">
        <div className="container hdr-inner">
          <a className="brand" href={asset("/eroticmassaj")}>
            PO<b>DIUM</b>
            <small>SPA</small>
          </a>
          <div className="hdr-spacer" />
          <a className="hdr-phone" href={PHONE_HREF}>
            {PHONE}
          </a>
          <a className="hdr-link" href={asset("/eroticmassaj/contacts")}>
            Контакты
          </a>
          <LangSwitcher accent={ACCENT} />
          <button className="menu-btn" onClick={() => setOpen(true)}>
            ☰ МЕНЮ
          </button>
        </div>
      </header>

      <div className={open ? 'drawer-overlay open' : 'drawer-overlay'} onClick={() => setOpen(false)} />
      <aside className={open ? 'drawer open' : 'drawer'}>
        <button className="close" onClick={() => setOpen(false)}>
          ×
        </button>
        <h4>НАВИГАЦИЯ</h4>
        {NAV.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <div className="dphone">
          <a href={PHONE_HREF}>{PHONE}</a>
          <div className="dsub">
            Москва, ул. Большая Молчановка 18
            <br />
            (м. Арбатская, м. Киевская)
          </div>
          <div className="dsub">Вс—Чт · 13:00-7:00 · Пт—Сб · 24 часа</div>
        </div>
      </aside>

      {children}

      <footer className="site-footer">
        <div className="container">
          <div className="foot-grid">
            <div className="foot-col">
              <a className="brand" href={asset("/eroticmassaj")} style={{ fontSize: 20 }}>
                PO<b>DIUM</b>
              </a>
              <p style={{ marginTop: 12 }}>Салон эротического массажа класса VIP в центре Москвы.</p>
            </div>
            <div className="foot-col">
              <h5>НАВИГАЦИЯ</h5>
              {NAV.slice(0, 5).map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </div>
            <div className="foot-col">
              <h5>АКЦИИ</h5>
              {NAV.slice(4, 9).map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </div>
            <div className="foot-col">
              <h5>КОНТАКТЫ</h5>
              <p>
                <a href={PHONE_HREF}>{PHONE}</a>
              </p>
              <p>Москва, ул. Большая Молчановка 18</p>
              <p>м. Арбатская · м. Киевская</p>
              <p>Вс—Чт 13:00-7:00 · Пт—Сб 24 ч</p>
            </div>
          </div>
          <div className="copy">© 2026 · PODIUM SPA · Москва</div>
        </div>
      </footer>
    </div>
  );
}
