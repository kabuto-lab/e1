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
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  // Идемпотентность: путь уже с basePath (напр. композиция asset(photoUrl(...)))
  // → не префиксуем второй раз, иначе /nas/nas/...
  if (BASE_PATH && p.startsWith(`${BASE_PATH}/`)) return p;
  return `${BASE_PATH}${p}`;
}
