/**
 * WFY Vacancies — список вакансий для тенантов типа `wfy-city-dir`.
 *
 * Site-specific (префикс `wfy_`): work-for-you имеет фиксированный набор позиций
 * (админ / массажистка / хостес и т.п.); требования и условия — текст. При
 * появлении 3-го тенанта-типа `*-city-dir` или другого сайта с произвольными
 * вакансиями — обобщать в `vacancies` (§7 rule-of-three).
 *
 * `code` — машинное имя позиции (используется в lead_applications.fields.vacancy
 * для связи заявки с позицией без жёсткого FK).
 *
 * Спецификация: `NON_PROJECT/MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md` §2.1.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/** Произвольные строковые требования / условия — массив пунктов. */
export type WfyVacancyBullets = string[];

export const wfyVacancies = pgTable(
  'wfy_vacancies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),

    /** Машинное имя — slug, используется в формах. */
    code: varchar('code', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    summary: text('summary'),

    /** Требования к кандидату — массив строк. */
    requirements: jsonb('requirements')
      .$type<WfyVacancyBullets>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** Условия / что предлагают — массив строк. */
    conditions: jsonb('conditions')
      .$type<WfyVacancyBullets>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    ord: integer('ord').notNull().default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    tenantCodeUniq: uniqueIndex('wfy_vacancies_tenant_code_uniq').on(
      t.tenantId,
      t.code,
    ),
    tenantOrdIdx: index('wfy_vacancies_tenant_ord_idx').on(t.tenantId, t.ord),
    codeCheck: check(
      'wfy_vacancies_code_format_check',
      sql`code ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$'`,
    ),
  }),
);

export type WfyVacancy = typeof wfyVacancies.$inferSelect;
export type NewWfyVacancy = typeof wfyVacancies.$inferInsert;
