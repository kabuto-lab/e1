/**
 * WfyAdvantagesService — tenant-scoped CRUD над `wfy_advantages`.
 *
 * Защиты (3 слоя):
 *   - Layer 1: TenantGuard + WfyTenantCapabilityGuard на контроллере
 *     (site_type='wfy-city-dir' enforced once в guard — Track D.7).
 *   - Layer 2: `combineTenant()` на каждом WHERE.
 *   - Layer 3: schema NOT NULL `tenant_id` + composite index `(tenant_id, ord)`.
 *
 * Service читает tenantId напрямую из ALS-контекста — guard уже проверил
 * capability, дополнительного запроса нет.
 */
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';

import type { Database, WfyAdvantage } from '@barbie-site1/db';
import { wfyAdvantages } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';
import { combineTenant } from '../../tenant-context/with-tenant.helper';
import type { CreateWfyAdvantageDto } from './dto/create-wfy-advantage.dto';
import type { UpdateWfyAdvantageDto } from './dto/update-wfy-advantage.dto';
import type { ListWfyAdvantagesQueryDto } from './dto/list-wfy-advantages-query.dto';
import type {
  ListWfyAdvantagesResponseDto,
  WfyAdvantageResponseDto,
} from './dto/wfy-advantage-response.dto';

@Injectable()
export class WfyAdvantagesService {
  private readonly logger = new Logger(WfyAdvantagesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateWfyAdvantageDto): Promise<WfyAdvantageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .insert(wfyAdvantages)
      .values({
        tenantId,
        title: dto.title,
        description: dto.description ?? null,
        iconName: dto.iconName ?? null,
        ord: dto.ord ?? 0,
      })
      .returning();
    this.logger.log(`wfy-advantage created: ${row.title} (id=${row.id}, tenant=${tenantId})`);
    return this.toResponse(row);
  }

  async list(query: ListWfyAdvantagesQueryDto): Promise<ListWfyAdvantagesResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const extra: (SQL | undefined)[] = [];
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(ilike(wfyAdvantages.title, pattern));
    }
    const where = combineTenant(tenantId, wfyAdvantages.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(wfyAdvantages)
        .where(where)
        .orderBy(asc(wfyAdvantages.ord), asc(wfyAdvantages.title))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(wfyAdvantages).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async get(id: string): Promise<WfyAdvantageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(wfyAdvantages)
      .where(and(eq(wfyAdvantages.id, id), eq(wfyAdvantages.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'WFY_ADVANTAGE_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateWfyAdvantageDto): Promise<WfyAdvantageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const patch: Partial<WfyAdvantage> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.iconName !== undefined) patch.iconName = dto.iconName;
    if (dto.ord !== undefined) patch.ord = dto.ord;

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }
    patch.updatedAt = new Date();

    const [row] = await this.db
      .update(wfyAdvantages)
      .set(patch)
      .where(and(eq(wfyAdvantages.id, id), eq(wfyAdvantages.tenantId, tenantId)))
      .returning();
    if (!row) {
      throw new NotFoundException({ code: 'WFY_ADVANTAGE_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .delete(wfyAdvantages)
      .where(and(eq(wfyAdvantages.id, id), eq(wfyAdvantages.tenantId, tenantId)))
      .returning({ id: wfyAdvantages.id });
    if (!row) {
      throw new NotFoundException({ code: 'WFY_ADVANTAGE_NOT_FOUND', id });
    }
    this.logger.log(`wfy-advantage deleted: id=${id}, tenant=${tenantId}`);
  }

  private toResponse(row: WfyAdvantage): WfyAdvantageResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      title: row.title,
      description: row.description,
      iconName: row.iconName,
      ord: row.ord,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
