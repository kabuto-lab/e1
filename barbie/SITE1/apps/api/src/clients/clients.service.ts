/**
 * ClientsService — tenant-scoped CRUD над `clients` (CRM-карточки клиентов салона).
 *
 * Все запросы ВСЕГДА содержат `eq(clients.tenantId, tenantId)` (Layer 2 4-слойной
 * изоляции, ARCHITECTURE.md §4) — через `combineTenant()` / явный `eq`.
 *
 * Особенности:
 *   - phone уникален per-tenant (uniq `clients_tenant_phone_uniq`). При конфликте
 *     возвращаем 409 + `existing.id` — UI предлагает «использовать существующего».
 *   - email НЕ уникален per-tenant; дубликаты разрешены.
 *   - birthdate — `date` в БД; DTO принимает ISO string, отдаём наружу тоже строкой.
 *   - tags — `jsonb` string[], нормализуем lowercase+trim+dedup перед сохранением.
 *   - notes — PII; в list endpoint НЕ отдаём (см. listClients → ClientListItemDto).
 *   - 404 на чужого клиента (не раскрываем существование в другом тенанте).
 *
 * findByPhone(phone) — внутренний метод, экспортируется для AppointmentsModule:
 * быстрый lookup при создании booking. Возвращает Client | null.
 */
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';

