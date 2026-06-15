/**
 * Единый источник локалей платформы (i18n). Используется LangSwitcher'ом,
 * next-intl-конфигом и middleware. Менять список языков — только здесь.
 *
 * См. docs/i18n-plan.md. Default — ru (без префикса при localePrefix:'as-needed').
 */

export interface LocaleMeta {
  /** ISO-код (используется в URL-префиксе и <html lang>) */
  code: string;
  /** короткая метка для переключателя */
  short: string;
  /** нативное название */
  label: string;
  /** направление письма */
  dir: 'ltr' | 'rtl';
}

// Активный набор на этапе запуска i18n — ru (дефолт) + en + zh.
// Остальные (fr/es/ar/de) добавим, расширив этот список (единый источник).
export const LOCALES: readonly LocaleMeta[] = [
  { code: 'ru', short: 'RU', label: 'Русский', dir: 'ltr' },
  { code: 'en', short: 'EN', label: 'English', dir: 'ltr' },
  { code: 'zh', short: 'ZH', label: '中文', dir: 'ltr' },
] as const;

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const DEFAULT_LOCALE = 'ru';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(code: string): boolean {
  return LOCALE_CODES.includes(code);
}

export function dirOf(code: string): 'ltr' | 'rtl' {
  return LOCALES.find((l) => l.code === code)?.dir ?? 'ltr';
}
