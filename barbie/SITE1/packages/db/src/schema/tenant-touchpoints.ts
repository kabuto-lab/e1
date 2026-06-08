/**
 * Tenant Touchpoints — точки касания клиента на публичном сайте тенанта.
 *
 * Одна строка на пару (tenant_id, key). 7 ключей = массив TOUCHPOINTS в
 * `apps/web/.../SalonColumn.tsx` (дека /admin/projects):
 *   ряд 1 (CTA): booking · operator · footer · callWidget · telegram
 *   ряд 2 (интерактив): quiz · popup
 *
 * Платформ-админ редактирует точки в деке; публичные шаблоны (vanilia,
 * salonmassage, …) читают enabled-точки и рендерят CTA/попап.
 *
 * `value` — цель (ссылка / якорь / телефон / @username / триггер), зависит от
 * типа. `image_key` — опциональная картинка в MinIO (`tenant/{id}/touchpoint/…`),
 * нужна попапу/баннеру. Публичный URL — через S3Service.publicUrlFor.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type TouchpointKey =
  | 'booking'
  | 'operator'
  | 'footer'
  | 'callWidget'
  | 'telegram'
  | 'quiz'
  | 'popup';

export const TOUCHPOINT_KEYS: readonly TouchpointKey[] = [
  'booking',
  'operator',
  'footer',
  'callWidget',
  'telegram',
  'quiz',
  'popup',
] as const;

export const tenantTouchpoints = pgTable(
  'tenant_touchpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    key: varchar('key', { length: 20 }).$type<TouchpointKey>().notNull(),

    enabled: boolean('enabled').notNull().default(false),
    label: varchar('label', { length: 120 }).notNull().default(''),
    value: varchar('value', { length: 500 }).notNull().default(''),

    /** Цвет кнопки (hex), напр. '#D4AF37'. null — дефолт шаблона/сайта. */
    color: varchar('color', { length: 16 }),

    /** MinIO-ключ картинки (tenant/{tenant_id}/touchpoint/…). null — без картинки. */
    imageKey: varchar('image_key', { length: 500 }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantKeyUniq: uniqueIndex('tenant_touchpoints_tenant_key_uniq').on(
      t.tenantId,
      t.key,
    ),
    keyCheck: check(
      'tenant_touchpoints_key_check',
      sql`key IN ('booking','operator','footer','callWidget','telegram','quiz','popup')`,
    ),
  }),
);

export type TenantTouchpoint = typeof tenantTouchpoints.$inferSelect;
export type NewTenantTouchpoint = typeof tenantTouchpoints.$inferInsert;
