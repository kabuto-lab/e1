/**
 * Lead Applications — универсальная таблица заявок от всех публичных форм всех
 * тенантов NAS.
 *
 * Обобщение work4u.applications: одна таблица обслуживает ВСЕ site_type:
 *   - `wfy-city-dir`: заявки на вакансию (formSource='wfy-interview')
 *   - `salon-detail`: бронирование услуги (formSource='imp-booking', и т.п.)
 *   - `generic-cms`: контактные формы (formSource='generic-contact')
 *
 * Произвольные поля формы хранятся в `fields` (jsonb). Структура определяется
 * `formSource` — Zod-схема per source в `cms/forms/*` (Phase F).
 *
 * Идемпотентность POST'ов клиентских форм — через unique `(tenant_id,
 * form_source, idempotency_key)` (Phase F добавит colonne idempotency_key
 * при необходимости).
 *
 * Аудит публичного приёма: `sourcePage`, `userAgent`, `ipAddress`. PII —
 * учитывается при GDPR-cleanup (Year-2 candidate).
 *
 * Спецификация: `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` §2.2.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type LeadApplicationStatus =
  | 'new'
  | 'processing'
  | 'rejected'
  | 'converted'
  | 'spam';

/** Произвольные поля формы; форма знает свой формат, repo — нет. */
export type LeadApplicationFields = Record<string, unknown>;

export const leadApplications = pgTable(
  'lead_applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    /**
     * Источник заявки — machine-readable идентификатор формы.
     * Примеры: 'wfy-interview', 'imp-booking', 'bba-callback',
     * 'salon-detail-contact', 'generic-contact'.
     */
    formSource: varchar('form_source', { length: 64 }).notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 64 }),
    email: varchar('email', { length: 320 }),

    /** Произвольные поля формы. Лимит размера применяется на write (Phase F). */
    fields: jsonb('fields')
      .$type<LeadApplicationFields>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /** UUID-ы прикреплённых медиа (например, портфолио для work4u вакансии). */
    attachedMediaIds: jsonb('attached_media_ids')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    status: varchar('status', { length: 20 })
      .$type<LeadApplicationStatus>()
      .notNull()
      .default('new'),

    /** Откуда пришла заявка — для аналитики и фрод-фильтра. */
    sourcePage: text('source_page'),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 64 }),

    /** Флаги нотификаций; обновляются worker'ом доставки (Phase 1 BullMQ). */
    telegramSent: boolean('telegram_sent').notNull().default(false),
    emailSent: boolean('email_sent').notNull().default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index('lead_applications_tenant_created_idx').on(
      t.tenantId,
      t.createdAt.desc(),
    ),
    tenantSourceIdx: index('lead_applications_tenant_source_idx').on(
      t.tenantId,
      t.formSource,
    ),
    tenantStatusIdx: index('lead_applications_tenant_status_idx').on(
      t.tenantId,
      t.status,
    ),
  }),
);

export type LeadApplication = typeof leadApplications.$inferSelect;
export type NewLeadApplication = typeof leadApplications.$inferInsert;
