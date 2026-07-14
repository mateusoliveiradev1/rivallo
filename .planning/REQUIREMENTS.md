# Requirements: Rivallo

**Defined:** 2026-07-13  
**Core Value:** dependable deep management in local and shared online competition.

## V0.1 requirements

### Foundation
- [ ] **FOUND-01**: Repository has Tauri/React/Rust workspace boundaries and repeatable local tooling.
- [ ] **FOUND-02**: CI independently verifies frontend, Rust, integration, contracts, visual checks, and desktop build.
- [ ] **FOUND-03**: Domain rules compile independently of React, Tauri, axum, and database adapters.

### Desktop experience
- [ ] **DESK-01**: User can use a deterministic development identity.
- [ ] **DESK-02**: User can select a fictional club and later see a dashboard and squad screen.
- [ ] **DESK-03**: User selection and local state restore after restart.
- [ ] **DESK-04**: UI shows explicit offline and synchronisation status and remains usable from cache.

### Data and API
- [ ] **DATA-01**: SQLite persists local career state, cache/projections, preferences, and command queue through adapters.
- [ ] **DATA-02**: API exposes health, readiness, session, clubs, and current context under `/api/v1` with stable errors and trace IDs.
- [ ] **DATA-03**: Fixtures are fictional, adapter-fed, and reusable across backend and tests.

### Design quality
- [ ] **UI-01**: UI Lab documents tokens, component states, dense tables, and responsive examples.
- [ ] **UI-02**: Initial desktop screens meet WCAG AA, keyboard, reduced-motion, and visual-regression checks.

## V0.2 requirements

- **MULTI-01**: Invited users create/join a private league and select distinct clubs.
- **MULTI-02**: Server authoritatively validates readiness and a fictitious round advance.
- **MULTI-03**: Two clients receive updates, reconnect, and preserve the league state in PostgreSQL/Neon.

## Later requirements

Simulation, advanced tactics, market, training, development, injuries, academy, scouting, public mods, and the full editor are planned after the private alpha foundation.

## Traceability

| Requirement group | Phase | Status |
|---|---:|---|
| Gate 0 documentation | 1 | Pending approval |
| FOUND | 2–4 | Pending |
| UI | 5–6 | Pending |
| DESK/DATA | 7–10 | Pending |
| MULTI | 11–13 | Deferred to V0.2 |
