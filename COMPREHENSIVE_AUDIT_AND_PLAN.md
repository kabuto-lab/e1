# 🔍 ESCORT PLATFORM — COMPREHENSIVE AUDIT & ACTION PLAN
**Date:** March 25, 2026 (addendum March 28, 2026)
**Auditor:** AI Design Consultant
**Repository:** `C:\Users\a\Documents\_DEV\Tran\ES`

---

## 📌 Addendum — March 28, 2026

**Сводка изменений в репозитории (день / недавний инкремент):**

- **Отзывы:** публичная выдача только одобренных отзывов по модели; создание отзывов персоналом с модерацией; миграции/поля `moderationStatus` и связанные правила доступа (manager scope, subscription tier).
- **Модерация:** единая очередь (профили, медиа, отзывы) через `ModerationController` с базовым путём **`/models/moderation`** (контроллер смонтирован в `ModelsModule`, чтобы маршруты не терялись).
- **Пользователи / JWT:** у пользователя учитывается **`subscriptionTier`** и прокидывается в токен там, где это нужно для политики отзывов и доступа.
- **Веб:** страницы логина (в т.ч. admin-login), `AuthProvider`, карточка и редактирование модели — загрузка и отображение отзывов через BFF/API-клиент; страница модерации в дашборде.
- **Документация и визуализация:** `platform-blueprint.html` — вкладка **«Роадмэп»** (полный путь этапов 0–9 до production, статусы ✓/◐/○), правки DFD и блока `comm.reviews`; `DEV-STACK.bat` / сценарии локального стека при необходимости синхронизированы с репо.
- **UI дашборда:** тема `data-dashboard-theme="wp-admin"` и правки `globals.css`, чтобы заголовки и body-шрифты в настройках не ломали иерархию (в т.ч. отделение display для крупных заголовков от глобальных `h1–h6`).

**Актуальная оценка Phase 1:** ~**65%** (ранее в документе — 60%); формальная дизайн-система уже зафиксирована в **`DESIGN.md`** (см. раздел ниже — первоначальный аудит упоминал её отсутствие до 25.03).

**Полный роадмэп в UI:** `apps/web/public/platform-blueprint.html` → вкладка **Роадмэп** (этапы 0–9).

---

## 📊 EXECUTIVE SUMMARY

### What This Is
**Escort Platform (Lovnge)** — A premium escort agency management platform with:
- Model profile CMS with photo management
- Client booking system with escrow payments
- CRM for manager-client communication
- Black/gold luxury aesthetic

### Current State: **Phase 1 — ~65% Complete** *(updated March 28, 2026)*
```
✅ WORKING (Backend + Basic Frontend)
├── NestJS API (13 modules, 40+ endpoints)
├── PostgreSQL (10 tables, Drizzle ORM)
├── Docker (Postgres, Redis, MinIO, Mailhog)
├── JWT Authentication
├── Model CRUD operations
├── Basic Next.js frontend (login, dashboard, catalog, profile pages)
├── Image rendering fixed (catalog + profile pages working)
├── Reviews with moderation workflow + public approved-only feed
├── Moderation queue API (/models/moderation/*) + dashboard moderation UI
└── User subscriptionTier in DB/JWT (policy hooks)

⏳ IN PROGRESS (Needs Completion)
├── Photo upload UI (basic working, needs visibility system)
├── Model profile editor (partially working)
├── Form validation
└── Live preview

❌ NOT STARTED (High Priority)
├── Image visibility toggles (show/hide per image)
├── Album/category system for photos
├── Fade slider component (background transitions)
├── Water shader overlay (Three.js distortion effect)
├── Public profile page polish
└── Booking flow UI

🗑️ DEFERRED (Medium/Low Priority)
├── Clerk Auth integration (self JWT works for now)
├── YooKassa/Cryptomus payments
├── Telegram/WhatsApp CRM integration
├── Admin panel
├── Email notifications
└── Advanced analytics
```

---

## 🏗️ ARCHITECTURE AUDIT

### Tech Stack (Modern 2026)
```
Frontend:
  - Next.js 15 (App Router, React 19)
  - TypeScript
  - Tailwind CSS (custom black/gold theme)
  - Lucide React (icons)

Backend:
  - NestJS 10
  - Drizzle ORM + PostgreSQL 16
  - JWT Auth (passport-jwt)
  - Swagger API docs

Infrastructure:
  - Docker Compose (4 services)
  - MinIO (S3-compatible storage)
  - Redis (caching)
  - Mailhog (email testing)

Monorepo:
  - Turborepo
  - npm workspaces
  - TypeScript project refs
```

