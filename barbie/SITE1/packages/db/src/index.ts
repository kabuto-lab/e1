/**
 * Barbie SITE1 — Database package public API.
 *
 * Drizzle ORM + PostgreSQL 16.
 * Multi-tenant: каждая таблица (кроме tenants, platform_admins, audit_log_platform,
 * subscription_plans) содержит `tenant_id NOT NULL` + композитные индексы.
 *
 * См. `docs/DB-SCHEMA.md` в корне SITE1 для полной спецификации.
 */

// Connection + Drizzle instance
export { getDb, getClient, closeDb, type Database } from './connection';

// Schema (таблицы + типы) — пополняется по мере добавления модулей
export * from './schema';
