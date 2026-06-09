'use client';

import { asset } from '@/lib/asset';
import '@/styles/5massage-com.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * M5cShell — обёртка тенанта 5massage-com (сеть салонов · сертификаты, full clone
 * site-clones/5massage-com, .m5c-site, красный акцент). Шапка + дровер + футер +
 * LangSwitcher + SiteTouchpoints. Контент статичный (без NAS-ростера).
 */

const ACCENT = '#c92929';
const PHONE = '+7 (495) 128-30-50';
const PHONE_HREF = 'tel:+74951283050';

const NAV: [string, string][] = [
  ['/5massage-com', 'Главная'],
  ['/5massage-com/sertifikaty', 'Сертификаты'],
  ['/5massage-com/salony', 'Салоны'],
  ['/5massage-com/programmy', 'Программы'],
  ['/5massage-com/kak-poluchit', 'Как получить'],
  ['/5massage-com/contacts', 'Контакты'],
];

export function M5cShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="m5c-site" id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap"
      />

      <header className="site">
        <div className="wrap hdr">
          <button className="burger" onClick={() => setOpen(true)}>
            ☰ МЕНЮ
          </button>
          <a href={asset("/5massage-com")} className="brand">
            5<span className="dot">·</span>MASSAGE
          </a>
          <nav className="hdr-nav">
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <span className="hdr-spacer" />
          <span className="hdr-phone accent">{PHONE}</span>
          <a href={asset("/5massage-com/contacts")} className="hdr-cta">
            Контакты
          </a>
          <LangSwitcher accent={ACCENT} />
        </div>
      </header>

      <div className={open ? 'drawer-bg open' : 'drawer-bg'} onClick={() => setOpen(false)} />
      <aside className={open ? 'drawer open' : 'drawer'}>
        <span className="close" onClick={() => setOpen(false)}>
          ✕
        </span>
        {NAV.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <div className="dphone">
          <a href={PHONE_HREF}>{PHONE}</a>
        </div>
      </aside>

      {children}

      <footer className="site">
        <div className="wrap foot">
          <div className="col-brand">
            <div className="b">
              5<span className="accent">·</span>MASSAGE
            </div>
            <p>Подарочные сертификаты на эротический массаж для мужчин. Четыре салона в разных районах Москвы.</p>
          </div>
          <div>
            <h5>Меню</h5>
            <div className="foot-nav">
              {NAV.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h5>Контакты</h5>
            <div className="foot-nav">
              <a href={PHONE_HREF}>{PHONE}</a>
              <a href={asset("/5massage-com/contacts")}>Контакты и адреса</a>
            </div>
          </div>
        </div>
        <div className="copy" style={{ textAlign: 'center', paddingTop: 16 }}>
          © 2026 · 5·MASSAGE · сеть салонов
        </div>
      </footer>
    </div>
  );
}
