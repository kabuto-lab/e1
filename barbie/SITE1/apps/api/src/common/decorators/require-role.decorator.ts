/**
 * @RequireRole('platform:super-admin')               — нужен platform-admin
 * @RequireRole('tenant-admin', 'salon-manager')      — кто-то из tenant-ролей
 * @RequireRole('platform:super-admin', 'tenant-admin') — комбо
 *
 * Префикс `platform:` означает что роль ищется в platform_admins.role.
 * Без префикса — tenant_users.role.
 *
 * Декоратор только помечает; собственно проверка — в RolesGuard.
 */
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

export type RoleSpec =
  | 'platform:super-admin'
  | 'platform:support'
  | 'tenant-admin'
  | 'salon-manager'
  | 'master'
  | 'client';

export const RequireRole = (...roles: RoleSpec[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
