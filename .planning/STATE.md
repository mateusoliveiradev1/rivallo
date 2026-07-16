gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP1 and MVP2 canonical planning
current_phase: 06.1
current_phase_name: Table Views and Durable Preferences
current_plan: 8
status: complete
stopped_at: Stable checkpoint; execution stopped before Phase 06.2
last_updated: "2026-07-16T00:00:00-03:00"
last_activity: 2026-07-16
last_activity_desc: Canonical roadmap and future architecture documented through MVP2; no implementation started
progress:
total_phases: 33
completed_phases: 7
total_plans: 45
completed_plans: 42
percent: 21
---

# State

## Current checkpoint

- **Stable implementation baseline:** `b813f0a5523f0d473ca33bac36369dda43b2015e`.
- **Current execution type:** documentation and future architecture only.
- **Implementation pointer:** Phase 06.2 is next, planned and **not started**.
- **Planning horizon:** the complete MVP1 and MVP2 sequence defined by `ROADMAP.md`.

## Historical status — preserved

| Phase                                                            | Status                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 — Gate 0 Foundation                                            | Complete                                                                         |
| 2 — Workspace, Toolchains and Quality Scripts                    | Complete                                                                         |
| 3 — Rust Modular Monolith and API Contract Pipeline              | Complete                                                                         |
| 4 — Desktop Shell, Local Persistence Boundary, Containers and CI | Complete                                                                         |
| 5 — Design Tokens, Icon Policy and UI Primitives                 | Complete — provisional technical foundation                                      |
| 6 — First Playable Matchday / SM-1                               | Complete; human product review remains deferred, not recorded as visual approval |
| 06.1 — Table Views and Durable Preferences                       | Complete — 8/8 plans executed                                                    |
| All canonical phases after 06.1                                  | Planned                                                                          |

This planning checkpoint does not alter any historical completion claim or evidence.

## Canonical decisions introduced by this checkpoint

1. MVP1 means a complete 20-club Série A 2026 season with 38 rounds, champion, save/load and real utility on every principal route.
2. MVP2 means safe sustainable multi-season play with rollover/history, world renewal, advanced domains, complete mods/editors and long-save migrations.
3. The old SM-6 Phase 06.5 is renumbered to 06.8; its content/history remain the basis for Dynamics/Training/Dynamic Potential.
4. Phase 06.5 now owns World Database, Editors and Modding Foundation; 06.6 menu/career/coach; 06.7 calendar/competition.
5. Competition/Calendar Engine is separate from Match Engine. Training consumes Calendar; Match consumes fixtures.
6. Runtime flow is domain → events → projections → routes → actions → commands → domain.
7. Active saves pin database/mod versions/hashes/load order/world snapshot and never change content silently.
8. Private package `dev.brasileirao-serie-a-2026` is isolated/unpublished and starts with every current-season result/statistic zero.
9. Multiplayer phases formerly numbered 11–13 remain preserved as post-MVP2 backlog and are not authorised.

## Phase migration

| Old                                                       | New                                                       | State                               |
| --------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| `06.5-sm-6-squad-dynamics-training-and-dynamic-potential` | `06.8-sm-6-squad-dynamics-training-and-dynamic-potential` | Renumbered; scope/history preserved |

The new directory contains a migration note and preserved prompt-base summary. Historical commits retain the old path.

## Canonical document set

- Roadmap/phase order: `ROADMAP.md`.
- Product/outcomes: root `PRODUCT.md`, `MVP-1-DEFINITION.md`, `MVP-2-DEFINITION.md`.
- Routes/navigation/daily surfaces: `ROUTE-READINESS-MATRIX.md`, `SIDEBAR-AND-MAIN-MENU-CONTRACT.md`, `HOME-COMMAND-CENTER.md`, `INBOX-EVENT-CONTRACT.md`.
- Architecture/lifecycle: `PHASE-DEPENDENCY-GRAPH.md`, `DATABASE-AND-MODDING-FOUNDATION.md`, `PRIVATE-DEV-DATABASE-POLICY.md`, `CAREER-LIFECYCLE.md`, `COACH-CREATOR-CONTRACT.md`, `COMPETITION-CALENDAR-ARCHITECTURE.md`, `MATCH-ENGINE-BOUNDARIES.md`.
- Gates: `MVP-GATE-CHECKLIST.md`.

## Risks and pending decisions

- Real-world private data/assets require rights/provenance controls before any collection.
- Calendar scheduling, match event granularity, rating scale, mod patch serialisation/security and youth/retirement calibration need phase-owned ADRs.
- Long-save performance/save-size budgets require measurement before gate approval.
- The breadth is large; gates must enforce vertical utility and resist decorative placeholder routes.

## Next allowed action

End this documentation checkpoint after one commit. Do not discuss, plan in detail or implement Phase 06.2 unless a later explicit request authorises it.

---

Last updated: 2026-07-16.
