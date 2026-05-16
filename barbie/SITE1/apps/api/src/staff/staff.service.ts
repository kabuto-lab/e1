/**
 * StaffService — tenant-scoped CRUD над `staff` + M2M `staff_services`.
 *
 * Слои tenant-изоляции (см. ARCHITECTURE.md §4):
 *   1. TenantGuard на контроллере (резолв тенанта).
 *   2. Все SELECT/UPDATE/DELETE проходят через withTenant() helper.
 *   3. NOT NULL на staff.tenant_id в схеме.
 *
 * Транзакционная семантика:
 *   - createStaff: INSERT staff + INSERT staff_services — одна транзакция.
 *   - updateStaff с serviceIds: DELETE old links + INSERT new — одна транзакция
 *     (даже если сам staff row не меняется).
 *   - archiveStaff: лёгкое UPDATE status='archived', не каскадим в staff_services
 *     (мастер архивирован, но связки с услугами остаются для истории; будущие
 *     записи к нему уже не создашь через UI).
 *
 * Чужой staff (другой тенант) → NotFoundException, НЕ 403 (не утечь сам факт существования).
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, sql } from 'drizzle-orm';

import {
  salons,
  services,
  staff,
  staffServices,
  tenantUsers,
  type Database,
  type NewStaff,
  type StaffSchedule,
} from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import type { CreateStaffDto } from './dto/create-staff.dto';
import type { UpdateStaffDto } from './dto/update-staff.dto';
import type { ListStaffQueryDto } from './dto/list-staff-query.dto';
import type {
  ListStaffResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';

/** Минимально жизнеспособное расписание — пустая неделя; реальное расписание заполняется позже. */
const EMPTY_SCHEDULE: StaffSchedule = {
  weekly: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null },
};

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async createStaff(dto: CreateStaffDto): Promise<StaffResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    return this.db.transaction(async (tx) => {
      // 1. Проверяем что салон принадлежит тенанту.
      const [salonRow] = await tx
        .select({ id: salons.id })
        .from(salons)
        .where(and(eq(salons.id, dto.salonId), eq(salons.tenantId, tenantId)))
        .limit(1);
      if (!salonRow) {
        throw new NotFoundException({ code: 'SALON_NOT_FOUND', id: dto.salonId });
      }

      // 2. userId опционален; если передан — должен быть в tenant_users этого тенанта.
      if (dto.userId) {
        const [tuRow] = await tx
          .select({ userId: tenantUsers.userId })
          .from(tenantUsers)
          .where(
            and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, dto.userId)),
          )
          .limit(1);
        if (!tuRow) {
          throw new NotFoundException({ code: 'USER_NOT_IN_TENANT', userId: dto.userId });
        }
      }

      // 3. serviceIds — все услуги должны быть в этом тенанте.
      const uniqueServiceIds = dto.serviceIds ? Array.from(new Set(dto.serviceIds)) : [];
      if (uniqueServiceIds.length > 0) {
        const found = await tx
          .select({ id: services.id })
          .from(services)
          .where(
            and(eq(services.tenantId, tenantId), inArray(services.id, uniqueServiceIds)),
          );
        if (found.length !== uniqueServiceIds.length) {
          const foundSet = new Set(found.map((r) => r.id));
          const missing = uniqueServiceIds.filter((id) => !foundSet.has(id));
          throw new NotFoundException({ code: 'SERVICES_NOT_FOUND', missing });
        }
      }

      // 4. INSERT staff.
      const insertRow: NewStaff = {
        tenantId,
        salonId: dto.salonId,
        userId: dto.userId ?? null,
        name: dto.name,
        bio: dto.bio ?? null,
        photoKey: dto.photoKey ?? null,
        specialties: dto.specialties ?? [],
        schedule: dto.schedule ?? EMPTY_SCHEDULE,
        // status, sortOrder — defaults в схеме
      };
      const [created] = await tx.insert(staff).values(insertRow).returning();

      // 5. INSERT staff_services (M2M).
      if (uniqueServiceIds.length > 0) {
        await tx.insert(staffServices).values(
          uniqueServiceIds.map((serviceId) => ({
            staffId: created.id,
            serviceId,
            tenantId,
          })),
        );
      }

      this.logger.log(
        `Staff created: ${created.id} (tenant=${tenantId}, salon=${dto.salonId}, services=${uniqueServiceIds.length})`,
      );

      return this.toResponse(created, uniqueServiceIds);
    });
  }

  // ---------------------------------------------------------------------------
  // LIST
  // ---------------------------------------------------------------------------

  async listStaff(query: ListStaffQueryDto): Promise<ListStaffResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const filters = [
      query.salonId ? eq(staff.salonId, query.salonId) : undefined,
      query.status ? eq(staff.status, query.status) : undefined,
      query.q ? ilike(staff.name, `%${query.q.trim()}%`) : undefined,
    ];
    const where = combineTenant(tenantId, staff.tenantId, ...filters);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(staff)
        .where(where)
        .orderBy(desc(staff.sortOrder), desc(staff.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(staff).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  // ---------------------------------------------------------------------------
  // GET ONE (with services M2M)
  // ---------------------------------------------------------------------------

  async getStaff(id: string): Promise<StaffResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const [row] = await this.db
      .select()
      .from(staff)
      .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      // Намеренно 404 — чужой staff не должен светить факт существования.
      throw new NotFoundException({ code: 'STAFF_NOT_FOUND', id });
    }

    // Подтягиваем serviceIds через staff_services (LEFT JOIN не нужен — staff уже есть).
    const linkRows = await this.db
      .select({ serviceId: staffServices.serviceId })
      .from(staffServices)
      .where(and(eq(staffServices.staffId, id), eq(staffServices.tenantId, tenantId)));

    return this.toResponse(row, linkRows.map((l) => l.serviceId));
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async updateStaff(id: string, dto: UpdateStaffDto): Promise<StaffResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    return this.db.transaction(async (tx) => {
      // 1. Загружаем staff (с tenant check).
      const [current] = await tx
        .select()
        .from(staff)
        .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
        .limit(1);
      if (!current) {
        throw new NotFoundException({ code: 'STAFF_NOT_FOUND', id });
      }

      // 2. Если меняется salonId — проверяем новый салон в тенанте.
      if (dto.salonId !== undefined && dto.salonId !== current.salonId) {
        const [salonRow] = await tx
          .select({ id: salons.id })
          .from(salons)
          .where(and(eq(salons.id, dto.salonId), eq(salons.tenantId, tenantId)))
          .limit(1);
        if (!salonRow) {
          throw new NotFoundException({ code: 'SALON_NOT_FOUND', id: dto.salonId });
        }
      }

      // 3. Если меняется userId — проверяем что user в tenant_users.
      // null/undefined семантика:
      //   - undefined → не трогаем поле
      //   - null       → отвязываем мастера от user (мастер становится "анонимным" в плане логина)
      if (dto.userId !== undefined && dto.userId !== null) {
        const [tuRow] = await tx
          .select({ userId: tenantUsers.userId })
          .from(tenantUsers)
          .where(
            and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, dto.userId)),
          )
          .limit(1);
        if (!tuRow) {
          throw new NotFoundException({ code: 'USER_NOT_IN_TENANT', userId: dto.userId });
        }
      }

      // 4. Сборка patch.
      const patch: Record<string, unknown> = {};
      if (dto.salonId !== undefined) patch.salonId = dto.salonId;
      if (dto.userId !== undefined) patch.userId = dto.userId; // null допустим (отвязка)
      if (dto.name !== undefined) patch.name = dto.name;
      if (dto.bio !== undefined) patch.bio = dto.bio;
      if (dto.photoKey !== undefined) patch.photoKey = dto.photoKey;
      if (dto.specialties !== undefined) patch.specialties = dto.specialties;
      if (dto.schedule !== undefined) patch.schedule = dto.schedule;
      if (dto.status !== undefined) patch.status = dto.status;

      let updatedRow = current;
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = sql`now()`;
        const [row] = await tx
          .update(staff)
          .set(patch)
          .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
          .returning();
        if (!row) {
          // Race: кто-то удалил между select и update.
          throw new NotFoundException({ code: 'STAFF_NOT_FOUND', id });
        }
        updatedRow = row;
      }

      // 5. Обновление M2M, если serviceIds передан.
      let finalServiceIds: string[] | undefined;
      if (dto.serviceIds !== undefined) {
        const uniqueServiceIds = Array.from(new Set(dto.serviceIds));

        if (uniqueServiceIds.length > 0) {
          const found = await tx
            .select({ id: services.id })
            .from(services)
            .where(
              and(eq(services.tenantId, tenantId), inArray(services.id, uniqueServiceIds)),
            );
          if (found.length !== uniqueServiceIds.length) {
            const foundSet = new Set(found.map((r) => r.id));
            const missing = uniqueServiceIds.filter((sid) => !foundSet.has(sid));
            throw new BadRequestException({ code: 'SERVICES_NOT_FOUND', missing });
          }
        }

        // DELETE+INSERT внутри транзакции = атомарная замена.
        await tx
          .delete(staffServices)
          .where(
            and(eq(staffServices.staffId, id), eq(staffServices.tenantId, tenantId)),
          );

        if (uniqueServiceIds.length > 0) {
          await tx.insert(staffServices).values(
            uniqueServiceIds.map((serviceId) => ({
              staffId: id,
              serviceId,
              tenantId,
            })),
          );
        }
        finalServiceIds = uniqueServiceIds;
      }

      // Если serviceIds не передан — не подгружаем их (экономим запрос); вернём без поля.
      return this.toResponse(updatedRow, finalServiceIds);
    });
  }

  // ---------------------------------------------------------------------------
  // ARCHIVE
  // ---------------------------------------------------------------------------

  /** Soft archive: status='archived'. M2M связки не трогаем (нужны для истории). */
  async archiveStaff(id: string): Promise<StaffResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const [row] = await this.db
      .update(staff)
      .set({ status: 'archived', updatedAt: sql`now()` })
      .where(and(eq(staff.id, id), eq(staff.tenantId, tenantId)))
      .returning();

    if (!row) {
      throw new NotFoundException({ code: 'STAFF_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  private toResponse(
    row: typeof staff.$inferSelect,
    serviceIds?: string[],
  ): StaffResponseDto {
    const dto: StaffResponseDto = {
      id: row.id,
      tenantId: row.tenantId,
      salonId: row.salonId,
      userId: row.userId,
      name: row.name,
      bio: row.bio,
      photoKey: row.photoKey,
      specialties: row.specialties ?? [],
      schedule: row.schedule,
      status: row.status,
      sortOrder: row.sortOrder,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
    if (serviceIds !== undefined) {
      dto.services = serviceIds;
    }
    return dto;
  }
}
