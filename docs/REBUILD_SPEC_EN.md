# Functional & Technical Specification — Lovnge-Style Premium Agency Platform (Stack-Agnostic Rebuild)

**Document purpose:** Enable another engineering team or AI coding agent to implement a **functionally equivalent** product on a **different technology stack** (e.g. Laravel + Vue, Rails + Hotwire, Go + htmx, etc.). This is **not** a line-by-line port of the reference repo; it is a **behavioral, data, API, UX, and compliance** specification.

**Reference implementation (for behavioral truth):** Monorepo `escort-platform` — NestJS API + Next.js web + PostgreSQL + Drizzle + MinIO/S3 + Redis (env-validated). Brand name in reference UI: **Lovnge**.

---

## 1. Product definition

### 1.1 Elevator pitch

A **premium companionship / escort agency** platform: **public marketing + model catalog + per-model profiles**, **client authentication**, **agency dashboard** (models, media, moderation, settings, bookings scaffolding), **reviews with moderation**, **booking + escrow data model** (payment integration hooks), **object storage for media** with presigned uploads, **platform-wide branding/settings** (JSON blob).

### 1.2 Primary personas

| Persona | Goals |
|--------|--------|
| **Guest** | Browse published models, open public profile, read approved public reviews, contact form, register/login. |
| **Client** | Same as guest + authenticated flows (dashboard areas tied to client role). |
| **Model** | Own profile & media where product allows (reference ties model card to `userId` optionally). |
| **Manager** | Create/edit model cards, photos flow, moderation queue participation. |
| **Admin** | Full settings, user/model oversight, blacklist, escrow/booking admin patterns. |

### 1.3 Language & markets

- **UI copy:** Russian is primary in the reference (labels, errors, dashboard). You may add i18n; default behavior should match **Russian-first** guest and admin strings for parity.
- **Compliance notes in reference:** Env flags for **data region** (`ru` default) and **audit log retention** (default 1825 days string in env schema). Implement as configurable policy hooks even if storage is simplified.

### 1.4 Explicit non-goals (unless you expand scope)

- Pixel-perfect clone of experimental pages (`/experiment`, `/ripple`, `/sandbox`, `/auth-debug`) — **optional**.
- Full payment capture for YooKassa/Cryptomus — reference has **env placeholders**; implement **interfaces + DB states**, not necessarily live PSP.
- Clerk — optional `clerkId` on user; reference may not fully enforce Clerk flows.
- Telegram bot — optional `TELEGRAM_BOT_TOKEN` in env.

---

## 2. Design system (must be reproduced visually)

**Source of truth:** Luxury dark “Modern Luxury”; full token list in reference `DESIGN.md`. Summary:

### 2.1 Typography

- **Display / logo / hero / model names:** **Unbounded** (Google Fonts), weights 400–900.
- **UI / body:** **Inter**, weights 300–700.
- **Numeric tables:** Inter with **tabular nums** where prices/stats appear.

### 2.2 Color (dark-only product)

| Token | Hex | Use |
|-------|-----|-----|
| Page background | `#0A0A0A` | Default page |
| Surface | `#1A1A1A` | Cards, inputs |
| Elevated | `#242424` | Hover, modals |
| Text primary | `#FFFFFF` | Headings |
| Text secondary | `#A0A0A0` | Body, labels |
| Text muted | `#666666` | Meta, placeholders |
| Gold primary | `#D4AF37` | CTAs, accents (sparse) |
| Gold light | `#F4D03F` | Hover highlight |
| Gold dark | `#B8941F` | Pressed |
| Success | `#22C55E` | Positive states |
| Warning | `#EAB308` | Pending |
| Error | `#EF4444` | Errors |
| Info | `#3B82F6` | Rare |

### 2.3 Layout & motion

- **Max content width** ~1200px, **12-column** discipline where applicable.
- **Spacing:** 8px base grid; comfortable density (cards ~24px padding; section vertical rhythm 48–64px).
- **Texture:** subtle **film grain / noise** overlay ~2–4% opacity on dark backgrounds.
- **Motion:** 200–500ms, ease-out / refined curves; respect **`prefers-reduced-motion`**.

### 2.4 Branding behavior

- **Configurable** site name, text logo, optional image logo, light/dark theme preview in settings (reference: dashboard settings + public branding API).
- Public site reads **public branding** without JWT; after admin save, clients refetch (no-store semantics in reference).

---

## 3. System architecture (logical)

