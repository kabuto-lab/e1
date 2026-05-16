/**
 * SalonsService — tenant-scoped CRUD над `salons`.
 *
 * Все запросы ВСЕГДА содержат `eq(salons.tenantId, tenantId)` — это Layer 2
 * 4-слойной изоляции (см. ARCHITECTURE.md §4). Используем `combineTenant()` /
 * `withTenant()` helper'ы, чтобы исключить случай "забыл фильтр по тенанту".
 *
 * Безопасность: при попытке доступа к чужому салону отдаём 404, а не 403 —
 * не раскрываем сам факт существования записи в другом тенанте.
 */
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { salons } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import type { CreateSalonDto } from './dto/create-salon.dto';
import type { UpdateSalonDto } from './dto/update-salon.dto';
import type { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import type { ListSalonsResponseDto, SalonResponseDto } from './dto/salon-response.dto';

@Injectable()
export class SalonsService {
  private readonly logger = new Logger(SalonsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createSalon(dto: CreateSalonDto): Promise<SalonResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    try {
      const [row] = await this.db
        .insert(salons)
        .values({
          tenantId,
          name: dto.name,
          slug: dto.slug,
          address: dto.address,
          city: dto.city,
          region: dto.region ?? null,
          country: dto.country ?? 'RU',
          postalCode: dto.postalCode ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          workingHours: dto.workingHours ?? {},
          coverImageKey: dto.coverImageKey ?? null,
          description: dto.description ?? null,
          status: 'active',
        })
        .returning();

      this.logger.log(`Salon created: ${row.slug} (id=${row.id}, tenant=${tenantId})`);
      return this.toResponse(row);
    } catch (err: any) {
      // unique violation (tenant_id, slug)
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'SALON_SLUG_TAKEN',
          message: `Salon slug '${dto.slug}' уже используется в этом тенанте.`,
        });
      }
      throw err;
    }
  }

  async listSalons(query: ListSalonsQueryDto): Promise<ListSalonsResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const extra = [];
    if (query.status) extra.push(eq(salons.status, query.status));
    if (query.city) extra.push(eq(salons.city, query.city));
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(ilike(salons.name, pattern));
    }
    const where = combineTenant(tenantId, salons.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(salons)
        .where(where)
        .orderBy(desc(salons.createdAt), asc(salons.name))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(salons).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getSalon(id: string): Promise<SalonResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(salons)
      .where(and(eq(salons.id, id), eq(salons.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      // 404 даже если запись есть в другом тенанте — не раскрываем существование.
      throw new NotFoundException({ code: 'SALON_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async updateSalon(id: string, dto: UpdateSalonDto): Promise<SalonResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.city !== undefined) patch.city = dto.city;
    if (dto.region !== undefined) patch.region = dto.region;
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.postalCode !== undefined) patch.postalCode = dto.postalCode;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.workingHours !== undefined) patch.workingHours = dto.workingHours;
    if (dto.coverImageKey !== undefined) patch.coverImageKey = dto.coverImageKey;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.status !== undefined) patch.status = dto.status;

    if (Object.keys(patch).length === 0) {
      return this.getSalon(id);
    }
    patch.updatedAt = sql`now()`;

    try {
      const [row] = await this.db
        .update(salons)
        .set(patch)
        .where(and(eq(salons.id, id), eq(salons.tenantId, tenantId)))
        .returning();

      if (!row) {
        throw new NotFoundException({ code: 'SALON_NOT_FOUND', id });
      }
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'SALON_SLUG_TAKEN',
          message: `Salon slug '${dto.slug}' уже используется в этом тенанте.`,
        });
      }
      throw err;
    }
  }

  /** Soft archive: status='archived'. Физическое удаление запрещено. */
  async archiveSalon(id: string): Promise<SalonResponseDto> {
    return this.updateSalon(id, { status: 'archived' });
  }

  private toResponse(row: typeof salons.$inferSelect): SalonResponseDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      city: row.city,
      region: row.region,
      country: row.country,
      postalCode: row.postalCode,
      geoLat: row.geoLat as unknown as string | null,
      geoLng: row.geoLng as unknown as string | null,
      phone: row.phone,
      email: row.email,
      workingHours: row.workingHours,
      status: row.status,
      coverImageKey: row.coverImageKey,
      description: row.description,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}
