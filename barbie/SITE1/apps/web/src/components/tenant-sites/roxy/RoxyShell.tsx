'use client';

import { asset } from '@/lib/asset';
import '@/styles/roxy.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * RoxyShell — общая обёртка ВНУТРЕННИХ страниц тенанта roxy-spa, в едином стиле
 * с главной (RoxyHome): .roxy-site, циан-акцент, шапка .rx-header + дровер +
 * футер .rx-footer + LangSwitcher + SiteTouchpoints. Тело — в children.
 */

const ACCENT = '#38bdf8';
const PHONE = '8 (499) 757-2501';
const PHONE_HREF = 'tel:+74997572501';

const NAV: [string, string][] = [
  ['/roxy-spa', 'Главная'],
  ['/roxy-spa/nashi-mastera', 'Наши мастера'],
  ['/roxy-spa/programmyi', 'Программы'],
  ['/roxy-spa/intereryi', 'Интерьеры'],
  ['/roxy-spa/massazh-i-vyiezd-na-dom', 'Выезд на дом'],
  ['/roxy-spa/akczii', 'Акции'],
  ['/roxy-spa/rabota-dlya-devushek', 'Работа'],
  ['/roxy-spa/blog', 'Блог'],
  ['/roxy-spa/kontaktyi', 'Контакты'],
];

export function RoxyShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="roxy-site" id="top">
      <SiteTouchpoints accent={ACCENT} />

      <header className="rx-header solid">
        <div className="nav-left">
          <div className="burger" onClick={() => setOpen(true)}>
            <span className="lines">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
        <a href={asset("/roxy-spa")} className="logo">
          <div className="mark gold-text">ROXY</div>
          <div className="sub">MEN&apos;S RELAX CLUB</div>
        </a>
        <div className="nav-right">
          <a className="phone" href={PHONE_HREF}>
            {PHONE}
          </a>
          <a className="contacts-link" href={asset("/roxy-spa/kontaktyi")}>
            КОНТАКТЫ
          </a>
          <LangSwitcher accent={ACCENT} />
        </div>
      </header>

      {children}

      <footer className="rx-footer">
        <div className="gold-text">ROXY</div>
        <div style={{ marginTop: 8 }}>© ROXY Men&apos;s Relax Club · 2026</div>
      </footer>

      <div className={open ? 'scrim open' : 'scrim'} onClick={() => setOpen(false)} />
      <nav className={open ? 'drawer open' : 'drawer'}>
        <div className="close" onClick={() => setOpen(false)}>
          ×
        </div>
        {NAV.map(([href, label]) => (
          <a key={href} href={asset(href)} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <div className="book">
          <a href={PHONE_HREF}>Записаться</a>
        </div>
      </nav>
    </div>
  );
}
