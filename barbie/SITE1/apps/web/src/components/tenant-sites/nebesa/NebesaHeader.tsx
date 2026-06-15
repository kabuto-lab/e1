import { asset } from '@/lib/asset';
import { LangSwitcher } from '../shared/LangSwitcher';
import { NebesaBurger } from './NebesaBurger';

/**
 * NebesaHeader — ЕДИНАЯ шапка тенанта nebesaspa (НЕБОСВОД) для всех страниц:
 * и главной (NebesaHome), и внутренних (NebesaShell). Один логотип, одна
 * навигация на реальные маршруты, одни контакты — чтобы хедер не отличался
 * от страницы к странице. Презентационный компонент без состояния
 * (LangSwitcher — клиентский остров).
 */

const PHONE = '+7 912 076-78-14';
const PHONE_HREF = 'tel:+79120767814';
const TG_URL = 'https://t.me/NebosvodSpa';
const WA_URL = 'https://wa.me/79120767814';
const ACCENT = '#6aa7d8';

// Навигация — только реальные страницы тенанта (никаких якорей «в никуда»).
const NAV: [string, string][] = [
  ['/nebesaspa/girls', 'Девушки'],
  ['/nebesaspa/programs', 'Программы'],
  ['/nebesaspa/additions', 'Дополнения'],
  ['/nebesaspa/akcziya', 'Акции'],
  ['/nebesaspa/vyezd', 'Выезд'],
  ['/nebesaspa/interior', 'Интерьеры'],
  ['/nebesaspa/contacts', 'Контакты'],
];

export function NebesaHeader({
  phone = PHONE,
  phoneHref = PHONE_HREF,
}: {
  phone?: string;
  phoneHref?: string;
}) {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <a className="logo" href={asset('/nebesaspa')} aria-label="NEBOSVOD">
          <img src={asset('/tenants/nebesaspa/nebesalogo2.svg')} alt="NEBOSVOD" />
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
          <div className="soc">
            <a className="tg" href={TG_URL} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
                <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
              </svg>
            </a>
            <a className="wa" href={WA_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </a>
          </div>
          <div className="phone">{phone}</div>
          <a className="btn btn-blue" href={phoneHref}>
            Записаться
          </a>
        </div>
        <NebesaBurger nav={NAV} phone={phone} phoneHref={phoneHref} tgUrl={TG_URL} waUrl={WA_URL} />
      </div>
    </header>
  );
}
