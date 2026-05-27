/**
 * WfyCitiesService — tenant-scoped CRUD над `wfy_city_pages`.
 *
 * Защиты:
 *   - Layer 1: TenantGuard на контроллере (резолвит контекст).
 *   - Layer 2: `combineTenant()` на каждом WHERE.
 *   - Layer 3: schema NOT NULL `tenant_id` + composite uniq `(tenant_id, slug)`.
 *   - Дополнительно: `requireWfyTenant()` проверяет `tenants.site_type === 'wfy-city-dir'`
 *     — закрывает дыру где тенант неправильного типа создаёт wfy-данные, которые
 *     потом нечем рендерить. ConflictException вместо ForbiddenException — это
 *     ошибка конфигурации тенанта, а не authz.
 */
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm';

import type { Database, WfyCityPage } from '@barbie-site1/db';
import { tenants, wfyCityPages } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';
import { combineTenant } from '../../tenant-context/with-tenant.helper';
import type { CreateWfyCityDto } from './dto/create-wfy-city.dto';
import type { UpdateWfyCityDto } from './dto/update-wfy-city.dto';
import type { ListWfyCitiesQueryDto } from './dto/list-wfy-cities-query.dto';
import type {
  ListWfyCitiesResponseDto,
  WfyCityResponseDto,
} from './dto/wfy-city-response.dto';

@Injectable()
export class WfyCitiesService {
  private readonly logger = new Logger(WfyCitiesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateWfyCityDto): Promise<WfyCityResponseDto> {
    const tenantId = await this.requireWfyTenant();
    try {
      const [row] = await this.db
        .insert(wfyCityPages)
        .values({
          tenantId,
          slug: dto.slug,
          cityName: dto.cityName,
          region: dto.region ?? null,
          country: dto.country ?? 'RU',
          headline: dto.headline ?? null,
          description: dto.description ?? null,
          extras: dto.extras ?? {},
          status: dto.status ?? 'draft',
          ord: dto.ord ?? 0,
        })
        .returning();
      this.logger.log(`wfy-city created: ${row.slug} (id=${row.id}, tenant=${tenantId})`);
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'WFY_CITY_SLUG_TAKEN',
          message: `City slug '${dto.slug}' уже используется в этом тенанте.`,
        });
      }
      throw err;
    }
  }

  async list(query: ListWfyCitiesQueryDto): Promise<ListWfyCitiesResponseDto> {
    const tenantId = await this.requireWfyTenant();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const extra: (SQL | undefined)[] = [];
    if (query.status) extra.push(eq(wfyCityPages.status, query.status));
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(ilike(wfyCityPages.cityName, pattern));
    }
    const where = combineTenant(tenantId, wfyCityPages.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(wfyCityPages)
        .where(where)
        .orderBy(asc(wfyCityPages.ord), asc(wfyCityPages.cityName))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(wfyCityPages).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async get(id: string): Promise<WfyCityResponseDto> {
    const tenantId = await this.requireWfyTenant();
    const [row] = await this.db
      .select()
      .from(wfyCityPages)
      .where(and(eq(wfyCityPages.id, id), eq(wfyCityPages.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'WFY_CITY_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateWfyCityDto): Promise<WfyCityResponseDto> {
    const tenantId = await this.requireWfyTenant();
    const patch: Partial<WfyCityPage> = {};
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.cityName !== undefined) patch.cityName = dto.cityName;
    if (dto.region !== undefined) patch.region = dto.region;
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.headline !== undefined) patch.headline = dto.headline;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.extras !== undefined) patch.extras = dto.extras;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.ord !== undefined) patch.ord = dto.ord;

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }
    patch.updatedAt = new Date();

    try {
      const [row] = await this.db
        .update(wfyCityPages)
        .set(patch)
        .where(and(eq(wfyCityPages.id, id), eq(wfyCityPages.tenantId, tenantId)))
        .returning();
      if (!row) {
        throw new NotFoundException({ code: 'WFY_CITY_NOT_FOUND', id });
      }
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'WFY_CITY_SLUG_TAKEN',
          message: `City slug '${dto.slug}' уже используется в этом тенанте.`,
        });
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const tenantId = await this.requireWfyTenant();
    const [row] = await this.db
      .delete(wfyCityPages)
      .where(and(eq(wfyCityPages.id, id), eq(wfyCityPages.tenantId, tenantId)))
      .returning({ id: wfyCityPages.id });
    if (!row) {
      throw new NotFoundException({ code: 'WFY_CITY_NOT_FOUND', id });
    }
    this.logger.log(`wfy-city deleted: id=${id}, tenant=${tenantId}`);
  }

  /**
   * Гарантирует, что текущий тенант имеет `siteType === 'wfy-city-dir'`.
   * Иначе 409 — операция не имеет смысла для других типов сайтов.
   * Возвращает tenantId для удобства вызова.
   *
   * NB: 1 дополнительный SELECT per request. Acceptable для admin endpoints
   * (~10 req/min). Если станет горячим путём — кэшировать в TenantContext.
   */
  private async requireWfyTenant(): Promise<string> {
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
    return tenantId;
  }

  private toResponse(row: WfyCityPage): WfyCityResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      slug: row.slug,
      cityName: row.cityName,
      region: row.region,
      country: row.country,
      headline: row.headline,
      description: row.description,
      extras: row.extras,
      status: row.status,
      ord: row.ord,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
