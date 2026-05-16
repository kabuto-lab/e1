/**
 * TenantGuard — обязательная защита для tenant-scoped эндпоинтов.
 *
 * Логика:
 *   1. Если на хэндлере / контроллере есть `@SkipTenant()` — пропускаем.
 *   2. Иначе проверяем:
 *      a. TenantResolverMiddleware зарегистрировал контекст (req.__tenantContext)
 *      b. Tenant в статусе 'active' (suspended/archived → 403)
 *      c. Если на request есть auth user (req.user, выставленный JwtAuthGuard):
 *         - platform-scope (kind='platform') — пропускаем без проверки тенанта;
 *           cross-tenant операции — это легитимный use case для platform-admin.
 *         - tenant-scope (kind='tenant') — требуем user.tenantId === ALS.tenantId,
 *           иначе 403 TENANT_OWNERSHIP_MISMATCH. Это закрывает дыру, когда
 *           tenant-admin одного тенанта мог менять header X-Tenant-Slug и
 *           получать доступ к данным чужого.
 *      d. Если req.user отсутствует — TenantGuard не валит; либо @Public()
 *         эндпоинт уже пропущен JwtAuthGuard, либо это случай, который должен
 *         был словить JwtAuthGuard раньше.
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
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_KEY } from './tenant.decorator';
import type { TenantContext } from './tenant-context.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

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

    // Ownership check — закрывает cross-tenant дыру.
    const user: AuthenticatedUser | undefined = req.user;
    if (user) {
      if (user.kind === 'platform') {
        // Platform-admin может ходить в любой тенант (saas-cross-tenant ops).
        return true;
      }
      if (user.kind === 'tenant') {
        if (!user.tenantId || user.tenantId !== ctx.tenantId) {
          // Логируем для будущего audit_log_platform (Phase 1: записывать в БД).
          this.logger.warn(
            `tenant_mismatch_attempt user=${user.id} (kind=${user.kind}, tenantId=${user.tenantId ?? 'none'}) ` +
              `→ requested tenant=${ctx.tenantSlug} (${ctx.tenantId})`,
          );
          throw new ForbiddenException({
            code: 'TENANT_OWNERSHIP_MISMATCH',
            message: 'Доступ к ресурсам другого тенанта запрещён.',
          });
        }
      }
    }

    return true;
  }
}
