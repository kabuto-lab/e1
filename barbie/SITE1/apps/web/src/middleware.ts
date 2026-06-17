import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

/**
 * i18n-middleware (next-intl) + опциональный режим «тенант в корне».
 *
 * Обычный режим (NEXT_PUBLIC_ROOT_TENANT не задан, общая /nas-сборка):
 *   обрабатываются ТОЛЬКО публичные tenant-пути. Корень `/` (платформенный
 *   лендинг), `/admin`, `/api`, `/v1`, `/_next`, файлы с расширением — исключены.
 *
 * Доменный режим (NEXT_PUBLIC_ROOT_TENANT=<slug>, выделенная сборка под домен,
 * напр. nebesaspa.com): корневые публичные пути ПЕРЕПИСЫВАЮТСЯ на физический
 * маршрут /<locale>/<slug>/... с сохранением видимого URL. Домен показывает
 * тенанта на чистом `https://nebesaspa.com/` (без хвоста /nebesaspa), а next-intl
 * работает на реальном маршруте — гидратация не ломается.
 *
 * Важно: next-intl сам по себе ДЕЛЕГИРОВАННЫЙ rewrite не всегда выполняет
 * (для путей с уже корректным префиксом локали он возвращает next()), поэтому
 * в доменном режиме мы строим rewrite САМИ. Локаль определяем из сегмента URL и
 * прокидываем next-intl-у через request-заголовок X-NEXT-INTL-LOCALE — именно его
 * читает getRequestLocale() при загрузке словаря в серверных компонентах.
 */
const intl = createMiddleware(routing);

const ROOT_TENANT = process.env.NEXT_PUBLIC_ROOT_TENANT || '';
const DEFAULT_LOCALE = routing.defaultLocale;
// next-intl: имя request-заголовка с резолвнутой локалью (HEADER_LOCALE_NAME).
const HEADER_LOCALE = 'X-NEXT-INTL-LOCALE';

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!ROOT_TENANT) {
    // Обычный режим: корень не локализуем (платформенный лендинг) — как было.
    if (pathname === '/') return NextResponse.next();
    return intl(req);
  }

  // Доменный режим: определяем локаль из первого сегмента (ru — дефолт, без префикса).
  const seg = pathname.split('/')[1] || '';
  // Явный префикс ДЕФОЛТНОЙ локали (/ru/...) при localePrefix:as-needed не каноничен —
  // 301-редиректим на путь без него (/ru/programs → /programs, /ru → /).
  if (seg === DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || '/';
    return NextResponse.redirect(url, 301);
  }
  const isLocaleSeg = routing.locales.includes(seg) && seg !== DEFAULT_LOCALE;
  const locale = isLocaleSeg ? seg : DEFAULT_LOCALE;
  const rest = isLocaleSeg ? pathname.slice(seg.length + 1) : pathname;
  const sub = rest === '' || rest === '/' ? '' : rest;

  // Канонизация: на домене тенант живёт в корне, поэтому старые/прямые URL
  // /<slug> и /<slug>/* (а также /<locale>/<slug>/*) 301-редиректим на чистый
  // корневой путь — один канонический URL, без дублей для поисковиков.
  if (sub === `/${ROOT_TENANT}` || sub.startsWith(`/${ROOT_TENANT}/`)) {
    const cleanSub = sub.slice(`/${ROOT_TENANT}`.length); // '' | '/girls' | ...
    const url = req.nextUrl.clone();
    url.pathname = `${isLocaleSeg ? `/${locale}` : ''}${cleanSub || '/'}`;
    return NextResponse.redirect(url, 301);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}/${ROOT_TENANT}${sub}`;

  // Прокидываем локаль next-intl-у через request-заголовок (его читает
  // getRequestLocale при выборе словаря) и переписываем на физический маршрут.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(HEADER_LOCALE, locale);
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // В доменном режиме нужен и корень `/`, поэтому добавлен явным первым элементом.
  // В обычном режиме `/` отрабатывается выше как no-op (NextResponse.next()).
  matcher: ['/', '/((?!api|v1|admin|_next|_vercel|favicon\\.ico|.*\\..*).+)'],
};
