/**
 * Tenant Design Tokens — дизайн-система тенанта (цвета, шрифты, лого, nav).
 *
 * 1:1 с `tenants`: primary key = `tenant_id` (не отдельный `id`). Создаётся
 * application-level при `TenantsService.create` (либо postgres trigger).
 *
 * Конструктор тенанта в админке редактирует именно эту таблицу. `navTemplate`
 * выбирает один из трёх готовых лейаутов меню в `apps/web`.
 *
 * Спецификация: `docs/DB-SCHEMA.md` §1.2.
 */

import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export type NavTemplate = 'top-classic' | 'mega-images' | 'vertical-side';

export const tenantDesignTokens = pgTable(
  'tenant_design_tokens',
  {
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .primaryKey(),

    bg: varchar('bg', { length: 16 }).notNull().default('#FFFFFF'),
    headColor: varchar('head_color', { length: 16 }).notNull().default('#0A0A0A'),
    headFont: varchar('head_font', { length: 64 }).notNull().default('Unbounded'),
    accColor: varchar('acc_color', { length: 16 }).notNull().default('#D4AF37'),
    accFont: varchar('acc_font', { length: 64 }).notNull().default('Unbounded'),
    bodyColor: varchar('body_color', { length: 16 }).notNull().default('#1A1A1A'),
    bodyFont: varchar('body_font', { length: 64 }).notNull().default('Inter'),

    logoKey: varchar('logo_key', { length: 500 }),
    logoAlt: varchar('logo_alt', { length: 255 }),
    faviconKey: varchar('favicon_key', { length: 500 }),

    navTemplate: varchar('nav_template', { length: 32 })
      .$type<NavTemplate>()
      .notNull()
      .default('top-classic'),

    customCss: text('custom_css'),
    extras: jsonb('extras')
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    navTemplateCheck: check(
      'tenant_design_tokens_nav_template_check',
      sql`nav_template IN ('top-classic','mega-images','vertical-side')`,
    ),
    colorFormatCheck: check(
      'tenant_design_tokens_colors_hex_check',
      sql`bg ~ '^#[0-9A-Fa-f]{6,8}$' AND head_color ~ '^#[0-9A-Fa-f]{6,8}$'`,
    ),
  }),
);

export type TenantDesignTokens = typeof tenantDesignTokens.$inferSelect;
export type NewTenantDesignTokens = typeof tenantDesignTokens.$inferInsert;
