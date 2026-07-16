# Rivallo — Product Contract

## Product purpose

Rivallo is a desktop-first, dark-first football-management simulator for deep, accessible and explainable careers. It must be easy to start, difficult to master, pleasant to operate for long sessions and capable of sustaining long saves without a static world.

The creative direction is **“command room under the floodlights”**: dense information is composed, important changes are visible, and club colour is contextual data rather than the product identity.

## Product horizons

| Horizon                   | Player outcome                                                                                                                            | Canonical definition            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Current stable checkpoint | One deterministic fictional matchday plus durable table views                                                                             | `.planning/STATE.md`            |
| MVP1 — Complete Season    | Start a career with any of 20 Série A 2026 clubs, manage every principal route, play 38 rounds, persist the save and determine a champion | `.planning/MVP-1-DEFINITION.md` |
| MVP2 — Sustainable Career | Continue safely across multiple seasons with history, renewal, promotion/relegation, advanced world systems, mods and migrations          | `.planning/MVP-2-DEFINITION.md` |

## Experience principles

1. **Nothing important is invisible.** Every relevant change states what changed, why, the causing decision, expected consequence, possible reaction, authoritative source and update time.
2. **Progressive disclosure.** Default views are simple and actionable; advanced detail is available on demand. Casual players receive recommendations and automation, while expert players retain full control.
3. **Authority is visible.** Domain facts, projections, confidence, save state, active database, mod set and timestamps are distinguishable.
4. **Dense without clutter.** Tables, timelines and dashboards earn space through hierarchy, comparison and actionability.
5. **Truthful depth.** No route, metric or control may imply a sporting effect that the authoritative domain does not implement.
6. **Accessible by construction.** Target WCAG 2.2 AA, full keyboard operation, visible focus, reduced motion, zoom, long text, semantic tables/dialogs and future localisation.
7. **Long-save safety.** Stable IDs, versioned schemas, snapshots, backups, explicit migrations and deterministic rules protect careers.

## Product surfaces

- Main menu: Continue, New Career, Load Career, Data Editor, Mods, Settings, optional Credits and Exit.
- Career shell: Home, Inbox, Squad, Tactics, Dynamics, Training, Data Centre, Scouting, Transfers, Club, Staff, Finances, Calendar, Competitions, Reports and Personalise.
- Career identity: managed club crest/name/abbreviation, coach, primary competition, current context, active database, career slot and save state.
- Editors and mods: shared, validated, versioned tooling outside the career route tree; no database swap occurs silently inside an active save.

## Authority and architecture

Competitive and simulation rules belong to deterministic Rust domains. React presents projections, previews and commands; it does not become sporting authority. Persistence crosses repositories/adapters. The future architecture uses the loop `domain → events → projections → routes → actions → commands → domain`, with separate calendar/competition and match engines.

Canonical boundaries are defined in `.planning/COMPETITION-CALENDAR-ARCHITECTURE.md`, `.planning/MATCH-ENGINE-BOUNDARIES.md`, `.planning/DATABASE-AND-MODDING-FOUNDATION.md` and `.planning/PHASE-DEPENDENCY-GRAPH.md`.

## Content policy

The public release uses an official fictional database. The private development package `dev.brasileirao-serie-a-2026` is isolated, never published or bundled by default, and starts a new 2026 season with all fixtures unplayed and every accumulated statistic zero. Factual identity data is separated from versioned, explainable Rivallo sporting evaluations.

## Non-goals through MVP2 planning

- This contract does not authorise implementation of Phase 06.2 or later phases.
- Real-person/club assets are not downloaded or created by planning work.
- Multiplayer remains a post-MVP2 backlog unless separately re-authorised.
- Betting, casino cues, generic SaaS styling and copies of competing games are anti-references.

## Canonical index

The sequence and phase ownership live in `.planning/ROADMAP.md`; route ownership in `.planning/ROUTE-READINESS-MATRIX.md`; lifecycle and navigation in `.planning/CAREER-LIFECYCLE.md` and `.planning/SIDEBAR-AND-MAIN-MENU-CONTRACT.md`; gates in `.planning/MVP-GATE-CHECKLIST.md`.

---

Last updated: 2026-07-16 from stable checkpoint `b813f0a5523f0d473ca33bac36369dda43b2015e`.
