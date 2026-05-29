/**
 * Barbie SITE1 — Drizzle schema barrel.
 *
 * Phase 0 (MVP) — 17 таблиц. Экспортируем в топологическом порядке
 * (см. `docs/DB-SCHEMA.md` §4), чтобы FK всегда ссылались на уже определённые
 * таблицы при разборе модуля consumer'ом.
 *
 *  1. tenants                  (root)
 *  2. users                    (root, no FK)
 *  3. platform_admins          → users
 *  4. salons                   → tenants
 *  5. tenant_users             → tenants, users, salons
 *  6. tenant_design_tokens     → tenants
 *  7. tenant_menu_items        → tenants, self
 *  8. services                 → tenants, salons
 *  9. staff                    → tenants, salons, users
 * 10. staff_services           → staff, services, tenants
 * 11. clients                  → tenants, users
 * 12. appointments             → tenants, salons, clients, staff, services
 * 13. sessions                 → users, tenants
 * 14. media                    → tenants, users
 * 15. cms_pages                → tenants, users
 * 16. audit_log_tenant         → tenants, users
 * 17. audit_log_platform       → users, tenants
 * 18. chat_channels            → tenants, salons
 * 19. chat_channel_members     → chat_channels, tenants, users
 * 20. chat_messages            → tenants, chat_channels, users, self
 * 21. chat_events              → tenants, chat_channels
 *
 * Phase 1 (4 таблицы): subscription_plans, subscriptions, subscription_invoices,
 * client_payments — добавляются после MVP.
 *
 * Полная спецификация: `barbie/SITE1/docs/DB-SCHEMA.md`.
 */

export * from './tenants';
export * from './users';
export * from './platform-admins';
export * from './salons';
export * from './tenant-users';
export * from './tenant-design-tokens';
export * from './tenant-menu-items';
export * from './services';
export * from './staff';
export * from './staff-services';
export * from './clients';
export * from './appointments';
export * from './sessions';
export * from './media';
export * from './cms-pages';
export * from './audit-log-tenant';
export * from './audit-log-platform';
export * from './chat-channels';
export * from './chat-channel-members';
export * from './chat-messages';
export * from './chat-events';

// Phase A — work4u → NAS migration (MIGRATION_PLAN_work4u_into_NAS_2026-05-25.md §2)
//   22. partner_salons          → tenants, media
//   23. wfy_city_pages          → tenants
//   24. wfy_opportunities       → tenants
//   25. wfy_vacancies           → tenants
//   26. wfy_advantages          → tenants
//   27. lead_applications       → tenants
export * from './partner-salons';
export * from './wfy-city-pages';
export * from './wfy-opportunities';
export * from './wfy-vacancies';
export * from './wfy-advantages';
export * from './lead-applications';

// Entertainment content model — Class-G global catalogs (CONTENT-MODEL.md, ADR-008)
//   28. girls                   (global, no tenant_id)
export * from './girls';
