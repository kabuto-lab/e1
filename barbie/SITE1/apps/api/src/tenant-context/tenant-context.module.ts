/**
 * TenantContextModule — оборачивает всё, что связано с резолвом и хранением tenant context.
 *
 * Что экспортируется:
 *   - TenantContextService (ALS) — для DI в любые сервисы
 *   - TenantGuard — используй через @UseGuards(JwtAuthGuard, TenantGuard)
 *
 * Подключение в AppModule:
 *   imports: [TenantContextModule],
 *   и в configure(consumer): consumer.apply(TenantResolverMiddleware).forRoutes('*');
 *
 * Декораторы (CurrentTenant, CurrentTenantId, SkipTenant) — pure functions,
 * импортируются напрямую из './tenant.decorator', без регистрации в модуле.
 *
 * Helper withTenant() / combineTenant() — pure functions из './with-tenant.helper'.
 */
import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TenantGuard } from './tenant.guard';

@Global()
@Module({
  providers: [TenantContextService, TenantResolverMiddleware, TenantGuard],
  exports: [TenantContextService, TenantResolverMiddleware, TenantGuard],
})
export class TenantContextModule {}
