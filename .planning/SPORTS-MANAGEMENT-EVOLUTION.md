# Sports Management Evolution — Prospective Product Plan

**Created:** 2026-07-15  
**Planning status:** prospective; only SM-1 / Plan 06-02 is authorized for implementation  
**Numbering rule:** SM-1 through SM-6 are product slices, not replacements for Roadmap Phases 1–13

## Purpose and non-regression rule

This document routes the requested evolution of Elenco, Táticas, player/coach entities, ratings, dynamics and training without turning the request into a redesign or a monolithic implementation. It preserves the current Rivallo identity (“Sala de comando sob os refletores”), AppShell, sidebar/topbar hierarchy, routes/entry behavior, design tokens, icon policy, validated matchday loop, keyboard behavior and Rust authority.

The attached screens and the FootSim interactive-pitch roadmap are functional references only. Their visual identity, layouts and components are not Rivallo specifications. The useful FootSim boundary is the separation between a visual pitch/slot interaction and the underlying tactical model: field, slots, starters/reserves, drag/drop and invalid feedback can be staged without pretending to deliver pixel-level control, 3D or advanced visual simulation.

> **Execution fence:** SM-2, SM-3, SM-4, SM-5 and SM-6 are not authorized in the current execution. They must not be implemented, scaffolded behind decorative controls, or reported as complete. The only permitted work now is SM-1 and the smallest SM-2-compatible seam strictly required to avoid reintroducing the SM-1 defects.

## Slice map

| Slice | Outcome                                                                              | Current roadmap relationship                                                                       | Authorization now  |
| ----- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------ |
| SM-1  | Stabilize density/disclosure, tooltips, flags and console quality                    | Additional product-review remediation Plan 06-02 in Phase 6                                        | **Authorized**     |
| SM-2  | Reusable Table View Engine and versioned preference persistence                      | Existing Phase 5 contract; production owner remains Phase 9 unless roadmap authority moves it      | **Not authorized** |
| SM-3  | Domain-ready free tactical field and unified starters/reserves interaction           | Natural fit with Phase 8 matchday depth after contracts are approved                               | **Not authorized** |
| SM-4  | Analysis, Strategy, Instructions, Opposition and familiarity over one tactical model | Phase 8 expansion plus explicit domain contracts; may require later milestone slices               | **Not authorized** |
| SM-5  | Contextual player inspector, full player/coach entities and explainable ratings      | Squad surface aligns with Phase 9; full profiles/ratings may exceed V0.1 and need roadmap approval | **Not authorized** |
| SM-6  | Squad dynamics, training calendar, individual development and dynamic potential      | Explicitly “Later requirements”; no current Phase 7–13 owns this scope                             | **Not authorized** |

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

## SM-2 — Table View Engine and durable views (future only)

### Outcome

Turn table personalization into a cross-product capability without special branches per screen.

### Dependencies

- SM-1 proven stable;
- `05-TABLE-VIEW-ENGINE-CONTRACT.md` as canonical behavior/ownership contract;
- a Phase 6/9 screen contract assigning `tableId`, `schemaVersion`, stable `columnId`s, required columns, capabilities and default views;
- Phase 9 adapter/repository and DATA-01 persistence work;
- measured row counts and selected client/server data-window mode;
- explicit decision before adding TanStack/Zustand/Zod packages not present in the current baseline.

### Domain and persistence authority

- owning screen: table schema/capabilities and football-specific column semantics;
- controlled engine: normalized view state and commands only;
- application/adapter layer: repository, migrations, quarantine/recovery, local persistence and future sync;
- React: editor state and preview; no direct storage authority.

### Acceptance criteria

- visibility, order, finite width, pinning, density, sorting and supported filters are controlled through stable IDs;
- per-user/per-table/per-schema/per-view envelopes survive restart;
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

### Current-execution fence

SM-2 is documented only. Plan 06-02 must not implement its engine or claim that current density/column persistence meets this acceptance contract.

## SM-3 — Free tactical field and unified bench interaction (future only)

### Outcome

Evolve fixed formation slots into a domain-ready, normalized tactical layout while keeping presets as useful starting points.

