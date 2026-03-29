/**
 * Resolves API base for fetches.
 * - Browser: при заданном NEXT_PUBLIC_API_URL — всегда туда (и в dev, и в prod). Нужен CORS на Nest для origin веба.
 * - Иначе same-origin `/api/...` + rewrites в next.config (beforeFiles) → Nest.
 * - Server (SSR): NEXT_PUBLIC_API_URL или http://127.0.0.1:3000.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    if (explicit) return `${explicit}${p}`;
    return `/api${p}`;
  }

  if (explicit) return `${explicit}${p}`;
  return `http://127.0.0.1:3000${p}`;
}
