# Sports Management Evolution — Prospective Product Plan

**Created:** 2026-07-15  
**Planning status:** SM-1 and SM-2 complete; SM-3 through SM-6 remain planned. SM-6 is canonically renumbered from Phase 06.5 to Phase 06.8.
**Numbering rule:** SM-1 through SM-6 are preserved product-slice identities; the canonical phase sequence is defined by `ROADMAP.md` through MVP2.

## Purpose and non-regression rule

This document routes the requested evolution of Elenco, Táticas, player/coach entities, ratings, dynamics and training without turning the request into a redesign or a monolithic implementation. It preserves the current Rivallo identity (“Sala de comando sob os refletores”), AppShell, sidebar/topbar hierarchy, routes/entry behavior, design tokens, icon policy, validated matchday loop, keyboard behavior and Rust authority.

The attached screens and the FootSim interactive-pitch roadmap are functional references only. Their visual identity, layouts and components are not Rivallo specifications. The useful FootSim boundary is the separation between a visual pitch/slot interaction and the underlying tactical model: field, slots, starters/reserves, drag/drop and invalid feedback can be staged without pretending to deliver pixel-level control, 3D or advanced visual simulation.

> **Execution fence:** This checkpoint is planning-only. Phase 06.2 and every later phase must not be implemented or scaffolded without fresh explicit authorization. SM-6 retains its original content under Phase 06.8. No phase may be reported complete without its own plan, executable implementation and verification evidence.

## Slice map

| Slice | Outcome                                                                              | Current roadmap relationship                                                  | Current execution |
| ----- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------- |
| SM-1  | Stabilize density/disclosure, tooltips, flags and console quality                    | Additional product-review remediation Plan 06-02 in Phase 6                   | **Complete**      |
| SM-2  | Reusable Table View Engine and versioned preference persistence                      | Inserted Phase 06.1; canonical Phase 5 contract remains authoritative         | **Complete**      |
| SM-3  | Domain-ready free tactical field and unified starters/reserves interaction           | Inserted Phase 06.2; preserves later Phase 8 season/matchday ownership        | **Planning only** |
| SM-4  | Analysis, Strategy, Instructions, Opposition and familiarity over one tactical model | Inserted Phase 06.3; effects remain honest until consumed by simulation       | **Planning only** |
| SM-5  | Contextual player inspector, full player/coach entities and explainable ratings      | Inserted Phase 06.4; later Phase 9 still owns broader cache/offline hardening | **Planning only** |
| SM-6  | Squad dynamics, training calendar, individual development and dynamic potential      | Phase 06.8; renumbered from the former 06.5 without scope/history loss        | **Planning only** |

## Shared architectural invariants

1. React owns presentation, pointer/keyboard interaction and transient UI state.
2. Rust owns competitive rules, deterministic ratings, positional familiarity, tactical validation, progression, training consequences and potential.
3. Temporary client validation must be named as a projection and must have a typed migration contract to Rust; it cannot silently become authority.
4. Persistence crosses an adapter/repository boundary. Product React components must not become long-term `localStorage`, SQLite or network authorities.
5. Stable IDs identify tables, columns, views, players, staff, tactics, instructions, sessions and country codes. Labels, translated copy and array indexes are never identity.
6. The existing `05-TABLE-VIEW-ENGINE-CONTRACT.md` is the only Table View Engine authority. No competing table-state contract may be created.
7. Existing ADRs remain authoritative, especially ADR-0002 through ADR-0006 and ADR-0009. A new ADR is required before selecting rating scales/formulas or materially changing route/state/persistence architecture.
8. Every slice remains executable and has component, browser, domain and migration evidence proportional to its risk.
9. Loading, empty, partial, error, offline, synchronising, invalid and no-selection states are real states, never decorative filler.
10. No new button or tab is shipped unless it performs a real supported action or is explicitly disabled with an honest explanation.

## SM-1 — Interface stabilization

### Outcome

Repair the concrete product-review regressions while preserving the committed Elenco/Táticas structure: density/disclosure behavior, product tooltips, nationality flags with fallback, relevant console errors and regression coverage.

### Dependencies

- baseline `38c2bff` and `06-02-AUDIT.md`;
- current design tokens, icons and Radix primitives from Phase 5;
- existing Elenco/Táticas component and Playwright suites;
- current UI preference behavior, Tauri commands and Rust matchday domain;
- no Table View Engine implementation dependency.

### Domain and UI authority

- React/shared primitives: disclosure open state, density presentation, tooltip provider, focus restoration, accessible country display and asset fallback;
- existing UI preference persistence: retained as a transitional local boundary, not generalized;
- Rust: unchanged matchday authority;
- country catalog: display adapter only; no competitive rule.

