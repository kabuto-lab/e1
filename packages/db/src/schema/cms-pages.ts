import { pgTable, uuid, varchar, text, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: varchar('type', { length: 20 }).notNull().default('page'),
    title: varchar('title', { length: 500 }).notNull().default(''),
    slug: varchar('slug', { length: 255 }).notNull(),
    content: jsonb('content'),
    excerpt: text('excerpt'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    featuredImageUrl: text('featured_image_url'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: text('meta_description'),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    slugUniq: uniqueIndex('cms_pages_slug_uniq').on(t.slug),
    typeStatusIdx: index('cms_pages_type_status_idx').on(t.type, t.status),
    createdAtIdx: index('cms_pages_created_at_idx').on(t.createdAt),
  }),
);

export type CmsPage = typeof cmsPages.$inferSelect;
export type NewCmsPage = typeof cmsPages.$inferInsert;
