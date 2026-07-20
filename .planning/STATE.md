---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP1 and MVP2 canonical planning
current_phase: 06.4
current_phase_name: Player/Coach Profiles and Explainable Ratings
current_plan: 1
status: complete
stopped_at: Phase 06.4 product completion complete; Phase 06.5 not started
last_updated: '2026-07-17T14:12:00-03:00'
last_activity: 2026-07-17
last_activity_desc: Phase 06.4 global entity profiles and premium navigation completed without starting Phase 06.5
---

# State

## Current checkpoint

- **Input implementation baseline for this post-phase round:** `9e85d1844477e2649e6fd4499ec858d94813d111`.
- **Current execution state:** Phase 06.4 complete after product-completion review and all contracted gates.
- **Current executable product:** deterministic fictional matchday plus global player/coach/club/nation profiles, explainable ratings, partial knowledge, four-type search, cross-navigation and premium entity UI.
- **Implementation pointer:** Phase 06.5 is next and **not started**.
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
| 06.3 — Tactical Model and Familiarity                            | Complete — checkpoint `3c221d35c82cf698e6a2dea2013cfa254a275c28`                        |
| 06.4 — Player/Coach Profiles and Explainable Ratings             | Complete — global entity product round and release gates approved                       |
| 06.5 and later canonical phases                                  | Planned; not started                                                                    |

## Phase 06.4 delivered

1. Stable global IDs and reusable player/coach projections are authoritative in Rust.
2. Ratings distinguish ability, position, role, tactical fit, familiarity and coach role with explicit factors/version.
3. Scouting knowledge controls exact/range/qualitative/unknown without mutating internal truth.
4. Player/coach routes, deep links, global search, comparison and contextual inspectors share the same projection source.
5. Rating/attribute history starts at the real 06.4 bootstrap and persists atomically with recovery.
6. 06.3 tactical position, role, fit and familiarity are consumed without a parallel model.
7. Development/training/coach capability contracts are ready for 06.8 without implementing its behavior.
8. The 06.2/06.3 drag hot path and tactical persistence remain unchanged.
9. Club and nation profiles are projections over loaded canonical entities, with specific Tauri queries and no world database.
10. Four-type search and semantic links connect player, coach, club and nation; back restores tab/context/scroll.
11. Club/Comissão sidebar state is synchronized with profile tabs through `aria-current`/`aria-selected`.
12. Coach portraits and ISO nation flags have local, accessible presentation with honest fallbacks.

## Final validation

- Prettier, ESLint, TypeScript, Rust fmt and Clippy passed.
- Vitest: 411 passed.
- Rust: 106 passed.
- Playwright: 60 passed, 24 conditional skips, zero failures.
- `pnpm quality` and `pnpm desktop:build` passed.
- Browser validation approved all four profiles, four-type search, sidebar/tab state, partial knowledge, contracted resolutions, zoom 200%, keyboard and zero console errors; 06.2/06.3 regressions also passed.
- Release WebView2 validation approved save legado, Clube/Comissão active state, coach portraits and the Brazil flag.
- Desktop artifact: `target/release/rivallo-desktop.exe`, 14,377,472 bytes, SHA-256 `3B71F3F27C323D593DD624C8DDC15B658DBF9D04605BE5DAEA145AD7DCCC9F64`.
- `Cargo.lock` has no diff from the input checkpoint.

## Canonical decisions preserved

1. MVP1 remains a complete 20-club Série A 2026 season with 38 rounds, champion, save/load and real utility on every principal route.
2. MVP2 remains safe sustainable multi-season play with history, renewal, advanced domains, complete mods/editors and migrations.
3. Competition/Calendar Engine remains separate from Match Engine; Training consumes Calendar and Match consumes fixtures.
4. Runtime flow remains domain → events → projections → routes → actions → commands → domain.
5. Active saves pin database/mod versions, hashes, load order and world snapshot and never change content silently.
6. The former SM-6 Phase 06.5 remains renumbered to 06.8 with scope/history preserved.

## Risks and pending decisions

- Phase 06.4 resolved rating scale/composition in ADR-0013; future phases must preserve the distinctions.
- Real-world private data/assets still require rights/provenance controls before collection.
- Calendar scheduling, match event granularity, mod patch serialisation/security and youth/retirement calibration remain phase-owned decisions.
- Long-save performance/save-size budgets require measurement before their gates.

## Next allowed action

End this checkpoint after one commit. Do not discuss in detail, plan or implement Phase 06.5 unless a later explicit request authorises it.

---

Last updated: 2026-07-17.
