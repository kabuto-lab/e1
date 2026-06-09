'use client';

import { asset } from '@/lib/asset';
import '@/styles/etalonspa.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * EtalonShell — обёртка тенанта etalonspa (Etalon, люкс, full clone
 * site-clones/etalonspa, .et-site, красный акцент). Шапка .hdr + дровер +
 * футер .ftr + LangSwitcher + SiteTouchpoints.
 */

const ACCENT = '#f04234';
const PHONE = '+7 912 076-93-01';
const PHONE_HREF = 'tel:+79120769301';

const NAV: [string, string][] = [
  ['/etalonspa', 'Главная'],
  ['/etalonspa/programs', 'Услуги'],
  ['/etalonspa/staff', 'Мастера'],
  ['/etalonspa/interior', 'Интерьер'],
  ['/etalonspa/promo', 'Акции'],
  ['/etalonspa/vacancy', 'Вакансии'],
  ['/etalonspa/blog', 'Блог'],
  ['/etalonspa/contacts', 'Контакты'],
];

export function EtalonShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="et-site" id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap"
      />

      <header className="hdr">
        <div className="wrap hdr-in">
          <a href={asset("/etalonspa")} className="brand">
            E<b>talon</b>
          </a>
          <div className="hdr-right">
            <a href={PHONE_HREF} className="hdr-phone">
              {PHONE}
            </a>
            <a href={asset("/etalonspa/contacts")} className="hdr-link">
              Контакты
            </a>
            <LangSwitcher accent={ACCENT} />
            <button className="menu-btn" onClick={() => setOpen(true)}>
              ☰ Меню
            </button>
          </div>
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

      <footer className="ftr">
        <div className="wrap">
          <div className="ftr-grid">
            <div>
              <a href={asset("/etalonspa")} className="brand">
                E<b>talon</b>
              </a>
              <p>
                Салон эротического массажа для мужчин в Москве. Чувственные программы, очаровательные мастера, полная
                конфиденциальность. 24/7.
              </p>
            </div>
            <div>
              <h5>Навигация</h5>
              <nav>
                {NAV.slice(0, 4).map(([href, label]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
              </nav>
            </div>
            <div>
              <h5>Ещё</h5>
              <nav>
                {NAV.slice(4).map(([href, label]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
              </nav>
            </div>
            <div>
              <h5>Контакты</h5>
              <nav>
                <a href={PHONE_HREF}>{PHONE}</a>
                <a href={asset("/etalonspa/contacts")}>Адрес и схема</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
