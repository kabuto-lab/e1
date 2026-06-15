import { defineRouting } from 'next-intl/routing';
import { LOCALE_CODES, DEFAULT_LOCALE } from './locales';

/**
 * Маршрутизация i18n (next-intl). Единый источник локалей — ./locales.ts.
 * localePrefix:'as-needed' — `ru` (дефолт) без префикса (`/nebesaspa`),
 * остальные с префиксом (`/en/nebesaspa`, `/zh/nebesaspa`). Куки NEXT_LOCALE
 * запоминает выбор для SSR.
 */
export const routing = defineRouting({
  locales: LOCALE_CODES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
});
