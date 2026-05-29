# EXECUTION PROTOCOL — Barbie Council Daily Cycle

> **Status:** binding · v1.0 · 2026-05-26
> **Authority:** subordinate to `CONSTITUTION.md` and `ENTITY_SYSTEM.md`.
> **Scope:** how the 14 minds cooperate per session; mode integration with `barbie/ENTITY.md §M` (via ES `CLAUDE.md`).

---

## §0 · The 14 Phases (T0–T13)

A non-trivial Council session passes through 14 phases. **Activation Matrix** (`ENTITY_SYSTEM.md §14`) decides which phases run and which can skip with reason.

For **trivial fixes** (row 1 of §14): only T0, T11, T12 run; the rest skip with `Council: T2–T10 skipped — reason: trivial fix per ENTITY_SYSTEM §14 row 1`.

---

## §1 · T0 — Opening Ritual

**Goal:** load context, decide mode, emit first-line status.

1. Read in order:
   - `barbie/ENTITY.md` §1, §2, §9, §11 (stack, multi-tenant rules, TLA, Engineering Entity)
   - `governance/CONSTITUTION.md` §0, §3, §4 (hierarchy, ladder, immutables)
   - `governance/ENTITY_SYSTEM.md` §14 (activation matrix)
   - User-memory `MEMORY.md` (auto-loaded by Claude Code)
   - Tier-1 dossiers if present in `governance/memory/orchestrator_init.md` / `forgemaster_init.md` / `sentinel_init.md`
   - Last `SESSION_LOG.md` (barbie root) if present
2. Detect mode from user's session-opening message:
   - Starts with `SEMIAUTO:` → SEMIAUTO
   - Starts with `AVTONOM:` → AVTONOM
   - Else → **MANUAL** (default)
3. Emit first-line status (mandatory):

   ```
   [mode:MANUAL|SEMIAUTO|AVTONOM] phase:<name> epic:<id> spine:<clear|pending>
   ```

   If this line is missing from the first reply, the operator interrupts with: *"Reset. Re-read CLAUDE.md §M and governance/EXECUTION_PROTOCOL.md §1. Emit first-line status, then resume."*

---

## §2 · T1 — Read-Before-Trust

**Goal:** verify every claim the session is about to make about repo state.

Any statement of the form "file X exists / function Y is defined / test Z passes / migration N is applied" is verified by:

- `Grep` / `Glob` for code claims
- `Bash: git log` for history claims
- `Bash: ls` for directory claims
- `Read` for content claims

Mismatches between memory and live state are fixed before T2:

- Stale memory → update or delete the memory entry (Memory drift D-10).
- Stale plan → revise the session-plan §entering state (Forecast drift D-8).

---

## §3 · T2 — Orchestrator Pass

**Goal:** epic alignment and forward-inheritance.

- Open `apps/web/public/platform-blueprint.html` (or the most recent ratified План→Статус equivalent) and find the cell for this work.
- Open the latest session-plan `NON_PROJECT/session-plans/YYYY-MM-DD-HHMM-AVTONOM-*.md` if AVTONOM.
- Verify prereq dependencies (migrations / ADRs / files) exist via T1.
- Record `Verdict: approve / approve-with-conditions / reject` in artifact §Council Review §ORCHESTRATOR.

---

## §4 · T3 — Historian Trace

**Goal:** decision-graph coherence.

- Open `governance/decision-graph.md`.
- New nodes for new ADRs proposed today; new edges (`Supersedes:` / `Consulted:`) where applicable.
- Audit `Status: Proposed` ADRs older than 7 days → ratify / supersede / reject.
- Prior-rejection check: if this session proposes option X that was rejected in ADR-NNN, cite new evidence.

Output → artifact §Historian Trace.

---

## §5 · T4 — Forgemaster Memo

**Goal:** stack-grounded implementation review.

