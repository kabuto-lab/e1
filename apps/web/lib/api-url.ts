/**
 * Resolves API base for fetches.
 * - If NEXT_PUBLIC_API_URL is set → use it (trim trailing slash).
 * - Browser + unset → same-origin `/api/...` (matches nginx proxy_pass /api/).
 * - Server (SSR) + unset → local Nest default for dev.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (explicit) return `${explicit}${p}`;
  if (typeof window !== 'undefined') return `/api${p}`;
  return `http://127.0.0.1:3000${p}`;
}