### Acceptance criteria

- density opens/applies without viewport displacement or broken table geometry;
- the related disclosure closes by its close control, Escape and outside click, restores focus and leaves no overlay/scroll lock/zombie state after repeated cycles;
- compact, standard and comfortable row geometry update consistently and the current preference survives navigation/reload;
- supplemental product tooltips work by pointer and keyboard with one consistent delay/provider policy;
- nationality shows a local asset for supported current codes, full name and code accessibly, and a deterministic unknown/asset-error fallback;
- no relevant uncaught page error or console error occurs in the exercised paths;
- existing Elenco/Táticas, XI, save/play and local persistence tests remain green;
- TypeScript, lint, formatting, components, browser matchday, Rust quality and desktop build gates pass.

### Risks and containment

| Risk                                                           | Containment                                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Replacing the real table while fixing one disclosure           | Repair `SquadWorkspace` incrementally; migration to the engine is explicitly forbidden. |
| Portal/z-index fix changes global layering                     | Reuse semantic layer tokens and test dialog/popover coexistence.                        |
| Tooltip wrapper changes accessible names                       | Keep visible/ARIA label authority separate from supplemental tooltip copy.              |
| Flag assets create licensing/network fragility                 | Commit small local assets with provenance and provide a text-safe fallback.             |
| Transitional `localStorage` is mistaken for final architecture | Mark it as preserved baseline and defer versioned repository work to SM-2.              |

### Permitted minimal SM-2-compatible foundation

Only seams needed by the bug fix are permitted: a shared tooltip provider, a controlled reusable Popover API, a reusable nationality display/catalog and stable identifiers for the touched preference values. No column ordering, resizing, pinning, presets, view lifecycle, migration repository or new state library is allowed.

## SM-2 — Table View Engine and durable views (Phase 06.1)

### Outcome

Turn table personalization into a cross-product capability without special branches per screen.

### Dependencies

- SM-1 proven stable;
- `05-TABLE-VIEW-ENGINE-CONTRACT.md` as canonical behavior/ownership contract;
- a Phase 6/9 screen contract assigning `tableId`, `schemaVersion`, stable `columnId`s, required columns, capabilities and default views;
- Phase 06.1 `local-fixed` owner scope behind the application persistence port, with an explicit migration contract for Phase 7 identity and Phase 9 SQLite/cache/offline ownership;
- measured row counts and selected client/server data-window mode;
- explicit decision before adding TanStack/Zustand/Zod packages not present in the current baseline.

### Domain and persistence authority

- owning screen: table schema/capabilities and football-specific column semantics;
- controlled engine: normalized view state and commands only;
- application/adapter layer: repository, migrations, quarantine/recovery, local persistence and future sync;
- React: editor state and preview; no direct storage authority.

### Acceptance criteria

- visibility, order, finite width, pinning, density, sorting and supported filters are controlled through stable IDs;
- current `local-fixed` owner/table/schema/view envelopes survive restart and carry an explicit future identity-migration seam without claiming multi-user support;
- sequential migrations handle added/removed columns and quarantine incompatible future payloads;
- system, user-owned and read-only shared view provenance follows the existing contract;
- create/duplicate/rename/delete/default/reset/save/dirty behaviors are complete and keyboard accessible;
- every table exposes only declared capabilities;
- reload, navigation, migration, corruption recovery, offline and stale-result tests pass;
- `Mostrar somente gols` is an ordinary configured view, never a special branch.

### Risks

- premature migration of the working squad table;
- duplicate contract or direct `localStorage` engine;
- unbounded state/query payloads;
- array-index identity and schema drift;
- overengineering before real data scale is measured.

### Execution boundary

Phase 06.1 may implement this capability against the canonical contract and current adapter seams. It must not reopen SM-1 or claim later Phase 9 cache/offline/database hardening unless that work is actually delivered and verified.

## SM-3 — Free tactical field and unified bench interaction (Phase 06.2)

### Outcome

Evolve fixed formation slots into a domain-ready, normalized tactical layout while keeping presets as useful starting points.

### Dependencies

- stable SM-1 interactions;
- approved tactic aggregate/command contract in Rust;
- normalized coordinates, zones, nominal position, role, side, line, bounds and overlap rules;
- persistence/migration strategy for multiple tactical variants;
- evaluated pointer/keyboard drag solution and performance budget;
- the current fixed-club matchday aggregate and a migration/consumption contract for later Phase 8 season/matchday depth.

### Domain authority

- Rust: eleven-player validity, goalkeeper bounds, duplicate prevention, overlap/zone constraints, starter/bench exclusivity, role/position compatibility and persistence commands;
- React: drag preview, valid-target highlighting, snap/revert animation and keyboard/menu alternative;
- no `100/76/42` familiarity formula may remain authoritative in TypeScript.

