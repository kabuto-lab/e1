# Barbie / SITE1 — Roles & RBAC Matrix

**Status:** Level 2 architectural design
**Last updated:** 2026-05-16
**Companion docs:** `ARCHITECTURE.md` (§5–§6), `DB-SCHEMA.md` (§1.5–§1.6)

---

## 1. Role taxonomy

Пять канонических ролей. Дополнительные роли в Phase 1+.

| Role | Scope | Storage | Cross-tenant |
|------|-------|---------|--------------|
| `platform-admin` | Cross-tenant (вся платформа) | `platform_admins` | Yes |
| `tenant-admin` | Один тенант (все салоны) | `tenant_users` | No |
| `salon-manager` | Один салон внутри тенанта | `tenant_users` + `salon_id` | No |
| `master` | Свои записи внутри салона | `tenant_users` + `salon_id` | No |
| `client` | Свой профиль и свои записи | `tenant_users` (опц.) | No |

### 1.1 Множественность ролей

Один `users.id` может быть:
- `platform-admin` в `platform_admins` И иметь tenant memberships (для тестирования / dogfooding) — но это discouraged
- В нескольких `tenant_users` rows с РАЗНЫМИ `tenant_id` (multi-tenant membership) — поддерживается
- В одном тенанте — ТОЛЬКО ОДНА активная роль (`(tenant_id, user_id)` UNIQUE)

### 1.2 Иерархия (для UI и автодополнения)

```
platform-admin
  └─ tenant-admin (внутри тенанта)
       └─ salon-manager (внутри салона)
            └─ master
       └─ client (плоско, не наследует от других)
```

**Важно:** иерархия — для UX, НЕ для permission inheritance. Никаких `if (role === 'tenant-admin' || role > 'salon-manager')` хаков. Permissions проверяются explicit-ом через guards.

---

## 2. Domain access matrix

**Легенда:**
- `–` — нет доступа
- `R` — read only (свой scope)
- `R*` — read только своих записей (ещё уже)
- `RW` — create / update своих
- `Manage` — full CRUD в своём scope
- `Admin` — Manage + чувствительные операции (delete, bulk, billing, settings)
- `X-Manage` — cross-tenant Manage (только platform-admin)

### 2.1 Phase 0 domains

| Domain | platform-admin | tenant-admin | salon-manager | master | client |
|--------|----------------|--------------|---------------|--------|--------|
| **Tenants** | X-Manage | R (свой) | R (свой) | R (свой) | – |
| **Tenant settings** (design tokens, nav template) | X-Manage | Admin | R | – | – |
| **Menu items** | X-Manage | Admin | R | – | – |
| **Platform admins** | Admin | – | – | – | – |
| **Tenant users** (invite, role mgmt) | X-Manage | Admin | R (своего салона) | – | – |
| **Salons** | X-Manage | Admin | R (своего) | R (своего) | R (publicly listed) |
| **Services** | X-Manage | Admin | Manage (своего салона) | R | R (publicly listed) |
| **Staff** | X-Manage | Admin | Manage (своего салона) | R (свой профиль RW) | R (publicly listed) |
| **Staff schedule** | X-Manage | Admin | Manage | RW (свой) | – |
| **Clients (CRM)** | X-Manage | Admin | Manage (клиенты своего салона) | R* (только своих записей) | R (свой профиль RW) |
| **Appointments** | X-Manage | Admin | Manage (своего салона) | R* (свои) + status updates | RW* (свои, без чужих) |
| **CMS pages** | X-Manage | Admin | – | – | R (published) |
| **Media** | X-Manage | Admin | Manage (своего салона) | RW (свои фото) | RW (avatar) |
| **Audit log (tenant)** | X-Manage | R | R* (своего салона) | – | – |
| **Audit log (platform)** | Admin | – | – | – | – |
| **Sessions (own)** | RW | RW | RW | RW | RW |
| **Sessions (others)** | Admin | Admin (внутри тенанта) | – | – | – |

### 2.2 Phase 1 domains

