# Requirements: Rivallo

**Defined:** 2026-07-13  
**Rebaselined for MVP1/MVP2 planning:** 2026-07-16
**Core value:** deep, dependable and explainable football management.

## Validated baseline

- [x] **FOUND-01** — reproducible Tauri/React/Rust workspace boundaries and local tooling.
- [x] **FOUND-02** — independent frontend, Rust, integration, contract, visual and desktop-build quality paths.
- [x] **FOUND-03** — domain rules compile independently of React, Tauri, axum and database adapters.
- [x] **GAME-01** — valid XI/tactical approach, deterministic fictional match, events/result and restart persistence.
- [x] **UI-01/UI-02** — design primitives, accessible first-playable surface and regression evidence.
- [x] **SM-01** — product-surface stabilisation.
- [x] **SM-02** — controlled Table View Engine and durable views (Phase 06.1).

Historical completion status above is immutable; this planning update does not reopen those phases.

## MVP1 requirement groups

| ID         | Requirement                                                                                                                                             | Owner              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| M1-CAREER  | Main menu, base/mod selection, coach create/select, any Série A 2026 club, slot creation, save/load/continue and safe return to menu                    | 06.5–06.7          |
| M1-SPORT   | Squad, tactics, dynamics, training, calendar/competition engine, match preparation/simulation/centre/decisions/post-match                               | 06.2–07.5          |
| M1-OPS     | Injuries, discipline, registration, basic transfers/contracts/scouting, club/staff/finances                                                             | 08.1–08.4          |
| M1-INFO    | Event-driven Home, Inbox, Data Centre and consolidated Reports                                                                                          | 08.5               |
| M1-SEASON  | Twenty clubs start at zero; 38 rounds complete; standings/statistics persist; champion is defined                                                       | 06.7, 08.6         |
| M1-ROUTES  | Every principal career route opens, has an authoritative source, useful action, persistence and empty/error handling; no placeholder or mock-only route | 08.6               |
| M1-EXPLAIN | Relevant changes expose cause, consequence, reaction, source and updated time                                                                           | Cross-cutting gate |

The executable Definition of Done is authoritative in `MVP-1-DEFINITION.md` and `MVP-GATE-CHECKLIST.md`.

## MVP2 requirement groups

| ID          | Requirement                                                                                                | Owner      |
| ----------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| M2-ROLLOVER | Close season, record history/awards, create the next season and continue safely                            | 09.1       |
| M2-WORLD    | Promotion/relegation, secondary competitions, youth, retirements, coach movement and world renewal         | 09.2, 09.4 |
| M2-MARKET   | Advanced transfers, agents, bonuses, clauses, instalments, pre-contracts, promises and club squad planning | 09.3       |
| M2-SCOUT    | Complete staff/region/assignment/budget knowledge network with discovery and decay                         | 09.5       |
| M2-CLUB     | Board, infrastructure, facilities, stadium work and deep sustainable finances                              | 09.6       |
| M2-MODS     | Complete shared editor/mod ecosystem, explicit migrations, safe long-save compatibility                    | 09.7       |
| M2-SUSTAIN  | Repeat multiple season rollovers without static world, save corruption or silent content drift             | 09.8       |

## Cross-cutting requirements

- **AUTH-01:** domains are authoritative; projections identify source and update time.
- **EVENT-01:** domain events feed projections, routes, Inbox and Reports; actions return typed commands.
- **DATA-01:** no specific club/player/competition is hardcoded in game code.
- **DATA-02:** factual data and Rivallo evaluations are independently versioned and editable.
- **SAVE-01:** saves record database/mod IDs, versions, hashes, load order, schema, seed, start date and world snapshot.
- **SAVE-02:** database/mod updates never mutate an existing save silently; migration is explicit, backed up, validated and fail-safe.
- **CAL-01:** Gregorian calendar/competition engine owns fixtures and standings; Training consumes it; Match consumes fixtures and never generates the calendar.
- **UX-01:** desktop/dark first, keyboard capable, WCAG 2.2 AA, reduced motion and progressive disclosure.

## Traceability

| Group                                   | Phase range | Status                    |
| --------------------------------------- | ----------: | ------------------------- |
| Foundation / first playable             |         1–6 | Complete                  |
| Durable table views                     |        06.1 | Complete                  |
| Sports-management and career foundation |   06.2–06.8 | Planned; 06.2 not started |
| Match Day                               |   07.1–07.5 | Planned                   |
| MVP1 Operations                         |   08.1–08.6 | Planned                   |
| MVP2 Sustainable Career                 |   09.1–09.8 | Planned                   |

The former SM-6 owner `06.5` is renumbered to `06.8`; the migration is recorded in `ROADMAP.md` and `STATE.md` without erasing history.
