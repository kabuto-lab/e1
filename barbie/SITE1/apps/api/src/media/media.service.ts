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
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { media } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { S3Service } from '../storage/s3.service';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import { ToolsService } from '../tools/tools.service';
import type { MediaModule, UploadMediaDto } from './dto/upload-media.dto';
import type { ListMediaQueryDto } from './dto/list-media-query.dto';
import type { ListMediaResponseDto, MediaResponseDto } from './dto/media-response.dto';

/** Лимиты Phase 0. В Phase 1 — конфигурируемые per-tenant (subscription_plan'ом). */
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — картинки/pdf
const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300 MB — видео

const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']);

/**
 * Бинарь ffmpeg: из FFMPEG_PATH (.env) или 'ffmpeg' на PATH. Страховка от
 * отсутствия на PATH (локально/VPS). Читаем в МОМЕНТ ВЫЗОВА, а не на импорте
 * модуля — иначе process.env ещё не заполнен ConfigModule/dotenv.
 */
const ffmpegBin = (): string => process.env.FFMPEG_PATH?.trim() || 'ffmpeg';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
};

/**
 * MIME-типы, которые мы готовы принимать из произвольного публичного URL
 * (favicon/logo во время bootstrap'a). Подмножество основного whitelist'а —
 * только картинки. Хранятся как обычные media-row, но статус сразу 'ready'.
 */
