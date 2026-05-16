/**
 * MenuService — управление главным меню тенанта.
 *
 * Все CRUD операции tenant-scoped через TenantContextService (ALS).
 * Public read (по slug) — отдельный метод без tenant context (вызывается из
 * PublicMenuController).
 *
 * Tree assembly: read flat list, в памяти строим children-связи.
 * Reorder: одна транзакция, проверка что все id принадлежат тенанту.
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '@barbie-site1/db';
import { tenantMenuItems, tenantDesignTokens, tenants } from '@barbie-site1/db';

import { DRIZZLE } from '../database/database.module';
import { TenantContextService } from '../tenant-context/tenant-context.service';

import type { CreateMenuItemDto } from './dto/create-menu-item.dto';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import type { ReorderMenuDto } from './dto/reorder-menu.dto';
import type {
  MenuItemResponseDto,
  MenuTreeItemDto,
  PublicMenuResponseDto,
} from './dto/menu-item-response.dto';

type NavTemplate = 'top-classic' | 'mega-images' | 'vertical-side';

const MAX_DEPTH = 2;

@Injectable()
export class MenuService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tenantCtx: TenantContextService,
  ) {}

  // ── Tenant-scoped CRUD ────────────────────────────────────────────────────

  async listForCurrentTenant(): Promise<MenuItemResponseDto[]> {
    const tenantId = this.tenantCtx.requireTenantId();
    const rows = await this.db
      .select()
      .from(tenantMenuItems)
      .where(eq(tenantMenuItems.tenantId, tenantId))
      .orderBy(asc(tenantMenuItems.sortOrder), asc(tenantMenuItems.createdAt));
    return rows.map(this.toResponse);
  }

  async treeForCurrentTenant(): Promise<MenuTreeItemDto[]> {
    const items = await this.listForCurrentTenant();
    return this.buildTree(items);
  }

  async create(dto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();

    // Validate parent belongs to same tenant and depth not exceeded.
    if (dto.parentId) {
      await this.assertParentValid(tenantId, dto.parentId);
    }

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(tenantId, dto.parentId ?? null));

    const [row] = await this.db
      .insert(tenantMenuItems)
      .values({
        tenantId,
        parentId: dto.parentId ?? null,
        label: dto.label,
        href: dto.href,
        imageKey: dto.imageKey ?? null,
        icon: dto.icon ?? null,
        sortOrder,
        locale: dto.locale ?? 'ru',
        status: dto.status ?? 'active',
        payload: dto.payload ?? {},
      })
      .returning();

    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItemResponseDto> {
    const tenantId = this.tenantCtx.requireTenantId();

    const [existing] = await this.db
      .select()
      .from(tenantMenuItems)
      .where(and(eq(tenantMenuItems.id, id), eq(tenantMenuItems.tenantId, tenantId)))
      .limit(1);
    if (!existing) {
      throw new NotFoundException({ code: 'MENU_ITEM_NOT_FOUND', id });
    }

    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId !== null) {
        // Prevent: cycle (parent === self), parent in same tenant, depth.
        if (dto.parentId === id) {
          throw new BadRequestException({ code: 'MENU_ITEM_PARENT_CYCLE' });
        }
        await this.assertParentValid(tenantId, dto.parentId, id);
      }
    }

    const patch: Record<string, unknown> = {};
    if (dto.parentId !== undefined) patch.parentId = dto.parentId;
    if (dto.label !== undefined) patch.label = dto.label;
    if (dto.href !== undefined) patch.href = dto.href;
    if (dto.imageKey !== undefined) patch.imageKey = dto.imageKey;
    if (dto.icon !== undefined) patch.icon = dto.icon;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;
    if (dto.locale !== undefined) patch.locale = dto.locale;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.payload !== undefined) patch.payload = dto.payload;
    patch.updatedAt = sql`now()`;

    const [row] = await this.db
      .update(tenantMenuItems)
      .set(patch)
      .where(and(eq(tenantMenuItems.id, id), eq(tenantMenuItems.tenantId, tenantId)))
      .returning();

    return this.toResponse(row);
  }

  /**
   * Delete a menu item. FK ON DELETE CASCADE handles descendants.
   * Returns the deleted item ids (the deleted row + cascades; we report at least the root).
   */
  async remove(id: string): Promise<{ deletedIds: string[] }> {
    const tenantId = this.tenantCtx.requireTenantId();

    // Collect descendant ids before delete (best-effort, for response).
    const descendants = await this.collectDescendants(tenantId, id);

    const result = await this.db
      .delete(tenantMenuItems)
      .where(and(eq(tenantMenuItems.id, id), eq(tenantMenuItems.tenantId, tenantId)))
      .returning({ id: tenantMenuItems.id });

    if (result.length === 0) {
      throw new NotFoundException({ code: 'MENU_ITEM_NOT_FOUND', id });
    }

    return { deletedIds: [id, ...descendants] };
  }

  /**
   * Bulk reorder: атомарно применяет changes в одной транзакции.
   * Все указанные id обязаны принадлежать текущему тенанту, иначе вся операция откатывается.
   */
  async reorder(dto: ReorderMenuDto): Promise<MenuTreeItemDto[]> {
    const tenantId = this.tenantCtx.requireTenantId();
    const ids = dto.changes.map((c) => c.id);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException({ code: 'MENU_REORDER_DUPLICATE_IDS' });
    }

    return this.db.transaction(async (tx) => {
      // Verify ownership: all ids belong to this tenant.
      const owned = await tx
        .select({ id: tenantMenuItems.id })
        .from(tenantMenuItems)
        .where(and(inArray(tenantMenuItems.id, ids), eq(tenantMenuItems.tenantId, tenantId)));

      if (owned.length !== ids.length) {
        throw new ConflictException({ code: 'MENU_REORDER_OWNERSHIP_MISMATCH' });
      }

      for (const change of dto.changes) {
        await tx
          .update(tenantMenuItems)
          .set({
            parentId: change.parentId ?? null,
            sortOrder: change.sortOrder,
            updatedAt: sql`now()`,
          })
          .where(
            and(eq(tenantMenuItems.id, change.id), eq(tenantMenuItems.tenantId, tenantId)),
          );
      }

      const rows = await tx
        .select()
        .from(tenantMenuItems)
        .where(eq(tenantMenuItems.tenantId, tenantId))
        .orderBy(asc(tenantMenuItems.sortOrder), asc(tenantMenuItems.createdAt));

      return this.buildTree(rows.map(this.toResponse));
    });
  }

  // ── Template (nav_template на tenant_design_tokens) ───────────────────────

  async getCurrentTenantTemplate(): Promise<{ navTemplate: NavTemplate }> {
    const tenantId = this.tenantCtx.requireTenantId();
    const [row] = await this.db
      .select({ navTemplate: tenantDesignTokens.navTemplate })
      .from(tenantDesignTokens)
      .where(eq(tenantDesignTokens.tenantId, tenantId))
      .limit(1);
    return { navTemplate: (row?.navTemplate as NavTemplate) ?? 'top-classic' };
  }

  async setCurrentTenantTemplate(template: NavTemplate): Promise<{ navTemplate: NavTemplate }> {
    const tenantId = this.tenantCtx.requireTenantId();
    const result = await this.db
      .update(tenantDesignTokens)
      .set({ navTemplate: template, updatedAt: sql`now()` })
      .where(eq(tenantDesignTokens.tenantId, tenantId))
      .returning({ navTemplate: tenantDesignTokens.navTemplate });

    if (result.length === 0) {
      throw new NotFoundException({ code: 'DESIGN_TOKENS_NOT_FOUND', tenantId });
    }
    return { navTemplate: result[0].navTemplate as NavTemplate };
  }

  // ── Public read by slug ───────────────────────────────────────────────────

  async getPublicMenuBySlug(slug: string): Promise<PublicMenuResponseDto> {
    const [tenant] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.slug, slug), eq(tenants.status, 'active')))
      .limit(1);

    if (!tenant) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', slug });
    }

    const [tokens] = await this.db
      .select({ navTemplate: tenantDesignTokens.navTemplate })
      .from(tenantDesignTokens)
      .where(eq(tenantDesignTokens.tenantId, tenant.id))
      .limit(1);

    const items = await this.db
      .select()
      .from(tenantMenuItems)
      .where(
        and(
          eq(tenantMenuItems.tenantId, tenant.id),
          eq(tenantMenuItems.status, 'active'),
        ),
      )
      .orderBy(asc(tenantMenuItems.sortOrder), asc(tenantMenuItems.createdAt));

    return {
      template: (tokens?.navTemplate as NavTemplate) ?? 'top-classic',
      items: this.buildTree(items.map(this.toResponse)),
    };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private toResponse = (row: typeof tenantMenuItems.$inferSelect): MenuItemResponseDto => ({
    id: row.id,
    tenantId: row.tenantId,
    parentId: row.parentId,
    label: row.label,
    href: row.href,
    imageKey: row.imageKey,
    icon: row.icon,
    sortOrder: row.sortOrder,
    locale: row.locale,
    status: row.status as 'active' | 'hidden' | 'archived',
    payload: row.payload ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  });

  private buildTree(items: MenuItemResponseDto[]): MenuTreeItemDto[] {
    const byId = new Map<string, MenuTreeItemDto>();
    const roots: MenuTreeItemDto[] = [];

    for (const it of items) {
      byId.set(it.id, { ...it, children: [] });
    }
    for (const it of items) {
      const node = byId.get(it.id)!;
      if (it.parentId && byId.has(it.parentId)) {
        byId.get(it.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private async nextSortOrder(tenantId: string, parentId: string | null): Promise<number> {
    const parentCond = parentId
      ? eq(tenantMenuItems.parentId, parentId)
      : sql`${tenantMenuItems.parentId} is null`;

    const [{ value }] = await this.db
      .select({ value: sql<number>`COALESCE(MAX(${tenantMenuItems.sortOrder}), -1) + 1` })
      .from(tenantMenuItems)
      .where(and(eq(tenantMenuItems.tenantId, tenantId), parentCond));

    return Number(value ?? 0);
  }

  /**
   * Verify that parent exists, belongs to same tenant, and depth limit isn't exceeded.
   * If movingItemId is set (update path), also prevent moving an item INTO its own subtree.
   */
  private async assertParentValid(
    tenantId: string,
    parentId: string,
    movingItemId?: string,
  ): Promise<void> {
    const [parent] = await this.db
      .select({ id: tenantMenuItems.id, parentId: tenantMenuItems.parentId })
      .from(tenantMenuItems)
      .where(and(eq(tenantMenuItems.id, parentId), eq(tenantMenuItems.tenantId, tenantId)))
      .limit(1);

    if (!parent) {
      throw new NotFoundException({ code: 'MENU_PARENT_NOT_FOUND', parentId });
    }

    // Depth check: walk up from parent. If parent already at MAX_DEPTH-1, child would exceed.
    let depth = 1; // parent is depth 1 (under root)
    let cursor = parent.parentId;
    while (cursor) {
      depth += 1;
      if (depth >= MAX_DEPTH) {
        throw new BadRequestException({ code: 'MENU_DEPTH_EXCEEDED', max: MAX_DEPTH });
      }
      const [up] = await this.db
        .select({ parentId: tenantMenuItems.parentId })
        .from(tenantMenuItems)
        .where(eq(tenantMenuItems.id, cursor))
        .limit(1);
      cursor = up?.parentId ?? null;
    }

    // Cycle check on move.
    if (movingItemId) {
      const descendants = await this.collectDescendants(tenantId, movingItemId);
      if (descendants.includes(parentId)) {
        throw new BadRequestException({ code: 'MENU_ITEM_PARENT_CYCLE' });
      }
    }
  }

  private async collectDescendants(tenantId: string, rootId: string): Promise<string[]> {
    const result: string[] = [];
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = await this.db
        .select({ id: tenantMenuItems.id })
        .from(tenantMenuItems)
        .where(
          and(
            eq(tenantMenuItems.tenantId, tenantId),
            inArray(tenantMenuItems.parentId, frontier),
          ),
        );
      const ids = children.map((c) => c.id);
      result.push(...ids);
      frontier = ids;
    }
    return result;
  }
}
