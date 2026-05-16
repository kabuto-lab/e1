/**
 * Barbie SITE1 — Drizzle schema barrel.
 *
 * Phase 0 таблицы (17) добавляются в Stage 3 bootstrap'а одна за одной:
 *   tenants → tenant_design_tokens → tenant_menu_items
 *   → users → platform_admins → tenant_users
 *   → salons → services → staff → staff_services
 *   → clients → appointments
 *   → sessions → audit_log_tenant → audit_log_platform
 *   → media → cms_pages
 *
 * Phase 1 (4 таблицы): subscription_plans, subscriptions, subscription_invoices, client_payments.
 *
 * Полная спецификация: `barbie/SITE1/docs/DB-SCHEMA.md`.
 */

// Stage 3 пополняется здесь:
// export * from './tenants';
// export * from './tenant-design-tokens';
// ...

export {};
