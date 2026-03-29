/**
 * Собирает project-arch-map-data.json для project-architecture-map.html:
 * узлы архитектуры + содержимое ключевых файлов (обрезка по MAX_BYTES).
 * Запуск из корня репозитория: node scripts/generate-project-arch-map.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "apps", "web", "public", "project-arch-map-data.json");
const MAX_BYTES = 14_000;

/** Узлы: иерархия parentId → рёбра на клиенте; x/y задаются в layout() ниже */
const NODE_DEFS = [
  {
    id: "root",
    parentId: null,
    label: "escort-platform",
    subtitle: "monorepo",
    summary:
      "Корень Turborepo: workspaces apps/* и packages/*. Сборка turbo, общий TypeScript. Точка входа для разработки — Docker, затем API :3000 и Web :3001.",
    files: ["package.json", "turbo.json"],
  },
  {
    id: "infra",
    parentId: "root",
    label: "infra",
    subtitle: "docker",
    summary:
      "Локальная инфраструктура: PostgreSQL, Redis, MinIO (S3), Mailhog. Compose-файл описывает сервисы и порты для dev.",
    files: ["docker-compose.dev.yml"],
  },
  {
    id: "db_pkg",
    parentId: "root",
    label: "packages/db",
    subtitle: "drizzle",
    summary:
      "Общая схема БД (Drizzle ORM): пользователи, профили моделей и клиентов, медиа, брони, эскроу, отзывы, blacklist, аудит. Импортируется API при старте.",
    files: ["packages/db/src/schema/index.ts", "packages/db/src/schema/model-profiles.ts", "packages/db/src/schema/media.ts"],
  },
  {
    id: "api",
    parentId: "root",
    label: "apps/api",
    subtitle: "nestjs",
    summary:
      "REST API на NestJS 10: JWT, RBAC, Swagger /api/docs, Helmet, CORS, rate limit. Модули подключаются в AppModule.",
    files: ["apps/api/src/app.module.ts"],
  },
  {
    id: "api_bootstrap",
    parentId: "api",
    label: "main.ts",
    subtitle: "bootstrap",
    summary:
      "Точка входа Nest: валидация env, глобальный exception filter, Helmet, CORS, ValidationPipe, Swagger, порт из конфига.",
    files: ["apps/api/src/main.ts", "apps/api/src/config/validation.schema.ts"],
  },
  {
    id: "api_auth",
    parentId: "api",
    label: "auth",
    subtitle: "jwt · rbac",
    summary:
      "Регистрация/логин, refresh, JwtAuthGuard, RolesGuard, иерархия admin > manager > model > client. Токены в Authorization header.",
    files: ["apps/api/src/auth/auth.controller.ts", "apps/api/src/auth/auth.service.ts", "apps/api/src/auth/guards/roles.guard.ts", "apps/api/src/auth/guards/jwt-auth.guard.ts"],
  },
  {
    id: "api_models",
    parentId: "api",
    label: "models",
    subtitle: "crud",
    summary:
      "Публичные и защищённые операции с карточками моделей (CRUD, slug). Часть маршрутов может быть открыта для каталога — проверьте guard на каждом методе.",
    files: ["apps/api/src/models/models.controller.ts", "apps/api/src/models/models.service.ts"],
  },
  {
    id: "api_profiles",
    parentId: "api",
    label: "profiles",
    subtitle: "cms · minio",
    summary:
      "Расширенное управление профилями и медиа для CMS: связь с MinIO, presigned URL, операции staff. Пересекается по домену с models — держите контракт единообразным.",
    files: ["apps/api/src/profiles/profiles.controller.ts", "apps/api/src/profiles/profiles.service.ts", "apps/api/src/profiles/minio.service.ts"],
  },
  {
    id: "api_media",
    parentId: "api",
    label: "media",
    subtitle: "upload",
    summary:
      "Загрузка файлов, presigned URLs, обновление видимости и альбомов в БД. Данные пишутся в media_files и отдаются фронту.",
    files: ["apps/api/src/media/media.controller.ts", "apps/api/src/media/media.service.ts"],
  },
  {
    id: "api_bookings",
    parentId: "api",
    label: "bookings",
    subtitle: "state",
    summary:
      "Бронирования: сущности и переходы статусов. UI дашборда должен вызывать эти эндпоинты вместо моков.",
    files: ["apps/api/src/bookings/bookings.controller.ts", "apps/api/src/bookings/bookings.service.ts"],
  },
  {
    id: "api_clients",
    parentId: "api",
    label: "clients",
    subtitle: "crm",
    summary:
      "Профили клиентов для staff (CRM). Связь с пользователями и VIP-полями в схеме.",
    files: ["apps/api/src/clients/clients.controller.ts", "apps/api/src/clients/clients.service.ts"],
  },
  {
    id: "api_reviews",
    parentId: "api",
    label: "reviews",
    subtitle: "ratings",
    summary:
      "Отзывы и рейтинги по моделям/встречам. Публичное чтение и модерация — по политике эндпоинтов.",
    files: ["apps/api/src/reviews/reviews.controller.ts", "apps/api/src/reviews/reviews.service.ts"],
  },
  {
    id: "api_escrow",
    parentId: "api",
    label: "escrow",
    subtitle: "payments",
    summary:
      "Эскроу-транзакции: учёт холда и статусов; внешний платёжный провайдер подключается на этом слое.",
    files: ["apps/api/src/escrow/escrow.controller.ts", "apps/api/src/escrow/escrow.service.ts"],
  },
  {
    id: "api_blacklist",
    parentId: "api",
    label: "blacklist",
    subtitle: "access",
    summary:
      "Чёрные списки для ограничения доступа. Операции обычно только staff.",
    files: ["apps/api/src/blacklist/blacklist.controller.ts", "apps/api/src/blacklist/blacklist.service.ts"],
  },
  {
    id: "api_security",
    parentId: "api",
    label: "security",
    subtitle: "helmet · rate",
    summary:
      "Helmet (заголовки), лимиты запросов, CORS-настройки как часть hardening в main и модулях.",
    files: ["apps/api/src/security/helmet.config.ts", "apps/api/src/security/rate-limit.config.ts"],
  },
  {
    id: "web",
    parentId: "root",
    label: "apps/web",
    subtitle: "next.js 15",
    summary:
      "App Router, React 19, Tailwind. Публичные страницы и дашборд. В dev API проксируется через /api → бэкенд.",
    files: ["apps/web/next.config.js", "apps/web/app/layout.tsx"],
  },
  {
    id: "web_lib",
    parentId: "web",
    label: "lib",
    subtitle: "fetch",
    summary:
      "apiUrl(), ApiClient с Bearer из localStorage, методы для моделей и медиа. Все запросы к бэкенду проходят через этот слой.",
    files: ["apps/web/lib/api-url.ts", "apps/web/lib/api-client.ts"],
  },
  {
    id: "web_dash",
    parentId: "web",
    label: "dashboard",
    subtitle: "cms shell",
    summary:
      "Общий layout дашборда: навигация, отладчик. Страницы models/*, media, moderation, bookings.",
    files: ["apps/web/app/dashboard/layout.tsx"],
  },
  {
    id: "web_public",
    parentId: "web",
    label: "public models",
    subtitle: "catalog",
    summary:
      "Каталог /models и профиль /models/[slug]: данные с API, фильтрация видимых фото для гостей.",
    files: ["apps/web/app/models/page.tsx", "apps/web/app/models/[slug]/page.tsx"],
  },
  {
    id: "docs",
    parentId: "root",
    label: "docs",
    subtitle: "markdown",
    summary:
      "Аудиты, дизайн-система DESIGN.md, роадмэпы и blueprint HTML в public. Не исполняются в рантайме приложения.",
    files: ["CLAUDE.md", "DESIGN.md", "docs/ARCHITECTURE_CODEBASE.md"],
  },
];