### File Structure
```
ES/
├── apps/
│   ├── api/              # NestJS backend (port 3000)
│   │   └── src/
│   │       ├── auth/     ✅ JWT auth, register, login
│   │       ├── users/    ✅ User CRUD
│   │       ├── models/   ✅ Model profiles API
│   │       ├── clients/  ✅ Client profiles
│   │       ├── bookings/ ✅ State machine (draft→completed)
│   │       ├── escrow/   ✅ Payment transactions
│   │       ├── reviews/  ✅ Reviews + ratings
│   │       ├── blacklist/✅ Blacklist management
│   │       ├── media/    ⚠️ Presigned URLs (MinIO not fully integrated)
│   │       ├── database/ ✅ Drizzle connection
│   │       └── health/   ✅ Health checks
│   │
│   └── web/              # Next.js frontend (port 3001)
│       └── app/
│           ├── login/        ✅ Login/register forms
│           ├── dashboard/    ✅ Admin dashboard with stats
│           ├── models/       ✅ Public catalog + profile pages
│           └── dashboard/models/
│               ├── list/     ✅ Model list (CMS)
│               ├── create/   ✅ Create model form
│               └── [id]/
│                   ├── edit/ ⚠️ Edit form (partially working)
│                   ├── photos/ ⚠️ Photo upload (basic)
│                   └── view/ ✅ View model
│
└── packages/
    └── db/
        └── src/schema/
            ├── users.ts           ✅
            ├── client-profiles.ts ✅
            ├── model-profiles.ts  ✅
            ├── bookings.ts        ✅
            ├── escrow.ts          ✅
            ├── reviews.ts         ✅
            ├── blacklists.ts      ✅
            ├── media.ts           ✅ (needs visibility columns)
            ├── audit.ts           ✅
            └── sessions.ts        ✅
```

---

## 🎨 DESIGN SYSTEM AUDIT

### Current State: **FORMAL DESIGN SYSTEM — `DESIGN.md` (since March 25, 2026)**

> Ниже сохранён снимок «как было до документа» (имплицитные решения в CSS). Источник правды для новой работы — **`DESIGN.md`** и `CLAUDE.md`.

**Observed Patterns (legacy snapshot):**
```
Colors (from globals.css):
  - Background: #0a0a0a (near-black)
  - Surface: #1a1a1a (dark gray)
  - Border: #333 (subtle borders)
  - Primary: #d4af37 (gold)
  - Accent: #f4d03f (bright gold)
  - Text: white / gray-400 / gray-500
  - Success: green-500
  - Warning: yellow-500
  - Error: red-400

Typography:
  - Font: System defaults (no custom fonts loaded)
  - Scale: text-xs → text-3xl (Tailwind defaults)
  - Weights: font-medium, font-bold

Spacing:
  - Base: Tailwind 4px grid
  - Density: Comfortable (p-6, gap-6 common)

Layout:
  - Max width: Not defined
  - Grid: Tailwind grid (sm:grid-cols-2, lg:grid-cols-4)
  - Border radius: rounded-xl, rounded-2xl

Motion:
  - Transitions: hover:-translate-y-1, transition-colors
  - Duration: Default Tailwind
  - Easing: Not customized
```

### Design Debt
1. ❌ **No custom fonts** — Using system fonts (Inter/Roboto fallback)
2. ❌ **No dark mode strategy** — Only dark theme exists
3. ❌ **No component library** — Inline styles everywhere
4. ❌ **No design tokens** — Hardcoded hex values
5. ❌ **No responsive breakpoints** — Assumed but not documented
6. ❌ **No motion guidelines** — Ad-hoc transitions

---

## 📸 IMAGE MANAGEMENT AUDIT

### What Works ✅
- Model cards display `mainPhotoUrl` correctly
- Profile pages render images with fallback
- MinIO presigned URL generation (backend)
- Image upload endpoint exists

### What's Broken ⚠️
1. **No visibility system** — All images are public by default
2. **No albums/categories** — Can't organize photos (Portfolio/VIP/Elite)
3. **No reordering UI** — Can't control display order
4. **No bulk actions** — Can't show/hide multiple at once
5. **MinIO not fully integrated** — Uploads may not reach MinIO

### Database Schema Gap
```sql
-- media_files table MISSING these columns:
ALTER TABLE media_files
ADD COLUMN is_public_visible BOOLEAN DEFAULT true,
ADD COLUMN album_category VARCHAR(50) DEFAULT 'portfolio',
ADD COLUMN sort_order INTEGER DEFAULT 0;
```