- Queries-per-request count for any new endpoint (target ≤ 5; cold paths exempt with note).
- Drizzle composite-index usage (`tenant_id, ...`) — name the index; cite EXPLAIN ANALYZE evidence or mark `[TBD bench]`.
- RSC vs Client split for any Next.js change — bundle delta KB gz.
- Event-loop blocking risk — any sync CPU > 50 ms → propose BullMQ offload.
- Zod / class-validator boundary at controller — schema name + rejected-input examples.

Output → artifact §Forgemaster Memo.

---

## §6 · T5 — Sentinel Risk Audit

**Goal:** ≥ 1 named failure mode with detector + recovery; tenant isolation evidence.

- For every new write: cite the tenant guard (decorator/middleware) + the WHERE clause in repository.
- For every new public endpoint: rate limit + body size + audit log on 4xx/5xx.
- For every file upload: MIME sniff + size cap + virus-scan plan.
- For every new dependency: `npm audit` + supply-chain breach history check.
- "No concerns" forbidden → must name ≥ 1 failure mode or escalate to Judge with explicit laziness flag.

Output → artifact §Sentinel Risk Audit.

---

## §7 · T6 — Simplifier Counterproposal

**Goal:** attempt to remove ≥ 1 surface.

- Concrete proposal to delete a Provider / DTO / Decorator / Pipe / Schema / Component / Lib.
- If three Tier-1 entities agreed at first pass, Simplifier **MUST** attempt reduction (Tension Doctrine §2.2).
- Forgemaster may reject reduction with a measured reason; reduction stands if Forgemaster cannot.

Output → artifact §Simplifier Counterproposal.

---

## §8 · T7 — Economist Ledger

**Goal:** cost accounting.

- Δ infra ₽/month for VPS Postgres / MinIO / Redis / bandwidth / Telegram quota.
- Per-tenant scaling curve named (O(1) / O(log N) / O(N)).
- New on-call surface / new alert / new runbook page.
- Cheaper variant considered (yes/no; if yes — why rejected).

Output → artifact §Economist Ledger.

---

## §9 · T8 — Tier-3 (per Activation Matrix)

**Goal:** adversarial pass on triggers.

- **Adversary** auto-on for: auth, RBAC, tenant guard, public input, WP-import URL fetch, file upload, Telegram webhook, Drizzle raw-SQL.
- **Chaos** auto-on for: Drizzle migrations, MinIO uploads, Redis-backed state, BullMQ, Telegram webhooks, `vps:after-pull`.
- **Test Pilot** auto-on for: hot-path endpoint changes, new public endpoints, per-epic sweep.
- On `docs-only` / `internal-refactor` days: all three may skip with explicit reason.

Output → artifact §Adversary Stress / §Chaos Drills / §Test Pilot Profile.

---

## §10 · T9 — Tier-4 (per epic / on trigger)

**Goal:** evolution pass.

- **Migrator** for every Drizzle migration + every WP-import code change + every DTO change + every epic RETRO.
- **Ecosystem** for every tenant-bootstrap change + every WP-import code change + every public API surface change.
- **Productor** for every `/admin/*` change + every CLI script change + every chat surface change.

Output → artifact §Migrator Outlook / §Ecosystem Outlook / §Productor Notes.

---

## §11 · T10 — Conflict Detect

**Goal:** trigger Judge on deadlock.

- Any `reject` verdict from any Tier-1/2/3/4 entity OR contradicting verdicts → Judge invoked.
- Judge applies the 8-step algorithm (`CONSTITUTION.md §7`): restate → ladder → immutables → forbiddens → drift → survivor.
- Otherwise → ratification.

---

## §12 · T11 — Execute

**Goal:** apply ratified plan.