### 3.1 Processes

1. **HTTP API** — JSON REST, OpenAPI/Swagger desirable, global validation, rate limiting, security headers (CSP, HSTS in prod, etc.).
2. **Web app** — SSR/SSG where appropriate; authenticated dashboard; public catalog.
3. **PostgreSQL** — primary data store.
4. **Object storage** — S3-compatible (MinIO in dev); private bucket; **presigned PUT** for uploads; public or CDN URL for reads as configured.
5. **Redis** — required in reference env validation; used for throttling / future session blacklist — implement at least **connection + health** or equivalent service boundary.
6. **SMTP** — optional; contact form email when configured.

### 3.2 Edge routing (reference behavior)

- Browser may call API via **absolute `NEXT_PUBLIC_API_URL`** OR via **same-origin `/api/*` rewrite** to API (Next `rewrites`: `/api/:path*` → `http://127.0.0.1:3000/:path*` **without** `/api` prefix on the upstream). Your stack should document **one** chosen pattern and keep **CORS** consistent.
- **Image proxies** (optional parity): same-origin `/pic-proxy/*` → picsum; `/img-proxy/*` → unsplash; CORS header `*` for WebGL/crossOrigin flows.

### 3.3 Ports (reference defaults)

- API: **3000**
- Web: **3001**

---

## 4. Authentication & authorization

### 4.1 User identity storage

- **Email** is not stored plaintext for lookup; store **`email_hash` = SHA-256( lower(trim(email)) )` hex string**, unique index.
- **Password:** **bcrypt** hash (reference cost factor **10**).
- **Roles:** `admin` | `manager` | `model` | `client` (string column).
- **Subscription tier (client-facing feature flag):** `none` | `basic` | `standard` | `premium` on user; included in JWT claims for gating review visibility.
- **Account status:** `active` | `suspended` | `pending_verification` | `blacklisted`. Login **rejected** for `suspended` and `blacklisted` with generic unauthorized message.

### 4.2 JWT

- **Access token** + **refresh token** returned on register/login/refresh.
- **Secrets:** separate access vs refresh secret in env; access secret **64 hex chars** (32 bytes); refresh secret strong string (reference min length 32).
- **Expiry:** configurable strings (reference defaults `15m` access, `7d` refresh).
- **Claims (minimum):** `sub` = user id, `email` (plain for UX in token), `role`, `subscriptionTier`, `jti` (session id).
- **Guards:** Bearer JWT on protected routes; role-based restrictions per controller patterns in reference.

### 4.3 Sessions table (persistence)

Table `sessions`: `userId`, `refreshTokenHash`, optional `accessTokenHash`, `ipAddress`, `userAgent`, `expiresAt`, `revokedAt`. Used to align refresh rotation / logout strategy with reference (even if simplified).

### 4.4 Auth HTTP API (path prefix **without** `/api` on Nest; front may use `/api` rewrite)

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| POST | `/auth/register` | No | Body: `email`, `password` (min 8), optional `role` in `client` \| `model` only (do not allow self-serve `admin`). Create user + client/model profile as reference does; return user summary + tokens. **409** if email hash exists. |
| POST | `/auth/login` | No | Valid email/password + status checks → tokens. **401** invalid credentials or blocked. |
| POST | `/auth/refresh` | No | Body: `refreshToken`; **401** if invalid. |
| POST | `/auth/logout` | JWT | Idempotent success (reference may not fully revoke server-side — implement at least API contract). |
| GET | `/auth/me` | JWT | Current user claims/profile snippet. |

---

## 5. Data model (PostgreSQL)

Implement **all** tables below with columns, types, defaults, indexes, and FK behaviors as specified. Use UUID PKs unless noted.

### 5.1 `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | default random |
| email_hash | varchar(64) | unique, indexed |
| phone_token | varchar(255) | nullable |
| password_hash | varchar(255) | bcrypt |
| role | varchar(20) | enum string, default `client` |
| subscription_tier | varchar(20) | `none` default |
| status | varchar(30) | default `pending_verification` |
| clerk_id | varchar(255) | nullable unique |
| last_login | timestamptz | nullable |
| deleted_at | timestamptz | nullable |
| created_at, updated_at | timestamptz | not null |

**Indexes:** unique on `email_hash`; index on `role`, `status`, `clerk_id`.

### 5.2 `client_profiles`

