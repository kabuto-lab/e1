/**
 * WfyCitiesService — tenant-scoped CRUD над `wfy_city_pages`.
 *
 * Защиты:
 *   - Layer 1: TenantGuard на контроллере (резолвит контекст).
 *   - Layer 2: `combineTenant()` на каждом WHERE.
 *   - Layer 3: schema NOT NULL `tenant_id` + composite uniq `(tenant_id, slug)`.
 *   - Site-type capability (`tenants.site_type === 'wfy-city-dir'`) — enforced
 *     declaratively by `WfyTenantCapabilityGuard` on the controller (Track D.7),
 *     409 для тенантов неправильного типа, которые иначе создали бы wfy-данные,
 *     которые потом нечем рендерить.
 */
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm';

import type { Database, WfyCityPage } from '@barbie-site1/db';
import { wfyCityPages } from '@barbie-site1/db';

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
    const tenantId = this.tenantContext.requireTenantId();
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
    const tenantId = this.tenantContext.requireTenantId();
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
    const tenantId = this.tenantContext.requireTenantId();
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
    const tenantId = this.tenantContext.requireTenantId();
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
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .delete(wfyCityPages)
      .where(and(eq(wfyCityPages.id, id), eq(wfyCityPages.tenantId, tenantId)))
      .returning({ id: wfyCityPages.id });
    if (!row) {
      throw new NotFoundException({ code: 'WFY_CITY_NOT_FOUND', id });
    }
    this.logger.log(`wfy-city deleted: id=${id}, tenant=${tenantId}`);
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
