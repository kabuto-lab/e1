# Agent notes

See `CLAUDE.md` / `ENTITY.md` for product stack, VPS, and engineering rules. See `README.md` for the standard local quick start.

## Cursor Cloud specific instructions

### Services (dev)

| Service | How to start | Ports |
|---|---|---|
| Postgres, Redis, MinIO, Mailhog | `docker compose -f docker-compose.dev.yml up -d` | 5432, 6379, 9000/9001, 1025/8025 |
| API (NestJS) | `npm run dev --workspace=@escort/api` or root `npm run dev:apps` | 3000 (`/health`, `/api/docs`) |
| Web (Next.js) | `npm run dev --workspace=@escort/web` or root `npm run dev:apps` | 3001 |
| Telegram bot | Optional — needs `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_SECRET` in env; skip unless testing TG linking | — |

Minimum viable stack: **Postgres + MinIO + API + Web**. Redis env var is required for API startup validation, but Redis itself is not used at runtime today. Mailhog is only for the Contacts SMTP flow.

### Cloud VM gotchas

- **Docker daemon:** Cloud VMs use Docker-in-Docker with `fuse-overlayfs` and `iptables-legacy`. If `docker ps` fails, start `dockerd` (e.g. in tmux: `sudo dockerd`) and confirm `Storage Driver: fuse-overlayfs`. Compose project name is `escort-dev`; containers are `escort-postgres`, `escort-redis`, `escort-minio`, `escort-mailhog`.
- **Env file:** Copy `.env.example` → `.env` at repo root if missing. Keep `POSTGRES_PASSWORD` identical to the password in `DATABASE_URL`. Do not commit `.env`.
- **First DB setup:** After Postgres is healthy, run `npm run db:bootstrap` once (migrate + seed admin/client/models). Later schema updates: `npm run db:migrate`. If auth fails against an existing volume, `npm run ensure:database` / `npm run db:align-password` (see `ENTITY.md` §6).
- **Seeded admin login:** username `admin`, password `Admin123!` (login by **login/username**, not email — see `LoginDto`). Client seed: `client@lovnge.local` / `Client123!`.
- **API without bot token:** Expected warn `TELEGRAM_BOT_TOKEN not set — bot disabled`; API still starts.

### Lint / test / build

- Lint: `npm run lint` — `@escort/db` (tsc) and `@escort/web` (`next lint`) work. `@escort/api` lint currently fails: no `eslint.config.*` / `.eslintrc*` in `apps/api` while ESLint 9 is installed (pre-existing).
- Tests: `NODE_ENV=test npm test` (or CI-style `npm test --workspace=@escort/api`). Most API suites pass; `auth.service.spec.ts` fails (missing `ModelsService` mock in the Nest testing module) — pre-existing on `main` / CI.
- Build: `npm run build` (turbo) succeeds for api/web/db/bot.

### Hello-world smoke (admin)

1. Ensure Docker infra is up, `.env` present, DB bootstrapped, `npm run dev:apps` running.
2. Open http://localhost:3001/login → log in as `admin` / `Admin123!`.
3. Sidebar **Модели** → **+ Добавить модель** → set display name + biography → **Сохранить черновик**.
4. Confirm draft appears under **Черновики** on `/dashboard/models/list`.