const BOOTSTRAP_FETCH_MIME_WHITELIST = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly s3: S3Service,
    private readonly tools: ToolsService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  /** ffmpeg доступен в системе? (для конвертации видео → webm) */
  private ffmpegOk: boolean | null = null;
  private hasFfmpeg(): boolean {
    if (this.ffmpegOk === null) {
      try {
        this.ffmpegOk = spawnSync(ffmpegBin(), ['-version'], { windowsHide: true }).status === 0;
      } catch {
        this.ffmpegOk = false;
      }
    }
    return this.ffmpegOk;
  }

  /**
   * ЗАКОН (asset-format-webp): загружаемое медиа нормализуется в web-формат —
   * фото → webp (sharp), видео → webm (ffmpeg, если установлен). svg / webp /
   * webm / pdf проходят как есть. Если видео пришло без ffmpeg на хосте —
   * кладём как есть + warn (закон требует поставить ffmpeg).
   */
  private async toWebFormat(
    buffer: Buffer,
    mime: string,
  ): Promise<{ buffer: Buffer; mime: string; ext: string }> {
    if (mime.startsWith('image/') && mime !== 'image/svg+xml' && mime !== 'image/webp') {
      const out = await sharp(buffer).webp({ quality: 85, effort: 4 }).toBuffer();
      this.logger.log(`image → webp (${buffer.length} → ${out.length} b)`);
      return { buffer: out, mime: 'image/webp', ext: 'webp' };
    }
    if (mime === 'image/webp') return { buffer, mime, ext: 'webp' };
    if (mime === 'image/svg+xml') return { buffer, mime, ext: 'svg' };

    if (VIDEO_MIMES.has(mime) && mime !== 'video/webm') {
      if (this.hasFfmpeg()) {
        const out = await this.transcodeToWebm(buffer);
        this.logger.log(`video → webm (${buffer.length} → ${out.length} b)`);
        return { buffer: out, mime: 'video/webm', ext: 'webm' };
      }
      this.logger.warn(
        'ffmpeg недоступен — видео сохранено без конвертации в webm (закон: установить ffmpeg на хост)',
      );
      return { buffer, mime, ext: EXT_BY_MIME[mime] ?? 'mp4' };
    }

    return { buffer, mime, ext: EXT_BY_MIME[mime] ?? 'bin' };
  }

  /** Транскод видео → webm (VP9 / Opus) через ffmpeg во временных файлах. */
  private async transcodeToWebm(input: Buffer): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'nas-webm-'));
    const inPath = join(dir, 'in');
    const outPath = join(dir, 'out.webm');
    try {
      await writeFile(inPath, input);
      await new Promise<void>((resolve, reject) => {
        const ff = spawn(
          ffmpegBin(),
          ['-y', '-i', inPath, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-c:a', 'libopus', outPath],
          { windowsHide: true },
        );
        ff.on('error', reject);
        ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
      });
      return await readFile(outPath);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Server-side fetch произвольного URL → S3 → media row. Используется только
   * для tenant-bootstrap (импорт favicon'а из стороннего сайта). НЕ ходит через
   * TenantContextService — вызывается из platform-admin потока, где tenantId
   * передаётся явно (тенант только что создан и контекст ещё не установлен).
   *
   * SSRF/redirect/timeout guarantees — реюз ToolsService.fetchSafeBinary
   * (тот же resolveAndAssertPublic + fetchPinned + content-type whitelist).
   */
  async fetchAndStoreUrl(
    url: string,
    tenantId: string,
    module: string = 'logo',
  ): Promise<{ mediaId: string; key: string; mime: string; sourceUrl: string }> {
    const fetched = await this.tools.fetchSafeBinary(url);
    if (!BOOTSTRAP_FETCH_MIME_WHITELIST.has(fetched.contentType)) {
      throw new UnsupportedMediaTypeException({
        code: 'MIME_NOT_ALLOWED',
        mime: fetched.contentType,
      });
    }

    const mediaId = randomUUID();
    const ext = EXT_BY_MIME[fetched.contentType] ?? 'bin';
    const key = `tenant/${tenantId}/${module}/${mediaId}.${ext}`;
    const sha256 = createHash('sha256').update(fetched.bytes).digest('hex');

    await this.s3.putObject({
      key,
      body: fetched.bytes,
      contentType: fetched.contentType,
      metadata: {
        'tenant-id': tenantId,
        'media-id': mediaId,
        'source-url': fetched.finalUrl.slice(0, 1024),
        'imported-from-url': '1',
      },
    });

    try {
      const [row] = await this.db
        .insert(media)
        .values({
          id: mediaId,
          tenantId,
          key,
          mime: fetched.contentType,
          size: BigInt(fetched.bytes.length),
          sha256,
          module,
          status: 'ready',
        })
        .returning();
      this.logger.log(
        `Media imported: ${row.id} tenant=${tenantId} mod=${module} from=${fetched.finalUrl}`,
      );
      return { mediaId: row.id, key: row.key, mime: row.mime, sourceUrl: fetched.finalUrl };
    } catch (err) {
      await this.s3.deleteObject(key);
      throw err;
    }
  }

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
    const cap = VIDEO_MIMES.has(file.mimetype) ? MAX_VIDEO_BYTES : MAX_SIZE_BYTES;
    if (file.size > cap) {
      throw new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', size: file.size, max: cap });
    }

    const tenantId = this.tenantContext.requireTenantId();
    // ЗАКОН: нормализуем в web-формат (фото→webp, видео→webm) перед хранением.
    const web = await this.toWebFormat(file.buffer, file.mimetype);
    const mediaId = randomUUID();
    const key = `tenant/${tenantId}/${dto.module}/${mediaId}.${web.ext}`;
    const sha256 = createHash('sha256').update(web.buffer).digest('hex');

    // 1. PUT в S3
    await this.s3.putObject({
      key,
      body: web.buffer,
      contentType: web.mime,
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
          mime: web.mime,
          size: BigInt(web.buffer.length),
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

  /**
   * Platform-scoped upload: tenantId передаётся ЯВНО, без TenantContext.
   * Для редактора точек касания в деке /admin/projects, где platform-admin
   * грузит картинку произвольному тенанту (контекста этого тенанта у него нет).
   * Зеркалит uploadFile; uploadedByUserId не пишем (платформенный поток).
   */
  async uploadForTenant(
    file: Express.Multer.File,
    tenantId: string,
    module: string = 'tenant',
  ): Promise<MediaResponseDto> {
    if (!file) throw new BadRequestException({ code: 'NO_FILE' });
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException({
        code: 'MIME_NOT_ALLOWED',
        mime: file.mimetype,
        allowed: [...ALLOWED_MIMES],
      });
    }
    const cap = VIDEO_MIMES.has(file.mimetype) ? MAX_VIDEO_BYTES : MAX_SIZE_BYTES;
    if (file.size > cap) {
      throw new PayloadTooLargeException({ code: 'FILE_TOO_LARGE', size: file.size, max: cap });
    }

    // ЗАКОН: нормализуем в web-формат (фото→webp, видео→webm) перед хранением.
    const web = await this.toWebFormat(file.buffer, file.mimetype);
    const mediaId = randomUUID();
    const key = `tenant/${tenantId}/${module}/${mediaId}.${web.ext}`;
    const sha256 = createHash('sha256').update(web.buffer).digest('hex');

    await this.s3.putObject({
      key,
      body: web.buffer,
      contentType: web.mime,
      metadata: { 'tenant-id': tenantId, 'media-id': mediaId, 'platform-upload': '1' },
    });

    try {
      const [row] = await this.db
        .insert(media)
        .values({
          id: mediaId,
          tenantId,
          key,
          mime: web.mime,
          size: BigInt(web.buffer.length),
          sha256,
          module,
          status: 'ready',
        })
        .returning();
      this.logger.log(`Media uploaded (platform): ${row.id} tenant=${tenantId} mod=${module} (${file.size}b)`);
      return this.toResponse(row);
    } catch (err) {
      await this.s3.deleteObject(key);
      throw err;
    }
  }

  /** Public URL для произвольного media-ключа (passthrough к S3Service). */
  publicUrlForKey(key: string): string {
    return this.s3.publicUrlFor(key);
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
