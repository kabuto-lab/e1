import { asset } from '@/lib/asset';
import '@/styles/nebesa.css';
import type { ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * NebesaShell — общая обёртка ВНУТРЕННИХ страниц тенанта nebesaspa (НЕБОСВОД),
 * в едином стиле с главной (NebesaHome): .nebesa-site, «небесная» светлая тема,
 * шапка .hdr + футер .foot + LangSwitcher + SiteTouchpoints. Тело — в children.
 * Серверный компонент (без интерактива; LangSwitcher/SiteTouchpoints — клиентские острова).
 */

const PHONE = '+7 912 076-78-14';
const PHONE_HREF = 'tel:+79120767814';
const ACCENT = '#6aa7d8';

const NAV: [string, string][] = [
  ['/nebesaspa', 'Главная'],
  ['/nebesaspa/girls', 'Девушки'],
  ['/nebesaspa/programs', 'Программы'],
  ['/nebesaspa/additions', 'Дополнения'],
  ['/nebesaspa/vyezd', 'Выезд'],
  ['/nebesaspa/interior', 'Интерьеры'],
  ['/nebesaspa/contacts', 'Контакты'],
];

export function NebesaShell({ children }: { children: ReactNode }) {
  return (
    <div className="nebesa-site" id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap"
      />

      <header className="hdr">
        <div className="wrap hdr-in">
          <a href={asset("/nebesaspa")} className="logo">
            NEBOSVOD
          </a>
          <nav className="nav">
            {NAV.map(([href, label]) => (
              <a key={href} href={asset(href)}>
                {label}
              </a>
            ))}
          </nav>
          <div className="hours">
            <div>
              <b>пн – чт:</b>
              <span>21:00 – 7:00</span>
            </div>
            <div>
              <b>пт – вс:</b>
              <span>Круглосуточно</span>
            </div>
          </div>
          <div className="contact">
            <LangSwitcher accent={ACCENT} />
            <div className="phone">{PHONE}</div>
            <a className="btn btn-blue" href={PHONE_HREF}>
              Записаться
            </a>
          </div>
        </div>
      </header>

      {children}

      <footer className="foot" id="contacts">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="logo serif">NEBOSVOD</div>
              <p>
                Спа-салон эротического массажа в Москве. Работаем по предварительной записи. Полная
                конфиденциальность гарантирована.
              </p>
            </div>
            <div>
              <h4>Разделы</h4>
              <ul>
                {NAV.slice(1).map(([href, label]) => (
                  <li key={href}>
                    <a href={asset(href)}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Часы работы</h4>
              <ul>
                <li>пн – чт: 21:00 – 7:00</li>
                <li>пт – вс: круглосуточно</li>
              </ul>
            </div>
            <div>
              <h4>Контакты</h4>
              <ul>
                <li>
                  <a href={PHONE_HREF}>{PHONE}</a>
                </li>
                <li>
                  <a href="https://t.me/NebosvodSpa">Telegram</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 NEBOSVOD. Все права защищены.</span>
            <span>18+ · Услуги массажа</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
