---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "08"
subsystem: api-contracts
tags: [openapi, hey-api, generated-client, drift-verification, vitest]
requires:
  - phase: 03-07
    provides: generated contracts-client package and non-mutating quality pipeline
provides:
  - Public generated Fetch client and configuration exports from @rivallo/contracts-client
  - Inventory-bounded, private dormant bundled-generator core with no active auth/retry/backoff configuration
  - Public-boundary, drift, and scope regressions for the D-10 exception
affects: [phase-3-verification, downstream-contract-consumers]
tech-stack:
  added: []
  patterns: [transparent generated ESM re-exports, exact generated inventory allowance, temporary-tree byte drift checks]
key-files:
  created: []
  modified:
    - packages/contracts-client/src/index.ts
    - tooling-tests/contracts-client-generation.test.mjs
    - tooling-tests/phase-3-scope.test.mjs
    - .planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-VALIDATION.md
key-decisions:
  - "Keep @hey-api/openapi-ts@0.97.3 bundled and expose only selected generated client symbols at the package root."
  - "Treat the generator-owned core as an exact, private inventory allowance rather than removing or publicly exposing it."
patterns-established:
  - "Consumers resolve the declared package export map before importing generated contract-client functionality."
  - "D-10 exception checks combine source boundaries, public behavior, explicit generated inventory, and non-mutating drift snapshots."
requirements-completed: [DATA-02]
duration: 10min
completed: 2026-07-14
status: complete
---

# Phase 03 Plan 08: Generated Fetch Client Boundary Summary

**The contracts package now exposes its generated Fetch client/configuration surface while keeping the approved bundled core private, inert, and byte-verified in isolated drift checks.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-14T12:10:00Z
- **Completed:** 2026-07-14T12:20:32Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

- Re-exported only selected generated Fetch client and configuration symbols through `@rivallo/contracts-client`.
- Added public-import, inactive-configuration, exact dormant-core inventory, and public-type/metadata boundary coverage.
- Extended the Phase 3 scope fence and validated writer-free client drift behavior through `pnpm check`.

## Task Commits

1. **Task 1: Preserve bundled generation and expose only its Fetch-client public surface** - `e664cc3` (test), `a7a07c6` (feat)
2. **Task 2: Prove dormant core is private and behaviorally inactive without mutating drift checks** - `2b0dfa6` (test)

## Files Created/Modified

- `packages/contracts-client/src/index.ts` - Transparent generated Fetch client and selected configuration re-exports.
- `tooling-tests/contracts-client-generation.test.mjs` - Public package import, dormant-core, inactive behavior, and non-mutation proof.
- `tooling-tests/phase-3-scope.test.mjs` - Exact contracts-client generated inventory and public-boundary scope fence.
- `.planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-VALIDATION.md` - Wave 7 validation rows marked passed.

## Decisions Made

- Retained the human-approved `@hey-api/openapi-ts@0.97.3` bundled output and made no runtime dependency, generator-version, or generated-code change.
- Kept generator core as a narrow explicit inventory allowance; no root export references an auth, SSE, retry, backoff, or core path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Formatted the newly extended test files**
- **Found during:** Task 2
- **Issue:** `pnpm check` stopped at Prettier after the test additions.
- **Fix:** Applied the repository Prettier formatter to the two changed tooling tests.
- **Files modified:** `tooling-tests/contracts-client-generation.test.mjs`, `tooling-tests/phase-3-scope.test.mjs`
- **Verification:** `pnpm check` passed afterward.
- **Committed in:** `2b0dfa6`

**2. [Rule 1 - Bug] Removed a malformed state decision entry**
- **Found during:** Plan metadata update
- **Issue:** An incorrectly quoted SDK invocation appended an empty decision entry to `STATE.md`.
- **Fix:** Re-ran the state update with named arguments and removed the malformed entry.
- **Files modified:** `.planning/STATE.md`
- **Verification:** The two intended decisions are present and the empty entry is absent.
- **Committed in:** Plan metadata commit

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Tooling/metadata corrections only; no scope expansion.

## Issues Encountered

- The focused test command delegates to the full Vitest suite; Cargo needed the existing local cargo-bin path in this Windows session. The full quality pass then completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DATA-02's generated client is usable through its dedicated public package and its D-10 exception has executable regression coverage.
- Phase verification can re-run `pnpm check` without regenerating tracked client output.

## Self-Check: PASSED

- Required summary, package-entrypoint, and regression-test files exist.
- Task commits `e664cc3`, `a7a07c6`, and `2b0dfa6` exist in Git history.

---
*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*
*Completed: 2026-07-14*
