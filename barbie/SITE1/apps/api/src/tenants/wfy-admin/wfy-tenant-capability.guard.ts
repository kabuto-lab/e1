/**
 * WfyTenantCapabilityGuard — declarative site-type capability gate for the
 * `/v1/wfy-admin/*` endpoints.
 *
 * Replaces the per-service `requireWfyTenant()` method that was inlined into
 * cities + partner-salons + opportunities (rule-of-three triggered → extracted
 * here in Track D.7). The single `tenants.site_type` lookup now lives once, in
 * the request lifecycle, instead of being copied into every service method.
 *
 * Order of guards on the controller: `@UseGuards(TenantGuard, RolesGuard,
 * WfyTenantCapabilityGuard)`. TenantResolverMiddleware has already populated the
 * ALS tenant context by the time any guard runs, so `requireTenantId()` is safe
 * here. Services then read `tenantId` straight from the context with NO extra
 * query — net query count per request is unchanged (1 site_type lookup), we
 * just deleted three copies of the method.
 *
 * Semantics preserved verbatim:
 *   - tenant row missing        → 404 TENANT_NOT_FOUND
 *   - site_type ≠ 'wfy-city-dir' → 409 TENANT_SITE_TYPE_MISMATCH
 * ConflictException (not Forbidden) — это ошибка конфигурации тенанта, не authz.
 */
import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { tenants } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';

@Injectable()
export class WfyTenantCapabilityGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const tenantId = this.tenantContext.requireTenantId();
    const [t] = await this.db
      .select({ siteType: tenants.siteType })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!t) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', tenantId });
    }
    if (t.siteType !== 'wfy-city-dir') {
      throw new ConflictException({
        code: 'TENANT_SITE_TYPE_MISMATCH',
        message: `wfy admin endpoints require tenant.site_type='wfy-city-dir' (got '${t.siteType}'). Tenant capability matrix violated — см. MIGRATION_PLAN §3.3.`,
      });
    }
    return true;
  }
}