| Domain | platform-admin | tenant-admin | salon-manager | master | client |
|--------|----------------|--------------|---------------|--------|--------|
| **Subscription plans** | Admin | R | R | – | – |
| **Subscriptions (own tenant)** | X-Manage | Admin | R | – | – |
| **Subscription invoices** | X-Manage | R | – | – | – |
| **Client payments** | X-Manage | Admin | Manage (своего салона) | R* (свои apps) | R* (свои) |
| **Payment refunds** | X-Manage | Admin | R (запрос refund'а; финальное одобрение tenant-admin) | – | – |
| **Reports / analytics** | X-Manage | Admin | R (свой салон) | R* (свои метрики) | – |

---

## 3. Operation-level breakdown

Конкретизация для критичных операций. Формат: `<HTTP method> <route> → <allowed roles>`.

### 3.1 Tenants

```
GET    /platform/admin/tenants                   → platform-admin
POST   /platform/admin/tenants                   → platform-admin
PATCH  /platform/admin/tenants/:id               → platform-admin
POST   /platform/admin/tenants/:id/suspend       → platform-admin
POST   /platform/admin/tenants/:id/resume        → platform-admin

GET    /tenant/me                                → any tenant role (returns own tenant)
PATCH  /tenant/me                                → tenant-admin
GET    /tenant/me/design-tokens                  → any tenant role
PATCH  /tenant/me/design-tokens                  → tenant-admin
```

### 3.2 Menu

```
GET    /tenant/me/menu                           → public (returns active items)
POST   /tenant/me/menu                           → tenant-admin
PATCH  /tenant/me/menu/:id                       → tenant-admin
DELETE /tenant/me/menu/:id                       → tenant-admin
POST   /tenant/me/menu/reorder                   → tenant-admin
```

### 3.3 Salons

```
GET    /salons                                   → public (active only)
GET    /salons/:id                               → public (active only)
POST   /tenant/me/salons                         → tenant-admin
PATCH  /tenant/me/salons/:id                     → tenant-admin
DELETE /tenant/me/salons/:id                     → tenant-admin
POST   /tenant/me/salons/:id/archive             → tenant-admin
```

### 3.4 Services

```
GET    /services                                 → public
POST   /tenant/me/services                       → tenant-admin, salon-manager (своего салона)
PATCH  /tenant/me/services/:id                   → tenant-admin, salon-manager (своего салона)
DELETE /tenant/me/services/:id                   → tenant-admin
```

### 3.5 Staff

```
GET    /staff                                    → public (active)
GET    /tenant/me/staff                          → tenant-admin, salon-manager
POST   /tenant/me/staff                          → tenant-admin, salon-manager (своего салона)
PATCH  /tenant/me/staff/:id                      → tenant-admin, salon-manager (своего салона), master (свой профиль only)
PATCH  /tenant/me/staff/:id/schedule             → tenant-admin, salon-manager, master (свой)
```

### 3.6 Clients (CRM)

```
GET    /tenant/me/clients                        → tenant-admin, salon-manager (свой салон)
POST   /tenant/me/clients                        → tenant-admin, salon-manager
PATCH  /tenant/me/clients/:id                    → tenant-admin, salon-manager
GET    /tenant/me/clients/:id                    → tenant-admin, salon-manager, master (если есть apps с этим клиентом)
GET    /me/profile                               → client
PATCH  /me/profile                               → client
```

### 3.7 Appointments

```
GET    /tenant/me/appointments                   → tenant-admin, salon-manager (свой салон)
POST   /tenant/me/appointments                   → tenant-admin, salon-manager
PATCH  /tenant/me/appointments/:id               → tenant-admin, salon-manager
POST   /tenant/me/appointments/:id/confirm       → tenant-admin, salon-manager
POST   /tenant/me/appointments/:id/complete      → tenant-admin, salon-manager, master (свои)
POST   /tenant/me/appointments/:id/cancel        → tenant-admin, salon-manager, master (свои), client (свои)
POST   /tenant/me/appointments/:id/noshow        → tenant-admin, salon-manager, master (свои)

POST   /bookings                                 → client, guest (опц., см. Phase 1)
GET    /me/appointments                          → client (свои)
```

### 3.8 CMS

```
GET    /cms/pages                                → public (status='published')
GET    /tenant/me/cms/pages                      → tenant-admin (все включая drafts)
POST   /tenant/me/cms/pages                      → tenant-admin
PATCH  /tenant/me/cms/pages/:id                  → tenant-admin
POST   /tenant/me/cms/pages/:id/publish          → tenant-admin
DELETE /tenant/me/cms/pages/:id                  → tenant-admin
GET    /cms/pages/:slug/preview?token=...        → public с valid signed token
```

### 3.9 Media

```
POST   /media/presign                            → any authenticated tenant role (с ratelimit)
POST   /media/confirm                            → any authenticated tenant role
DELETE /media/:id                                → tenant-admin (любое), uploader (своё, до 24h)
```

### 3.10 Audit log

```
GET    /tenant/me/audit                          → tenant-admin (полный), salon-manager (filter by salon)
GET    /platform/admin/audit                     → platform-admin
```

### 3.11 Subscriptions & payments (Phase 1)

```
GET    /platform/admin/subscription-plans        → platform-admin
POST   /platform/admin/subscription-plans        → platform-admin
GET    /subscription-plans                       → public
GET    /tenant/me/subscription                   → tenant-admin
POST   /tenant/me/subscription                   → tenant-admin
POST   /tenant/me/subscription/cancel            → tenant-admin
GET    /tenant/me/subscription/invoices          → tenant-admin

POST   /payments                                 → client
GET    /tenant/me/payments                       → tenant-admin, salon-manager (свой салон)
POST   /tenant/me/payments/:id/refund            → tenant-admin
```

---

## 4. TenantGuard contract

### 4.1 Inputs

| Source | Field | Required? |
|--------|-------|-----------|
| `JwtAuthGuard` | `req.user.id` | yes |
| `JwtAuthGuard` | `req.user.scope` ('tenant' \| 'platform') | yes |
| `JwtAuthGuard` | `req.user.tenantId` | yes if scope='tenant' |
| `JwtAuthGuard` | `req.user.role` | yes |
| `JwtAuthGuard` | `req.user.salonId` | yes if role in ('salon-manager', 'master') |
| `TenantResolverMiddleware` (ALS) | `tenantId` | yes (или `null` для platform endpoints) |
| Route decorator | `@RequireTenant() / @CrossTenant() / @RequireRole(...) / @RequireSalonScope()` | declared at controller/method |

### 4.2 Decision matrix

```
TenantGuard.canActivate(ctx):
  if route has @CrossTenant():
    return user.scope === 'platform' && user.role === 'platform-admin'

  if route has @RequireTenant() (default for tenant-scoped controllers):
    if user.scope !== 'tenant':
      audit('platform_user_on_tenant_route')
      return false (or convert to impersonation, see §6)

    alsTenantId = TenantContext.getTenantId()
    if user.tenantId !== alsTenantId:
      audit('tenant_mismatch_attempt', { user: user.id, claimedTenant: user.tenantId, resolvedTenant: alsTenantId })
      return false

    if route has @RequireRole(...roles):
      if user.role not in roles:
        audit('role_escalation_attempt', { user: user.id, role: user.role, required: roles })
        return false

    if route has @RequireSalonScope():
      // salon_id из params/body должен совпадать с user.salonId (если роль scope'дит на салон)
      if user.role in ('salon-manager', 'master'):
        targetSalonId = extractSalonId(req)
        if targetSalonId !== user.salonId:
          audit('cross_salon_attempt', { user: user.id, userSalon: user.salonId, target: targetSalonId })
          return false

    return true
```

### 4.3 Outputs

- `true` → запрос проходит, attaches `req.tenantContext` для последующих guards/interceptors
- `false` → throws `ForbiddenException` (HTTP 403), audit event записан

---

## 5. Privilege escalation policy

### 5.1 Запрещённые сценарии

| Сценарий | Действие |
|----------|----------|
| `master` пытается hit-нуть `PATCH /tenant/me/services/:id` | 403, audit `role_escalation_attempt` |
| `salon-manager` пытается hit-нуть endpoint другого салона своего тенанта | 403, audit `cross_salon_attempt` |
| `tenant-admin` тенанта A пытается hit-нуть endpoint тенанта B (через X-Tenant-Domain header в prod) | 403, audit `tenant_mismatch_attempt` |
| `platform-admin` использует tenant-scoped endpoint без явной impersonation | 403 если нет `@CrossTenant()`, audit `platform_user_on_tenant_route` |
| `client` пытается PATCH чужую appointment | 403, audit `appointment_ownership_violation` |
| JWT с роль='platform-admin' предъявлен на subdomain тенанта без impersonation token | 403, audit `platform_jwt_on_tenant_subdomain` |

### 5.2 Audit на любую попытку

Каждая попытка эскалации (даже неудачная) логируется:

- В `audit_log_tenant` если контекст tenant-scoped
- В `audit_log_platform` если контекст cross-tenant или involves platform-admin
- Sentry event с tag `security_violation`
- Если 5+ за 5 минут от одного `user_id` → suspend сессии (`sessions.revoked_at = now()`, reason='security_throttle')

---

## 6. Impersonation (для саппорта)

### 6.1 Opt-in flag

Тенант явно даёт согласие через `tenants.settings.impersonationAllowed = true`. По умолчанию `false`.

### 6.2 Flow

```
1. platform-admin → POST /platform/admin/tenants/:id/impersonate
   body: { reason: "Support ticket #12345", durationMinutes: 60 }

2. Server checks tenants.settings.impersonationAllowed === true
   - if false → 403, audit('impersonation_denied_by_tenant')

3. Server creates short-lived session:
   - sessions row with scope='tenant', tenantId=:id, userId=platform-admin.userId
   - expires_at = now() + duration
   - extra column `impersonation_actor_user_id` = platform-admin.userId
   - JWT issued: { scope: 'tenant', tenantId, role: 'tenant-admin', impersonating: true }

4. audit_log_platform:
   action='impersonation.start', affected_tenant_id, payload={ reason, duration }

5. audit_log_tenant (целевой тенант):
   action='impersonation.start_by_platform', actor=platform-admin.userId, payload={ reason }

6. Каждый запрос в impersonated session:
   - audit_log_tenant записывает ИНДИВИДУАЛЬНО все mutations (POST/PATCH/DELETE)
   - в payload отмечается impersonation=true

7. Impersonation end:
   - явно: POST /platform/admin/impersonate/stop
   - автоматически: session expires
   - audit events: 'impersonation.end' в обоих логах
```

### 6.3 Ограничения impersonation

| Action | Allowed under impersonation? |
|--------|------------------------------|
| Read CRM data | yes |
| Create/update appointments | yes |
| Update tenant settings (design, menu) | yes |
| Invite new tenant users | NO (audit и block) |
| Delete data (anything) | NO (audit и block) |
| Change billing / subscription | NO (audit и block) |
| Trigger refunds | NO (audit и block) |
| Export tenant data | NO (audit и block) |

Реализация: декоратор `@DenyImpersonation()` на чувствительных endpoints, guard проверяет `req.user.impersonating !== true`.

### 6.4 Notifications

При начале impersonation:
- Email на `tenants.contact_email` (Phase 1)
- В CRM UI tenant-admin'а — баннер "Сейчас в системе работает поддержка платформы"
- Phase 2: realtime via WS

---

## 7. Permission overrides (Phase 1)

`tenant_users.permissions jsonb` позволяет тенант-админу выдавать fine-grained права. Например:

```jsonc
// salon-manager обычно НЕ может удалить услугу, но tenant-admin даёт явное право:
{
  "services:delete": true,
  "audit:read_full_salon": true
}
```

Guard проверяет в порядке:
1. Role default permissions (matrix выше)
2. `tenant_users.permissions` override (true permits, false revokes)
3. `tenants.settings.featureFlags` (отключение всей фичи на уровне тенанта)

Permission keys: `<domain>:<operation>` (например `services:create`, `appointments:cancel_any`, `audit:read`).

---

## 8. Public (unauthenticated) access

| Endpoint | Notes |
|----------|-------|
| `GET /tenant/me/menu` | Active items, published page links |
| `GET /salons` (и `/:id`) | Active salons listing |
| `GET /services` (и `/:id`) | Active services |
| `GET /staff` | Active staff profiles (без phone/email) |
| `GET /cms/pages/:slug` | Published only |
| `POST /bookings` (Phase 1) | Guest booking — анонимная запись по phone confirmation |
| `POST /auth/register` | Регистрация client |
| `POST /auth/login` | Логин |
| `GET /health` | Liveness |

Все остальные tenant endpoints — требуют JWT.

---

## 9. Test plan (для guard'ов)

Минимальный набор unit + e2e тестов перед merge:

### 9.1 Unit (TenantGuard)

- Valid tenant-admin → allow
- tenant-admin тенант A с ALS тенант B → deny + audit
- platform-admin без @CrossTenant → deny + audit
- platform-admin с @CrossTenant → allow
- salon-manager hit endpoint с другим salon_id → deny + audit
- master hit endpoint другого master'а → deny + audit
- client hit endpoint без аутентификации → deny

### 9.2 E2E (full request lifecycle)

- Login → resolve tenant → access tenant data: ok
- Login в тенанте A → попытка hit subdomain тенанта B: 403
- Impersonation flow: start → make change → audit recorded в обоих логах
- Impersonation expired → 401
- Revoke session → следующий запрос 401
- Cross-salon attempt by salon-manager: 403
- 5+ violation attempts → session suspended

---

## 10. Open questions

1. **Multi-role inside one tenant:** допускаем `tenant-admin` И `master` одновременно (одно лицо — и владелец, и работник)? — Default: НЕТ, только одна активная роль на `(tenant_id, user_id)`. Multi-role симулируется через permission overrides.
2. **Master endpoint scope:** `master` видит ВСЕХ клиентов своих записей или только за период (последние 30 дней)? — Default: все исторические записи мастера, фильтр UI-level.
3. **Guest booking (Phase 1):** какой rate-limit на анонимные `POST /bookings`? — Default: 5 per IP per hour, 1 per phone per hour.
4. **Impersonation duration cap:** максимум? — Default: 240 минут (4 часа), force-refresh для продления.
5. **API tokens (machine-to-machine):** Phase 2, отдельный `api_tokens` table c scoped permissions, не в RBAC matrix Phase 0.
6. **Tenant-admin self-impersonation salon-manager view:** позволяем tenant-admin'у "see as salon-manager" для отладки UI? — Default: НЕТ в Phase 0, UI-level role switcher Phase 2.
