---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "03"
subsystem: dependency-security
tags: [npm, openapi, generator, human-approval]

requires:
  - phase: 03-01
    provides: Phase 3 crate and contract-pipeline foundation planning context
provides:
  - Human package-legitimacy approval for the exact @hey-api/openapi-ts@0.97.3 pin
affects: [03-06, contracts-client, package-installation]

tech-stack:
  added: []
  patterns: [Blocking human package-legitimacy approval is recorded before installation]

key-files:
  created: [.planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-03-SUMMARY.md]
  modified: []

key-decisions:
  - "Mateus approved @hey-api/openapi-ts@0.97.3 on 2026-07-14 after reviewing its official documentation/repository, high package usage, and absence of postinstall behavior; the SUS warning concerned recency only."

patterns-established:
  - "Plan 03-06 must read this approval record before installing or invoking the pinned generator."

requirements-completed: [DATA-02]
duration: 0min
completed: 2026-07-14
status: complete
---

# Phase 3 Plan 03: Pinned Generator Approval Summary

**Human approval permits only the exact `@hey-api/openapi-ts@0.97.3` generator pin to be installed by the downstream client-generation plan.**

## Performance

- **Duration:** 0min
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments

- Recorded the required human package-legitimacy decision before any generator installation or invocation.
- Preserved the checkpoint boundary: no source, manifest, lockfile, or dependency changes were made.

## Human Decision

**Approved by:** Mateus  
**Date:** 2026-07-14  
**Exact dependency:** `@hey-api/openapi-ts@0.97.3`

Mateus approved installation of this exact pin. The approval basis is the official documentation and repository, high package usage, and no postinstall behavior. The legitimacy warning was solely due to recency; it was not a finding of malicious behavior, misleading ownership, or install-time execution.

## Verification Evidence

- `03-RESEARCH.md` Package Legitimacy Audit selected `@hey-api/openapi-ts` at exact version `0.97.3` and flagged only the latest-publication recency as SUS.
- `03-CONTEXT.md` D-11 requires a mature deterministic generator, and D-12 requires explicit generation and verification-only root commands.
- `03-VALIDATION.md` row `03-03-01` requires this exact approval record as the manual verification evidence.

## Task Commits

1. **Task 1: Approve or reject the pinned generator** - recorded in the accompanying `docs(03-03)` commit.

## Files Created/Modified

- `.planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-03-SUMMARY.md` - Canonical approval record for Plan 03-06.

## Decisions Made

- Approved `@hey-api/openapi-ts@0.97.3` exactly; no substitute package or version is approved by this checkpoint.
- Plan 03-06 may install or invoke the generator only after reading this record.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03-06 has the required human approval to install the exact pinned generator. This checkpoint did not install it or modify any source/dependency manifest.

## Self-Check: PASSED

- Approval record names the exact package and version.
- No source or dependency-manifest changes were made by this checkpoint.

---
*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*  
*Completed: 2026-07-14*