### Dependencies

- stable SM-1 interactions;
- approved tactic aggregate/command contract in Rust;
- normalized coordinates, zones, nominal position, role, side, line, bounds and overlap rules;
- persistence/migration strategy for multiple tactical variants;
- evaluated pointer/keyboard drag solution and performance budget;
- current Phase 8 matchday-depth planning.

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

### Current-execution fence

SM-3 is not implemented now. The current preset slots, HTML5 drag/drop and local layout storage are preserved during SM-1.

## SM-4 — Tactical model: Analysis, Strategy, Instructions and Opposition (future only)

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

### Current-execution fence

SM-4 is planning only. Current panels must not be expanded with fabricated data or arbitrary effects.

## SM-5 — Player/coach entities and explainable ratings (future only)

### Outcome

Keep the squad table as the workspace, use the right panel as a concise inspector, add complete player/coach pages, and establish contextual explainable ratings.

### Dependencies

- product router/entity-route decision and typed query boundary;
- player and coach aggregates/read models;
- identity, career, contract, availability, statistics and scouting contracts;
- rating-scale/composition ADR before formulas spread;
- historical event/projection storage for rating/potential evolution;
- Phase 9 squad/cache/offline ownership or an explicitly approved roadmap change.

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

### Current-execution fence

SM-5 is not implemented now. SM-1 may reuse nationality presentation in the existing inspector but cannot add routes, coach pages or formulas.

## SM-6 — Dynamics, training and dynamic potential (future only)

### Outcome

Establish squad dynamics and a calendar-based collective/individual training system whose events can influence development, familiarity, condition and future simulation.

### Dependencies

- explicit later-milestone requirements and roadmap allocation;
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

### Current-execution fence

SM-6 is not part of current Roadmap Phases 7–13. Training, development and dynamic potential remain future requirements and must not be smuggled into Phase 6.

## Cross-slice dependency chain

```text
SM-1 stability
  -> SM-2 durable table views
  -> SM-3 normalized tactic/bench commands
  -> SM-4 tactic semantics + familiarity
  -> SM-5 entity profiles + explainable ratings
  -> SM-6 training/dynamics/development
```

This is a risk/dependency order, not permission to execute automatically. Each arrow requires a fresh discussion/spec/plan, explicit acceptance of the previous slice and an executable non-regression baseline.

The current roadmap placement is provisional and does not yet satisfy this order: Phase 8 is the likely home for SM-3/SM-4, while Phase 9 currently owns the production Table View Engine work in SM-2. Before either future slice starts, planning must explicitly reconcile that mismatch by moving the required SM-2 work earlier or by proving and approving that the tactical track can proceed independently. No phase may silently bypass this decision.

## Relationship to existing Roadmap Phases

| Roadmap phase   | Preserved relationship                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Phase 5         | Owns tokens, primitives and the sole Table View Engine contract. It is not reopened or rewritten.               |
| Phase 6         | Keeps 06-01 as closed first-playable history and receives additional unchecked remediation Plan 06-02 for SM-1. |
| Phase 7         | Career/identity remains unchanged; SM work must not renumber or replace it.                                     |
| Phase 8         | Likely owner for later SM-3/SM-4 matchday depth after explicit planning.                                        |
| Phase 9         | Existing owner for real squad/table engine/cache/offline integration; likely home for SM-2 and part of SM-5.    |
| Phase 10        | Must verify whatever V0.1 subset has actually shipped; prospective items are not release evidence.              |
| Phases 11–13    | Multiplayer sequence remains intact; none is repurposed for training or profiles.                               |
| Later milestone | Required home for unallocated SM-5 depth and SM-6 training/dynamics/development.                                |

## Decisions required before future execution

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

Until those decisions are approved, UI may show only real existing data and honest unavailable/empty states.

## Current handoff

Execute only `.planning/phases/06-first-playable-matchday/06-02-PLAN.md`. After its automated gates pass, Mateus must re-check the real Elenco surface. Only then should SM-2 be discussed/planned against the existing contract; no SM-2 through SM-6 implementation should be inferred from this document.