function readFileSafe(rel) {
  const abs = path.join(ROOT, rel.split("/").join(path.sep));
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  if (buf.length > MAX_BYTES) {
    return {
      content: buf.slice(0, MAX_BYTES).toString("utf8") + "\n\n/* … обрезано generate-project-arch-map.mjs … */",
      truncated: true,
    };
  }
  return { content: buf.toString("utf8"), truncated: false };
}

function layoutNodes(defs) {
  const childrenOf = new Map();
  for (const d of defs) {
    const p = d.parentId;
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p).push(d);
  }

  const pos = {};
  const ROOT_Y = 48;
  const LEVEL_DY = 118;
  const SIB_DX = 168;
  const CENTER_X = 520;

  const roots = childrenOf.get(null) || [];
  const rootW = roots.length * SIB_DX;
  let rx = CENTER_X - rootW / 2 + SIB_DX / 2;
  roots.forEach((r) => {
    pos[r.id] = { x: rx, y: ROOT_Y };
    rx += SIB_DX;
  });

  function layoutSubtree(parentId, px, py) {
    const ch = childrenOf.get(parentId) || [];
    if (!ch.length) return;
    const w = ch.length * SIB_DX;
    let x = px - w / 2 + SIB_DX / 2;
    const y = py + LEVEL_DY;
    ch.forEach((c) => {
      pos[c.id] = { x, y };
      layoutSubtree(c.id, x, y);
      x += SIB_DX;
    });
  }

  roots.forEach((r) => layoutSubtree(r.id, pos[r.id].x, pos[r.id].y));

  return defs.map((d) => ({
    ...d,
    x: pos[d.id]?.x ?? 80,
    y: pos[d.id]?.y ?? 80,
  }));
}

const nodes = layoutNodes(NODE_DEFS);
const fileSet = new Set();
for (const n of NODE_DEFS) {
  for (const f of n.files || []) fileSet.add(f);
}

const files = {};
for (const rel of fileSet) {
  const data = readFileSafe(rel);
  if (data) {
    files[rel] = { ...data, lang: guessLang(rel) };
  }
}

function guessLang(rel) {
  if (rel.endsWith(".tsx")) return "tsx";
  if (rel.endsWith(".ts")) return "typescript";
  if (rel.endsWith(".js")) return "javascript";
  if (rel.endsWith(".yml") || rel.endsWith(".yaml")) return "yaml";
  if (rel.endsWith(".json")) return "json";
  if (rel.endsWith(".md")) return "markdown";
  return "text";
}

const payload = {
  generatedAt: new Date().toISOString(),
  nodes,
  files,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 0), "utf8");
console.log("Wrote", OUT, "nodes:", nodes.length, "files:", Object.keys(files).length);