### Acceptance criteria

- a user can start from a preset, move a player to normalized coordinates and preserve a custom formation without snapping it to the nearest preset;
- field-to-field, reserve-to-field and field-to-reserve move/swap use one command model;
- invalid goalkeeper, duplicate, overlap, count and empty-required-slot states are rejected with concrete feedback;
- pointer drag is fluid without pitch reflow and essential moves have keyboard/menu equivalents;
- cancel/revert is stable; accepted changes persist across restart;
- migration tests preserve existing saved XI/formation data;
- domain, component and browser tests prove no player duplication.

### Risks

- coordinate freedom creates technically impossible shapes;
- HTML5 drag behavior differs across WebView platforms;
- animation masks rejected domain commands;
- existing matchday persistence loses slot ordering;
- field/bench implementations diverge.

### Execution boundary

Phase 06.2 may evolve the fixed interaction only after Phase 06.1 is verified. Migration must preserve the current saved XI and first-playable matchday loop; freedom of placement cannot move validation authority into React.

## SM-4 — Tactical model: Analysis, Strategy, Instructions and Opposition (Phase 06.3)

### Outcome

Give four progressive-disclosure views a single persisted tactical model with explicit precedence and future simulation effects.

### Dependencies

- SM-3 tactic aggregate and normalized formation;
- stable IDs/categories/scopes for team, unit, role and player instructions;
- rule/conflict/precedence contract;
- opponent/scouting availability contract;
- familiarity event/projection contract and match-engine integration plan.

### Domain authority

- Rust: validation, conflicts, precedence, analysis facts, familiarity events and eventual match effects;
- application layer: tactic commands/queries and opponent context;
- React: editors, progressive disclosure, explanations and empty states.

### Acceptance criteria

- Analysis derives position, sector, width/depth, corridor, condition, bench and lineup warnings from named rules;
- Strategy models possession, out-of-possession and transition decisions plus match contexts without conflicting local stores;
- Instructions separate collective/unit/role/individual scopes and expose incompatibilities and precedence;
- Opposition shows honest empty/no-report/no-opponent states and supports typed opponent-scoped instructions when data exists;
- familiarity is multidimensional and explainable; it changes only through approved events;
- saved tactics restore exactly, validate on migration and expose no invented simulation effect.

### Risks

- generic warnings pretending to be analysis;
- local React toggles diverging from domain state;
- instruction explosion and inaccessible forms;
- fake scouting depth;
- UI copy promising simulation effects before the engine consumes them.

### Execution boundary

Phase 06.3 may deliver the persisted model, editors, named analysis rules and familiarity events after Phase 06.2. Panels still must not fabricate scouting depth or promise simulation effects that the engine does not consume.

## SM-5 — Player/coach entities and explainable ratings (Phase 06.4)

### Outcome

Keep the squad table as the workspace, use the right panel as a concise inspector, add complete player/coach pages, and establish contextual explainable ratings.

### Dependencies

- product router/entity-route decision and typed query boundary;
- player and coach aggregates/read models;
- identity, career, contract, availability, statistics and scouting contracts;
- rating-scale/composition ADR before formulas spread;
- historical event/projection storage for rating/potential evolution;
- fixed-club adapter-fed player/coach read models plus approved entity-navigation and rating ADRs; Phase 9 remains the later cache/offline/career-data hardening owner.

### Domain authority

- Rust: rating composition, context, uncertainty/confidence, history and deterministic calculations;
- projections: page/inspector view models;
- React: presentation, comparison selection and contextual disclosure.

### Acceptance criteria

- one click keeps the table visible and opens an actionable inspector with an evident “Abrir perfil” path;
- a stable player route exposes hierarchical tabs/subroutes without duplicating business rules;
- coach is a first-class entity with category ratings rather than one opaque number;
- player/team/coach ratings expose origin, components, context and scouting confidence;
- position/role/system can change contextual player rating without changing identity;
- no random filler number exists; domain unit tests cover every approved formula;
- partial/offline/scouting-unknown states remain truthful.

### Risks

- profile scope overwhelms V0.1;
- inspector duplicates page logic;
- one OVR obscures important dimensions;
- rating formulas become React helpers;
- exact potential leaks information the club should not know.

### Execution boundary

Phase 06.4 may add stable profile navigation, projections and tested Rust ratings after Phase 06.3. It must reuse the existing inspector/table relationship, avoid unapproved dependency transactions and keep unknown/partial data truthful.

## SM-6 — Dynamics, training and dynamic potential (Phase 06.8; formerly 06.5)

### Outcome

