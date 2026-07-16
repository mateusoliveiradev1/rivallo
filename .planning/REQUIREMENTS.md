# Requirements: Rivallo

**Defined:** 2026-07-13  
**Core Value:** dependable deep management in local and shared online competition.

## V0.1 requirements

### Foundation

- [x] **FOUND-01**: Repository has Tauri/React/Rust workspace boundaries and repeatable local tooling.
- [x] **FOUND-02**: CI independently verifies frontend, Rust, integration, contracts, visual checks, and desktop build.
- [x] **FOUND-03**: Domain rules compile independently of React, Tauri, axum, and database adapters.

### Desktop experience

- [ ] **DESK-01**: User can use a deterministic development identity.
- [ ] **DESK-02**: User can select a fictional club and later see a dashboard and squad screen.
- [ ] **DESK-03**: User selection and local state restore after restart.
- [ ] **DESK-04**: UI shows explicit offline and synchronisation status and remains usable from cache.

### Gameplay

- [x] **GAME-01**: User can select a valid XI and tactical approach, simulate one deterministic fictional match, inspect events and result, and resume the resulting matchday state after restart.

### Data and API

- [ ] **DATA-01**: SQLite persists local career state, cache/projections, preferences, and command queue through adapters.
- [x] **DATA-02**: API exposes health, readiness, session, clubs, and current context under `/api/v1` with stable errors and trace IDs.
- [ ] **DATA-03**: Fixtures are fictional, adapter-fed, and reusable across backend and tests.

### Design quality

- [x] **UI-01**: UI Lab documents tokens, component states, dense tables, and responsive examples.
- [x] **UI-02**: Initial desktop screens meet WCAG AA, keyboard, reduced-motion, and visual-regression checks.

### Sports-management product review

- [x] **SM-01**: In the real Elenco product surface, density and its adjacent disclosure remain stable across repeated close/Escape/outside-click cycles; supplemental tooltips and accessible local nationality flags work with fallbacks; relevant console errors fail regression tests; and the established AppShell, navigation, table, inspector, tactics, persistence, tokens and domain behavior do not regress.
- [x] **SM-02**: Dense product tables use one controlled Table View Engine with stable table/column/view IDs, declared capabilities, complete saved-view lifecycle, versioned adapter-owned persistence, sequential migrations and safe corruption/future-schema recovery; Elenco proves visibility, order, finite width, pinning, density, sorting and supported filtering across navigation and restart.
- [ ] **SM-03**: Tactics use a Rust-authoritative normalized free-position model and one persisted move/swap command path for field and bench; presets remain starting points, custom shapes survive restart, invalid goalkeeper/count/overlap/duplicate states are rejected clearly, and essential operations work by pointer and keyboard without player duplication.
- [ ] **SM-04**: Analysis, Strategy, Instructions and Opposition edit or derive from one persisted tactical aggregate with named validation, conflict and precedence rules; familiarity is multidimensional, explainable and event-driven, while unavailable scouting and simulation effects remain explicitly truthful rather than invented.
- [ ] **SM-05**: Elenco keeps its table workspace and contextual player inspector while stable player and coach profile navigation exposes real adapter-fed data; contextual player/team/coach ratings are deterministic Rust-domain projections with documented scale, components, context, uncertainty and tests rather than opaque or decorative numbers.
- [ ] **SM-06**: Squad Dynamics and Training are distinct working product areas: dynamics explains morale/cohesion/hierarchy/events, while a persisted week anchored to the current matchday supports validated collective, group and individual training commands; Rust owns implemented workload, development, familiarity and dynamic-potential consequences with deterministic history and perceived-potential uncertainty, without claiming later season/travel/cache/offline breadth.

## V0.2 requirements

- **MULTI-01**: Invited users create/join a private league and select distinct clubs.
- **MULTI-02**: Server authoritatively validates readiness and a fictitious round advance.
- **MULTI-03**: Two clients receive updates, reconnect, and preserve the league state in PostgreSQL/Neon.

## Later requirements

Advanced match simulation breadth, market, injuries, academy, full scouting, public mods, and the full editor remain later work. The bounded sports-management slices SM-2 through SM-6 are detailed planned requirements in inserted Phases 06.1 through 06.5, but they are not authorized for implementation in the current execution. A deliberately small matchday simulation remains the current executable base, and every future sporting effect must be real, deterministic and domain-owned or be labelled honestly as not yet consumed by the simulator.

## Traceability

| Requirement group    | Phase | Status                                  |
| -------------------- | ----: | --------------------------------------- |
| Gate 0 documentation |     1 | Pending approval                        |
| FOUND                |   2–4 | Pending                                 |
| UI                   |   5–6 | Pending                                 |
| SM-01 stabilization  |  6/02 | Complete; human product review deferred |
| SM-02 table views    |  06.1 | Complete                                |
| SM-03 tactical field |  06.2 | Planned                                 |
| SM-04 tactical model |  06.3 | Planned                                 |
| SM-05 profiles       |  06.4 | Planned                                 |
| SM-06 training       |  06.5 | Planned                                 |
| GAME                 |     6 | Complete                                |
| DESK/DATA            |  7–10 | Pending                                 |
| MULTI                | 11–13 | Deferred to V0.2                        |
