import '@/styles/pentagon.css';
import type { ReactNode } from 'react';
import { LangSwitcher } from '../shared/LangSwitcher';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';

/**
 * PentagonShell — общая обёртка ВНУТРЕННИХ страниц тенанта pentagon, в едином
 * стиле с главной (PentagonHome): .pg-site, шапка .pg-header + футер .pg-footer
 * + LangSwitcher + SiteTouchpoints. Серверный компонент. Тело — в children.
 */

const ACCENT = '#dc2626';
const PHONE = '+7 (912) 076-97-49';
const PHONE_HREF = 'tel:+79120769749';

const NAV: [string, string][] = [
  ['/pentagon', 'Главная'],
  ['/pentagon/girl', 'Девушки'],
  ['/pentagon/program', 'Программы'],
  ['/pentagon/additions', 'Дополнения'],
  ['/pentagon/interior', 'Интерьер'],
  ['/pentagon/bachelor-party', 'Мальчишник'],
  ['/pentagon/outcall-massage', 'Выезд'],
  ['/pentagon/video', 'Видео'],
  ['/pentagon/contacts', 'Контакты'],
];

export function PentagonShell({ children }: { children: ReactNode }) {
  return (
    <div className="pg-site" id="top">
      <SiteTouchpoints accent={ACCENT} />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" />

      <header className="pg-header">
        <div className="wrap nav">
          <a href="/pentagon" className="brand">
            <span className="word">PENTAGON</span>
            <span className="sub">spa salon</span>
          </a>
          <nav className="menu">
            {NAV.slice(1).map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="hours">
            <div className="hour">
              <span className="lbl">пн-чт:</span>
              <span className="val">13:00–07:00</span>
            </div>
            <div className="hour">
              <span className="lbl">птн-вс:</span>
              <span className="val">24 часа</span>
            </div>
          </div>
          <LangSwitcher accent={ACCENT} />
          <a href={PHONE_HREF} className="phone">
            {PHONE}
          </a>
          <a href="/pentagon/contacts" className="btn btn-light">
            Записаться
          </a>
        </div>
      </header>

      {children}

      <footer className="pg-footer">
        <div className="wrap">
          <div className="fcols">
            <div>
              <div className="word">PENTAGON</div>
              <div className="sub">spa salon</div>
              <p>Спа-салон эротического массажа. Работаем по предварительной записи.</p>
            </div>
            <div>
              <h4>Разделы</h4>
              <ul>
                {NAV.slice(1).map(([href, label]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Контакты</h4>
              <ul>
                <li>{PHONE}</li>
                <li>Москва, центр</li>
                <li>Круглосуточно (птн-вс)</li>
              </ul>
            </div>
            <div>
              <h4>Время работы</h4>
              <ul>
                <li>пн-чт: 13:00–07:00</li>
                <li>птн-вс: 24 часа</li>
              </ul>
            </div>
          </div>
          <div className="fbot">
            <div>
              <span className="age">18+</span>Сайт не является публичной офертой.
            </div>
            <div>© 2026 PENTAGON spa salon</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
