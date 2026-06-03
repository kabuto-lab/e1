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
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { asc, count, eq, ilike, sql, type SQL } from 'drizzle-orm';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

import type { Database, Girl } from '@barbie-site1/db';
import { girls } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { modelLibraryDir } from './model-library.util';
import { extractPoster, posterName, transcodeToWebMp4 } from './video-transcode.util';
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
   * Загрузка фото в карточку модели. Каждый файл конвертируется в WebP
   * (q82, ≤1600px, EXIF-rotate — тот же конвейер, что и сид/импорт), пишется в
   * `model-library/<slug>/NN.webp` со следующим свободным индексом и сразу
   * добавляется в `mediaKeys` (диск ↔ БД консистентны). Возвращает обновлённую
   * карточку + список добавленных ключей.
   */
  async addPhotos(id: string, files: Express.Multer.File[]): Promise<{ added: string[]; girl: GirlResponseDto }> {
    if (!files?.length) throw new BadRequestException({ code: 'NO_FILES' });

    const [row] = await this.db.select().from(girls).where(eq(girls.id, id)).limit(1);
    if (!row) throw new NotFoundException({ code: 'GIRL_NOT_FOUND', id });

    const slug = row.slug;
    // slug из БD (translit), но валидируем перед использованием в пути — защита от traversal.
    if (!/^[a-z0-9-]+$/.test(slug)) throw new BadRequestException({ code: 'GIRL_SLUG_UNSAFE', slug });

    const dir = resolve(modelLibraryDir(), slug);
    mkdirSync(dir, { recursive: true });

    // Следующий свободный индекс из существующих NN.webp (контигуальная нумерация).
    let n = (existsSync(dir) ? readdirSync(dir) : [])
      .filter((f) => /^\d+\.webp$/.test(f))
      .reduce((mx, f) => Math.max(mx, parseInt(f, 10)), 0);

    const added: string[] = [];
    for (const file of files) {
      n += 1;
      const name = `${String(n).padStart(2, '0')}.webp`;
      try {
        await sharp(file.buffer)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toFile(resolve(dir, name));
      } catch {
        n -= 1; // откат индекса — файл не записан (не картинка / битый)
        throw new BadRequestException({ code: 'IMAGE_DECODE_FAILED', file: file.originalname });
      }
      added.push(`model-library/${slug}/${name}`);
    }

    const mediaKeys = [...row.mediaKeys, ...added];
    const [updated] = await this.db
      .update(girls)
      .set({ mediaKeys, updatedAt: new Date() })
      .where(eq(girls.id, id))
      .returning();
    this.logger.log(`girl photos added: ${slug} +${added.length} (id=${id})`);
    return { added, girl: this.toResponse(updated) };
  }

  /**
   * Загрузка видео в карточку. Без транскода (нет ffmpeg в стеке): принимаем
   * web-native контейнеры (mp4/webm), пишем как есть в `model-library/<slug>/
   * video/NN.<ext>` и добавляем ключ в `params.videoKeys` (jsonb — без миграции,
   * паттерн inactiveMedia/activeTenants). Транскод произвольных форматов — отдельный
   * шаг (ffmpeg). videoKeys re-seed-safe: seed-girls.ts сканирует тот же subdir.
   */
  async addVideos(id: string, files: Express.Multer.File[]): Promise<{ added: string[]; girl: GirlResponseDto }> {
    if (!files?.length) throw new BadRequestException({ code: 'NO_FILES' });

    const [row] = await this.db.select().from(girls).where(eq(girls.id, id)).limit(1);
    if (!row) throw new NotFoundException({ code: 'GIRL_NOT_FOUND', id });

    const slug = row.slug;
    if (!/^[a-z0-9-]+$/.test(slug)) throw new BadRequestException({ code: 'GIRL_SLUG_UNSAFE', slug });

    const dir = resolve(modelLibraryDir(), slug, 'video');
    mkdirSync(dir, { recursive: true });

    let n = (existsSync(dir) ? readdirSync(dir) : [])
      .map((f) => parseInt(f, 10))
      .reduce((mx, v) => (Number.isFinite(v) ? Math.max(mx, v) : mx), 0);

    // Каждое видео транскодируется в универсальный веб-профиль (H.264/yuv420p/
    // faststart, ≤1280, CRF27) + poster-webp. Выход всегда .mp4 (играет везде).
    const added: string[] = [];
    const tmp = mkdtempSync(join(tmpdir(), 'vidup-'));
    try {
      for (const file of files) {
        n += 1;
        const name = `${String(n).padStart(2, '0')}.mp4`;
        const inPath = join(tmp, `in-${n}`);
        writeFileSync(inPath, file.buffer);
        try {
          await transcodeToWebMp4(inPath, resolve(dir, name));
        } catch {
          n -= 1;
          throw new BadRequestException({ code: 'VIDEO_TRANSCODE_FAILED', file: file.originalname });
        }
        // poster — best-effort, не валит загрузку
        try {
          await extractPoster(resolve(dir, name), resolve(dir, posterName(name)));
        } catch {
          this.logger.warn(`poster failed for ${slug}/${name}`);
        }
        added.push(`model-library/${slug}/video/${name}`);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }

    const params = (row.params ?? {}) as Record<string, unknown>;
    const existing = Array.isArray(params.videoKeys) ? (params.videoKeys as string[]) : [];
    const nextParams = { ...params, videoKeys: [...existing, ...added] };
    const [updated] = await this.db
      .update(girls)
      .set({ params: nextParams, updatedAt: new Date() })
      .where(eq(girls.id, id))
      .returning();
    this.logger.log(`girl videos added: ${slug} +${added.length} (id=${id})`);
    return { added, girl: this.toResponse(updated) };
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
    const inactiveVid = Array.isArray(p.inactiveVideos) ? (p.inactiveVideos as string[]) : [];
    const videos = Array.isArray(p.videoKeys)
      ? (p.videoKeys as string[]).filter((v) => typeof v === 'string' && !inactiveVid.includes(v))
      : [];
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
      videos,
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
