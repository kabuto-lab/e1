/**
 * CmsService — tenant-aware управление CMS-страницами.
 *
 * Ключевые механики:
 *   - Zod-валидация `body` на write (PageBody schema из dto/blocks.schema.ts)
 *   - Unique (tenant_id, slug, locale) — 409 при дубликате
 *   - 404 на чужие страницы (не раскрываем существование)
 *   - publish/unpublish — отдельные actions (атомарно меняют status + publishedAt)
 *   - Public render: getPublishedBySlug() возвращает только status='published'
 *
 * Не реализовано в Phase 0:
 *   - Версионирование (Phase 1: cms_page_versions табл)
 *   - HTML-sanitization для text.html (Phase 0 trust admin; Phase 1 DOMPurify)
 *   - Soft delete восстановление (status='archived' финален)
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { ZodError } from 'zod';

import type { CmsBlocks, Database } from '@barbie-site1/db';
import { cmsPages } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { combineTenant } from '../tenant-context/with-tenant.helper';
import { PageBody } from './dto/blocks.schema';
import type { CreatePageDto } from './dto/create-page.dto';
import type { UpdatePageDto } from './dto/update-page.dto';
import type { ListPagesQueryDto } from './dto/list-pages-query.dto';
import type { ListPagesResponseDto, PageResponseDto } from './dto/page-response.dto';

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async createPage(dto: CreatePageDto, authorUserId: string): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const body = this.validateBody(dto.body);

    try {
      const [row] = await this.db
        .insert(cmsPages)
        .values({
          tenantId,
          slug: dto.slug,
          locale: dto.locale ?? 'ru',
          title: dto.title,
          body,
          status: 'draft',
          metaTitle: dto.metaTitle ?? null,
          metaDescription: dto.metaDescription ?? null,
          coverImageKey: dto.coverImageKey ?? null,
          authorUserId,
        })
        .returning();
      this.logger.log(`Page created: ${row.id} slug=${row.slug} locale=${row.locale}`);
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'PAGE_SLUG_LOCALE_TAKEN',
          slug: dto.slug,
          locale: dto.locale ?? 'ru',
        });
      }
      throw err;
    }
  }

  async listPages(query: ListPagesQueryDto): Promise<ListPagesResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const extra: SQL[] = [];
    if (query.status) extra.push(eq(cmsPages.status, query.status));
    if (query.locale) extra.push(eq(cmsPages.locale, query.locale));
    if (query.q) {
      const pat = `%${query.q.trim()}%`;
      extra.push(or(ilike(cmsPages.title, pat), ilike(cmsPages.slug, pat))!);
    }
    const where = combineTenant(tenantId, cmsPages.tenantId, ...extra);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(cmsPages)
        .where(where)
        .orderBy(desc(cmsPages.updatedAt), asc(cmsPages.slug))
        .limit(limit)
        .offset(offset),
      this.db.select({ value: count() }).from(cmsPages).where(where),
    ]);

    return {
      data: rows.map((r) => this.toResponse(r)),
      total: Number(totalRows[0]?.value ?? 0),
      limit,
      offset,
    };
  }

  async getPage(id: string): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(cmsPages)
      .where(and(eq(cmsPages.id, id), eq(cmsPages.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', id });
    return this.toResponse(row);
  }

  /** Публичный рендер по slug+locale — отдаёт только published. */
  async getPublishedBySlug(slug: string, locale: 'ru' | 'en' = 'ru'): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .select()
      .from(cmsPages)
      .where(
        and(
          eq(cmsPages.tenantId, tenantId),
          eq(cmsPages.slug, slug),
          eq(cmsPages.locale, locale),
          eq(cmsPages.status, 'published'),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundException({ code: 'PAGE_NOT_FOUND', slug, locale });
    }
    return this.toResponse(row);
  }

  async updatePage(id: string, dto: UpdatePageDto): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const patch: Record<string, unknown> = { updatedAt: sql`now()` };
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.locale !== undefined) patch.locale = dto.locale;
    if (dto.metaTitle !== undefined) patch.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) patch.metaDescription = dto.metaDescription;
    if (dto.coverImageKey !== undefined) patch.coverImageKey = dto.coverImageKey;
    if (dto.body !== undefined) patch.body = this.validateBody(dto.body);

    if (Object.keys(patch).length === 1) {
      return this.getPage(id);
    }

    try {
      const [row] = await this.db
        .update(cmsPages)
        .set(patch)
        .where(and(eq(cmsPages.id, id), eq(cmsPages.tenantId, tenantId)))
        .returning();
      if (!row) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', id });
      return this.toResponse(row);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException({
          code: 'PAGE_SLUG_LOCALE_TAKEN',
          message: 'Страница с таким slug+locale уже существует.',
        });
      }
      throw err;
    }
  }

  async publishPage(id: string): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .update(cmsPages)
      .set({ status: 'published', publishedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(cmsPages.id, id), eq(cmsPages.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', id });
    this.logger.log(`Page published: ${row.id} (${row.slug}/${row.locale})`);
    return this.toResponse(row);
  }

  async unpublishPage(id: string): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .update(cmsPages)
      .set({ status: 'draft', publishedAt: null, updatedAt: sql`now()` })
      .where(and(eq(cmsPages.id, id), eq(cmsPages.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', id });
    return this.toResponse(row);
  }

  async archivePage(id: string): Promise<PageResponseDto> {
    const tenantId = this.tenantContext.requireTenantId();
    const [row] = await this.db
      .update(cmsPages)
      .set({ status: 'archived', updatedAt: sql`now()` })
      .where(and(eq(cmsPages.id, id), eq(cmsPages.tenantId, tenantId)))
      .returning();
    if (!row) throw new NotFoundException({ code: 'PAGE_NOT_FOUND', id });
    return this.toResponse(row);
  }

  private validateBody(rawBody: unknown[]): CmsBlocks {
    try {
      // Zod schema зеркалит CmsBlocks из @barbie-site1/db — после успешной валидации
      // структуру можно безопасно сузить к CmsBlocks для Drizzle insert.
      return PageBody.parse(rawBody) as unknown as CmsBlocks;
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestException({
          code: 'PAGE_BODY_INVALID',
          issues: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        });
      }
      throw err;
    }
  }

  private toResponse(row: typeof cmsPages.$inferSelect): PageResponseDto {
    return {
      id: row.id,
      slug: row.slug,
      locale: row.locale as PageResponseDto['locale'],
      title: row.title,
      body: (row.body ?? []) as unknown[],
      status: row.status as PageResponseDto['status'],
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      coverImageKey: row.coverImageKey,
      authorUserId: row.authorUserId,
      publishedAt: row.publishedAt
        ? row.publishedAt instanceof Date
          ? row.publishedAt.toISOString()
          : String(row.publishedAt)
        : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }
}
