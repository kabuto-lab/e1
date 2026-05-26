# Council Memory

Per-entity dossiers, git-tracked. **One file per entity.** Cross-entity writes forbidden (`ENTITY_SYSTEM.md §17`).

## File naming

```
governance/memory/
├── orchestrator_init.md     ← epic graph, dependencies
├── orchestrator_drift_log.md← append-only drift trip log
├── forgemaster_init.md      ← query budgets, bench baselines
├── sentinel_init.md         ← open failure modes, accepted-risk register
├── simplifier_init.md       ← deletion graveyard
├── historian_init.md        ← ADR aging, prior-rejection log (canonical graph in ../decision-graph.md)
├── economist_init.md        ← per-tenant cost models
├── adversary_init.md        ← open threat list
├── chaos_init.md            ← partition drills passed/failed
├── testpilot_init.md        ← load baselines, saturation curves
├── migrator_init.md         ← migration log, WP-import fixture register
├── ecosystem_init.md        ← onboarding step log
├── productor_init.md        ← UX debt register
└── judge_init.md            ← verdict log
```

`_init.md` is the bootstrap. Entities may add `<entity>_<topic>.md` for focused logs.

## NOT the user-level memory

The user-level memory at `C:\Users\a3\.claude\projects\F--Users-a-Documents--DEV-Tran-ES\memory\` is **separate** — that's the Claude Code auto-memory system from `CLAUDE.md` §auto-memory, persists across chats, indexed via `MEMORY.md`.

`governance/memory/` is **Council-scoped, git-tracked**, lives with the codebase. It is the Council's working memory across sessions for *this repository*. It is NOT a substitute for the user-level memory and does NOT replicate facts already saved there.

## Bootstrap

Init files are created on first activation of each entity in a non-trivial session. The Adoption Pass on 2026-05-26 did not create them — they fill as the Council operates.
