/**
 * ServicesService — tenant-scoped CRUD над таблицей `services`.
 *
 * Изоляция:
 *   - Layer 1: TenantGuard на контроллере (резолв tenant из subdomain/header).
 *   - Layer 2: withTenant() во всех чтениях/обновлениях/удалениях.
 *   - Layer 3: NOT NULL tenant_id в схеме.
 *
 * Особенности:
 *   - `priceKopecks` хранится как bigint; на вход — строка цифр, конвертится в BigInt;
 *     на выход — снова строка (JSON.stringify не умеет BigInt).
 *   - `salonId` nullable: null → услуга глобальна для всех салонов тенанта;
 *     если передан UUID — проверяем, что салон принадлежит текущему тенанту.
 *   - Composite unique `(tenant_id, salon_id, slug)` — на конфликт отдаём 409.
 */
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, isNull, or, sql, SQL } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { salons, services, type ServiceStatus } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';
import type { ListServicesQueryDto } from './dto/list-services-query.dto';
import type {
  ListServicesResponseDto,
  ServiceResponseDto,
} from './dto/service-response.dto';

/** PostgreSQL код ошибки уникальности — для маппинга в 409. */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createService(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const salonId = dto.salonId ?? null;
    if (salonId) {
      await this.assertSalonBelongsToTenant(salonId, tenantId);
    }

    let priceBigInt: bigint;
    try {
      priceBigInt = BigInt(dto.priceKopecks);
    } catch {
      // regex в DTO уже отрезает не-цифры, но защищаемся на случай прямого вызова сервиса.
      throw new ConflictException({
        code: 'INVALID_PRICE',
        message: 'priceKopecks должен быть строкой неотрицательных цифр',
      });
    }
    if (priceBigInt < 0n) {
      throw new ConflictException({
        code: 'INVALID_PRICE',
        message: 'priceKopecks должен быть >= 0',
      });
    }

    try {
      const [row] = await this.db
        .insert(services)
        .values({
          tenantId,
          salonId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          category: dto.category,
          durationMin: dto.durationMin,
          priceKopecks: priceBigInt,
          // currency пока всегда RUB (default в схеме); поле в DTO добавим, когда понадобится мультивалюта.
        })
        .returning();

      this.logger.log(
        `Service created: tenant=${tenantId} salon=${salonId ?? 'GLOBAL'} slug=${row.slug} id=${row.id}`,
      );
      return this.toResponse(row);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException({
          code: 'SERVICE_SLUG_CONFLICT',
          message: `Услуга со slug '${dto.slug}' уже существует в этом scope (tenant/salon).`,
        });
      }
      throw err;
    }
  }

  async listServices(query: ListServicesQueryDto): Promise<ListServicesResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const filters: (SQL | undefined)[] = [];
    if (query.status) filters.push(eq(services.status, query.status));
    if (query.salonId) filters.push(eq(services.salonId, query.salonId));
    if (query.category) filters.push(eq(services.category, query.category));
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      filters.push(or(ilike(services.name, pattern), ilike(services.slug, pattern))!);
    }

    const where = combineTenant(tenantId, services.tenantId, ...filters);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(services)
        .where(where)
        .orderBy(asc(services.sortOrder), desc(services.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(services).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getService(id: string): Promise<ServiceResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(services)
      .where(combineTenant(tenantId, services.tenantId, eq(services.id, id)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async updateService(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    // Гарантируем существование внутри тенанта (404 если чужая/нет).
    await this.getService(id);

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.durationMin !== undefined) patch.durationMin = dto.durationMin;
    if (dto.status !== undefined) patch.status = dto.status;

    if (dto.priceKopecks !== undefined) {
      try {
        const priceBigInt = BigInt(dto.priceKopecks);
        if (priceBigInt < 0n) {
          throw new ConflictException({
            code: 'INVALID_PRICE',
            message: 'priceKopecks должен быть >= 0',
          });
        }
        patch.priceKopecks = priceBigInt;
      } catch (err) {
        if (err instanceof ConflictException) throw err;
        throw new ConflictException({
          code: 'INVALID_PRICE',
          message: 'priceKopecks должен быть строкой неотрицательных цифр',
        });
      }
    }

    if (dto.salonId !== undefined) {
      const nextSalonId = dto.salonId ?? null;
      if (nextSalonId) {
        await this.assertSalonBelongsToTenant(nextSalonId, tenantId);
      }
      patch.salonId = nextSalonId;
    }

    if (Object.keys(patch).length === 0) {
      return this.getService(id);
    }
    patch.updatedAt = sql`now()`;

    try {
      const [row] = await this.db
        .update(services)
        .set(patch)
        .where(combineTenant(tenantId, services.tenantId, eq(services.id, id)))
        .returning();

      if (!row) {
        throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', id });
      }
      return this.toResponse(row);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException({
          code: 'SERVICE_SLUG_CONFLICT',
          message: 'Услуга с таким slug уже существует в этом scope (tenant/salon).',
        });
      }
      throw err;
    }
  }

  /** Soft archive — status='archived'. Физическая запись остаётся. */
  async archiveService(id: string): Promise<ServiceResponseDto> {
    return this.updateService(id, { status: 'archived' as ServiceStatus });
  }

  // === internals ===

  private async assertSalonBelongsToTenant(salonId: string, tenantId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: salons.id })
      .from(salons)
      .where(and(eq(salons.id, salonId), eq(salons.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException({
        code: 'SALON_NOT_FOUND',
        message: `Салон ${salonId} не найден или не принадлежит текущему тенанту.`,
      });
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === PG_UNIQUE_VIOLATION
    );
  }

  private toResponse(row: typeof services.$inferSelect): ServiceResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      salonId: row.salonId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      durationMin: row.durationMin,
      // BigInt → string (JSON.stringify не умеет BigInt).
      priceKopecks: row.priceKopecks.toString(),
      currency: row.currency,
      coverImageKey: row.coverImageKey,
      status: row.status,
      sortOrder: row.sortOrder,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}

// `or`/`isNull` импортированы заранее — оставлены для будущих фильтров (например "global only"),
// чтобы не возвращаться к шапке импортов при расширении.
void isNull;
void or;
