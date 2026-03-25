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

---

## Current Phase: Phase 1 (Core CMS) — 60% Complete

**Next priorities:**
1. Image visibility system (show/hide per image)
2. Album/category system for photos
3. Fade slider component
4. Water shader overlay
5. Design system (DESIGN.md)

See `COMPREHENSIVE_AUDIT_AND_PLAN.md` for full audit.

---

## Design System

**Status:** ✅ Created — March 25, 2026

**Always read `DESIGN.md` before making any visual or UI decisions.**

All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

**Direction:** Luxury/Refined (Modern Luxury)
- **Fonts:** Satoshi (display) + DM Sans (body) — Google Fonts
- **Colors:** Restrained gold accent (#D4AF37) on black (#0A0A0A)
- **Layout:** Grid-disciplined, 1200px max, 12 columns
- **Motion:** Intentional, subtle (200-500ms)
- **Decoration:** Subtle grain texture (2% opacity noise)

**Preview:** `C:\tmp\design-preview.html`
