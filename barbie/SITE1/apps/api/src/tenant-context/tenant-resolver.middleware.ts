/**
 * TenantResolverMiddleware — резолвит tenant из HTTP-запроса:
 *
 *   1. Subdomain: `{slug}.{TENANT_ROOT_DOMAIN}` (например `aurelia.lvh.me`)
 *   2. Fallback header: `X-Tenant-Slug: aurelia` (для curl/тестов/Postman)
 *
 * Найденный tenant запихивается в ALS через TenantContextService.run(),
 * чтобы дальше по стеку любой код мог достать tenantId без проброса параметров.
 *
 * Если тенант не найден — middleware НЕ бросает (контекст останется пустым).
 * TenantGuard на конкретном эндпоинте сам решит, фейлить или пропускать.
 * Это позволяет /v1/auth/login / /v1/platform/* работать без tenant контекста.
 */
import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { Database } from '@barbie-site1/db';
import { tenants } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService, TenantContext } from './tenant-context.service';

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);
  private readonly rootDomain: string;
  private readonly fallbackHeader: string;

  constructor(
    private readonly ctxService: TenantContextService,
    private readonly config: ConfigService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {
    this.rootDomain = (this.config.get<string>('tenant.rootDomain') ?? 'lvh.me').toLowerCase();
    this.fallbackHeader = (
      this.config.get<string>('tenant.fallbackHeader') ?? 'x-tenant-slug'
    ).toLowerCase();
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = this.extractSlug(req);
    if (!slug) {
      return next();
    }

    const rows = await this.db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        status: tenants.status,
      })
      .from(tenants)
      .where(and(eq(tenants.slug, slug), isNotNull(tenants.id)))
      .limit(1);

    const tenant = rows[0];
    if (!tenant) {
      this.logger.debug(`Tenant slug not found: '${slug}'`);
      return next();
    }

    const ctx: TenantContext = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      status: tenant.status as TenantContext['status'],
    };

    // Двойная экспозиция:
    //   1. req.__tenantContext — для синхронных декораторов (createParamDecorator)
    //   2. ALS-storage в TenantContextService — для сервисов в глубине стека
    (req as Request & { __tenantContext?: TenantContext }).__tenantContext = ctx;
    this.ctxService.run(ctx, () => next());
  }

  private extractSlug(req: Request): string | null {
    // 1) header fallback (приоритет — удобно для тестов и платформ-админских tools)
    const headerVal = req.headers[this.fallbackHeader];
    if (typeof headerVal === 'string' && headerVal.trim().length > 0) {
      return this.normalizeSlug(headerVal);
    }

    // 2) subdomain: hostname без порта → match `{slug}.rootDomain`
    const host = (req.hostname || req.headers.host || '').toString().toLowerCase();
    const cleanHost = host.split(':')[0];
    if (!cleanHost || cleanHost === this.rootDomain) {
      return null;
    }
    const suffix = '.' + this.rootDomain;
    if (cleanHost.endsWith(suffix)) {
      const candidate = cleanHost.slice(0, -suffix.length);
      // не принимаем многоуровневые поддомены (foo.bar.lvh.me)
      if (candidate && !candidate.includes('.')) {
        return this.normalizeSlug(candidate);
      }
    }
    return null;
  }

  private normalizeSlug(raw: string): string | null {
    const s = raw.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(s)) return null;
    return s;
  }
}
