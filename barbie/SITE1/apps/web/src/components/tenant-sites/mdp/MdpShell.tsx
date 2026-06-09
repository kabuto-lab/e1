'use client';

import '@/styles/massazh-dlya-par.css';
import { asset } from '@/lib/asset';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * MdpShell — обёртка тенанта massazh-dlya-par (Barbie Spa · массаж для пар,
 * full clone site-clones/massazh-dlya-par, .mdp-site, золотой акцент #d7c68b).
 * Шапка header.site + дровер + футер footer.site + LangSwitcher +
 * SiteTouchpoints (вместо прототипного .fab).
 */

const ACCENT = '#d7c68b';
const PHONE = '+7 (916) 007-32-59';
const PHONE_HREF = 'tel:+79160073259';
const LOGO = asset('/tenants/massazh-dlya-par/logo-barbie1-2.webp');

const NAV: [string, string][] = [
  ['/massazh-dlya-par', 'Главная'],
  ['/massazh-dlya-par#programs', 'Программы'],
  ['/massazh-dlya-par#girls', 'Девушки'],
  ['/massazh-dlya-par#salons', 'Наши салоны'],
  ['/massazh-dlya-par/zabronirovat', 'Забронировать'],
];

export function MdpShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="mdp-site"
      id="top"
      style={{
        ['--mdp-hero' as string]: `url(${asset('/tenants/massazh-dlya-par/m1000x1000a.webp')})`,
        ['--mdp-cta' as string]: `url(${asset('/tenants/massazh-dlya-par/photo_2022-11-09_19-11-38.webp')})`,
      }}
    >
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap"
      />

      <header className="site">
        <a className="brand" href="/massazh-dlya-par">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Barbie" />
          <b>Barbie&nbsp;Spa</b>
        </a>
        <div className="head-right">
          <a className="head-phone" href={PHONE_HREF}>
            {PHONE}
          </a>
          <a className="head-link" href="/massazh-dlya-par/zabronirovat">
            Контакты
          </a>
          <LangSwitcher accent={ACCENT} />
          <button className="menu-btn" onClick={() => setOpen(true)}>
            ☰ МЕНЮ
          </button>
        </div>
      </header>

      <div className={open ? 'drawer-mask open' : 'drawer-mask'} onClick={() => setOpen(false)} />
      <nav className={open ? 'drawer open' : 'drawer'}>
        <div className="dh">
          <b>Barbie Spa</b>
          <button className="x" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        {NAV.map(([href, label]) => (
          <a key={href} className="nav" href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <div className="dphone">
          Звоните, мы работаем 24/7
          <b>{PHONE}</b>
        </div>
      </nav>

      {children}

      <footer className="site">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO} alt="Barbie" style={{ height: 38 }} />
                <b>Barbie&nbsp;Spa</b>
              </div>
              <p>
                Эротический массаж для пар в Москве. Сеть салонов с программами для двоих, VIP-апартаментами и
                круглосуточной работой.
              </p>
            </div>
            <div className="foot-col">
              <h4>Навигация</h4>
              {NAV.map(([href, label]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </div>
            <div className="foot-col">
              <h4>Контакты</h4>
              <a href={PHONE_HREF}>{PHONE}</a>
              <a href="/massazh-dlya-par/zabronirovat">Записаться онлайн</a>
              <a href="/massazh-dlya-par#salons">Адреса салонов</a>
              <span style={{ color: 'var(--muted)', fontSize: '.9rem', display: 'block', padding: '5px 0' }}>
                Работаем 24/7
              </span>
            </div>
          </div>
          <div className="foot-bottom">© 2026 · Barbie Spa · массаж для пар · Москва</div>
        </div>
      </footer>
    </div>
  );
}
