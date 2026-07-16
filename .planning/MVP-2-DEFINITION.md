<!-- generated-by: gsd-doc-writer -->

# MVP2 — Carreira Sustentável

## Outcome

MVP2 extends the complete-season MVP into a safe, evolving multi-season career. The world renews, competitions and club contexts change, history remains queryable, content versions remain pinned/migratable and repeated seasons do not degrade integrity or performance.

## Required journey

1. Complete a season and freeze authoritative history/statistics.
2. Process awards and financial consequences exactly once.
3. Process promotion/relegation and next-season participants.
4. Process expiring contracts, advanced transfers and squad plans.
5. Generate/develop youth and process aging/retirements.
6. Move coaches and evolve club/world state.
7. Generate the next season and conflict-free calendar.
8. Continue with compatible database/mod snapshot and intact save.
9. Repeat for multiple seasons while records, finances, knowledge and population remain coherent.

## Required systems

- season rollover, archives, records and awards;
- promotion/relegation and secondary competitions;
- advanced market, agents, clauses, bonuses, instalments, pre-contracts, promises and loans;
- youth intake/development, retirements, staff/player renewal and coach movement;
- complete scouting network with staff, regions, assignments, budgets, discovery and knowledge decay;
- board, infrastructure, facilities, stadium projects and deep finances;
- shared complete editors and official mod format with validation/migration;
- club changes, safe version upgrades, backups and long-save diagnostics.

## Sustainability invariants

- No season operation is applied twice after retry/restart.
- History is immutable after archival; corrections are explicit migrations.
- Stable IDs never reuse retired identities.
- Population, finances and competition participation remain within calibrated bounds.
- Database/mod updates never mutate an existing career silently.
- A migration creates backup, validates compatibility, reports impact/conflicts and fails safely.
- Performance and save size remain measured across the supported long-save horizon.

## Definition of Done E2E

The gate demonstrates: finish season → archive/history → awards → promotion/relegation → contracts → transfers → youth → retirements → new season → new calendar → Continue → integrity/compatibility check → repeat several seasons.

The evidence includes soak results, deterministic seeds, backup/restore, corrupt/interrupted rollover recovery, schema migration, mod-version conflict handling, world-renewal distributions and cross-route reconciliation.

## Gate authority

Phase 09.8 owns the gate. `MVP-GATE-CHECKLIST.md` owns the executable checklist; `ROADMAP.md` owns phase order.
