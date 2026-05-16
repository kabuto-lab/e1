/**
 * Tenant Menu Items — иерархические пункты главного меню сайта тенанта.
 *
 * Self-FK `parent_id` для двух уровней (root + children). Глубина больше двух
 * не запрещена в БД, но регулируется на application level — каждый renderer
 * (`top-classic`, `mega-images`, `vertical-side`) ожидает максимум 2 уровня.
 *
 * Composite index `(tenant_id, parent_id, sort_order)` — главный путь рендера.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.3.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
  check,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type MenuItemStatus = 'active' | 'hidden' | 'archived';

export type MenuItemPayload = {
  description?: string;
  badge?: string;
  openInNewTab?: boolean;
  highlight?: boolean;
};

export const tenantMenuItems = pgTable(
  'tenant_menu_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    parentId: uuid('parent_id'),

    label: varchar('label', { length: 255 }).notNull(),
    href: varchar('href', { length: 1000 }).notNull(),

    imageKey: varchar('image_key', { length: 500 }),
    icon: varchar('icon', { length: 64 }),

    sortOrder: integer('sort_order').notNull().default(0),
    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    payload: jsonb('payload')
      .$type<MenuItemPayload>()
      .default(sql`'{}'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<MenuItemStatus>()
      .notNull()
      .default('active'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    parentFk: foreignKey({
      columns: [t.parentId],
      foreignColumns: [t.id],
      name: 'tenant_menu_items_parent_fk',
    }).onDelete('cascade'),
    tenantParentSortIdx: index('tmi_tenant_parent_sort_idx').on(
      t.tenantId,
      t.parentId,
      t.sortOrder,
    ),
    tenantLocaleIdx: index('tmi_tenant_locale_idx').on(t.tenantId, t.locale),
    hrefCheck: check(
      'tenant_menu_items_href_check',
      sql`href ~ '^(/|https?://)'`,
    ),
  }),
);

export type TenantMenuItem = typeof tenantMenuItems.$inferSelect;
export type NewTenantMenuItem = typeof tenantMenuItems.$inferInsert;
