/**
 * WfyPartnerSalonsService — tenant-scoped CRUD над `partner_salons`.
 *
 * Защиты (4 слоя):
 *   - Layer 1: TenantGuard на контроллере (резолвит контекст).
 *   - Layer 2: `combineTenant()` на каждом WHERE.
 *   - Layer 3: schema NOT NULL `tenant_id` + composite index `(tenant_id, ord)`.
 *   - Layer 4: `assertMediaBelongsToTenant()` — закрытие cross-tenant media leak
 *     при логотипе (см. partner-salons.ts:9-11 schema docstring).
 *   - Site-type capability (`tenants.site_type === 'wfy-city-dir'`) — enforced
 *     declaratively by `WfyTenantCapabilityGuard` on the controller (Track D.7),
 *     409 TENANT_SITE_TYPE_MISMATCH для других типов тенантов.
 */
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';

import type { Database, PartnerSalon } from '@barbie-site1/db';
import { media, partnerSalons } from '@barbie-site1/db';

import { DRIZZLE } from '../../database/database.module';
import { TenantContextService } from '../../tenant-context/tenant-context.service';
import { combineTenant } from '../../tenant-context/with-tenant.helper';
import type { CreateWfyPartnerSalonDto } from './dto/create-wfy-partner-salon.dto';
import type { UpdateWfyPartnerSalonDto } from './dto/update-wfy-partner-salon.dto';
import type { ListWfyPartnerSalonsQueryDto } from './dto/list-wfy-partner-salons-query.dto';
import type {
  ListWfyPartnerSalonsResponseDto,
  WfyPartnerSalonResponseDto,
} from './dto/wfy-partner-salon-response.dto';

@Injectable()
export class WfyPartnerSalonsService {
  private readonly logger = new Logger(WfyPartnerSalonsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: CreateWfyPartnerSalonDto): Promise<WfyPartnerSalonResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    if (dto.logoMediaId) {
      await this.assertMediaBelongsToTenant(dto.logoMediaId, tenantId);
    }
    const [row] = await this.db
      .insert(partnerSalons)
      .values({
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        externalLink: dto.externalLink ?? null,
        logoMediaId: dto.logoMediaId ?? null,
        ord: dto.ord ?? 0,
      })
      .returning();
    this.logger.log(`partner-salon created: ${row.name} (id=${row.id}, tenant=${tenantId})`);
    return this.toResponse(row);
  }

  async list(query: ListWfyPartnerSalonsQueryDto): Promise<ListWfyPartnerSalonsResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const extra: (SQL | undefined)[] = [];
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(ilike(partnerSalons.name, pattern));
    }
    const where = combineTenant(tenantId, partnerSalons.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(partnerSalons)
        .where(where)
        .orderBy(asc(partnerSalons.ord), asc(partnerSalons.name))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(partnerSalons).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async get(id: string): Promise<WfyPartnerSalonResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(partnerSalons)
      .where(and(eq(partnerSalons.id, id), eq(partnerSalons.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'WFY_PARTNER_SALON_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateWfyPartnerSalonDto): Promise<WfyPartnerSalonResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    if (typeof dto.logoMediaId === 'string') {
      await this.assertMediaBelongsToTenant(dto.logoMediaId, tenantId);
    }

    const patch: Partial<PartnerSalon> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.externalLink !== undefined) patch.externalLink = dto.externalLink;
    if (dto.logoMediaId !== undefined) patch.logoMediaId = dto.logoMediaId;
    if (dto.ord !== undefined) patch.ord = dto.ord;

    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }
    patch.updatedAt = new Date();

    const [row] = await this.db
      .update(partnerSalons)
      .set(patch)
      .where(and(eq(partnerSalons.id, id), eq(partnerSalons.tenantId, tenantId)))
      .returning();
    if (!row) {
      throw new NotFoundException({ code: 'WFY_PARTNER_SALON_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .delete(partnerSalons)
      .where(and(eq(partnerSalons.id, id), eq(partnerSalons.tenantId, tenantId)))
      .returning({ id: partnerSalons.id });
    if (!row) {
      throw new NotFoundException({ code: 'WFY_PARTNER_SALON_NOT_FOUND', id });
    }
    this.logger.log(`partner-salon deleted: id=${id}, tenant=${tenantId}`);
  }

  /**
   * Sentinel: cross-tenant media leak protection. Перед insert/update logoMediaId
   * проверяем, что медиа принадлежит текущему тенанту. Mismatch → NotFoundException
   * с code MEDIA_NOT_FOUND (не разглашаем существование медиа в чужом тенанте —
   * same shape как «не существует»).
   *
   * Inline single-callsite; на третьей репликации (D.3/D.4/D.5) вынести в
   * shared helper apps/api/src/media/assert-media-tenant.helper.ts (rule-of-three).
   */
  private async assertMediaBelongsToTenant(mediaId: string, tenantId: string): Promise<void> {
    const [m] = await this.db
      .select({ tenantId: media.tenantId })
      .from(media)
      .where(eq(media.id, mediaId))
      .limit(1);
    if (!m || m.tenantId !== tenantId) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', id: mediaId });
    }
  }

  private toResponse(row: PartnerSalon): WfyPartnerSalonResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      address: row.address,
      phone: row.phone,
      email: row.email,
      externalLink: row.externalLink,
      logoMediaId: row.logoMediaId,
      ord: row.ord,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
