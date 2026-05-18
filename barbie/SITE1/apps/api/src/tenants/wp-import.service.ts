/**
 * WpImportService — выполняет async-импорт WordPress-донора в нового NAS-тенанта.
 *
 * Поток (вызывается из TenantsController.bootstrapWp, после того как jobId
 * уже создан и пользователю отправлен):
 *
 *   1. probe — re-validate WP по sourceUrl (защита от race'а: probe в wizard'е
 *      мог быть на другом URL)
 *   2. analyzeSite — для design tokens (guessedRoles + первые googleFonts) и
 *      favicon. Если фейлится — fallback на NAS-дефолты.
 *   3. tenantsService.bootstrap — создаём пустого тенанта с design tokens,
 *      без menu (он придёт из WP), с favicon.
 *   4. Pages — paginate /wp-json/wp/v2/pages, для каждой INSERT cms_pages
 *      (slug=wp.slug, body=[hero?, text], status='published', locale='ru').
 *   5. Posts — то же, slug префиксуем `blog-` чтобы не конфликтовать с pages.
 *   6. Media — paginate /wp-json/wp/v2/media, для каждого вызываем
 *      MediaService.fetchAndStoreUrl(source_url, tenantId, 'cms'). Per-item
 *      ошибки не прерывают импорт (emit'им media.failed и идём дальше).
 *   7. Menu — /wp/v2/menus + /wp/v2/menu-items?menus=:id. Берём первое меню
 *      или меню по локации (primary/main/header). Flatten — parent_id=null,
 *      sortOrder из menu_order. Иерархия — отдельная сессия.
 *   8. done / error — terminal event через WpJobStore.finalize.
 *
 * Все события доставляются через WpJobStore (EventEmitter) и подписываются
 * SSE-stream'ом в TenantsController.bootstrapWpStream.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import {
  cmsPages,
  media as mediaTable,
  tenantMenuItems,
  type CmsBlocks,
} from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { MediaService } from '../media/media.service';
import { ToolsService } from '../tools/tools.service';
import { TenantsService } from './tenants.service';
import { WpJobStore, type WpImportEvent } from './wp-job-store';
import type { BootstrapWpDto } from './dto/bootstrap-wp.dto';

interface WpPage {
  id: number;
  slug: string;
  status?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  excerpt?: { rendered?: string };
  featured_media?: number;
  menu_order?: number;
  date?: string;
}

interface WpMedia {
  id: number;
  slug?: string;
  source_url?: string;
  mime_type?: string;
  alt_text?: string;
  media_details?: { width?: number; height?: number };
}

interface WpMenu {
  id: number;
  name?: string;
  slug?: string;
  locations?: string[];
}

interface WpMenuItem {
  id: number;
  title?: { rendered?: string } | string;
  url?: string;
  parent?: number;
  menu_order?: number;
  type_label?: string;
  object?: string;
}

const PER_PAGE = 100;
const MAX_PAGES_PER_RESOURCE = 50; // hard cap: 100 * 50 = 5000 items
const PRIMARY_MENU_LOCATION_HINTS = ['primary', 'main', 'header', 'top'];

const FALLBACK_DESIGN = {
  bg: '#FAFAFA',
  headColor: '#0A0A0A',
  headFont: 'Unbounded',
  accColor: '#D4AF37',
  accFont: 'Unbounded',
  bodyColor: '#1A1A1A',
  bodyFont: 'Inter',
};

@Injectable()
export class WpImportService {
  private readonly logger = new Logger(WpImportService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tools: ToolsService,
    private readonly media: MediaService,
    private readonly tenants: TenantsService,
    private readonly jobs: WpJobStore,
  ) {}

  async run(jobId: string, dto: BootstrapWpDto): Promise<void> {
    const emit = (e: WpImportEvent) => this.jobs.emit(jobId, e);
    try {
      emit({ type: 'start', message: `Import started from ${dto.sourceUrl}` });

      // 1. Probe (re-validate)
      const probe = await this.tools.probeWordPress(dto.sourceUrl);
      if (!probe.isWp || !probe.restApiUrl) {
        this.jobs.finalize(jobId, {
          type: 'error',
          message: 'Сайт не определяется как WordPress',
          error: {
            code: 'NOT_WORDPRESS',
            message: probe.notes.join(' ') || 'No /wp-json endpoint',
          },
        });
        return;
      }
      const restApiUrl = probe.restApiUrl;
      emit({
        type: 'progress',
        message: `WP detected: ${probe.siteName ?? 'unnamed'} (${probe.counts.pages}p / ${probe.counts.media}m / ${probe.counts.posts}b)`,
      });

      // 2. Design tokens + favicon (best-effort)
      let design = FALLBACK_DESIGN;
      let faviconUrl: string | undefined;
      try {
        const analysis = await this.tools.analyzeSite({ url: dto.sourceUrl });
        design = {
          bg: analysis.guessedRoles.bg,
          headColor: analysis.guessedRoles.head,
          headFont: analysis.typography.googleFonts[0] ?? FALLBACK_DESIGN.headFont,
          accColor: analysis.guessedRoles.acc,
          accFont: analysis.typography.googleFonts[0] ?? FALLBACK_DESIGN.accFont,
          bodyColor: analysis.guessedRoles.head,
          bodyFont: analysis.typography.googleFonts[1] ?? FALLBACK_DESIGN.bodyFont,
        };
        faviconUrl = analysis.identity.favicon ?? undefined;
      } catch (err) {
        emit({
          type: 'progress',
          message: `Design analyzer failed (${this.errMsg(err)}); using NAS defaults`,
        });
      }

      // 3. Bootstrap tenant skeleton
      const skeleton = await this.tenants.bootstrap({
        slug: dto.slug,
        name: dto.name,
        sourceUrl: dto.sourceUrl,
        customDomain: dto.customDomain,
        design,
        menuItems: [],
        faviconUrl,
      });
      const tenantId = skeleton.id;
      emit({
        type: 'tenant.created',
        message: `Tenant ${skeleton.slug} создан`,
        payload: { tenantId, slug: skeleton.slug, customDomain: skeleton.customDomain },
      });

      // Aggregate summary
      const summary = {
        pagesImported: 0,
        postsImported: 0,
        mediaImported: 0,
        mediaFailed: 0,
        menuItemsImported: 0,
      };

      // 4. Pages
      if (dto.importOptions.pages) {
        summary.pagesImported = await this.importPagesOrPosts(
          jobId,
          tenantId,
          restApiUrl,
          'pages',
        );
      }

      // 5. Posts (blog-prefixed slug)
      if (dto.importOptions.posts) {
        summary.postsImported = await this.importPagesOrPosts(
          jobId,
          tenantId,
          restApiUrl,
          'posts',
        );
      }

      // 6. Media
      if (dto.importOptions.media) {
        const r = await this.importMedia(
          jobId,
          tenantId,
          restApiUrl,
          dto.maxMediaItems ?? 200,
        );
        summary.mediaImported = r.imported;
        summary.mediaFailed = r.failed;
      }

      // 7. Menu
      if (dto.importOptions.menu) {
        summary.menuItemsImported = await this.importMenu(jobId, tenantId, restApiUrl);
      }

      this.jobs.finalize(jobId, {
        type: 'done',
        message: 'Импорт завершён',
        payload: {
          tenantId,
          slug: skeleton.slug,
          customDomain: skeleton.customDomain,
          ...summary,
        },
      });
    } catch (err) {
      this.logger.error(`WP import job ${jobId} failed: ${this.errMsg(err)}`);
      this.jobs.finalize(jobId, {
        type: 'error',
        message: 'Импорт прервался',
        error: { code: 'IMPORT_FAILED', message: this.errMsg(err) },
      });
    }
  }

  // ── Pages / Posts ─────────────────────────────────────────────────────────

  private async importPagesOrPosts(
    jobId: string,
    tenantId: string,
    restApiUrl: string,
    resource: 'pages' | 'posts',
  ): Promise<number> {
    const emit = (e: WpImportEvent) => this.jobs.emit(jobId, e);
    const slugPrefix = resource === 'posts' ? 'blog-' : '';
    const fetchedEvent: WpImportEvent['type'] =
      resource === 'pages' ? 'pages.fetched' : 'posts.fetched';
    const importedEvent: WpImportEvent['type'] =
      resource === 'pages' ? 'page.imported' : 'post.imported';

    // Сначала — собираем весь список (paginated)
    const all: WpPage[] = [];
    for (let page = 1; page <= MAX_PAGES_PER_RESOURCE; page++) {
      let batch: WpPage[];
      let totalPages: number | null = null;
      try {
        const res = await this.tools.fetchSafeJson<WpPage[]>(
          `${restApiUrl}/wp/v2/${resource}?per_page=${PER_PAGE}&page=${page}&_embed=false`,
        );
        batch = Array.isArray(res.data) ? res.data : [];
        const tp = res.headers.get('x-wp-totalpages');
        totalPages = tp && /^\d+$/.test(tp) ? Number(tp) : null;
      } catch (err) {
        emit({
          type: 'progress',
          message: `Page ${page} of ${resource} fetch failed: ${this.errMsg(err)}`,
        });
        break;
      }
      if (batch.length === 0) break;
      all.push(...batch);
      if (totalPages != null && page >= totalPages) break;
    }
    emit({
      type: fetchedEvent,
      message: `Получено ${all.length} ${resource}`,
      total: all.length,
    });

    let imported = 0;
    for (let i = 0; i < all.length; i++) {
      const wp = all[i];
      // Sanitize slug + collision protection via prefix.
      const baseSlug = wp.slug && /^[a-z0-9-]+$/i.test(wp.slug) ? wp.slug.toLowerCase() : `wp-${wp.id}`;
      const slug = `${slugPrefix}${baseSlug}`.slice(0, 255);
      const title = (wp.title?.rendered ?? wp.slug ?? `Untitled #${wp.id}`).slice(0, 500);
      const html = wp.content?.rendered ?? '';
      const blocks: CmsBlocks = [];
      // featured_media — пока не разрешаем (нужен mapping media-id → S3 ключ,
      // а медиа импортируется ниже и в другом порядке). Импортнём, добавим hero
      // отдельным шагом «refine pages» — out of scope MVP.
      blocks.push({ type: 'text', data: { html } });

      try {
        await this.db
          .insert(cmsPages)
          .values({
            tenantId,
            slug,
            locale: 'ru',
            title,
            body: blocks,
            status: 'published',
            publishedAt: wp.date ? new Date(wp.date) : sql`now()`,
          })
          .onConflictDoNothing({
            target: [cmsPages.tenantId, cmsPages.slug, cmsPages.locale],
          });
        imported += 1;
        emit({
          type: importedEvent,
          message: `Импортирована: ${title}`,
          current: i + 1,
          total: all.length,
          payload: { slug, wpId: wp.id },
        });
      } catch (err) {
        emit({
          type: 'progress',
          message: `Skip ${slug}: ${this.errMsg(err)}`,
          current: i + 1,
          total: all.length,
        });
      }
    }

    return imported;
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  private async importMedia(
    jobId: string,
    tenantId: string,
    restApiUrl: string,
    maxItems: number,
  ): Promise<{ imported: number; failed: number }> {
    const emit = (e: WpImportEvent) => this.jobs.emit(jobId, e);

    const all: WpMedia[] = [];
    outer: for (let page = 1; page <= MAX_PAGES_PER_RESOURCE; page++) {
      let batch: WpMedia[];
      let totalPages: number | null = null;
      try {
        const res = await this.tools.fetchSafeJson<WpMedia[]>(
          `${restApiUrl}/wp/v2/media?per_page=${PER_PAGE}&page=${page}&_embed=false&media_type=image`,
        );
        batch = Array.isArray(res.data) ? res.data : [];
        const tp = res.headers.get('x-wp-totalpages');
        totalPages = tp && /^\d+$/.test(tp) ? Number(tp) : null;
      } catch (err) {
        emit({ type: 'progress', message: `Media page ${page} fetch failed: ${this.errMsg(err)}` });
        break;
      }
      if (batch.length === 0) break;
      for (const m of batch) {
        all.push(m);
        if (all.length >= maxItems) break outer;
      }
      if (totalPages != null && page >= totalPages) break;
    }
    emit({
      type: 'media.fetched',
      message: `Найдено ${all.length} media (cap ${maxItems})`,
      total: all.length,
    });

    let imported = 0;
    let failed = 0;
    for (let i = 0; i < all.length; i++) {
      const wp = all[i];
      const src = wp.source_url;
      if (!src) {
        failed += 1;
        emit({
          type: 'media.failed',
          message: `WP media #${wp.id} без source_url`,
          current: i + 1,
          total: all.length,
        });
        continue;
      }
      try {
        const stored = await this.media.fetchAndStoreUrl(src, tenantId, 'cms');
        // Поставим alt из WP, если есть. MediaService не отдаёт прямой UPDATE-helper'а,
        // так что таргетим таблицу напрямую (tenant_id уже зашит в key через CHECK constraint).
        if (wp.alt_text) {
          await this.db
            .update(mediaTable)
            .set({ alt: wp.alt_text.slice(0, 500) })
            .where(eq(mediaTable.id, stored.mediaId));
        }
        imported += 1;
        emit({
          type: 'media.imported',
          message: `${src}`,
          current: i + 1,
          total: all.length,
          payload: { mediaId: stored.mediaId, key: stored.key },
        });
      } catch (err) {
        failed += 1;
        emit({
          type: 'media.failed',
          message: `${src}: ${this.errMsg(err)}`,
          current: i + 1,
          total: all.length,
        });
      }
    }
    return { imported, failed };
  }

  // ── Menu ──────────────────────────────────────────────────────────────────

  private async importMenu(
    jobId: string,
    tenantId: string,
    restApiUrl: string,
  ): Promise<number> {
    const emit = (e: WpImportEvent) => this.jobs.emit(jobId, e);

    // Шаг 1 — получить список меню. Сначала /wp/v2/menus, fallback /menus/v1.
    let menus: WpMenu[] = [];
    try {
      const r = await this.tools.fetchSafeJson<WpMenu[]>(`${restApiUrl}/wp/v2/menus`);
      if (Array.isArray(r.data)) menus = r.data;
    } catch {
      try {
        const r = await this.tools.fetchSafeJson<Record<string, WpMenu>>(
          `${restApiUrl}/menus/v1/menus`,
        );
        if (Array.isArray(r.data)) menus = r.data as WpMenu[];
        else if (r.data && typeof r.data === 'object') menus = Object.values(r.data);
      } catch {
        emit({ type: 'progress', message: 'Menus endpoint недоступен — пропускаю меню' });
        return 0;
      }
    }
    if (menus.length === 0) {
      emit({ type: 'progress', message: 'WP отдал 0 menus' });
      return 0;
    }

    // Шаг 2 — выбрать "primary" меню по locations, иначе первое.
    const primary =
      menus.find((m) =>
        (m.locations ?? []).some((loc) =>
          PRIMARY_MENU_LOCATION_HINTS.includes(loc.toLowerCase()),
        ),
      ) ?? menus[0];

    // Шаг 3 — fetch items
    let items: WpMenuItem[] = [];
    try {
      const r = await this.tools.fetchSafeJson<WpMenuItem[]>(
        `${restApiUrl}/wp/v2/menu-items?menus=${primary.id}&per_page=100&_embed=false`,
      );
      if (Array.isArray(r.data)) items = r.data;
    } catch {
      // Fallback plugin endpoint
      try {
        const r = await this.tools.fetchSafeJson<{ items?: WpMenuItem[] }>(
          `${restApiUrl}/menus/v1/menus/${primary.slug ?? primary.id}`,
        );
        if (r.data && Array.isArray(r.data.items)) items = r.data.items;
      } catch (err) {
        emit({
          type: 'progress',
          message: `Menu items fetch failed: ${this.errMsg(err)}`,
        });
        return 0;
      }
    }
    emit({
      type: 'menu.fetched',
      message: `Меню «${primary.name ?? primary.slug ?? primary.id}» → ${items.length} элементов`,
      total: items.length,
    });

    let imported = 0;
    // Только top-level (parent=0 или undefined). Иерархия — отдельная сессия.
    const top = items.filter((it) => !it.parent);
    top.sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0));

    for (let i = 0; i < top.length; i++) {
      const it = top[i];
      const label = (typeof it.title === 'string' ? it.title : it.title?.rendered) ?? '';
      let href = it.url ?? '/';
      // tenant_menu_items_href_check требует начала с '/' или 'http(s)://'.
      try {
        const u = new URL(href);
        href = u.pathname + u.search + u.hash || u.toString();
        if (!href.startsWith('/') && !href.startsWith('http')) href = '/';
      } catch {
        if (!href.startsWith('/')) href = `/${href}`;
      }
      try {
        await this.db.insert(tenantMenuItems).values({
          tenantId,
          parentId: null,
          label: label.slice(0, 255) || `Item ${i + 1}`,
          href: href.slice(0, 1000),
          sortOrder: i,
          locale: 'ru',
          status: 'active',
        });
        imported += 1;
        emit({
          type: 'menu.imported',
          message: label || `Item ${i + 1}`,
          current: i + 1,
          total: top.length,
        });
      } catch (err) {
        emit({
          type: 'progress',
          message: `Menu skip ${label}: ${this.errMsg(err)}`,
        });
      }
    }
    return imported;
  }

  private errMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }
}
