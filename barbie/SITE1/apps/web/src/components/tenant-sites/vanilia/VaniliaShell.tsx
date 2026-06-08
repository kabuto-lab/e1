'use client';

import '@/styles/vanilia.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * VaniliaShell — общая обёртка ВНУТРЕННИХ страниц тенанта 5massage (Vanilia),
 * в едином стиле с главной (VaniliaHome): .vanilia-site, фиолетовая палитра,
 * тема dark/light, шапка + дровер + контакты-футер + LangSwitcher + SiteTouchpoints.
 * Тело страницы — в children (контент берётся из site-clones/5massage-ru,
 * но верстается классами vanilia.css).
 */

const ACCENT = '#caa15a';
const PHONE = '+7 912 076-72-23';
const PHONE_HREF = 'tel:+79120767223';

const NAV: [string, string][] = [
  ['/5massage', 'Главная'],
  ['/5massage/girls', 'Девушки'],
  ['/5massage/services', 'Услуги'],
  ['/5massage/visit', 'Выезд'],
  ['/5massage/add-services', 'Дополнения'],
  ['/5massage/interer', 'Интерьер'],
  ['/5massage/manparty', 'Мальчишник'],
  ['/5massage/stocks', 'Акции'],
  ['/5massage/contacts', 'Контакты'],
];

export function VaniliaShell({
  children,
  phone = PHONE,
  phoneHref = PHONE_HREF,
  address = 'Москва, Лучников переулок, 7/4с5',
}: {
  children: ReactNode;
  phone?: string;
  phoneHref?: string;
  address?: string;
}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="vanilia-site" data-theme={theme} id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Great+Vibes&display=swap"
      />

      <header>
        <div className="wrap hdr">
          <a href="/5massage" className="logo">
            Vanilia<small>SPA SALON</small>
          </a>
          <button className="burger" aria-label="Меню" onClick={() => setMenuOpen(true)}>
            <i />
            <i />
            <i />
          </button>
          <nav className="main">
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="hdr-right">
            <button className="round-btn" title="Тема" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? (
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              ) : (
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                </svg>
              )}
            </button>
            <LangSwitcher accent={ACCENT} />
            <a className="phone" href={phoneHref}>
              {phone}
            </a>
          </div>
        </div>
      </header>

      {children}

      <section id="contacts" className="contacts">
        <div className="wrap">
          <h2>Контакты</h2>
          <div className="c-cols">
            <div>
              <div className="lab">Адрес</div>
              {address}
              <div className="metro" style={{ marginTop: 8 }}>
                М. Лубянка
                <br />
                М. Китай-город
              </div>
            </div>
            <div>
              <div className="lab">Телефон</div>
              <a href={phoneHref}>{phone}</a>
            </div>
            <div>
              <div className="lab">Режим работы</div>
              24/7, по предварительной записи
            </div>
            <div />
          </div>
          <div className="map">Карта (Yandex / Google Maps — плейсхолдер)</div>
        </div>
        <div className="wrap">
          <footer>
            <span>2016–2026 © 5massage.ru · все права защищены</span>
            <a href="/5massage">На главную</a>
          </footer>
        </div>
      </section>

      <div className={menuOpen ? 'scrim open' : 'scrim'} onClick={() => setMenuOpen(false)} />
      <nav className={menuOpen ? 'drawer open' : 'drawer'}>
        <span className="close" onClick={() => setMenuOpen(false)}>
          ×
        </span>
        {NAV.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setMenuOpen(false)}>
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
