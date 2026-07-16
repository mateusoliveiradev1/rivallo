<!-- generated-by: gsd-doc-writer -->

# MVP Gate Checklist

## MVP1 — Phase 08.6

### Career and navigation

- [ ] Main menu opens and Continue selects the last valid save.
- [ ] New Career validates database, mods, season, club, coach, automation, difficulty and preferences.
- [ ] Multiple slots expose autosaves/backups, date, club, coach, season, database, mods, game/schema versions and integrity.
- [ ] AppShell/sidebar show crest, club, competition, coach, active database, slot and save state without clutter.
- [ ] Return to Main Menu handles dirty/saving/safe states with Save and Exit, Cancel and safe Exit Without Saving.
- [ ] Active database cannot change silently inside a save.

### Route readiness

For every row in `ROUTE-READINESS-MATRIX.md`:

- [ ] opens by pointer and keyboard;
- [ ] identifies an authoritative source and update time;
- [ ] exposes at least one useful supported action;
- [ ] persists relevant state across navigation/restart;
- [ ] handles loading, empty, partial/stale and error states;
- [ ] receives/emits typed career events/commands;
- [ ] uses no placeholder, “coming soon”, mock-only data or decorative unsupported control.

### Complete-season E2E

- [ ] Open menu; select database/mods; create career; create coach; select club.
- [ ] Load squad; create tactic; plan training; advance days.
- [ ] Play match; receive result; update standings, Inbox, finances and condition exactly once.
- [ ] Save; close; reopen; Continue with identical authoritative state.
- [ ] Complete all 38 rounds; each club has 38 games; determine champion via rules/tie-breaks.
- [ ] Reconcile match event logs, competition totals, player/team statistics, finance ledger and reports.

### Quality

- [ ] Domain/unit/property/integration/component/browser/E2E/migration tests pass.
- [ ] Deterministic replay and idempotent projection processing pass.
- [ ] WCAG 2.2 AA target, keyboard, focus, reduced motion, zoom/long text and target viewports pass.
- [ ] Save interruption, corrupt backup recovery and no-relevant-console-error checks pass.
- [ ] Private development database remains excluded from public build/package tests.

## MVP2 — Phase 09.8

### Multi-season E2E

- [ ] Finish season and archive immutable history/statistics.
- [ ] Process awards, finance, promotion/relegation and secondary competition membership once.
- [ ] Process contract expiry, advanced transfers, youth, aging, retirements and coach movement.
- [ ] Generate next-season participants/fixtures/calendar without conflicts.
- [ ] Continue career with intact database/mod snapshot and save integrity.
- [ ] Repeat multiple seasons; records, population, economics, scouting knowledge and performance remain healthy.

### Compatibility and recovery

- [ ] Database/mod version hashes/load order are pinned per save.
- [ ] Explicit migration creates backup, validates, reports impact/conflicts and requires confirmation.
- [ ] Interrupted rollover/migration resumes or rolls back without duplication.
- [ ] Incompatible content fails safely and original save remains loadable.
- [ ] Editor/mod import rejects invalid references, unsafe paths and unsupported schema/game versions.

### Sustainability evidence

- [ ] Long-run deterministic/soak tests meet calibrated bounds.
- [ ] World renewal prevents static/empty population.
- [ ] Finance and obligations ledgers reconcile over years.
- [ ] Historical queries and records remain correct after migrations.
- [ ] Save size/load time/projection rebuild are measured against an approved budget.

## Release rule

Any unchecked blocker keeps the corresponding MVP gate closed. Evidence must name command/scenario, seed/database/mod versions, observed result, artifact location and approver where human judgment is required.