Establish squad dynamics and a calendar-based collective/individual training system whose events can influence development, familiarity, condition and future simulation.

### Dependencies

- explicit Phase 06.8 allocation and a calendar-driven deterministic week; the authoritative season/calendar foundation is Phase 06.7;
- calendar/time, match, travel and availability contracts;
- coach/staff capabilities from SM-5;
- workload, fatigue, injury-risk, morale, familiarity and development aggregates;
- event history/projections and deterministic simulation integration;
- potential privacy/uncertainty model separating real value from club estimate.

### Domain authority

- Rust: session validation, workload, eligibility, progression, fatigue/risk, familiarity events, potential trajectory and deterministic consequences;
- application layer: calendar commands, templates/microcycles and individual-plan queries;
- React: schedule editing, drag preview, group/player selection and explanations.

### Acceptance criteria

- “Dinâmica do elenco” represents morale, cohesion, hierarchy, groups, promises/conflicts and recent events; it is not mislabeled training;
- training has its own route and supports weekly sessions, rest/recovery, match preparation, units/groups and individual plans;
- add/remove/replace/move/copy/template operations are persisted commands with validation;
- calendar changes reconcile with matches and availability;
- consequences are explainable domain events, not client formulas;
- potential distinguishes base reality, club estimate, range and confidence;
- historical projections show change without promising false precision;
- unit, integration, migration and long-horizon determinism tests pass.

### Risks

- a visually full calendar with no sporting effect;
- runaway combinatorial session options;
- non-deterministic progression;
- exact hidden potential leaks;
- tight coupling between UI drag operations and simulation mutations;
- large scope displacing the core season loop.

### Execution boundary

Phase 06.8 is the canonical owner for this preserved slice after Phases 06.3, 06.4 and 06.7. The former 06.5 identity is historical only. It does not authorize unrelated later systems or invented sporting formulas; every shipped consequence must be deterministic, domain-owned and tested.

## Cross-slice dependency chain

```text
SM-1 stability
  -> SM-2 durable table views
  -> SM-3 normalized tactic/bench commands
  -> SM-4 tactic semantics + familiarity
  -> SM-5 entity profiles + explainable ratings
  -> SM-6 training/dynamics/development
```

This preserved SM chain describes product-risk order, not current execution authorization. Canonical phase dependencies, including the new database/menu/calendar phases between SM-5 and SM-6, live in `PHASE-DEPENDENCY-GRAPH.md`.

The preserved sequence resolves the earlier ownership mismatch without overriding the canonical roadmap. Phase 06.1 owns the reusable view engine and current durable adapter boundary; Phases 06.2/06.3 own the tactical product/domain model; Phase 06.4 owns profiles/ratings; Phase 06.8 retains SM-6 after the new database, career and calendar foundations in 06.5–06.7. Blocks 07–09 own Match Day, MVP1 Operations and MVP2 Sustainable Career. No phase may claim another owner's responsibility without implementing and verifying it explicitly.

## Relationship to existing Roadmap Phases

| Roadmap phase    | Preserved relationship                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Phase 5          | Owns tokens, primitives and the sole Table View Engine contract. It is not reopened or rewritten.    |
| Phase 6          | Keeps 06-01 and 06-02 as closed first-playable/SM-1 history; inserted phases build on that baseline. |
| Phase 06.5       | Owns world database, editor and modding foundation; it does not replace SM-6.                        |
| Phases 06.6–06.7 | Own main menu/career/coach and authoritative competition/calendar before SM-6 consumes them.         |
| Phase 06.8       | Preserves the former 06.5 SM-6 dynamics/training/dynamic-potential scope.                            |
| Blocks 07–09     | Own Match Day, MVP1 Operations and MVP2 Sustainable Career as defined by the canonical roadmap.      |
| Post-MVP2        | Preserves the former multiplayer sequence without authorization in this horizon.                     |

## Decisions to resolve inside future authorised phase executions

- exact router/entity-route adoption and migration path;
- Table View repository/storage owner and migration envelope implementation;
- tactical coordinate/zone/constraint model;
- cross-WebView drag interaction solution;
- instruction conflict and precedence model;
- rating scale, context and uncertainty ADR;
- coach/player/team aggregate boundaries;
- training time/session/event model;
- real versus perceived potential model;
- integration events consumed by the match/simulation engine.

Each responsible phase must record and verify its decision before dependent implementation spreads. Until then, UI may show only real existing data and honest unavailable/empty states.

## Current handoff

SM-1 and SM-2 are complete with their historical evidence; human product review remains explicitly deferred rather than recorded as visual approval. This document is retained as the prompt base for SM-3 through SM-6. The current checkpoint ends after canonical planning and does not initiate Phase 06.2.
