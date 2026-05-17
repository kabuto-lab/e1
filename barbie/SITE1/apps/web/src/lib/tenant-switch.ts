'use client';

import { getAuth, saveAuth } from './auth';

/**
 * switchActiveTenant — меняет `auth.tenantSlug` в localStorage и
 * перезагружает страницу, чтобы все client-state кэши перерисовались
 * под новым тенантом. JWT не пересоздаётся — TenantGuard для
 * `kind:'platform'` пропускает в любой тенант (см. tenant.guard.ts §4.5).
 *
 * Для `kind:'tenant'` метод не должен вызываться (UI отрисует pill как
 * read-only). Если всё же вызвали — на бэкенде поймает 403
 * TENANT_OWNERSHIP_MISMATCH, и текущая страница тихо «не загрузится».
 */
export function switchActiveTenant(slug: string): void {
  const auth = getAuth();
  if (!auth) return;
  if (auth.tenantSlug === slug) return;
  saveAuth({ ...auth, tenantSlug: slug });
  // Жёсткая перезагрузка — все client components пересоздают state с
  // новым X-Tenant-Slug header'ом из apiFetch.
  window.location.reload();
}
