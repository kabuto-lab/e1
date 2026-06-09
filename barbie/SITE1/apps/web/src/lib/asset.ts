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
