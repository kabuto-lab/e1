import { asset } from '@/lib/asset';
import '@/styles/nebesa.css';
import type { ReactNode } from 'react';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { NebesaHeader } from './NebesaHeader';
import { manrope, playfair, cormorant } from './fonts';
import { NebesaAgeGate } from './NebesaAgeGate';

/**
 * NebesaShell — общая обёртка ВНУТРЕННИХ страниц тенанта nebesaspa (НЕБОСВОД),
 * в едином стиле с главной (NebesaHome): .nebesa-site, «небесная» светлая тема,
 * шапка .hdr + футер .foot + LangSwitcher + SiteTouchpoints. Тело — в children.
 * Серверный компонент (без интерактива; LangSwitcher/SiteTouchpoints — клиентские острова).
 */

const PHONE = '+7 912 076-78-14';
const PHONE_HREF = 'tel:+79120767814';

const NAV: [string, string][] = [
  ['/nebesaspa', 'Главная'],
  ['/nebesaspa/girls', 'Девушки'],
  ['/nebesaspa/programs', 'Программы'],
  ['/nebesaspa/additions', 'Дополнения'],
  ['/nebesaspa/akcziya', 'Акции'],
  ['/nebesaspa/vyezd', 'Выезд'],
  ['/nebesaspa/interior', 'Интерьеры'],
  ['/nebesaspa/contacts', 'Контакты'],
  ['/nebesaspa/vecher-v-nebosvode', 'Вечер в Небосводе'],
  ['/nebesaspa/act', 'Первое знакомство'],
];

export function NebesaShell({ children }: { children: ReactNode }) {
  return (
    <div className={`nebesa-site ${manrope.variable} ${playfair.variable} ${cormorant.variable}`} id="top">
      <NebesaAgeGate />
      <SiteTouchpoints accent="#2ba3e5" fg="#fff" />
      {/* Шрифты — через next/font (см. ./fonts), без внешнего <link>. */}

      <NebesaHeader />

      {children}

      <footer className="foot" id="contacts">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <img className="foot-logo" src={asset('/tenants/nebesaspa/nebesalogo2bel.svg')} alt="NEBOSVOD" />
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
