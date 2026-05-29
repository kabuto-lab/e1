# ADR-003 — WP-Import SSRF Allow-List Policy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Decision date** | 2026-05-26 |
| **Proposed by** | ADVERSARY (Council Phase B pre-pass) |
| **Drives** | `governance/CONSTITUTION.md §4 I-2` (multi-tenant safety) + `§5 F-9` (public-input untrusted) |
| **Consulted** | `barbie/ENTITY.md §2.2, §11` · Memory `project_nas_wp_migration_inputs` · ADR-001 (allow-list pattern) |
| **Supersedes** | none |

---

## Context

The WP-import pipeline ingests three source types per memory `project_nas_wp_migration_inputs`:
1. **Live URL crawl** — operator gives a `https://example.com` and importer fetches HTML/sitemap/feed/RSS/uploaded media URLs.
2. **WXR XML** — file contains `<wp:attachment_url>` entries that the importer may fetch to back-populate `nas.media`.
3. **Duplicator archive** — opaque zip with embedded SQL; fewer outbound fetches but still has `siteurl` strings that may be auto-followed.

All three surfaces fetch URLs an attacker partially controls (the attacker can craft a malicious WP export). Without an allow-list, the importer can be tricked into:

- **SSRF to internal infrastructure**: `http://localhost`, `http://127.0.0.1`, `http://169.254.169.254` (AWS / GCP metadata), private CIDR (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`).
- **SSRF to internal services**: NAS-Postgres (`postgres:5432`), MinIO (`minio:9000`), Redis (`redis:6379`).
- **Protocol smuggling**: `file://`, `gopher://`, `dict://`, `ftp://`.
- **DNS rebinding**: hostname resolves to public IP at allow-list check, then to internal IP at fetch.
- **Redirect chain to internal**: outbound request to `http://attacker.com/x` returns 302 to `http://169.254.169.254/...`.

Phase A's `seed-wfy-tenant.ts` does NOT fetch URLs in v1 (sets `logoMediaId=null` for now). But **Phase B.2** (media upload step — adapted from `work4u/packages/migrator/src/upload-media.ts`) will, and **Phase L** (WP-import module in NAS) makes this a runtime path that platform-admins call from the admin UI.

The window between Phase A's clean state and Phase B.2/Phase L landing is the right time to codify the policy — before code is written.

---

## Decision

Centralise outbound HTTP for WP-import behind a single helper at `apps/api/src/wp-import/safe-fetch.ts` that enforces an allow-list:

### Scheme allow-list
- Allowed: `http:`, `https:`.
- Denied with `BlockedScheme` error: everything else (`file:`, `gopher:`, `ftp:`, `dict:`, `data:`, `javascript:`).

### Host resolution + IP allow-list

1. Parse URL. Reject if hostname is empty or numeric IPv6/IPv4 literal (forces DNS path).
2. Resolve hostname via `dns.promises.lookup()` with `family: 0` (both v4/v6) and `all: true` (get all records).
3. For every resolved IP:
   - Reject if in any blocked CIDR:
     - IPv4 reserved: `0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `224.0.0.0/4`, `240.0.0.0/4`.
     - IPv6 reserved: `::/128`, `::1/128`, `fe80::/10`, `fc00::/7`, `ff00::/8`.
   - Reject if matches container-DNS internal names: `postgres`, `minio`, `redis`, `web`, `api` (literal hostname check, since dev/prod docker compose binds these as service names).
4. **Pin the resolved IP**: fetch must go to the resolved IP (with `Host:` header matching the original hostname). This defeats DNS rebinding.

### Redirect policy

- Maximum 3 redirects.
- Every hop re-runs the resolution + allow-list (no resolve-once-then-trust).

### Port allow-list

- Allowed without explicit operator opt-in: `80`, `443`.
- Operator-opt-in (via env `WP_IMPORT_EXTRA_PORTS=8080,8443`): up to 5 extra ports.
- Denied: everything else (especially `5432`, `9000`, `6379`, `22`).

### Response size + content-type cap

- Max body size: 50 MB (configurable per `WP_IMPORT_MAX_BYTES`).
- Allowed `Content-Type`: `text/html`, `application/rss+xml`, `application/xml`, `application/json`, `image/*`, `video/*`, `audio/*`, `application/pdf`, `application/octet-stream` (with sniffed type fallback).
- Denied: anything else, with explicit message.

### Audit log

Every BLOCKED request → `Logger.warn` entry tagged `wp-import-ssrf-block` with: original URL, resolved IPs, block-reason. Phase 1 target: `audit_log_platform`.

---

## Consequences

### Positive

- Single chokepoint for outbound HTTP. All WP-import code MUST import `safeFetch` from one module.
- Defence-in-depth against the most common SSRF classes (private CIDR, link-local metadata, DNS rebind).
- Operator-controlled extension surface via env (no hard-coded extra ports).

### Negative

- **Some legitimate hosts blocked** when behind reverse proxy that resolves to private CIDR (e.g. corp VPN). Mitigation: env `WP_IMPORT_ALLOW_INTERNAL_HOSTS=…` whitelist of literal hostnames that bypass IP allow-list. Requires explicit Sentinel cosign in PR.
- **No HTTP/2 / HTTP/3 specifics** in v1 — `safeFetch` uses Node's `undici`/built-in fetch which negotiates per-request. Adversary's response: enough for v1 because allow-list is at the URL+IP+content-type layer.
- **One new dep** is anticipated (`ipaddr.js` ~5 KB or `is-ip` + `ip-range-check` ~10 KB combined). Forgemaster + Sentinel cosign required per `ENTITY.md §11 Dependency policy`.

### Failure modes (SENTINEL section per A-5)

- **F-S1 · TOCTOU between DNS resolution and TCP connect.** Mitigation: `family: 0` + IP-pinning at connect ensures connect goes to resolved IP, defeating most rebinds.
- **F-S2 · IPv4-mapped IPv6 bypass** (e.g. `::ffff:10.0.0.1`). Mitigation: normalise via `ipaddr.js` to its v4 form before allow-list check.
- **F-S3 · Service-name DNS in compose network** (e.g. `http://postgres:5432/`). Mitigation: hostname literal-check before DNS resolution (rejected even if not yet resolved).
- **F-S4 · Operator misconfigures `WP_IMPORT_EXTRA_PORTS=*`.** Mitigation: validate value at boot — comma-separated integer list, max length 5; reject and fail boot with clear error.

---

## Considered options

### Option A — Picked: centralised `safeFetch` helper

Single import surface. Easy to test, easy to grep for, easy to extend.

### Option B — Per-call validation

Rejected: every WP-import code path independently validates. Inevitable miss when Phase L lands new endpoints.

### Option C — Outbound network policy at OS / firewall layer (iptables egress filter)

Rejected: deploy-time concern, doesn't help local dev, doesn't audit at app layer. Complement, not substitute.

### Option D — Proxy through an internal allow-list proxy (e.g. Squid)

Rejected: extra infra component; over-engineered for current scope. Re-consider if NAS grows beyond single-VPS deploy.

---

## Implementation plan

| Slot | Work | Owner | Estimate |
|---|---|---|---|
| IMPL-A | `apps/api/src/wp-import/safe-fetch.ts` + helper + types | Forgemaster + Adversary | 0.75 d |
| IMPL-B | Spec at `safe-fetch.spec.ts` — every block class covered + happy-path | Adversary | 0.5 d |
| IMPL-C | Integration into Phase B.2 media upload helper (when that lands) | Migrator + Forgemaster | by Phase B.2 epic |
| IMPL-D | Wire into ESLint rule (post-Phase-A ESLint config migration) — ban `node:https` / `fetch` direct imports in `wp-import/` files | Forgemaster | trivial |

**IMPL-A + IMPL-B deferred** — drafting ADR ahead of implementation. Will land in the Phase B.2 (media upload) session.

---

## Forward-inheritance

- **Phase B.2** (media upload) — first consumer of `safeFetch`.
- **Phase L** (WP-import module inside NAS) — primary consumer. Every admin-UI-invokable WP-import code path uses `safeFetch`.
- **Future ADR-NNN** — if a new ingestion source appears (e.g. Shopify import), it should reuse `safeFetch` or `Supersedes:` this ADR with a justification.

---

**End of ADR-003.**
