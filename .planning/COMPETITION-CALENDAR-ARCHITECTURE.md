<!-- generated-by: gsd-doc-writer -->

# Competition and Calendar Architecture

## Boundary

The Competition/Calendar Engine owns seasons, participants, rounds, fixtures, real Gregorian dates/times, venues, regulations, standings, tie-breaks, conflicts, postponements/rescheduling, promotion/relegation and history. It does not simulate football actions.

The Calendar route displays the authoritative complete agenda. Training consumes calendar windows to construct microcycles. Match Engine consumes an immutable fixture snapshot. Neither Training nor Match may create/change fixtures directly.

## Time model

Use local civil date, day of week, local time and named timezone when relevant; store an unambiguous instant for scheduled events. Support weekend/midweek games, varied kickoffs, simultaneous competitions, minimum rest, venue conflicts, travel blocks, locked dates, draws, registration deadlines/windows and transfer windows.

## Core aggregates and projections

- CompetitionDefinition/Season: rules, participants, stages, tie-breakers and lifecycle.
- Fixture: participants, round/stage, home/away, stadium, scheduled instant, status and reschedule lineage.
- CalendarEvent: match, training summary, travel, draw, registration, window, deadline or season boundary.
- Standings projection: played/win/draw/loss/goals/points/tie-break facts with source result IDs.
- Competition statistics/history: team/player accumulations and immutable archived season.

## Commands and events

Commands include generate schedule, publish fixture set, postpone, reschedule, register result, open/close window and close season. Events include FixtureScheduled/Changed/Postponed, WindowOpened/Closed, ResultRegistered, StandingsChanged and SeasonClosed. Commands validate authority/version; consumers process events idempotently.

## Scheduling invariants

- Each required pairing/count occurs exactly once per regulation.
- A club cannot play overlapping fixtures and respects approved minimum rest.
- A stadium cannot host conflicting events unless explicitly permitted.
- Published changes preserve lineage and notify affected consumers.
- Result registration refers to an existing playable fixture and occurs once.
- Série A 2026 seed: 20 clubs, double round robin, 38 matches per club, 380 total, all initially future and zero standings/statistics.

## Consumers

Home/Inbox receive next commitments and changes; Training rebuilds affected microcycles; Match receives fixture; Travel/registration/transfers observe deadlines; Competitions renders standings/rounds/stats/regulation/history; Reports documents changes and season outcomes.

## Persistence and tests

Persist definitions, season state, fixture lineage, calendar events, result references and projection checkpoints. Test deterministic generation, property invariants, Gregorian/leap/daylight rules, timezone conversion, conflicts, postponement/reschedule, simultaneous competitions, tie-breaks, 20-team/38-round/380-fixture totals, idempotent results and migration/rebuild.
