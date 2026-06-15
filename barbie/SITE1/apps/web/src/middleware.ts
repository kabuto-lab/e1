import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * i18n-middleware (next-intl). Обрабатывает ТОЛЬКО публичные tenant-пути.
 * Matcher исключает: корень `/` (платформенный лендинг), `/admin`, `/api`,
 * `/v1`, `/_next`, `/_vercel`, favicon и любые файлы с расширением.
 * `.+` (а не `.*`) гарантирует, что бар `/` не матчится → корень не локализуем.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|v1|admin|_next|_vercel|favicon\\.ico|.*\\..*).+)'],
};