---

## 🔐 SECURITY AUDIT

### What's Good ✅
- JWT with refresh tokens (15min access, 7d refresh)
- Password hashing with bcrypt
- CORS configured
- Helmet middleware
- ValidationPipe (class-validator)

### Concerns ⚠️
1. **JWT Guard disabled** — Auth endpoints unprotected in dev
2. **No rate limiting** — Vulnerable to brute force
3. **No input sanitization** — XSS risk in user content
4. **No HTTPS enforcement** — Dev-only, but still
5. **MinIO credentials in .env** — Should use secrets manager

### Critical Missing Features
- Email verification
- 2FA for admin accounts
- Password reset flow
- Session invalidation on password change
- Audit logging for sensitive actions

---

## 🎯 IMMEDIATE ACTION PLAN (Next 2-3 Days)

### Priority 1: Image Visibility System (4-5 hours)
**Why:** Models need control over which photos are public vs. VIP-only.

**Tasks:**
1. Add database columns to `media_files` table
2. Update backend API endpoints (GET/PUT visibility)
3. Build `ImageVisibilityGrid` component
4. Add album/category dropdown
5. Implement bulk selection toolbar
6. Add filter view (All/Visible/Hidden)

**Files to Modify:**
- `packages/db/src/schema/media.ts`
- `apps/api/src/media/media.controller.ts`
- `apps/web/app/dashboard/models/[id]/photos/page.tsx`
- `apps/web/components/ImageVisibilityGrid.tsx` (NEW)

---

### Priority 2: Fade Slider Component (3-4 hours)
**Why:** Background image transitions are a core visual feature.

**Tasks:**
1. Create `FadeSlider` React component
2. Implement smooth crossfade (5s default)
3. Add configuration (interval, transition type)
4. Filter to only "visible" images
5. Mobile responsive sizing
6. Performance optimization (lazy loading)

**Files to Modify:**
- `apps/web/components/FadeSlider.tsx` (NEW)
- `apps/web/app/models/[slug]/page.tsx`
- `apps/web/types/slider.ts` (NEW)

---

### Priority 3: Water Shader Integration (4-5 hours)
**Why:** The "wow factor" — liquid distortion effect on background images.

**Tasks:**
1. Analyze `water_shader_stacked.html` reference
2. Port Three.js setup to React component
3. Create `WaterShaderOverlay` component
4. Add intensity/speed controls
5. Implement mobile fallback (disable shader)
6. Test performance on mid-range devices

**Files to Modify:**
- `apps/web/components/WaterShaderOverlay.tsx` (NEW)
- `apps/web/lib/shader-utils.ts` (NEW)
- Reference: `water_shader_stacked.html`

---

### Priority 4: Design System Documentation (2-3 hours)
**Why:** Future-proof the visual language, enable consistency.

**Tasks:**
1. Create `DESIGN.md` with:
   - Typography stack (recommend specific fonts)
   - Color palette (hex values + CSS variables)
   - Spacing scale
   - Layout guidelines
   - Motion principles
2. Update `CLAUDE.md` to reference `DESIGN.md`
3. Generate preview page (HTML artifact)

**Files to Create:**
- `DESIGN.md`
- `CLAUDE.md` (append design system section)
- `/tmp/design-preview-{timestamp}.html`

---

## 🗓️ PHASED ROADMAP

### Phase 1: Core CMS (Complete in 3-5 days)
```
Week 1:
  Day 1-2: Image visibility system ✅
  Day 3: Fade slider component ✅
  Day 4: Water shader integration ✅
  Day 5: Design system documentation ✅

Deliverables:
  ✅ Models can toggle photo visibility
  ✅ Albums/categories working
  ✅ Background fade slider on public profiles
  ✅ Water shader effect (desktop)
  ✅ DESIGN.md written
```

### Phase 2: Public Profile Pages (1 week)
```
Week 2:
  - Public profile page polish
  - Image gallery with lightbox
  - Contact/booking inquiry form
  - Reviews display
  - Social sharing (OG tags)

Deliverables:
  ✅ /models/[slug] is production-ready
  ✅ Gallery lightbox working
  ✅ Inquiry form submits to API
  ✅ Reviews section renders
```

### Phase 3: Booking System (2 weeks)
```
Week 3-4:
  - Booking request form
  - Date/time picker
  - Service selection
  - Price calculation
  - Escrow payment flow
  - Manager dashboard

Deliverables:
  ✅ End-to-end booking flow
  ✅ Escrow integration
  ✅ Manager can manage bookings
```

