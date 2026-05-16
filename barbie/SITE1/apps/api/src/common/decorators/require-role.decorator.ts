/**
 * @RequireRole('platform-admin')                   — нужен platform-admin
 * @RequireRole('tenant-admin', 'salon-manager')    — одна из tenant-ролей
 * @RequireRole('platform-admin', 'tenant-admin')   — комбо
 *
 * Имена ролей соответствуют ЗНАЧЕНИЯМ в БД:
 *   - platform_admins.role: 'platform-admin' | 'platform-support'
 *   - tenant_users.role:     'tenant-admin' | 'salon-manager' | 'master' | 'client'
 *
 * Namespaces не пересекаются (platform-* vs остальные), поэтому prefix не нужен.
 * 'platform-admin' = god-mode (см. RolesGuard).
 */
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export type RoleSpec =
  | 'platform-admin'
  | 'platform-support'
  | 'tenant-admin'
  | 'salon-manager'
  | 'master'
  | 'client';

export const RequireRole = (...roles: RoleSpec[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
