/**
 * WfyOpportunitiesService — tenant-scoped CRUD над `wfy_opportunities`.
 *
 * Защиты (3 слоя):
 *   - Layer 1: TenantGuard на контроллере.
 *   - Layer 2: `combineTenant()` на каждом WHERE.
 *   - Layer 3: schema NOT NULL `tenant_id` + composite index `(tenant_id, ord)`.
 *
 * `coverImageKey` — varchar(500) S3 key string, NOT FK → cross-tenant media
 * leak protection НЕ применима (нет FK для join). Format validation
 * (`^tenant/{tenantId}/...`) — Productor-debt, defer.
 *
 * Site-type capability (`tenants.site_type === 'wfy-city-dir'`) enforced once,
 * declaratively, by `WfyTenantCapabilityGuard` on the controller (Track D.7 —
 * extracted from the former per-service `requireWfyTenant()`). The service reads
 * `tenantId` straight from the ALS context — no extra query.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';

import type { Database, WfyOpportunity } from '@barbie-site1/db';
import { wfyOpportunities } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';
import { combineTenant } from '../../tenant-context/with-tenant.helper';
import type { CreateWfyOpportunityDto } from './dto/create-wfy-opportunity.dto';
import type { UpdateWfyOpportunityDto } from './dto/update-wfy-opportunity.dto';
import type { ListWfyOpportunitiesQueryDto } from './dto/list-wfy-opportunities-query.dto';
import type {
  ListWfyOpportunitiesResponseDto,
  WfyOpportunityResponseDto,
} from './dto/wfy-opportunity-response.dto';

@Injectable()
export class WfyOpportunitiesService {
  private readonly logger = new Logger(WfyOpportunitiesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateWfyOpportunityDto): Promise<WfyOpportunityResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    this.assertCoverKeyScope(dto.coverImageKey, tenantId);
    const [row] = await this.db
      .insert(wfyOpportunities)
      .values({
        tenantId,
        title: dto.title,
        headline: dto.headline ?? null,
        description: dto.description ?? null,
        coverImageKey: dto.coverImageKey ?? null,
        ord: dto.ord ?? 0,
      })
      .returning();
    this.logger.log(`wfy-opportunity created: ${row.title} (id=${row.id}, tenant=${tenantId})`);
    return this.toResponse(row);
  }

  async list(query: ListWfyOpportunitiesQueryDto): Promise<ListWfyOpportunitiesResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const extra: (SQL | undefined)[] = [];
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(ilike(wfyOpportunities.title, pattern));
    }
    const where = combineTenant(tenantId, wfyOpportunities.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(wfyOpportunities)
        .where(where)
        .orderBy(asc(wfyOpportunities.ord), asc(wfyOpportunities.title))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(wfyOpportunities).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async get(id: string): Promise<WfyOpportunityResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(wfyOpportunities)
      .where(and(eq(wfyOpportunities.id, id), eq(wfyOpportunities.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'WFY_OPPORTUNITY_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateWfyOpportunityDto): Promise<WfyOpportunityResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    this.assertCoverKeyScope(dto.coverImageKey, tenantId);

    const patch: Partial<WfyOpportunity> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.headline !== undefined) patch.headline = dto.headline;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.coverImageKey !== undefined) patch.coverImageKey = dto.coverImageKey;
    if (dto.ord !== undefined) patch.ord = dto.ord;

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }
    patch.updatedAt = new Date();

    const [row] = await this.db
      .update(wfyOpportunities)
      .set(patch)
      .where(and(eq(wfyOpportunities.id, id), eq(wfyOpportunities.tenantId, tenantId)))
      .returning();
    if (!row) {
      throw new NotFoundException({ code: 'WFY_OPPORTUNITY_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .delete(wfyOpportunities)
      .where(and(eq(wfyOpportunities.id, id), eq(wfyOpportunities.tenantId, tenantId)))
      .returning({ id: wfyOpportunities.id });
    if (!row) {
      throw new NotFoundException({ code: 'WFY_OPPORTUNITY_NOT_FOUND', id });
    }
    this.logger.log(`wfy-opportunity deleted: id=${id}, tenant=${tenantId}`);
  }

  /**
   * Cross-tenant media-leak guard: a coverImageKey, when present, must live
   * under this tenant's prefix. Media keys are always
   * `tenant/{tenantId}/{module}/…` (MediaService + DB CHECK), so a key not
   * starting with `tenant/{tenantId}/` would point at another tenant's object.
   * null/undefined (omit or clear) is allowed. Validated at the service layer
   * because tenantId is only known at runtime from ALS context, not in the DTO.
   */
  private assertCoverKeyScope(key: string | null | undefined, tenantId: string): void {
    if (key == null) return;
    const prefix = `tenant/${tenantId}/`;
    if (!key.startsWith(prefix)) {
      throw new BadRequestException({
        code: 'WFY_OPPORTUNITY_COVER_KEY_SCOPE',
        message: `coverImageKey должен начинаться с '${prefix}' (cross-tenant media-leak guard).`,
      });
    }
  }

  private toResponse(row: WfyOpportunity): WfyOpportunityResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      title: row.title,
      headline: row.headline,
      description: row.description,
      coverImageKey: row.coverImageKey,
      ord: row.ord,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
