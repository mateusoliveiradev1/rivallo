---
phase: 04-desktop-shell-local-persistence
plan: "05"
subsystem: persistence
tags: [rust, ports-and-adapters, sqlite-boundary, local-data]

requires:
  - phase: 04-02
    provides: Outer platform crate with application-only inward dependency direction.
provides:
  - Application-owned local-persistence capability port and stable recovery taxonomy.
  - Inert platform SQLite adapter shape with injected per-user location resolution.
  - Regression fences against storage side effects, database drivers, and UI/domain coupling.
affects: [phase-08-local-persistence, phase-09-local-cache]

tech-stack:
  added: []
  patterns: [application-owned ports, resolver injection, inert outer adapter]

key-files:
  created:
    - crates/application/src/persistence.rs
    - crates/platform/src/persistence/mod.rs
    - crates/platform/src/persistence/sqlite.rs
    - tooling-tests/phase-4-persistence.test.mjs
  modified:
    - crates/application/src/lib.rs
    - crates/platform/src/lib.rs

key-decisions:
  - "Expose only Unavailable and InvalidData from the application persistence boundary; adapter-specific causes stay outside the public contract."
  - "Represent the Phase 4 SQLite boundary as a disconnected adapter with an injected per-user directory resolver and no driver or filesystem side effects."

patterns-established:
  - "Persistence capability probes remain product-record-free and storage-engine-free in application."
  - "Platform validates an injected absolute local-data location without creating or opening anything."

requirements-completed: [FOUND-01]

duration: 10min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 5: Inert Local-Persistence Boundary Summary

**Application-owned recovery semantics now meet a resolver-injected, disconnected SQLite platform adapter without adding a driver, file, schema, migration, product record, or UI dependency.**

## Performance

- **Duration:** 10 min
- **Completed:** 2026-07-14
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added the `LocalPersistencePort` capability seam and stable `Unavailable` versus `InvalidData` application errors.
- Added a platform-only `SqlitePersistenceAdapter` whose construction is inert and whose location comes exclusively from an injected `LocalDataDirectoryResolver`.
- Added Rust and Vitest coverage proving there is no storage driver, fixed checkout path, storage I/O, or SQLite knowledge in domain/application/UI-facing source.

## Task Commits

1. **Task 1: Define the application-owned persistence port and recovery-safe errors** - `f7126a1` (test), `4685f2f` (feat)
2. **Task 2: Add the inert platform SQLite adapter and per-user location seam** - `ad6b201` (test), `63da652` (feat), `a01a11c` (style)

## Decisions Made

- Kept the port to a record-free capability probe so later storage behavior cannot leak into this phase.
- Used resolver injection plus absolute-path validation; a missing location maps to `Unavailable`, a relative/invalid location maps to `InvalidData`, and a valid location remains unavailable because the adapter is intentionally disconnected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Quality] Applied repository Prettier formatting**
- **Found during:** Final aggregate verification.
- **Issue:** The new Vitest source did not initially satisfy the repository formatting gate.
- **Fix:** Formatted only `tooling-tests/phase-4-persistence.test.mjs`.
- **Verification:** The aggregate formatting stage passes.
- **Committed in:** `a01a11c`

## Issues Encountered

- The aggregate remains blocked by two pre-existing Phase 04-03 regressions: the Phase 2 workspace test assumes `packages/*` is the first workspace entry, and live Cargo metadata exceeds Node's default synchronous output buffer. Both are recorded in `deferred-items.md`.
- The architecture rules themselves pass against live resolved metadata when invoked with a 64 MiB buffer. `rivallo-application` resolves only to `rivallo-domain`.

## Verification

- Focused persistence Vitest: 3 passed.
- Rust tests, warnings-denied Clippy, and rustfmt: passed.
- Cargo architecture policy: passed through the same audit function with an enlarged metadata buffer.
- Aggregate `pnpm check`: 33 tests passed and 2 pre-existing tests failed as documented above.

## Known Stubs

- The disconnected adapter intentionally returns `Unavailable` after validating a supplied location. This is the Phase 4 boundary contract; real storage is explicitly deferred to later phases.

## User Setup Required

None.

## Next Phase Readiness

- Later local persistence work can implement the application port inside platform without changing domain or UI-facing boundaries.
- SQLite driver selection, file creation, schema, migrations, and product storage remain intentionally deferred.

## Self-Check: PASSED

- All six implementation/test files exist and task commits `f7126a1`, `4685f2f`, `ad6b201`, `63da652`, and `a01a11c` exist.
- Focused persistence and Rust verification passed; no database dependency was added.

---
*Phase: 04-desktop-shell-local-persistence*
*Completed: 2026-07-14*
