'use client';

import { useEffect, useState } from 'react';
import { asset } from '@/lib/asset';
import { LangSwitcher } from '../shared/LangSwitcher';

/**
 * Единый хедер + главное меню barbiespa — один источник правды для ВСЕГО сайта
 * (главная, программы, статьи, …). Раньше хедер/меню были скопированы в каждый
 * экран по-своему (разные пункты, лишнее слово «МЕНЮ», иконка-пин, лого слева
 * на статьях) — теперь рендерится отсюда.
 *
 * transparentOnTop=true — главная: хедер прозрачный до скролла, solid после 60px.
 * По умолчанию (внутренние страницы) — всегда solid.
 */

// Единое главное меню. Все ссылки абсолютные (/barbiespa…) → работают с любой
// страницы; якоря (#masters/#interior/#contacts) ведут на соответствующую
// секцию главной. Пункт «Дополнения» — обязателен.
export const BARBIE_NAV: [string, string][] = [
  ['/barbiespa#masters', 'Наши мастера'],
  ['/barbiespa/programmy', 'Программы'],
  ['/barbiespa/programmy#addons', 'Дополнения'],
  ['/barbiespa/stati', 'Статьи'],
  ['/barbiespa#interior', 'Интерьер'],
  ['/barbiespa/vyezd', 'Выезд на дом'],
  ['/barbiespa/malchishnik', 'Мальчишник'],
  ['/barbiespa#contacts', 'Контакты'],
];

// Контакты салона (донор barbiespa.ru) — кружки в меню + дееплинк на Яндекс.Карты.
export const BARBIE_CONTACTS = {
  phone: '+7 (499) 520-03-10',
  tel: 'tel:+74995200310',
  whatsapp: 'https://wa.me/79289084389',
  telegram: 'https://t.me/Barbie_Spa',
  email: 'barbiespa@yandex.ru',
  address: 'Москва, Каланчевская 32/58 с1',
  maps: `https://yandex.ru/maps/?text=${encodeURIComponent('Москва, Каланчевская 32/58 строение 1')}`,
};

type Props = {
  phone?: string;
  phoneHref?: string;
  transparentOnTop?: boolean;
};

export function BarbieHeader({
  phone = '+7 (912) 076-81-28',
  phoneHref = 'tel:+79120768128',
  transparentOnTop = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!transparentOnTop);

  useEffect(() => {
    if (!transparentOnTop) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentOnTop]);

  return (
    <>
      <header className={scrolled ? 'bs-header solid' : 'bs-header'}>
        <div className="h-left">
          <div className="menu-btn" role="button" aria-label="Открыть меню" onClick={() => setMenuOpen(true)}>
            <span className="ln">
              <i />
              <i />
              <i />
            </span>
            <span className="menu-label">Меню</span>
          </div>
        </div>
        <a href={asset('/barbiespa')} className="logo">
          <div className="b display">BARBIE</div>
          <div className="s">SPA</div>
        </a>
        <div className="h-right">
          <a href={phoneHref} className="phone">
            {phone}
          </a>
          <a href={asset('/barbiespa#contacts')} className="contacts">
            Контакты
          </a>
          <span className="bs-lang">
            <LangSwitcher accent="#ec1c8f" />
          </span>
        </div>
      </header>

      <div className={menuOpen ? 'overlay open' : 'overlay'} onClick={() => setMenuOpen(false)} />
      <aside className={menuOpen ? 'drawer open' : 'drawer'}>
        <span className="close" role="button" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)}>
          ×
        </span>
        <nav>
          {BARBIE_NAV.map(([href, label], i) => (
            <a key={i} href={asset(href)} onClick={() => setMenuOpen(false)} style={{ ['--i' as string]: i }}>
              {label}
            </a>
          ))}
        </nav>
        <div className="bs-menu-contacts">
          <a className="bs-mc" href={BARBIE_CONTACTS.tel} aria-label="Позвонить">
            <svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2z" /></svg>
          </a>
          <a className="bs-mc" href={BARBIE_CONTACTS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.9c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.9C21.95 6.45 17.5 2 12.04 2zm0 18.15c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.25-8.25 8.25zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
          </a>
          <a className="bs-mc" href={BARBIE_CONTACTS.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
            <svg viewBox="0 0 24 24"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.23.23-.42.42-.83.42z" /></svg>
          </a>
          <a className="bs-mc" href={BARBIE_CONTACTS.maps} target="_blank" rel="noopener noreferrer" aria-label="Яндекс Карты">
            <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 4.7 7 13 7 13s7-8.3 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" /></svg>
          </a>
        </div>
        <a className="bs-menu-addr" href={BARBIE_CONTACTS.maps} target="_blank" rel="noopener noreferrer">
          {BARBIE_CONTACTS.address}
        </a>
      </aside>
    </>
  );
}
