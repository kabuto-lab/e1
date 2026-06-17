/** basePath под которым крутится фронт (prod: '/nas'; dev: ''). */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Публичный URL статического ассета из apps/web/public с учётом basePath.
 *
 * Next.js НЕ префиксует basePath для сырых `<img src>`, `<video src>`, `poster`
 * и `url()` в инлайн-стилях — только для next/image и next/link. Любой такой
 * абсолютный путь (`/tenants/...`, `/model-library/...`) под prod-basePath `/nas`
 * уходит мимо приложения (→ 404). Оборачивай его этим хелпером.
 */
export function asset(path: string): string {
  if (!path) return '';
  // Префиксуем только абсолютные '/'-пути. http(s)/tel:/mailto:/#hash/относительные
  // — возвращаем как есть (basePath к ним неприменим; иначе ломаются якоря/внешние).
  if (!path.startsWith('/')) return path;
  // Идемпотентность: путь уже с basePath (напр. композиция asset(photoUrl(...)))
  // → не префиксуем второй раз, иначе /nas/nas/...
  if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

/**
 * Слаг тенанта, смонтированного В КОРЕНЬ домена для выделенной доменной сборки
 * (напр. NEXT_PUBLIC_ROOT_TENANT=nebesaspa для nebesaspa.com). Пусто → обычный
 * мультитенант-режим (общая /nas-сборка): тенанты живут под /<slug>.
 */
const ROOT_TENANT = process.env.NEXT_PUBLIC_ROOT_TENANT ?? '';

/**
 * URL ВНУТРЕННЕГО маршрута тенанта с учётом basePath и режима «тенант в корне».
 *
 *  - slug: слаг тенанта ('nebesaspa').
 *  - sub:  подпуть БЕЗ ведущего слэша ('girls', `program/${p.slug}`) или '' для главной.
 *
 * Общая /nas-сборка (ROOT_TENANT='') → '/nebesaspa/girls' (как раньше).
 * Доменная сборка (ROOT_TENANT='nebesaspa') → '/girls', главная → '/'.
 * Поверх результата применяется basePath через asset() (на домене он пустой).
 */
export function tpath(slug: string, sub = ''): string {
  const tail = sub ? `/${sub}` : '';
  const routed = ROOT_TENANT === slug ? tail || '/' : `/${slug}${tail}`;
  return asset(routed);
}
