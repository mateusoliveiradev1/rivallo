<!-- generated-by: gsd-doc-writer -->

# MVP1 — Temporada Completa

## Outcome

MVP1 allows a player to create a career from the main menu, choose the active database/mod set, create or select a coach, manage any of the 20 Série A 2026 clubs through every principal career route, play all 38 rounds, persist/reopen the save and determine the champion.

## Starting-state invariant

The selected Série A 2026 season is new: 20 participants, round 1 unplayed, all fixtures future, zero games/points/goals/cards/ratings/accumulated statistics and no imported result. The database provides the world; results exist only inside the generated save.

## Required journey

1. Open the real main menu.
2. Choose database and compatible mods.
3. Start New Career and choose the season.
4. Create a constrained coach or select an existing coach.
5. Choose any of the 20 clubs and configure automation, difficulty and preferences.
6. Create a named slot, generate the world and enter the career shell.
7. Use Squad, Tactics, Dynamics, Training, Scouting, Transfers, Staff, Club and Finances.
8. Advance through a real Gregorian calendar, prepare and play matches.
9. Receive domain-driven Home/Inbox/Reports/Data Centre updates.
10. Save, exit safely, reopen and Continue the same career.
11. Complete 38 rounds, reconcile the standings and determine the champion.

## Route scope

Every route listed in `ROUTE-READINESS-MATRIX.md` must provide MVP1 utility. Depth may be smaller than MVP2, but no principal sidebar route may be placeholder, “coming soon”, mock-only, non-persistent or detached from the career loop.

## MVP1 capability boundary

- **Included:** basic transfers/contracts/loans; partial-knowledge scouting; basic staff and medical roles; club overview; auditable budget/ledger; authoritative calendar/competition; complete match lifecycle; injuries/discipline/registration; actionable Home/Inbox; interactive analytics; consolidated reports; safe slot/backup/autosave metadata.
- **Deferred to MVP2:** season rollover, promotion/relegation, secondary competition breadth, advanced clauses/agents, youth/retirement/world renewal, full scouting network, board/infrastructure/deep finances and complete editors/mod migration ecosystem.

## Explainability contract

Every relevant projection provides: change, cause/decision, expected consequence, available reaction, authoritative source and updated time. Unknown, partial, loading, empty, stale and error states are explicit.

## Definition of Done E2E

The release gate must demonstrate, in one traceable scenario: menu → database → career → coach → club → squad → tactic → training → advance days → match → result → standings → Inbox → finances → condition → save → close → reopen → Continue → 38 rounds → champion.

The scenario additionally proves deterministic/replay invariants, safe crash/restart boundaries, keyboard access, target desktop viewports, no relevant console errors, valid links/deep-links and no main-route placeholder.

## Gate authority

Phase 08.6 owns the gate. `MVP-GATE-CHECKLIST.md` is the executable checklist; this document owns product scope.