import type { Client, Database } from '@barbie-site1/db';
import { clients } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import type { CreateClientDto } from './dto/create-client.dto';
import type { UpdateClientDto } from './dto/update-client.dto';
import type { ListClientsQueryDto } from './dto/list-clients-query.dto';
import type {
  ClientListItemDto,
  ClientResponseDto,
  ListClientsResponseDto,
} from './dto/client-response.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createClient(dto: CreateClientDto): Promise<ClientResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const phone = dto.phone.trim();
    const tags = this.normalizeTags(dto.tags);

    // Preflight uniqueness check — раньше unique violation, чтобы вернуть existing.id.
    const existing = await this.findByPhoneInternal(tenantId, phone);
    if (existing) {
      throw new ConflictException({
        code: 'CLIENT_PHONE_TAKEN',
        message: `Клиент с телефоном '${phone}' уже существует в этом тенанте.`,
        existing: { id: existing.id },
      });
    }

    try {
      const [row] = await this.db
        .insert(clients)
        .values({
          tenantId,
          userId: dto.userId ?? null,
          name: dto.name.trim(),
          phone,
          email: dto.email?.trim().toLowerCase() ?? null,
          birthdate: dto.birthdate ?? null,
          notes: dto.notes ?? null,
          tags,
          status: 'active',
        })
        .returning();

      this.logger.log(
        `Client created: phone=${row.phone} (id=${row.id}, tenant=${tenantId})`,
      );
      return this.toResponse(row);
    } catch (err: any) {
      // Race condition: уникальность проверили выше, но между select и insert мог
      // вклиниться параллельный запрос. Повторно достаём existing для payload.
      if (err?.code === '23505') {
        const race = await this.findByPhoneInternal(tenantId, phone);
        throw new ConflictException({
          code: 'CLIENT_PHONE_TAKEN',
          message: `Клиент с телефоном '${phone}' уже существует в этом тенанте.`,
          existing: race ? { id: race.id } : undefined,
        });
      }
      throw err;
    }
  }

  async listClients(query: ListClientsQueryDto): Promise<ListClientsResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const extra: (SQL | undefined)[] = [];
    if (query.status) extra.push(eq(clients.status, query.status));
    if (query.q) {
      const pattern = `%${query.q.trim()}%`;
      extra.push(
        or(
          ilike(clients.name, pattern),
          ilike(clients.phone, pattern),
          ilike(clients.email, pattern),
        )!,
      );
    }
    if (query.tag) {
      const tag = query.tag.trim().toLowerCase();
      // jsonb `?` — содержит ли массив строку
      extra.push(sql`${clients.tags} ? ${tag}`);
    }
    if (query.hasUser === true) extra.push(isNotNull(clients.userId));
    if (query.hasUser === false) extra.push(isNull(clients.userId));

    const where = combineTenant(tenantId, clients.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(clients)
        .where(where)
        .orderBy(desc(clients.createdAt), asc(clients.name))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(clients).where(where),
    ]);

    return {
      data: rows.map((r) => this.toListItem(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getClient(id: string): Promise<ClientResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .limit(1);
    if (!row) {
      // 404 даже если запись есть в другом тенанте — не раскрываем существование.
      throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', id });
    }
    return this.toResponse(row);
  }

  async updateClient(id: string, dto: UpdateClientDto): Promise<ClientResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();

    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.phone !== undefined) patch.phone = dto.phone.trim();
    if (dto.email !== undefined) {
      patch.email = dto.email ? dto.email.trim().toLowerCase() : null;
    }
    if (dto.birthdate !== undefined) patch.birthdate = dto.birthdate;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.tags !== undefined) patch.tags = this.normalizeTags(dto.tags);
    if (dto.userId !== undefined) patch.userId = dto.userId ?? null;
    if (dto.status !== undefined) patch.status = dto.status;

    if (Object.keys(patch).length === 0) {
      return this.getClient(id);
    }

    // Перед сменой phone — повторная проверка uniqueness, чтобы вернуть existing.id.
    if (typeof patch.phone === 'string') {
      const newPhone = patch.phone;
      const existing = await this.findByPhoneInternal(tenantId, newPhone);
      if (existing && existing.id !== id) {
        throw new ConflictException({
          code: 'CLIENT_PHONE_TAKEN',
          message: `Клиент с телефоном '${newPhone}' уже существует в этом тенанте.`,
          existing: { id: existing.id },
        });
      }
    }

    patch.updatedAt = sql`now()`;

    try {
      const [row] = await this.db
        .update(clients)
        .set(patch)
        .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
        .returning();

      if (!row) {
        throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', id });
      }
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        const newPhone = typeof patch.phone === 'string' ? patch.phone : undefined;
        const race = newPhone ? await this.findByPhoneInternal(tenantId, newPhone) : null;
        throw new ConflictException({
          code: 'CLIENT_PHONE_TAKEN',
          message: newPhone
            ? `Клиент с телефоном '${newPhone}' уже существует в этом тенанте.`
            : 'Конфликт уникальности при обновлении клиента.',
          existing: race ? { id: race.id } : undefined,
        });
      }
      throw err;
    }
  }

  /** Soft archive: status='archived'. Физическое удаление запрещено. */
  async archiveClient(id: string): Promise<ClientResponseDto> {
    return this.updateClient(id, { status: 'archived' });
  }

  /**
   * Поиск клиента по phone в текущем тенанте.
   *
   * Используется из AppointmentsModule (auto-link клиента при создании booking),
   * BotModule (TG-mapping), CRM-импорт. Возвращает Client | null без бросания
   * исключений.
   */
  async findByPhone(phone: string): Promise<Client | null> {
    const tenantId = this.tenantContext.requireTenantId();
    return this.findByPhoneInternal(tenantId, phone.trim());
  }

  // --- private helpers ---------------------------------------------------------

  private async findByPhoneInternal(tenantId: string, phone: string): Promise<Client | null> {
    const [row] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.phone, phone)))
      .limit(1);
    return row ?? null;
  }

  /** Lowercase + trim + dedup + drop empties. Сохраняем порядок появления. */
  private normalizeTags(input: string[] | undefined): string[] {
    if (!input || input.length === 0) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of input) {
      if (typeof raw !== 'string') continue;
      const t = raw.trim().toLowerCase();
      if (!t) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out;
  }

  private toResponse(row: Client): ClientResponseDto {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      birthdate: row.birthdate as unknown as string | null,
      notes: row.notes,
      tags: row.tags ?? [],
      userId: row.userId,
      status: row.status,
      firstVisitAt:
        row.firstVisitAt instanceof Date
          ? row.firstVisitAt.toISOString()
          : (row.firstVisitAt as unknown as string | null),
      lastVisitAt:
        row.lastVisitAt instanceof Date
          ? row.lastVisitAt.toISOString()
          : (row.lastVisitAt as unknown as string | null),
      totalSpentKopecks: row.totalSpentKopecks?.toString() ?? '0',
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }

  /** Версия toResponse без notes — для list endpoint (защита PII). */
  private toListItem(row: Client): ClientListItemDto {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      birthdate: row.birthdate as unknown as string | null,
      tags: row.tags ?? [],
      userId: row.userId,
      status: row.status,
      firstVisitAt:
        row.firstVisitAt instanceof Date
          ? row.firstVisitAt.toISOString()
          : (row.firstVisitAt as unknown as string | null),
      lastVisitAt:
        row.lastVisitAt instanceof Date
          ? row.lastVisitAt.toISOString()
          : (row.lastVisitAt as unknown as string | null),
      totalSpentKopecks: row.totalSpentKopecks?.toString() ?? '0',
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}
