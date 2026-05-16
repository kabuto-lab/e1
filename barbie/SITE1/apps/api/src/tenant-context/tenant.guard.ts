/**
 * TenantGuard — обязательная защита для tenant-scoped эндпоинтов.
 *
 * Логика:
 *   1. Если на хэндлере / контроллере есть `@SkipTenant()` — пропускаем.
 *   2. Иначе проверяем что:
 *      a. TenantResolverMiddleware зарегистрировал контекст (req.__tenantContext)
 *      b. Tenant в статусе 'active' (suspended/archived → 403)
 *      c. (опционально, если есть auth user) user принадлежит этому тенанту
 *         — эта проверка живёт в AuthorizationGuard / RoleGuard (Stage 7+).
 *         TenantGuard отвечает ТОЛЬКО за тенант-резолв, не за роль/принадлежность user.
 *
 * Это — Layer 1 из 4-слойной изоляции (см. ARCHITECTURE.md §4).
 * Слой 2 — `withTenant()` helper в репозиториях. Слой 3 — NOT NULL в схеме.
 * Слой 4 — audit log (Phase 1).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_KEY } from './tenant.decorator';
import type { TenantContext } from './tenant-context.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const ctx: TenantContext | undefined = req.__tenantContext;

    if (!ctx) {
      throw new UnauthorizedException({
        code: 'TENANT_NOT_RESOLVED',
        message:
          'Не удалось определить тенант. Используй subdomain (например aurelia.lvh.me) или заголовок X-Tenant-Slug.',
      });
    }

    if (ctx.status !== 'active') {
      throw new ForbiddenException({
        code: 'TENANT_NOT_ACTIVE',
        message: `Тенант '${ctx.tenantSlug}' в статусе '${ctx.status}'.`,
      });
    }

    return true;
  }
}
