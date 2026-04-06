# Escort Platform — Development Guidelines

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

**VPS (production clone):** репозиторий на сервере лежит в **`~/e1`**. Рабочая сессия по SSH: пользователь обычно **уже в `~/e1`**.

**Как отвечать при работе на VPS:** выдавать **строго по одной shell-команде** за сообщение и коротко пояснять, зачем она; **не** слать длинные чеклисты или блок из нескольких команд сразу — следующую команду дать после того, как пользователь выполнит предыдущую (если не попросил иное).

Типовой порядок (по одной штуке в диалоге): `git pull` → при необходимости `npm run db:bootstrap` → сборка API/web → перезапуск PM2 из корня с `ecosystem.config.cjs`.

---

## Ригор инженерии (ассистент) — «God of code» (адаптировано)

Цель: меньше регрессий и догадок. **Не магия:** между чатами нет буквальной «вечной памяти» — опирайся на этот файл, код в репо и то, что пользователь написал в текущем диалоге.

**Стек (факт):** NestJS (API), Next.js (web), TypeScript, **Drizzle ORM + PostgreSQL**, Redis, MinIO/S3 — не Prisma.

**До правок:** читать затрагиваемые файлы целиком или достаточный контекст; искать вхождения по репо; пути брать из дерева проекта, не выдумывать.

**Совместимость:** не ломать существующее поведение без явной просьбы; правки точечные; стиль и паттерны как у соседнего кода.

**UI:** перед визуальными решениями — `DESIGN.md`; при смене контрактов/архитектуры публичного сайта — при необходимости `apps/web/public/platform-blueprint.html`.

**Надёжность:** для пользовательских потоков учитывать успех / ошибку / загрузку и типичные сбои (сеть, 401/503), где это уместно.

**Зависимости:** не добавлять пакеты без нужды.

**Формат ответа:** по объёму задачи — для крупных изменений уместно кратко: контекст → какие файлы → что сделано → как проверить; для мелочей — коротко, без шести обязательных секций.

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