One row per client user: `user_id` FK **unique** → `users`. Fields: trust score decimal, VIP tier enum (`standard` default, `silver`, `gold`, `platinum`), psychotype enum, JSON `archetypes`, JSON `preferences`, counters, blacklist flags, `assigned_manager_id` FK → `users`. Timestamps.

### 5.3 `model_profiles`

| Area | Fields |
|------|--------|
| Identity | `user_id` nullable FK (unique when not null), `manager_id` FK |
| Public | `display_name`, unique `slug`, `biography` text |
| Verification | `verification_status` enum (`pending`, `video_required`, `document_required`, `verified`, `rejected`), timestamps, `elite_status` bool |
| Pricing | `rate_hourly`, `rate_overnight` decimal |
| Availability | `availability_status` enum (`offline`, `online`, `in_shift`, `busy`), `next_available_at` |
| JSON | `psychotype_tags` string[], `languages` string[], `physical_attributes` object (see reference schema for subfields) |
| Stats | reliability rating decimal, meeting/cancellation counters |
| Media summary | `photo_count`, video URLs, `main_photo_url` |
| Publication | `is_published` bool, `published_at` |

**Partial unique index:** `user_id` unique where `user_id IS NOT NULL`. Indexes on manager, slug, availability, elite, verification, published.

### 5.4 `bookings`

FK: `client_id` → `users`, `model_id` → `model_profiles`, optional `manager_id` → `users`.

**Status enum:** `draft`, `pending_payment`, `escrow_funded`, `confirmed`, `in_progress`, `completed`, `disputed`, `cancelled`, `refunded`.

Fields: `start_time`, `duration_hours`, `location_type` enum (`incall`, `outcall`, `travel`, `hotel`, `dacha`), `special_requests` text, monetary fields (`total_amount`, `platform_fee`, `model_payout`, `currency` default `RUB`), cancellation metadata, timestamps (`confirmed_at`, `completed_at`, `cancelled_at`).

### 5.5 `escrow_transactions`

One row per booking (unique `booking_id`): provider enum (`yookassa`, `cryptomus`, `manual`), provider ref, amounts, **status enum** (`pending_funding`, `funded`, `hold_period`, `released`, `refunded`, `disputed_hold`, `partially_refunded`), hold timestamps, `release_trigger` enum, `state_history` JSON array of transitions.

### 5.6 `reviews`

FK: `client_id`, `model_id`, optional `booking_id` (unique when set). `rating` int, `comment` text, `is_public`, `is_verified`, **moderation** `pending|approved|rejected` + reason, helpful counters, timestamps.

**Public rule:** only **approved** reviews appear on public model page APIs.

### 5.7 `media_files`

FK: `owner_id` → `users`, optional `model_id` → `model_profiles`.

Fields: `file_type` (`photo|video|document`), `mime_type`, `file_size`, `storage_key` **unique**, `bucket`, `cdn_url`, presigned URL + expiry, `sort_order`, **`is_public_visible`** bool, `album_category` string default `portfolio`, verification flags, **moderation** fields + `moderated_by` FK, JSON `metadata`, timestamps.

### 5.8 `blacklists`

`entity_type` `model|client`, `entity_id` UUID, `reason` enum (fake_photos, client_complaints, fraud, no_show, video_fake, non_payment, rudeness, pressure), `description`, `status` (`blocked`, `under_review`, `restored`), actor FKs, timestamps, `is_public` bool.

### 5.9 `booking_audit_logs`

Append-only style: `booking_id`, `action`, `actor_id`, `from_status`, `to_status`, `metadata` JSON, IP, user agent, `created_at`.

### 5.10 `sessions`

(See §4.3.)

### 5.11 `platform_settings`

Single-row pattern: `id` varchar PK (e.g. `default`), `data` JSONB **not null** (arbitrary keys for site name, logos, theme tokens, text logo blink, etc.), `updated_at`.

### 5.12 Relations

Enforce referential integrity consistent with reference `relations.ts` (bookings ↔ escrow, models ↔ media, users ↔ profiles, etc.).

---

## 6. HTTP API surface (implement parity)

**Conventions:** JSON bodies/responses, ISO 8601 timestamps, UUID strings, decimal amounts as strings in JSON. Use **Problem Details** or Nest-like `{ statusCode, message, error? }` for errors. Map **database/upstream failures** to **503** with safe client message; **wrong DB credentials** should be distinguishable in logs from **TCP down**.

Below, “Admin/Manager” means JWT with appropriate `role`. Exact RBAC should mirror reference controllers.

### 6.1 Health

