'use client';

import { asset } from '@/lib/asset';
import '@/styles/imperiumspa.css';
import { useState, type ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * ImperiumShell — общая обёртка всех страниц тенанта imperiumspa
 * (порт site-clones/imperiumspa: шапка + дровер + футер, .imp-site).
 * Флоатинг прототипа (.fab) заменён единым SiteTouchpoints; в шапке — LangSwitcher.
 * Тело страницы передаётся в children (серверный JSX внутри клиентской обёртки — ок).
 */

const PHONE = '+7 (912) 076-91-73';
const PHONE_HREF = 'tel:+79120769173';
const ACCENT = '#cfb068';

const NAV: [string, string, string][] = [
  ['/imperiumspa', 'Главная', 'index'],
  ['/imperiumspa/services', 'Программы', 'services'],
  ['/imperiumspa/staff', 'Девушки', 'staff'],
  ['/imperiumspa/add-services', 'Доп. услуги', 'add-services'],
  ['/imperiumspa/visit', 'Выезд', 'visit'],
  ['/imperiumspa/stocks', 'Акции', 'stocks'],
  ['/imperiumspa/interiors', 'Интерьеры', 'interiors'],
  ['/imperiumspa/video', 'Видео', 'video'],
  ['/imperiumspa/contacts', 'Контакты', 'contacts'],
];

export function ImperiumShell({ active, children }: { active?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="imp-site" id="top">
      <SiteTouchpoints accent={ACCENT} />

      <header className="site">
        <div className="wrap hd">
          <a href={asset("/imperiumspa")} className="brand">
            IMPERIUM<small>SPA MOSCOW</small>
          </a>
          <nav className="hd-nav">
            {NAV.map(([href, label, key]) => (
              <a key={key} href={href} className={active === key ? 'active' : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <a href={PHONE_HREF} className="hd-phone">
            {PHONE}
          </a>
          <LangSwitcher accent={ACCENT} />
          <button className="menu-btn" onClick={() => setOpen(true)}>
            ☰ МЕНЮ
          </button>
        </div>
      </header>

      <div className={open ? 'overlay open' : 'overlay'} onClick={() => setOpen(false)} />
      <aside className={open ? 'drawer open' : 'drawer'}>
        <button className="drawer-close" onClick={() => setOpen(false)}>
          ×
        </button>
        {NAV.map(([href, label, key]) => (
          <a key={key} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
        <a href={PHONE_HREF} className="dphone">
          {PHONE}
        </a>
      </aside>

      <main>{children}</main>

      <footer className="site">
        <div className="wrap">
          <div className="ft-top">
            <div className="ft-brand">
              <div className="brand">
                IMPERIUM<small>SPA MOSCOW</small>
              </div>
              <p>
                Салон эротического массажа в центре Москвы. Тематические программы, вдохновлённые культурой Древней
                Греции и Рима, и лучшие массажистки столицы.
              </p>
            </div>
            <div className="ft-col">
              <h4>Навигация</h4>
              <div className="ft-nav">
                {NAV.map(([href, label, key]) => (
                  <a key={key} href={href}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div className="ft-col">
              <h4>Контакты</h4>
              <a href={PHONE_HREF}>{PHONE}</a>
              <div>г. Москва, ул. Мясницкая, 41В</div>
              <div>м. Красные ворота, м. Чистые пруды</div>
              <div>ПН-СР: 13:00-07:00 · ЧТ-ВС: круглосуточно</div>
            </div>
          </div>
          <div className="ft-bot">© 2026 · IMPERIUM SPA · Москва</div>
        </div>
      </footer>
    </div>
  );
}
