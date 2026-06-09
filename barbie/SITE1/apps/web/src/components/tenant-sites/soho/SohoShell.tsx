'use client';

import { asset } from '@/lib/asset';
import '@/styles/soho-spa.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * SohoShell — общая обёртка всех страниц тенанта soho-spa (полный клон-дизайн
 * site-clones/soho-spa, .soho-site, золотой акцент). Шапка .site + дровер +
 * футер + LangSwitcher + SiteTouchpoints (вместо прототипного .fab).
 */

const ACCENT = '#c2a86c';
const PHONE = '+7 (912) 076-97-90';
const PHONE_HREF = 'tel:+79120769790';

const NAV: [string, string][] = [
  ['/soho-spa', 'Главная'],
  ['/soho-spa/girls', 'Девушки'],
  ['/soho-spa/price', 'Программы'],
  ['/soho-spa/visit', 'Выезд'],
  ['/soho-spa/actions', 'Акции'],
  ['/soho-spa/add-services', 'Дополнения'],
  ['/soho-spa/interier', 'Интерьер'],
  ['/soho-spa/videos', 'Видео'],
  ['/soho-spa/contacts', 'Контакты'],
];

export function SohoShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="soho-site" id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&family=Manrope:wght@400;500;600;700&display=swap"
      />

      <header className="site">
        <div className="wrap hdr">
          <a href={asset("/soho-spa")} className="brand">
            SOHO<b>SPA</b>
          </a>
          <div className="spacer" />
          <a href={PHONE_HREF} className="phone">
            {PHONE}
          </a>
          <a href={asset("/soho-spa/contacts")} className="hdr-link">
            Контакты
          </a>
          <LangSwitcher accent={ACCENT} />
          <button className="menu-btn" onClick={() => setOpen(true)}>
            ☰ Меню
          </button>
        </div>
      </header>

      <div className={open ? 'drawer-bg open' : 'drawer-bg'} onClick={() => setOpen(false)} />
      <aside className={open ? 'drawer open' : 'drawer'}>
        <span className="close" onClick={() => setOpen(false)}>
          ✕
        </span>
        <h4>Навигация</h4>
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
        <div className="wrap">
          <div className="fcols">
            <div>
              <a href={asset("/soho-spa")} className="brand">
                SOHO<b>SPA</b>
              </a>
              <p className="fdesc">
                Салон эротического массажа в центре Москвы. 7 комнат с джакузи, профессиональные мастера, полная
                конфиденциальность. 18+
              </p>
            </div>
            <div>
              <h4>Меню</h4>
              <nav>
                {NAV.map(([href, label]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
              </nav>
            </div>
            <div>
              <h4>Контакты</h4>
              <div className="fsoc">
                <a href={PHONE_HREF}>{PHONE}</a>
                <a href={asset("/soho-spa/contacts")}>Москва, Малый Харитоньевский, 9/13с5</a>
                <a href={asset("/soho-spa/contacts")}>м. Чистые пруды · Красные Ворота</a>
              </div>
            </div>
          </div>
          <div className="copy">© 2026 · SOHO SPA · Москва</div>
        </div>
      </footer>
    </div>
  );
}
