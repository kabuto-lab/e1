/**
 * GirlsService — CRUD над глобальным каталогом `girls` (Class-G, ADR-008).
 *
 * БЕЗ tenant-scoping: таблица платформенно-глобальная (нет tenant_id). Правится
 * админом, публикуется на сайты снапшотами (ADR-009 — отдельный шаг).
 *
 * MVP-объём: list / get / update. params (jsonb) и mediaKeys заменяются целиком
 * при update — структуру (age/height/weight/breast/silicon/active/inactiveMedia,
 * порядок и видимость фото) держит клиент.
 */
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { asc, count, eq, ilike, sql, type SQL } from 'drizzle-orm';

import type { Database, Girl } from '@barbie-site1/db';
import { girls } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import type { UpdateGirlDto } from './dto/update-girl.dto';
import type { ListGirlsQueryDto } from './dto/list-girls-query.dto';
import type { GirlResponseDto, ListGirlsResponseDto } from './dto/girl-response.dto';
import type { PublicGirlDto, PublicGirlsListDto } from './dto/public-girl.dto';

@Injectable()
export class GirlsService {
  private readonly logger = new Logger(GirlsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(query: ListGirlsQueryDto): Promise<ListGirlsResponseDto> {
    const limit = query.limit ?? 200;
    const offset = query.offset ?? 0;
    const where: SQL | undefined = query.q ? ilike(girls.name, `%${query.q.trim()}%`) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(girls)
        .where(where)
        .orderBy(asc(girls.ord), asc(girls.name))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(girls).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async get(id: string): Promise<GirlResponseDto> {
    const [row] = await this.db.select().from(girls).where(eq(girls.id, id)).limit(1);
    if (!row) throw new NotFoundException({ code: 'GIRL_NOT_FOUND', id });
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateGirlDto): Promise<GirlResponseDto> {
    const patch: Partial<Girl> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.params !== undefined) patch.params = dto.params;
    if (dto.mediaKeys !== undefined) patch.mediaKeys = dto.mediaKeys;
    if (dto.ord !== undefined) patch.ord = dto.ord;

    if (Object.keys(patch).length === 0) return this.get(id);
    patch.updatedAt = new Date();

    const [row] = await this.db.update(girls).set(patch).where(eq(girls.id, id)).returning();
    if (!row) throw new NotFoundException({ code: 'GIRL_NOT_FOUND', id });
    this.logger.log(`girl updated: ${row.slug} (id=${id})`);
    return this.toResponse(row);
  }

  /**
   * Полный ре-ордер каталога: ord = позиция в массиве ids. Глобально (Class-G) —
   * новый порядок применяется на всех сайтах всех тенантов. Транзакция.
   */
  async reorder(ids: string[]): Promise<{ updated: number }> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(girls)
          .set({ ord: i, updatedAt: new Date() })
          .where(eq(girls.id, ids[i]));
      }
    });
    this.logger.log(`girls reordered: ${ids.length} items`);
    return { updated: ids.length };
  }

  // ─── Public (сайты тенантов, без auth) ──────────────────────────────────────

  /**
   * Активные модели для публичного сайта. Если передан `tenantSlug` — фильтр по
   * params.activeTenants: модель видна, если activeTenants отсутствует / не
   * массив (= глобально, legacy) ИЛИ содержит slug. Без slug — все активные.
   */
  async listPublic(tenantSlug?: string): Promise<PublicGirlsListDto> {
    const activeClause = sql`coalesce((${girls.params}->>'active')::boolean, true) = true`;
    const where = tenantSlug
      ? sql`${activeClause} AND (
            ${girls.params}->'activeTenants' IS NULL
            OR jsonb_typeof(${girls.params}->'activeTenants') <> 'array'
            OR ${girls.params}->'activeTenants' @> ${JSON.stringify([tenantSlug])}::jsonb
          )`
      : activeClause;

    const rows = await this.db
      .select()
      .from(girls)
      .where(where)
      .orderBy(asc(girls.ord), asc(girls.name));

    const data = rows.map((r) => this.toPublic(r));
    return { data, total: data.length };
  }

  async getPublicBySlug(slug: string): Promise<PublicGirlDto> {
    const [row] = await this.db.select().from(girls).where(eq(girls.slug, slug)).limit(1);
    if (!row) throw new NotFoundException({ code: 'GIRL_NOT_FOUND', slug });
    return this.toPublic(row);
  }

  private toPublic(row: Girl): PublicGirlDto {
    const p = row.params as Record<string, unknown>;
    const inactive = Array.isArray(p.inactiveMedia) ? (p.inactiveMedia as string[]) : [];
    const photos = row.mediaKeys.filter((k) => !inactive.includes(k));
    const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);
    return {
      slug: row.slug,
      name: row.name,
      age: num(p.age),
      height: num(p.height),
      weight: num(p.weight),
      breast: num(p.breast),
      silicon: p.silicon === true,
      description: row.description,
      photos,
    };
  }

  private toResponse(row: Girl): GirlResponseDto {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      params: row.params,
      mediaKeys: row.mediaKeys,
      ord: row.ord,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
