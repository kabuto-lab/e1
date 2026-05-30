/**
 * WfyVacanciesService — tenant-scoped CRUD над `wfy_vacancies`.
 *
 * Защиты (3 слоя):
 *   - Layer 1: TenantGuard + WfyTenantCapabilityGuard на контроллере
 *     (site_type='wfy-city-dir' enforced once в guard — Track D.7).
 *   - Layer 2: `combineTenant()` на каждом WHERE.
 *   - Layer 3: schema NOT NULL `tenant_id` + composite uniq `(tenant_id, code)`
 *     + composite index `(tenant_id, ord)`.
 *
 * `code` уникален в пределах тенанта → 23505 маппится в 409
 * WFY_VACANCY_CODE_TAKEN (mirror cities slug pattern).
 * requirements/conditions — массивы строк, заменяются целиком при update.
 */
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';

import type { Database, WfyVacancy } from '@barbie-site1/db';
import { wfyVacancies } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';
import { combineTenant } from '../../tenant-context/with-tenant.helper';
import type { CreateWfyVacancyDto } from './dto/create-wfy-vacancy.dto';
import type { UpdateWfyVacancyDto } from './dto/update-wfy-vacancy.dto';
import type { ListWfyVacanciesQueryDto } from './dto/list-wfy-vacancies-query.dto';
import type {
  ListWfyVacanciesResponseDto,
  WfyVacancyResponseDto,
} from './dto/wfy-vacancy-response.dto';

@Injectable()
export class WfyVacanciesService {
  private readonly logger = new Logger(WfyVacanciesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateWfyVacancyDto): Promise<WfyVacancyResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    try {
      const [row] = await this.db
        .insert(wfyVacancies)
        .values({
          tenantId,
          code: dto.code,
          title: dto.title,
          summary: dto.summary ?? null,
          requirements: dto.requirements ?? [],
          conditions: dto.conditions ?? [],
          ord: dto.ord ?? 0,
        })
        .returning();
      this.logger.log(`wfy-vacancy created: ${row.code} (id=${row.id}, tenant=${tenantId})`);
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'WFY_VACANCY_CODE_TAKEN',
          message: `Vacancy code '${dto.code}' уже используется в этом тенанте.`,
        });
      }
      throw err;
    }
  }

  async list(query: ListWfyVacanciesQueryDto): Promise<ListWfyVacanciesResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const extra: (SQL | undefined)[] = [];
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(ilike(wfyVacancies.title, pattern));
    }
    const where = combineTenant(tenantId, wfyVacancies.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(wfyVacancies)
        .where(where)
        .orderBy(asc(wfyVacancies.ord), asc(wfyVacancies.title))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(wfyVacancies).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async get(id: string): Promise<WfyVacancyResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(wfyVacancies)
      .where(and(eq(wfyVacancies.id, id), eq(wfyVacancies.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'WFY_VACANCY_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateWfyVacancyDto): Promise<WfyVacancyResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const patch: Partial<WfyVacancy> = {};
    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.summary !== undefined) patch.summary = dto.summary;
    if (dto.requirements !== undefined) patch.requirements = dto.requirements;
    if (dto.conditions !== undefined) patch.conditions = dto.conditions;
    if (dto.ord !== undefined) patch.ord = dto.ord;

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }
    patch.updatedAt = new Date();

    try {
      const [row] = await this.db
        .update(wfyVacancies)
        .set(patch)
        .where(and(eq(wfyVacancies.id, id), eq(wfyVacancies.tenantId, tenantId)))
        .returning();
      if (!row) {
        throw new NotFoundException({ code: 'WFY_VACANCY_NOT_FOUND', id });
      }
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'WFY_VACANCY_CODE_TAKEN',
          message: `Vacancy code '${dto.code}' уже используется в этом тенанте.`,
        });
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .delete(wfyVacancies)
      .where(and(eq(wfyVacancies.id, id), eq(wfyVacancies.tenantId, tenantId)))
      .returning({ id: wfyVacancies.id });
    if (!row) {
      throw new NotFoundException({ code: 'WFY_VACANCY_NOT_FOUND', id });
    }
    this.logger.log(`wfy-vacancy deleted: id=${id}, tenant=${tenantId}`);
  }

  private toResponse(row: WfyVacancy): WfyVacancyResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      code: row.code,
      title: row.title,
      summary: row.summary,
      requirements: row.requirements,
      conditions: row.conditions,
      ord: row.ord,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