- `GET /health` — 200 JSON with status, version/env hint, links to docs.

### 6.2 Models (public + admin)

Reference controller: `models`. Implement list with **filters**: published vs all (role-based), `limit`, `orderBy`, `order`, search. Public list returns only **published** profiles.

- `GET /models` — guest: published catalog.
- `GET /models/:id` — detail by id with role-appropriate fields.
- Admin/manager CRUD patterns as in reference (create draft, update, publish).

### 6.3 Profiles (model owner + staff)

Reference: `profiles` — rich surface for **my profile**, **slug** public resolution, **media presign**, **confirm upload**, **set main photo**, **approve/reject** (staff), **delete**, stats. Implement:

- Presigned **POST** returning URL + fields client uses to **PUT** binary to S3/MinIO.
- **Confirm** step persists `media_files` row and ties to model.
- **Visibility** toggles (`is_public_visible`) and bulk operations if present in reference.

### 6.4 Media (staff)

`media` controller: stats, by model, get by id, create, approve, delete, **visibility** POST endpoints, bulk visibility.

### 6.5 Users / Clients

`users` + `clients` controllers: CRUD-ish patterns, stats endpoints, VIP/psychotype updates for clients as in reference.

### 6.6 Bookings & Escrow

`bookings` + `escrow`: list, stats, get by id, create, state transitions (`transition`, `confirm`, `cancel`, `complete`, `dispute`, `refund` routes in reference), delete rules. Persist audit rows on changes.

### 6.7 Reviews

Public: **approved** reviews for model, rating aggregate endpoints. Authenticated: create review; staff endpoints for moderation; delete rules.

### 6.8 Blacklist

CRUD + check endpoint `GET /blacklist/check/:entityType/:entityId` + restore.

### 6.9 Moderation queue

`moderation` controller: aggregate pending **models** / **media** (and reviews if wired) for dashboard queue; approve/reject actions consistent with schema.

### 6.10 Settings

- `GET /settings/public` — **no auth**, `Cache-Control: no-store`, returns **safe subset** of branding (site name, logos URLs, text logo, colors if exposed).
- `GET /settings` — auth staff: full JSON.
- `POST /settings` — auth staff: **shallow merge** `{ ...existing, ...incoming }` for `data` blob.
- `POST /settings/logo-presign` — staff: presign for platform logo upload to object storage.

### 6.11 Contact

`contact` controller: public contact form POST → SMTP to `CONTACT_FORM_TO_EMAIL` when set; rate limit.

### 6.12 Rate limiting

Global default: TTL + max requests from env (`RATE_LIMIT_TTL` default `60` seconds, `RATE_LIMIT_MAX` default `100`). Throttle **burst** login/register/contact more strictly if you implement extras.

### 6.13 CORS

`ALLOWED_ORIGINS` comma-separated list; echo `FRONTEND_URL` in allowed set in reference.

### 6.14 Security headers

Helmet-class: CSP, HSTS (production), XSS filter, frameguard, etc. Report URI optional.

### 6.15 Encryption

`ENCRYPTION_KEY` 64 hex chars — used for **PII encryption helpers** in reference (implement same contract for any encrypted fields you add; location encryption may be TODO in reference).

---

## 7. Web application (routes & UX)

### 7.1 Public

- `/` — landing / marketing.
- `/login` — tabs Login / Register; show API errors; demo credential copy UI optional.
- `/models` — grid/list of **published** models.
- `/models/[slug]` — public profile: photos (respect `is_public_visible`), bio, rates, **approved** reviews, subscription-gated review visibility for clients if implemented.
- `/contacts` — contact form.

### 7.2 Dashboard (JWT required; role-gated sections)

- `/dashboard` — shell / redirect.
- `/dashboard/home`
- `/dashboard/models` — hub.
- `/dashboard/models/list`, `/dashboard/models/create`, `/dashboard/models/[id]/edit`, `/dashboard/models/[id]/photos`, `/dashboard/models/[id]/view`
- `/dashboard/moderation` — queue UI.
- `/dashboard/settings` — platform settings + branding (light/dark preview), logo presign, text logo fields.
- `/dashboard/bookings`, `/dashboard/media` — parity with API readiness.

### 7.3 Misc reference pages (optional)

- `/admin-login`, `/auth-debug`, `/experiment`, `/ripple`

### 7.4 Client integration

