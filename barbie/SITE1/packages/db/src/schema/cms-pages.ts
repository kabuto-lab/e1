/**
 * CMS Pages — tenant-aware страницы конструктора сайта.
 *
 * Уникальность `(tenant_id, slug, locale)`: одна страница на slug+locale в
 * пределах тенанта (multilang готов из коробки).
 *
 * Тело страницы (`body`) — массив блоков-объектов с `type` и `data`. Список
 * блоков фиксирован в типе `CmsBlocks`:
 *   - `hero`, `text`, `gallery`, `services`, `cta`, `custom`.
 *
 * Partial index `cms_pages_tenant_published_idx` ускоряет публичный
 * листинг — только `status='published'`, DESC по publishedAt.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.17.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export type CmsPageStatus = 'draft' | 'published' | 'archived';

export type CmsBlocks = Array<
  | { type: 'hero'; data: { title: string; subtitle?: string; imageKey?: string } }
  | { type: 'text'; data: { html: string } }
  | { type: 'gallery'; data: { mediaIds: string[] } }
  | { type: 'services'; data: { categoryFilter?: string; limit?: number } }
  | { type: 'cta'; data: { label: string; href: string; style?: 'primary' | 'secondary' } }
  | { type: 'custom'; data: Record<string, unknown> }
>;

export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    slug: varchar('slug', { length: 255 }).notNull(),
    locale: varchar('locale', { length: 8 }).notNull().default('ru'),

    title: varchar('title', { length: 500 }).notNull(),
    body: jsonb('body')
      .$type<CmsBlocks>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<CmsPageStatus>()
      .notNull()
      .default('draft'),

    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    coverImageKey: varchar('cover_image_key', { length: 500 }),

    authorUserId: uuid('author_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantSlugLocaleUniq: uniqueIndex('cms_pages_tenant_slug_locale_uniq').on(
      t.tenantId,
      t.slug,
      t.locale,
    ),
    tenantStatusIdx: index('cms_pages_tenant_status_idx').on(t.tenantId, t.status),
    tenantPublishedIdx: index('cms_pages_tenant_published_idx')
      .on(t.tenantId, t.publishedAt.desc())
      .where(sql`status = 'published'`),
  }),
);

export type CmsPage = typeof cmsPages.$inferSelect;
export type NewCmsPage = typeof cmsPages.$inferInsert;
