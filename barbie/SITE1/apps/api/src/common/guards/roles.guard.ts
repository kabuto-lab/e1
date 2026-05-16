/**
 * RolesGuard — проверяет req.user.kind+role против @RequireRole(...).
 *
 * Подключай через @UseGuards(RolesGuard) ВМЕСТЕ с JwtAuthGuard (или после него
 * в pipeline, чтобы req.user был наполнен). JwtAuthGuard у нас глобальный, так что
 * RolesGuard просто использовать локально.
 *
 * Спец-кейс: 'platform:super-admin' автоматически проходит ЛЮБУЮ проверку
 * (god-mode для саппорта). Чтобы это отключить — добавим @StrictRole() в будущем.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRED_ROLES_KEY, RoleSpec } from '../decorators/require-role.decorator';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleSpec[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = req.user;
    if (!user) {
      throw new UnauthorizedException({ code: 'NOT_AUTHENTICATED' });
    }

    // Нормализуем роль пользователя в RoleSpec-формат
    const userRole: RoleSpec =
      user.kind === 'platform' ? (`platform:${user.role}` as RoleSpec) : (user.role as RoleSpec);

    // God-mode: super-admin платформы проходит всё (кроме явных запретов)
    if (userRole === 'platform:super-admin') return true;

    if (!required.includes(userRole)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        required,
        actual: userRole,
      });
    }
    return true;
  }
}