- Central **API client** with base URL from env.
- **Auth context:** store tokens (reference: memory + refresh flow); attach `Authorization: Bearer`.
- After settings save in dashboard, **refetch public branding** on client with cache-busting query.

---

## 8. Environment configuration (validate at API boot)

**Required (reference Zod schema):**

| Variable | Rule |
|----------|------|
| `NODE_ENV` | development \| staging \| production \| test |
| `DATABASE_URL` | `postgresql://...` URL |
| `JWT_SECRET` | 64 hex chars |
| `JWT_REFRESH_SECRET` | min 32 chars |
| `ENCRYPTION_KEY` | 64 hex chars |
| `REDIS_URL` | `redis://...` URL |
| `MINIO_ENDPOINT` | host:port string |
| `MINIO_ACCESS_KEY` | min 8 chars |
| `MINIO_SECRET_KEY` | min 16 chars |

**Defaults / optional:**

- `JWT_ACCESS_EXPIRATION` default `15m`, `JWT_REFRESH_EXPIRATION` default `7d`
- `MINIO_BUCKET` default `escort-media`
- `MINIO_PUBLIC_URL` URL optional
- `MINIO_PRESIGN_ENDPOINT` optional (browser-reachable host for presigned PUT)
- `PORT` default `3000`; `HOST` default `0.0.0.0` in reference bootstrap
- `FRONTEND_URL` default `http://localhost:3001`
- `ALLOWED_ORIGINS` default `http://127.0.0.1:3001`
- `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`
- `DATA_REGION` enum `ru|eu|global` default `ru`
- `AUDIT_LOG_RETENTION_DAYS` default `1825`
- SMTP_* optional block; `CONTACT_FORM_TO_EMAIL` optional
- `TELEGRAM_BOT_TOKEN`, `YOOKASSA_*`, `CRYPTOMUS_*` optional

**Web:**

- `NEXT_PUBLIC_API_URL` — if set, browser talks to API directly (CORS must allow web origin).
- `NEXT_PUBLIC_SITE_URL` — canonical site.
- `API_PROXY_UPSTREAM` — override for dev rewrite target.

---

## 9. Object storage flows (must match semantics)

1. **Client requests presign** from API (model media or platform logo).
2. API returns **PUT URL**, headers, and **`storage_key`** (or equivalent) + expiry.
3. Browser **PUTs** file to storage using **presign endpoint** reachable from user network (often public IP:9000, not `localhost`, in production).
4. **Confirm** endpoint creates/updates DB row, sets moderation state (`pending` for model uploads), increments counters, sets `main` if requested.
5. **Public URLs** for display: either CDN/base URL concatenated with `storage_key`, or signed GET if you choose — reference uses **public base** pattern with MinIO.

Implement **visibility** flag: hidden media must not appear in public profile API responses.

---

## 10. Observability & operations

- Structured logs on errors: URL, method, IP, user agent, status, timestamp, stack in dev only.
- Health check for DB connectivity (light query) optional beyond process up.
- **PM2/systemd/Docker:** document recommended **working directory** = monorepo root; **single fork** process for API; correct **compiled entrypoint** path.

---

## 11. Acceptance criteria (minimum bar)

- [ ] All §5 tables migrated; FKs and indexes match intent.
- [ ] §4 auth: register/login/refresh/me; email hash + bcrypt; JWT claims include role + subscriptionTier.
- [ ] Public catalog + public profile by slug; unpublished hidden from guests.
- [ ] Media presign + confirm + moderation states; main photo; visibility toggle.
- [ ] Reviews: create → pending; staff approve; public only sees approved.
- [ ] Settings JSON with public GET (no auth) + staff POST merge; logo presign.
- [ ] Bookings + escrow tables wired with state transition endpoints (payment may be stubbed).
- [ ] Blacklist CRUD + check endpoint.
- [ ] Rate limit + CORS + security headers + env validation on boot.
- [ ] UI matches §2 design tokens and Russian copy for core flows.
- [ ] Document deployment env pitfalls: **DB TCP password** vs socket, **ConfigModule .env path** = repo root, **`@escort/db`-equivalent package** must resolve to **compiled JS** for production Node.

---

## 12. Suggested deliverables from the implementer

1. Architecture diagram (web, api, db, redis, s3).
2. OpenAPI 3.1 spec exported from running API.
3. Migration scripts + seed script for admin + demo client.
4. README: local dev, production env, object storage DNS/firewall notes.
5. Test plan: auth, model publish, media upload, review moderation, settings public cache.

---

*End of specification.*
