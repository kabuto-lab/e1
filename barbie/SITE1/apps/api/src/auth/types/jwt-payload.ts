/**
 * JWT payload — что кладём в access token.
 *
 * kind='tenant' — это `tenant_users` row (роли: tenant-admin / salon-manager / master / client)
 * kind='platform' — это `platform_admins` row (роли: super-admin / support)
 *
 * При проверке tenant-scoped эндпоинта проверяй:
 *   - payload.kind === 'tenant'
 *   - payload.tenantId === currentTenantContext.tenantId
 *
 * Platform-admin может обходить tenant scoping для cross-tenant операций
 * (см. ROLES-RBAC.md).
 */
export type JwtKind = 'tenant' | 'platform';

export interface JwtPayload {
  /** user.id (UUID) */
  sub: string;
  /** Тип сессии. */
  kind: JwtKind;
  /** Tenant id — только когда kind='tenant'. */
  tenantId?: string;
  /** Salon id — только для master (специфика расписания внутри салона). */
  salonId?: string;
  /** Роль внутри своего scope. */
  role: string;
  /** Email — для логирования / отображения. */
  email: string;
  iat?: number;
  exp?: number;
}

/** Authenticated user, доступный через @CurrentUser() декоратор. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  kind: JwtKind;
  tenantId?: string;
  salonId?: string;
  role: string;
}