### Phase 4: Advanced Features (Ongoing)
```
Future:
  - Telegram/WhatsApp CRM
  - YooKassa/Cryptomus
  - Email verification
  - Admin panel
  - Analytics dashboard
  - VIP/Elite content gating
```

---

## 🧪 TESTING CHECKLIST

### Before Next Session
```bash
# 1. Docker services running
docker-compose -f docker-compose.dev.yml ps
# Expected: postgres, redis, minio, mailhog = Up

# 2. API healthy
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# 3. Web running
open http://localhost:3001
# Expected: Login page

# 4. Catalog images visible
open http://localhost:3001/models
# Expected: 12-14 model cards with photos

# 5. Profile page renders
open http://localhost:3001/models/[any-slug]
# Expected: Profile with background image
```

---

## 📋 DECISION LOG

| Decision | Rationale | Date |
|----------|-----------|------|
| Keep self JWT (not Clerk) | Clerk overkill for MVP, JWT works | 2026-03-25 |
| Prioritize image visibility | Core CMS feature, blocks Phase 2 | 2026-03-25 |
| Build fade slider before shader | Slider is prerequisite for shader overlay | 2026-03-25 |
| Create DESIGN.md now | Prevents design debt accumulation | 2026-03-25 |

---

## 🎯 RECOMMENDED NEXT SESSION

### Option A: Image Visibility (Recommended)
**Time:** 4-5 hours
**Impact:** High — unblocks photo management workflow

```bash
# Start session
cd C:\Users\a\Documents\_DEV\Tran\ES
dev-ultimate.bat

# Then run:
# 1. Database migration (add visibility columns)
# 2. Backend API updates
# 3. Frontend ImageVisibilityGrid component
# 4. Test with 10+ images
```

### Option B: Design System First
**Time:** 2-3 hours
**Impact:** Medium — establishes visual foundation

```bash
# Run design-consultation skill
# Create DESIGN.md
# Generate preview page
# Then build features with design system in place
```

---

## 🔗 QUICK REFERENCE

### Key URLs
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Web: http://localhost:3001
- MinIO: http://localhost:9001
- Mailhog: http://localhost:8025

### Key Commands
```bash
# Full restart
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d

# API dev
cd apps/api && npx ts-node -r tsconfig-paths/register src/main.ts

# Web dev
cd apps/web && npm run dev

# Drizzle Studio
cd packages/db && npx drizzle-kit studio
```

### Key Files
- Profile Editor: `apps/web/app/dashboard/models/[id]/edit/page.tsx`
- Photo Upload: `apps/web/app/dashboard/models/[id]/photos/page.tsx`
- Public Catalog: `apps/web/app/models/page.tsx`
- Public Profile: `apps/web/app/models/[slug]/page.tsx`
- Shader Reference: `water_shader_stacked.html`

---

## 📊 COMPLETION SCORECARD

| Module | Backend | Frontend | Design | Tests | Overall |
|--------|---------|----------|--------|-------|---------|
| Auth | ✅ 100% | ✅ 100% | ⚠️ 50% | ❌ 0% | 75% |
| Models | ✅ 100% | ✅ 80% | ⚠️ 50% | ❌ 0% | 70% |
| Media | ⚠️ 70% | ⚠️ 50% | ❌ 0% | ❌ 0% | 40% |
| Bookings | ✅ 90% | ❌ 0% | ❌ 0% | ❌ 0% | 25% |
| Escrow | ✅ 80% | ❌ 0% | ❌ 0% | ❌ 0% | 20% |
| Reviews | ✅ 80% | ❌ 0% | ❌ 0% | ❌ 0% | 20% |
| **Overall** | **88%** | **45%** | **25%** | **0%** | **52%** |

**Legend:** ✅ Complete | ⚠️ Partial | ❌ Not Started

---

## 🚨 KNOWN ISSUES

1. **JWT Guard disabled** — Security risk in current dev state
2. **MinIO upload untested** — May not actually save to MinIO
3. **No form validation** — Edit forms accept invalid data
4. **No error boundaries** — React errors crash entire app
5. **No loading states** — UI shows blank during fetches
6. **No mobile testing** — Responsive but untested on devices

---

**Generated:** March 25, 2026
**Next Action:** Run `/design-consultation` to create DESIGN.md, OR start Image Visibility implementation
**Estimated Time to Phase 2:** 3-5 days of focused work
