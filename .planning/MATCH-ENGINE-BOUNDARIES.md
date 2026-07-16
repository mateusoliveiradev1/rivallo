<!-- generated-by: gsd-doc-writer -->

# Match Engine Boundaries

## Responsibility

The headless Match Engine owns deterministic simulation of actions, possession, goals, shots, cards, injuries, substitutions, statistics, ratings, wear and final result. It consumes a published fixture plus immutable pre-match snapshots; it never owns season scheduling, standings, transfer processing, training planning or route projections.

## Input contract

- fixture ID, competition context, instant/venue and regulation snapshot from Calendar/Competition;
- squads, eligibility and registrations from Squad/Availability;
- starting XI/bench/tactics/familiarity from Tactics;
- condition/workload/morale and preparation from Training/Dynamics/Club AI;
- stable ruleset, database evaluation versions and deterministic seed.

Inputs are validated before kickoff and hashed into the match snapshot. Later world changes cannot rewrite a started/completed match.

## Output contract

An append-only ordered event log, state checkpoints, final result, team/player statistics, ratings, wear, cards/injury events and causal explanation metadata. Result registration is a separate idempotent application command to Competition; post-match projections are consumers, not simulation authority.

## In-match command boundary

Substitution and tactical commands carry match ID, expected version, actor, game time and payload. The engine validates timing, eligibility, limits and state; accepted/rejected decisions become events. UI previews never mutate engine state.

## Downstream flow

Match result → Competition standings/statistics; event/result → Home and Inbox; full log → Reports/Data Centre/post-match; wear → Training/condition; cards/injuries → Availability; attendance/prize triggers → Finances. Every consumer is idempotent and traceable to source event IDs.

## Determinism and replay

Same engine/rules/data versions, input hash, decisions and seed must reproduce the same event log/result. Migrations never reinterpret an archived result silently; a new simulation version is explicit.

## Modular internals

Simulation orchestration may coordinate possession/phase transitions, action resolution, set pieces, discipline/injury, substitutions, fatigue and statistics, but those are bounded modules. Calendar, club AI, training, dynamics, scouting, market, contracts, finance, staff, Inbox, analytics and reports remain separate domains/projections.

## Tests and performance gates

Golden replay, invariants (score/event/stat coherence, player uniqueness, substitution/card rules), property/fuzz seeds, snapshot save/load, command ordering, version mismatch, performance budgets, long batch simulation and cross-domain idempotency. UI/Match Center tests verify rendering and accessibility without becoming engine correctness tests.
