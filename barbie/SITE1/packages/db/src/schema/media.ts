/**
 * Media — все загруженные файлы тенанта (logo, photos, CMS images, menu images).
 *
 * S3-bucket layout: `tenant/{tenant_id}/{module}/...`. CHECK constraint
 * `media_key_tenant_prefix_check` enforce префикс `tenant/{tenant_id}/` на
 * DB-уровне — защита от случайного cross-tenant ключа.
 *
 * `module` group'ирует медиа по контексту использования: `logo`, `cms`,
 * `staff`, `menu`, `service`, etc. `entity_id` — опциональная ссылка на
 * родителя (например, `staff.id` для photo мастера).
 *
 * НЕТ полей-наследников ES (`modelId`, `albumCategory`, `isVerified`) —
 * это другая доменная модель.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.16.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export type MediaStatus = 'uploading' | 'ready' | 'archived';

export const media = pgTable(
  'media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    key: varchar('key', { length: 500 }).notNull(),
    mime: varchar('mime', { length: 100 }).notNull(),
    size: bigint('size', { mode: 'bigint' }).notNull(),
    sha256: varchar('sha256', { length: 64 }),

    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),

    alt: varchar('alt', { length: 500 }),
    caption: text('caption'),

    module: varchar('module', { length: 32 }).notNull(),
    entityId: uuid('entity_id'),

    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    status: varchar('status', { length: 20 })
      .$type<MediaStatus>()
      .notNull()
      .default('uploading'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    keyUniq: uniqueIndex('media_key_uniq').on(t.key),
    tenantModuleIdx: index('media_tenant_module_idx').on(t.tenantId, t.module),
    tenantEntityIdx: index('media_tenant_entity_idx').on(
      t.tenantId,
      t.module,
      t.entityId,
    ),
    tenantCreatedIdx: index('media_tenant_created_idx').on(
      t.tenantId,
      t.createdAt.desc(),
    ),
    keyPrefixCheck: check(
      'media_key_tenant_prefix_check',
      sql`key LIKE 'tenant/' || tenant_id::text || '/%'`,
    ),
  }),
);

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
