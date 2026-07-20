---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP1 and MVP2 canonical planning
current_phase: 06.3
current_phase_name: Tactical Model and Familiarity
current_plan: 1
status: complete
stopped_at: Phase 06.3 complete; Phase 06.4 not started
last_updated: '2026-07-17T10:15:33-03:00'
last_activity: 2026-07-17
last_activity_desc: Phase 06.3 manually approved and formally closed without starting Phase 06.4
---

# State

## Current checkpoint

- **Input implementation baseline:** `e8412d29a770bf0e400e2f72ec16e47f7e95f31f`, stable final checkpoint of Phase 06.2.
- **Current execution state:** Phase 06.3 complete after one plan, one consolidated review, final product refinement, all gates and approved manual validation.
- **Current executable product:** deterministic fictional matchday, durable table views, free normalized tactical field, independent variations and a versioned/explainable tactical model with multidimensional familiarity and `TacticalMatchSnapshot`.
- **Implementation pointer:** Phase 06.4 is next and **not started**.
- **Planning horizon:** complete MVP1 and MVP2 sequence remains defined by `ROADMAP.md`.

## Historical status — preserved

| Phase                                                            | Status                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 — Gate 0 Foundation                                            | Complete                                                                                |
| 2 — Workspace, Toolchains and Quality Scripts                    | Complete                                                                                |
| 3 — Rust Modular Monolith and API Contract Pipeline              | Complete                                                                                |
| 4 — Desktop Shell, Local Persistence Boundary, Containers and CI | Complete                                                                                |
| 5 — Design Tokens, Icon Policy and UI Primitives                 | Complete — provisional technical foundation                                             |
| 6 — First Playable Matchday / SM-1                               | Complete; human product review remains deferred, not recorded as global visual approval |
| 06.1 — Table Views and Durable Preferences                       | Complete — 8/8 plans executed                                                           |
| 06.2 — Free Tactical Field and Unified Bench Interaction         | Complete — checkpoint `e8412d29a770bf0e400e2f72ec16e47f7e95f31f`                        |
| 06.3 — Tactical Model and Familiarity                            | Complete — automated gates and final manual validation approved                         |
| 06.4 and later canonical phases                                  | Planned; not started                                                                    |

## Phase 06.3 delivered

1. The Phase 06.2 aggregate remains the single authority for variations, XI, bench, placements, source preset, revisions and persistence.
2. `TacticalPlanSnapshot` schema 4 embeds a Rust-resolved `TacticalModelSnapshot` per variation.
3. Base, in-possession, out-of-possession, offensive-transition and defensive-transition structures use normalized coordinates.
4. Spatial interpretation, resolved strategy, instruction precedence/conflicts, partial opposition, familiarity, diagnostics, recommendations and comparison are deterministic and explainable.
5. `TacticalMatchSnapshot` schema 1 is validated, serializable, persisted and free of React/pixel state.
6. Analysis, Strategy, Instructions and Opposition consume the same versioned plan and projection.
7. The pointer hot path preserves the Phase 06.2 budget: no semantic calculation, React update or persistence during `pointermove`.
8. The final product refinement keeps tabs/actions accessible, uses one scroll body, contains every projected card, previews spatial changes without autosave and exposes instructions only in sporting Portuguese.

## Final validation

- Prettier, ESLint, TypeScript, Rust fmt and Clippy passed.
- Focused component validation: 51 passed.
- Rust: 94 passed.
- Playwright: 58 passed, 20 conditional skips, zero failures.
- `pnpm quality` and `pnpm desktop:build` passed.
- Manual validation approved all four tabs, five field readings, contracted resolutions, zoom 200%, real drag and zero console errors in the desktop executable.
- Desktop artifact: `target/release/rivallo-desktop.exe`, 13,795,328 bytes, SHA-256 `DEED9B9E06F84A50BFBE61D8F6263934153AB93AC9E8F4EE7EDDD2BBD3150B43`.
- `Cargo.lock` has no diff from the input checkpoint.

## Canonical decisions preserved

1. MVP1 remains a complete 20-club Série A 2026 season with 38 rounds, champion, save/load and real utility on every principal route.
2. MVP2 remains safe sustainable multi-season play with history, renewal, advanced domains, complete mods/editors and migrations.
3. Competition/Calendar Engine remains separate from Match Engine; Training consumes Calendar and Match consumes fixtures.
4. Runtime flow remains domain → events → projections → routes → actions → commands → domain.
5. Active saves pin database/mod versions, hashes, load order and world snapshot and never change content silently.
6. The former SM-6 Phase 06.5 remains renumbered to 06.8 with scope/history preserved.

## Risks and pending decisions

- Phase 06.4 owns the ADR for rating scale/composition and must keep rating, adequacy, condition, form and familiarity distinct.
- Real-world private data/assets still require rights/provenance controls before collection.
- Calendar scheduling, match event granularity, mod patch serialisation/security and youth/retirement calibration remain phase-owned decisions.
- Long-save performance/save-size budgets require measurement before their gates.

## Next allowed action

End this checkpoint after one commit. Do not discuss in detail, plan or implement Phase 06.4 unless a later explicit request authorises it.

---

Last updated: 2026-07-17.
