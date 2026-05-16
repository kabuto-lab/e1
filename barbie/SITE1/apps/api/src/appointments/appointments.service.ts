/**
 * AppointmentsService — ключевая операционная сущность. Tenant-scoped CRUD +:
 *   - idempotency через `Idempotency-Key` header (см. controller)
 *   - overlap protection через SELECT ... FOR UPDATE (Phase 0 lock; Phase 1 GIST)
 *   - вычисление endsAt = startsAt + durationMin (трет временно перенесён в app
 *     до миграции БД-триггера set_appointments_ends_at())
 *
 * Все операции — в транзакциях. FK validation проверяет что салон/мастер/клиент/
 * услуга принадлежат тому же tenant'у (defence in depth поверх FK constraint'ов).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { appointments, clients, salons, services, staff } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { UpdateAppointmentDto } from './dto/update-appointment.dto';
import type { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import type {
  AppointmentResponseDto,
  ListAppointmentsResponseDto,
} from './dto/appointment-response.dto';

/** Статусы, которые занимают slot мастера. cancelled/noshow освобождают. */
const BLOCKING_STATUSES = ['booked', 'confirmed', 'completed'] as const;

/** Допустимые переходы состояний для UpdateAppointmentDto.status. */
const STATUS_TRANSITIONS: Record<string, ReadonlyArray<string>> = {
  booked: ['confirmed', 'cancelled', 'noshow'],
  confirmed: ['completed', 'cancelled', 'noshow'],
  completed: [], // финальный
  cancelled: [], // финальный
  noshow: [],    // финальный
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  /**
   * Создать запись.
   * @param dto             поля записи
   * @param idempotencyKey  значение HTTP-заголовка Idempotency-Key (если задан)
   */
  async createAppointment(
    dto: CreateAppointmentDto,
    idempotencyKey?: string,
  ): Promise<AppointmentResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    return this.db.transaction(async (tx) => {
      // 1. Idempotency replay — если идём с тем же ключом, возвращаем existing
      if (idempotencyKey) {
        const [existing] = await tx
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.tenantId, tenantId),
              eq(appointments.idempotencyKey, idempotencyKey),
            ),
          )
          .limit(1);
        if (existing) {
          this.logger.log(`Idempotency replay: ${idempotencyKey} → ${existing.id}`);
          return this.toResponse(existing);
        }
      }

      // 2. Резолв связанных сущностей (salon/client/staff/service)
      //    — проверяем что они есть и принадлежат этому tenant'у.
      const [salon] = await tx
        .select({ id: salons.id, status: salons.status })
        .from(salons)
        .where(and(eq(salons.id, dto.salonId), eq(salons.tenantId, tenantId)))
        .limit(1);
      if (!salon) throw new NotFoundException({ code: 'SALON_NOT_FOUND', id: dto.salonId });

      const [client] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, dto.clientId), eq(clients.tenantId, tenantId)))
        .limit(1);
      if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', id: dto.clientId });

      const [staffRow] = await tx
        .select({ id: staff.id, salonId: staff.salonId, status: staff.status })
        .from(staff)
        .where(and(eq(staff.id, dto.staffId), eq(staff.tenantId, tenantId)))
        .limit(1);
      if (!staffRow) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', id: dto.staffId });
      if (staffRow.status !== 'active') {
        throw new ForbiddenException({ code: 'STAFF_INACTIVE', id: dto.staffId });
      }
      // Мастер должен работать именно в этом салоне (Phase 0: жёсткая привязка)
      if (staffRow.salonId !== dto.salonId) {
        throw new BadRequestException({
          code: 'STAFF_SALON_MISMATCH',
          message: 'Мастер не работает в указанном салоне.',
        });
      }

      const [service] = await tx
        .select({
          id: services.id,
          salonId: services.salonId,
          durationMin: services.durationMin,
          priceKopecks: services.priceKopecks,
          status: services.status,
        })
        .from(services)
        .where(and(eq(services.id, dto.serviceId), eq(services.tenantId, tenantId)))
        .limit(1);
      if (!service) throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', id: dto.serviceId });
      if (service.status !== 'active') {
        throw new ForbiddenException({ code: 'SERVICE_INACTIVE', id: dto.serviceId });
      }
      // services.salonId nullable: null = доступна во всех салонах тенанта
      if (service.salonId !== null && service.salonId !== dto.salonId) {
        throw new BadRequestException({
          code: 'SERVICE_SALON_MISMATCH',
          message: 'Услуга недоступна в этом салоне.',
        });
      }

      // 3. Проверка: мастер вообще делает эту услугу (M2M staff_services)?
      //    Если связки нет — Phase 0 рассматривает как допустимое (любой staff может
      //    делать любую активную услугу). Жёсткую проверку включим в Phase 1, когда
      //    UI начнёт привязывать услуги к staff.
      // (intentionally lenient)

      // 4. Вычисление endsAt
      const durationMin = dto.durationMin ?? service.durationMin;
      if (durationMin <= 0 || durationMin > 1440) {
        throw new BadRequestException({ code: 'DURATION_OUT_OF_RANGE', durationMin });
      }
      const startsAt = dto.startsAt;
      const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
      if (endsAt <= startsAt) {
        throw new BadRequestException({ code: 'INVALID_TIME_RANGE' });
      }

      // 5. Overlap protection через SELECT FOR UPDATE.
      //    Lock'им строки мастера за пересекающимся диапазоном:
      //      existing.starts_at < new.ends_at AND existing.ends_at > new.starts_at
      //    + только blocking-статусы (cancelled/noshow свободят слот).
      const overlap = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            eq(appointments.staffId, dto.staffId),
            inArray(appointments.status, [...BLOCKING_STATUSES]),
            lt(appointments.startsAt, endsAt),
            gt(appointments.endsAt, startsAt),
          ),
        )
        .for('update')
        .limit(1);

      if (overlap.length > 0) {
        throw new ConflictException({
          code: 'APPOINTMENT_OVERLAP',
          message: 'Этот мастер уже занят в указанное время.',
          conflictingId: overlap[0].id,
        });
      }

      // 6. Цена: либо переданная (BigInt-safe из строки), либо из service
      const priceKopecks =
        dto.priceKopecks !== undefined ? BigInt(dto.priceKopecks) : service.priceKopecks;
      if (priceKopecks < 0n) {
        throw new BadRequestException({ code: 'PRICE_NEGATIVE' });
      }

      // 7. INSERT
      try {
        const [created] = await tx
          .insert(appointments)
          .values({
            tenantId,
            salonId: dto.salonId,
            clientId: dto.clientId,
            staffId: dto.staffId,
            serviceId: dto.serviceId,
            startsAt,
            endsAt,
            durationMin,
            priceKopecks,
            currency: 'RUB',
            status: 'booked',
            source: dto.source ?? 'admin',
            notes: dto.notes ?? null,
            idempotencyKey: idempotencyKey ?? null,
          })
          .returning();
        this.logger.log(
          `Appointment created: ${created.id} salon=${dto.salonId} staff=${dto.staffId} start=${startsAt.toISOString()}`,
        );
        return this.toResponse(created);
      } catch (err: any) {
        // Race на idempotency_key или partial unique
        if (err?.code === '23505' && idempotencyKey) {
          const [race] = await tx
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.tenantId, tenantId),
                eq(appointments.idempotencyKey, idempotencyKey),
              ),
            )
            .limit(1);
          if (race) return this.toResponse(race);
        }
        throw err;
      }
    });
  }

  async listAppointments(query: ListAppointmentsQueryDto): Promise<ListAppointmentsResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const extra: SQL[] = [];
    if (query.salonId) extra.push(eq(appointments.salonId, query.salonId));
    if (query.staffId) extra.push(eq(appointments.staffId, query.staffId));
    if (query.clientId) extra.push(eq(appointments.clientId, query.clientId));
    if (query.status) extra.push(eq(appointments.status, query.status));
    if (query.from) extra.push(gte(appointments.startsAt, query.from));
    if (query.to) extra.push(lt(appointments.startsAt, query.to));

    const where = combineTenant(tenantId, appointments.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(appointments)
        .where(where)
        .orderBy(asc(appointments.startsAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(appointments)
        .where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getAppointment(id: string): Promise<AppointmentResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', id });
    return this.toResponse(row);
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto): Promise<AppointmentResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
        .for('update')
        .limit(1);
      if (!current) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', id });

      const patch: Record<string, unknown> = { updatedAt: sql`now()` };

      if (dto.status !== undefined && dto.status !== current.status) {
        const allowed = STATUS_TRANSITIONS[current.status] ?? [];
        if (!allowed.includes(dto.status)) {
          throw new BadRequestException({
            code: 'INVALID_STATUS_TRANSITION',
            from: current.status,
            to: dto.status,
            allowed,
          });
        }
        patch.status = dto.status;
        if (dto.status === 'cancelled' && !dto.cancellationReason) {
          throw new BadRequestException({ code: 'CANCELLATION_REASON_REQUIRED' });
        }
        if (dto.cancellationReason !== undefined) {
          patch.cancellationReason = dto.cancellationReason;
        }
      } else if (dto.cancellationReason !== undefined) {
        patch.cancellationReason = dto.cancellationReason;
      }

      if (dto.notes !== undefined) patch.notes = dto.notes;

      const [updated] = await tx
        .update(appointments)
        .set(patch)
        .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
        .returning();

      return this.toResponse(updated);
    });
  }

  /** Soft cancel — DELETE-эндпоинт ставит status='cancelled'. */
  async cancelAppointment(id: string, reason?: string): Promise<AppointmentResponseDto> {
    return this.updateAppointment(id, {
      status: 'cancelled',
      cancellationReason: reason ?? 'Отменена администратором',
    });
  }

  private toResponse(row: typeof appointments.$inferSelect): AppointmentResponseDto {
    return {
      id: row.id,
      salonId: row.salonId,
      clientId: row.clientId,
      staffId: row.staffId,
      serviceId: row.serviceId,
      startsAt: row.startsAt instanceof Date ? row.startsAt.toISOString() : String(row.startsAt),
      endsAt: row.endsAt instanceof Date ? row.endsAt.toISOString() : String(row.endsAt),
      durationMin: row.durationMin,
      priceKopecks: row.priceKopecks.toString(),
      currency: row.currency,
      status: row.status as AppointmentResponseDto['status'],
      source: row.source as AppointmentResponseDto['source'],
      notes: row.notes,
      cancellationReason: row.cancellationReason,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}
