/**
 * Декораторы для tenant-aware endpoints:
 *
 *   @CurrentTenant()             — параметр-декоратор, возвращает TenantContext
 *   @CurrentTenantId()           — параметр-декоратор, возвращает string (id)
 *   @SkipTenant()                — метод-декоратор, говорит TenantGuard пропустить проверку
 *                                  (для /auth/login, /platform/*, /health и т.п.)
 *
 * Использование:
 *   @Get()
 *   @UseGuards(JwtAuthGuard, TenantGuard)
 *   list(@CurrentTenantId() tenantId: string) { ... }
 */
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { TenantContext } from './tenant-context.service';

/** Метаданные-флаг — TenantGuard читает и решает пропустить ли проверку. */
export const SKIP_TENANT_KEY = 'skipTenant';
export const SkipTenant = (): MethodDecorator & ClassDecorator => SetMetadata(SKIP_TENANT_KEY, true);

/**
 * Достаёт TenantContext из ALS (через тот же storage, что использует TenantContextService).
 * Возвращает null если контекста нет — обычно это либо bug, либо @SkipTenant() endpoint.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | null => {
    // Достаём через request — middleware уже зарегистрировал контекст в ALS;
    // в request.tenant мы НЕ кладём (ALS — единый источник истины).
    // Для удобства тестов и type-safety делаем небольшой fallback на req.
    const req = ctx.switchToHttp().getRequest();
    return req.__tenantContext ?? null;
  },
);

export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx.switchToHttp().getRequest();
    const tc: TenantContext | null = req.__tenantContext ?? null;
    return tc?.tenantId ?? null;
  },
);
