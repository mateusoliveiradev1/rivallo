<!-- generated-by: gsd-doc-writer -->

# Career Lifecycle

## State machine

`MainMenu → ConfigureCareer → ValidateContent → CreateSlot → GenerateWorld → ActiveCareer ↔ Saving → SafeExit → Load/Continue → ActiveCareer → SeasonClose → Rollover(MVP2)`.

Failure states retain a resumable/rollback checkpoint and never expose a partially authoritative career as valid.

## New career

Select database/version, mods/versions/load order, validate compatibility, select season and club, create/select coach, configure automations/difficulty/preferences, name slot, choose seed, generate resolved world snapshot and enter the career only after atomic commit.

The save records database/mod IDs, versions and hashes, schema/game versions, seed, start date, initial world snapshot, slot ID and coach/club identity.

## Save model

- Manual save, autosaves and rolling backups have integrity metadata and timestamps.
- Saving exposes idle/dirty/saving/saved/failed states.
- Slot operations: load, duplicate, delete with confirmation, restore backup and integrity diagnostics.
- A crash during write keeps the previous valid generation; recovery never guesses silently.

## Continue and load

Continue opens the most recent valid save, not merely the newest file. Load Career shows slot, autosave/backups, date, club, coach, season, database, mods, versions and integrity. Incompatible saves offer diagnostics/migration, not silent mutation.

## Return to main menu

- Dirty + idle: Save and Exit, Cancel, or Exit Without Saving after explicit consequence.
- Saving: wait/cancel return; never terminate the process silently.
- Save failed: remain in career, expose reason/retry/diagnostics; unsafe exit needs explicit confirmation.
- Clean: return directly while preserving slot/context for Continue.

## Active database immutability

An active save displays database name/version, mods and compatibility. It cannot switch content graph in place. Change requires a new career or explicit migration with backup, validation, impact/conflict report and confirmation.

## Season close and rollover

MVP1 closes after champion/history-ready summary but does not start another season. MVP2 rollover archives history, awards consequences, processes membership/contracts/world renewal, creates the next calendar and atomically advances the career. Each step is idempotent/restartable.

## Tests

Atomic create/save, concurrent/rapid save requests, crash recovery, Continue selection, duplicate/delete/restore, dirty/saving/failed exit matrix, compatibility/migration failure, season-close and multi-season rollover retry.
