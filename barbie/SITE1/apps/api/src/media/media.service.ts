/**
 * MediaService — high-level tenant-aware media management.
 *
 * Flow upload:
 *   1. Сгенерировать mediaId (UUID v4)
 *   2. Построить ключ: `tenant/{tenantId}/{module}/{mediaId}.{ext}`
 *   3. PUT в S3 через S3Service
 *   4. INSERT row в `media` со статусом 'ready'
 *   5. При ошибке INSERT — best-effort удалить S3-объект (избежать orphan'ов)
 *
 * Tenant isolation:
 *   - В key всегда префикс `tenant/{tenantId}/` (CHECK constraint enforce-ит на БД-уровне)
 *   - Все SELECT'ы фильтруют по tenant_id через combineTenant()
 *   - Чужие media → 404 NOT_FOUND (не раскрываем существование)
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { media } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { S3Service } from '../storage/s3.service';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import type { MediaModule, UploadMediaDto } from './dto/upload-media.dto';
import type { ListMediaQueryDto } from './dto/list-media-query.dto';
import type { ListMediaResponseDto, MediaResponseDto } from './dto/media-response.dto';

/** Лимиты Phase 0. В Phase 1 — конфигурируемые per-tenant (subscription_plan'ом). */
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly s3: S3Service,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    uploaderUserId: string,
  ): Promise<MediaResponseDto> {
    if (!file) throw new BadRequestException({ code: 'NO_FILE' });
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException({
        code: 'MIME_NOT_ALLOWED',
        mime: file.mimetype,
        allowed: [...ALLOWED_MIMES],
      });
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException({
        code: 'FILE_TOO_LARGE',
        size: file.size,
        max: MAX_SIZE_BYTES,
      });
    }

    const tenantId = this.tenantContext.requireTenantId();
    const mediaId = randomUUID();
    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    const key = `tenant/${tenantId}/${dto.module}/${mediaId}.${ext}`;

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    // 1. PUT в S3
    await this.s3.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      metadata: {
        'tenant-id': tenantId,
        'media-id': mediaId,
        'uploader-id': uploaderUserId,
      },
    });

    // 2. INSERT row; при сбое — компенсирующий delete S3
    try {
      const [row] = await this.db
        .insert(media)
        .values({
          id: mediaId,
          tenantId,
          key,
          mime: file.mimetype,
          size: BigInt(file.size),
          sha256,
          module: dto.module,
          entityId: dto.entityId ?? null,
          alt: dto.alt ?? null,
          caption: dto.caption ?? null,
          uploadedByUserId: uploaderUserId,
          status: 'ready',
        })
        .returning();
      this.logger.log(`Media uploaded: ${row.id} tenant=${tenantId} mod=${dto.module} (${file.size}b)`);
      return this.toResponse(row);
    } catch (err) {
      // Best-effort cleanup чтобы не накапливать orphan-объекты
      await this.s3.deleteObject(key);
      throw err;
    }
  }

  async listMedia(query: ListMediaQueryDto): Promise<ListMediaResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const extra: SQL[] = [];
    if (query.module) extra.push(eq(media.module, query.module));
    if (query.entityId) extra.push(eq(media.entityId, query.entityId));
    if (query.status) extra.push(eq(media.status, query.status));
    else extra.push(eq(media.status, 'ready')); // default — не показываем archived

    const where = combineTenant(tenantId, media.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(media)
        .where(where)
        .orderBy(desc(media.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(media).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getMedia(id: string): Promise<MediaResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(media)
      .where(and(eq(media.id, id), eq(media.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', id });
    return this.toResponse(row);
  }

  /** Soft-archive — status='archived', S3-объект НЕ удаляется (для возможного восстановления). */
  async archiveMedia(id: string): Promise<MediaResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .update(media)
      .set({ status: 'archived', updatedAt: sql`now()` })
      .where(and(eq(media.id, id), eq(media.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', id });
    return this.toResponse(row);
  }

  private toResponse(row: typeof media.$inferSelect): MediaResponseDto {
    return {
      id: row.id,
      key: row.key,
      url: this.s3.publicUrlFor(row.key),
      mime: row.mime,
      size: row.size.toString(),
      sha256: row.sha256,
      width: row.width,
      height: row.height,
      module: row.module,
      entityId: row.entityId,
      alt: row.alt,
      caption: row.caption,
      status: row.status as MediaResponseDto['status'],
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
  }
}