- AVTONOM: execute the ratified session-plan; commit locally; never push.
- SEMIAUTO: emit MANIFEST L3 (files list with `[spine]` / `[non-spine]` flags); single operator OK; then execute non-spine without stops, spine with stop+OK.
- MANUAL: per-file approval cadence.
- Run gates as code changes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test` (or specific spec)
  - `npm run check:tenant-coverage` (when wired) — see Anti-Drift D-3

---

## §13 · T12 — Closing Ritual

**Goal:** verify and write down the outcome.

- Gates green (typecheck + lint + relevant tests).
- Tenant-isolation specs green (per recent practice: `salons-tenant-isolation.spec.ts`, `services-...`, `clients-...`, `staff-...`).
- Append to `SESSION_LOG.md` (barbie root):

  ```markdown
  ## YYYY-MM-DD HH:MM — <mode> · <epic>

  ### Outcome — one line per phase
  - T0 ✓ context loaded
  - T1 ✓ read-before-trust (no drift)
  - T2 ✓ Orchestrator: approve
  - T5 ✓ Sentinel: 2 failure modes named (see §Sentinel Risk Audit)
  - …

  ### AI-Default decisions (AVTONOM only)
  - Chose pgmq-style retry over BullMQ for X because <reason>

  ### Spine touches
  - <file>: <reason>: <authorization mode>

  ### Commits made (local, not pushed)
  - <SHA> <subject>
  - <SHA> <subject>

  ### Recommendations for human review
  - <one line each>

  ### Skipped Council passes
  - Council: SIMPLIFIER skipped — reason: trivial CSS fix
  ```

- Entities write memory deltas to their respective `governance/memory/<entity>_*.md`.

---

## §14 · T13 — Anti-Drift Sweep

**Goal:** detect drift before it compounds.

Per-session sweep (every non-trivial session):

- **D-1 Scope creep** — `git diff --stat HEAD~1 HEAD` vs declared session-plan scope.
- **D-3 Tenant-guard coverage** — grep new controllers for missing tenant guard.
- **D-5 Migration state** — `_journal.json` consistent with applied migrations.
- **D-6 Planning trail** — commit messages reference correct session-plan / ADR / blueprint cell.
- **D-7 Architecture-layer** — no cross-module internal imports added.

Weekly sweep (any Friday session OR epic-close):

- **D-2 ADR drift** — Historian reads new commits against open ADRs.
- **D-9 Decision-graph drift** — Historian compares new ADRs to ratified set.

Epic-RETRO sweep:

- **D-4 Bench drift** — compare p95 / Lighthouse against baseline.
- **D-8 Forecast drift** — last session-plan §entering state vs current state.
- **D-10 Memory drift** — read-before-trust on every memory citation used this epic.

Trips logged to `governance/memory/orchestrator_drift_log.md` (append-only).

---

## §15 · Mode Integration

The mode controls **when** the operator is asked, not **how thorough** the Council is. Tier-1 always runs full pass on non-trivial sessions.

| Aspect | MANUAL | SEMIAUTO: | AVTONOM: |
|---|---|---|---|
| **Activation** | normal message | `SEMIAUTO:` prefix | `AVTONOM:` prefix |
| **Operator answers** | every fork | once per MANIFEST L3 + spine | only post-session |
| **AI-Defaults** | asks | applies + records in commit msg | applies + records in SESSION_LOG |
| **Spine files** | stop + explicit OK | stop + explicit OK | SKIP + SESSION_LOG entry |
| **Council passes** | full T0–T13 with dialogue | full T0–T13, MANIFEST L3 at T11 | full T0–T13 without dialogue |
| **git push** | only on operator command | only on operator command | **never** |
| **When to use** | risky days, spine edits, migrations, ENTITY/CONSTITUTION amendments | well-scoped plan, transparent scope | well-scoped task, operator unavailable |

The mode does not change which Tiers are required — that's the Activation Matrix (`ENTITY_SYSTEM.md §14`).

---

## §16 · Conflict Resolution Examples

### Example 1 — Forgemaster vs Simplifier on caching layer

- Forgemaster: "Add Redis-backed cache for `/cms/pages/published`; reduces DB queries from 8 to 1 per request."
- Simplifier: "Delete it — `/cms/pages/published` is hit < 10 RPS in practice; 8 queries × 5 ms = 40 ms, well within p95 200 ms target."

Judge applies:
1. Restate: both pass ≤ 50 words.
2. Ladder rung: Forgemaster claims Performance (#5), Simplifier claims Maintainability (#3). **Maintainability wins.**
3. Immutables: none touched.
4. Forbiddens: none.
5. Drift: Forgemaster's caching adds D-5 risk (cache vs DB consistency under migration).
6. **Survivor:** Simplifier. Verdict: do not add cache; revisit if measured RPS > 100.

### Example 2 — Sentinel vs Productor on tenant_id in URL

- Productor: "Show `?tenant=salon-x` in URL for clarity to platform-admin."
- Sentinel: "URL-visible tenant_id widens attack surface (param smuggling, log leak, sharing-by-URL); use header + JWT claim only."

Judge applies:
1. Restate: both pass.
2. Ladder rung: Sentinel claims Correctness #1 (tenant integrity). Productor claims DX #6. **Correctness wins.**
3. **Survivor:** Sentinel. Verdict: tenant resolved from JWT only; URL shows tenant *slug* (not id) for human reference, never authoritative.

---

## §17 · Recovery — When the Council Fails

Six known failure modes (`AX governance EXECUTION_PROTOCOL §10` analogue):

| Failure | Symptom | Recovery |
|---|---|---|
| **Quorum failure** | Tier-1 entity silent on non-trivial day | Restart session with explicit T0; if entity still silent, operator escalates per Mode Recovery §18 |
| **Deadlock loop** | Judge invoked twice on same conflict | Escalate to operator with both surviving positions side-by-side |
| **Consensus theater** | All Tier-1 approve without Simplifier reduction attempt (§2.2 violation) | Session marked `drafted`, not `ratified`; redo T6 |
| **Memory amnesia** | Session contradicts prior ratified ADR without `Supersedes:` | Historian opens superseding ADR; pre-amendment work flagged for review |
| **Anti-drift cascade** | D-3/D-5/D-6/D-7 trip simultaneously | Session paused; emergency RETRO; operator decides which drift to fix first |
| **Entity capture** | Single entity (e.g. Sentinel) blocks everything with non-falsifiable claims | Judge applies §A-2 Falsifiability test; non-falsifiable claims dropped |

---

## §18 · Mode Recovery

- **AI did not emit first-line status:** *"Reset. Re-read CLAUDE.md §M and governance/EXECUTION_PROTOCOL.md §1. Emit first-line status, then resume."*
- **AI proposes spine touch without cause:** Refuse. Read `barbie/ENTITY.md` and ES `CLAUDE.md §M` for the spine list. If spine-edit truly needed, authorize one-line with file + reason; commit message records it.
- **AI proposes `git push` / `--force` / `reset --hard` / hook-skip:** Absolutely forbidden (`barbie/ENTITY.md` §6 + Forbidden F-12). Refuse. If AVTONOM proposed this, log incident in SESSION_LOG and discuss as a contract violation.
- **AI committed inconsistent changes:** `git log -1 --stat` to see what landed. If not pushed: `git reset --soft HEAD~1`, fix, re-commit. **Do not use `--amend` on prior-session commits.**

---

## §19 · Session Output Contract

A session is `ratified` only if:

1. First-line status emitted (T0).
2. All A-tests pass (`CONSTITUTION.md §9`).
3. Active Tier verdicts recorded (per §14 matrix).
4. `SESSION_LOG.md` updated with Outcome / Spine touches / Commits / Recommendations / Skipped passes.
5. Gates green: typecheck + lint + tests + tenant-isolation specs (where applicable).
6. `decision-graph.md` updated or explicit "no graph delta today" recorded.

Failing any of the above → session is `drafted`, work is preserved but artifacts marked accordingly. Next session opens with a recovery pass.

---

## §20 · End-of-Protocol

The Council does not write code. The Council creates the system that writes code, and **preserves its coherence** across sessions.

Read `CONSTITUTION.md §0` again before your next decision.

---

**End of Execution Protocol.**
