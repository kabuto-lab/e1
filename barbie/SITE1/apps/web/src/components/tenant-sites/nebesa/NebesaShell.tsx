import { asset, tpath } from '@/lib/asset';
import '@/styles/nebesa.css';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { SiteTouchpoints } from '../shared/SiteTouchpoints';
import { NEBESA_TOUCHPOINTS, NEBESA_ROUTE } from './nebesa-contacts';
import { NebesaHeader } from './NebesaHeader';
import { manrope, playfair, cormorant } from './fonts';
import { NebesaAgeGate } from './NebesaAgeGate';

/**
 * NebesaShell — общая обёртка ВНУТРЕННИХ страниц тенанта nebesaspa (НЕБОСВОД),
 * в едином стиле с главной (NebesaHome): .nebesa-site, «небесная» светлая тема,
 * шапка .hdr + футер .foot + LangSwitcher + SiteTouchpoints. Тело — в children.
 * Серверный async-компонент (i18n через getTranslations; LangSwitcher/SiteTouchpoints — клиентские острова).
 */

const PHONE = '+7 912 076-78-14';
const PHONE_HREF = 'tel:+79120767814';

// [sub, i18nKey(common.nav.*)] — sub: подпуть тенанта без слага ('' = главная).
// href строится через tpath('nebesaspa', sub) — режим «тенант в корне» на домене.
const NAV: [string, string][] = [
  ['', 'home'],
  ['girls', 'girls'],
  ['programs', 'programs'],
  ['additions', 'additions'],
  ['akcziya', 'promos'],
  ['vyezd', 'outcall'],
  ['interior', 'interiors'],
  ['contacts', 'contacts'],
  ['vecher-v-nebosvode', 'eveningNebosvod'],
  ['act', 'firstMeeting'],
];

export async function NebesaShell({ children }: { children: ReactNode }) {
  const t = await getTranslations('nebesa');
  const tc = await getTranslations('common');
  return (
    <div className={`nebesa-site ${manrope.variable} ${playfair.variable} ${cormorant.variable}`} id="top">
      <NebesaAgeGate />
      <SiteTouchpoints tp={NEBESA_TOUCHPOINTS} accent="#2ba3e5" fg="#fff" />
      {/* Шрифты — через next/font (см. ./fonts), без внешнего <link>. */}

      <NebesaHeader />

      {children}

      <footer className="foot" id="contacts">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <img className="foot-logo" src={asset('/tenants/nebesaspa/nebesalogo2bel.svg')} alt="NEBOSVOD" />
              <p>{t('footer.taglineShell')}</p>
            </div>
            <div>
              <h4>{t('footer.sections')}</h4>
              <ul>
                {NAV.slice(1).map(([sub, key]) => (
                  <li key={sub}>
                    <a href={tpath('nebesaspa', sub)}>{tc(`nav.${key}`)}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{t('footer.hoursTitle')}</h4>
              <ul>
                <li>{tc('hours.monThu')}: {tc('hours.night')}</li>
                <li>{tc('hours.friSun')}: {tc('hours.allDay')}</li>
              </ul>
            </div>
            <div>
              <h4>{t('footer.contacts')}</h4>
              <ul>
                <li>
                  <a href={PHONE_HREF}>{PHONE}</a>
                </li>
                <li>
                  <a href="https://t.me/NebosvodSpa" target="_blank" rel="noopener noreferrer">
                    Telegram
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/79120767814" target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href={NEBESA_ROUTE.href}>{NEBESA_ROUTE.label}</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>{t('footer.copyright')}</span>
            <span>{t('footer.ageNote')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
