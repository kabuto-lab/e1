# Escort Platform — Development Guidelines

**Конституция безопасной работы с кодом, деплоем и источниками правды:** **`ENTITY.md`** — читай при задачах на код, VPS, UI и архитектуру. Здесь — gstack, быстрый старт и сжатые напоминания.

---

## gstack

This project uses **gstack** — a virtual engineering team for Claude Code.

**Browse:** Always use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

**Available skills:**
- `/office-hours` — Problem statement & design doc
- `/plan-ceo-review` — Strategy & scope review
- `/plan-eng-review` — Architecture & tests
- `/plan-design-review` — UI/UX review
- `/design-consultation` — Design system creation
- `/review` — Code review before PR
- `/ship` — Create PR with review dashboard
- `/land-and-deploy` — Merge & deploy
- `/canary` — Staging validation
- `/benchmark` — Performance testing
- `/browse` — Web browsing automation
- `/qa` — End-to-end QA testing
- `/qa-only` — QA without code changes
- `/setup-browser-cookies` — Browser auth setup
- `/setup-deploy` — Deployment configuration
- `/retro` — Project retrospective
- `/investigate` — Bug investigation
- `/document-release` — Release documentation
- `/codex` — Codex integration
- `/cso` — Security officer
- `/autoplan` — Full auto-review pipeline
- `/careful` — Extra verification
- `/freeze` — Code freeze
- `/guard` — Pre-merge checks
- `/unfreeze` — Lift code freeze
- `/gstack-upgrade` — Update gstack

**If gstack skills aren't working:** Run `cd .claude/skills/gstack && bun install && bun build src/cli.ts --outdir dist --target node` in the gstack folder.

---

## Project Quick Start

**Docker Desktop (Windows):** если `docker compose` не видит движок — сначала запусти Docker Desktop. Типичный путь установки: `C:\Program Files\Docker\Docker`.

```bash
# 1. Start Docker services
docker-compose -f docker-compose.dev.yml up -d

# 2. Start API (port 3000)
cd apps/api && npx ts-node -r tsconfig-paths/register src/main.ts

# 3. Start Web (port 3001)
cd apps/web && npm run dev
```

**URLs:**
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Web: http://localhost:3001
- MinIO: http://localhost:9001
- Mailhog: http://localhost:8025

**Test Login:**
- Email: `test@test.com`
- Password: `password123`

**VPS:** репозиторий на сервере **`~/e1`**. После `git pull`: **`npm run vps:after-pull`** из корня `~/e1` (не `pm2 restart escort-api` после смены `.env`). Подробно: **`ENTITY.md` §6**.

**Сессия по SSH с ассистентом:** одна shell-команда за сообщение — см. **`ENTITY.md` §6** (правило для ИИ).

---

## Ригор инженерии (кратко)

Полные правила, стек, источники правды, границы монорепо: **`ENTITY.md` §1–3**.

Напоминание: NestJS + Next.js + **Drizzle + PostgreSQL** (не Prisma); читать код перед правками; не ломать поведение без запроса; **`DESIGN.md`** перед UI; не добавлять зависимости без нужды.

---

## Current Phase: Phase 1 (Core CMS) — ~65% Complete

**Shipped recently (2026-03-28):** отзывы с модерацией (API + публичная выдача одобренных), очередь модерации под `GET/POST …/models/moderation/*`, дашборд-модерация, поле `subscriptionTier` у пользователя и в JWT, доработки blueprint (`comm.reviews`, пути API, DFD), тема дашборда wp-admin и типографика настроек, обновления страниц логина и `AuthProvider`.

**Next priorities:**
1. Image visibility system (show/hide per image)
2. Album/category system for photos
3. Fade slider component
4. Water shader overlay
5. Booking flow UI (guest-facing) and payment provider integration

**Роадмэп в UI:** полный сквозной план этапов **0–9** (от репозитория до production), с маркерами ✓ / ◐ / ○ — вкладка **Роадмэп** в `apps/web/public/platform-blueprint.html` (рядом с «Гант»).

See `COMPREHENSIVE_AUDIT_AND_PLAN.md` for full audit (обновлён блок от 2026-03-28).

---

## Design System

**Status:** ✅ Created — March 25, 2026

**Always read `DESIGN.md` before making any visual or UI decisions.**

All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

**Direction:** Luxury/Refined (Modern Luxury)
- **Fonts:** Unbounded (display) + Inter (body) — Google Fonts
- **Colors:** Restrained gold accent (#D4AF37) on black (#0A0A0A)
- **Layout:** Grid-disciplined, 1200px max, 12 columns
- **Motion:** Intentional, subtle (200-500ms)
- **Decoration:** Subtle grain texture (2% opacity noise)

**Preview:** `C:\tmp\design-preview.html`
