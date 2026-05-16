/**
 * TenantContextService — ALS-обёртка над текущим tenant_id запроса.
 *
 * Поток данных:
 *   1. TenantResolverMiddleware вычисляет tenant из subdomain / header → run(ctx, next)
 *   2. Любой код в стеке Nest читает контекст через .getContext() / .getTenantId()
 *   3. После завершения запроса ALS автоматически очищается
 *
 * Альтернативы рассматривались (см. ARCHITECTURE.md §3):
 *   - request-scoped DI (Nest @Injectable({ scope: REQUEST }) — пересоздаёт ВСЕ зависимости
 *     на запрос, дорого
 *   - параметр-проброс через все слои — компилируется, но засоряет сигнатуры
 *   ALS — компромисс: минимальная инвазивность + работает в любой глубине стека.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  /** Кэш статуса тенанта; если 'suspended' — guard рубит запрос. */
  status: 'active' | 'suspended' | 'archived';
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  /** Запустить async-функцию в области с привязанным tenant context. */
  run<T>(ctx: TenantContext, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  /** Текущий контекст; null если запрос не прошёл TenantResolverMiddleware
      (например, /health, /v1/auth/*). */
  getContext(): TenantContext | null {
    return this.storage.getStore() ?? null;
  }

  /** Удобный аксессор; бросает если контекста нет — используй когда требование обязательно. */
  requireTenantId(): string {
    const ctx = this.getContext();
    if (!ctx) {
      throw new Error(
        'TenantContext is missing — endpoint должен быть за TenantGuard или middleware должен сработать',
      );
    }
    return ctx.tenantId;
  }
}
