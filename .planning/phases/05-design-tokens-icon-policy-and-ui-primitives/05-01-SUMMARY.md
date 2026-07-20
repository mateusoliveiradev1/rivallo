---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: "01"
subsystem: ui-supply-chain
tags: [npm, supply-chain, radix-ui, lucide, colorjs, testing-library, jsdom, playwright]

requires:
  - phase: 04-desktop-shell-local-persistence
    provides: React 19 desktop host, Vite/Vitest tooling, and reproducible workspace baseline
provides:
  - Exact 16-package Phase 5 dependency inventory approved by Mateus
  - Strict digest-backed approval parser with actionable failure behavior
  - Fixture-driven approval and installed-inventory divergence tests
affects: [05-02, design-tokens, icons, ui-primitives, ui-lab, browser-evidence]

tech-stack:
  added: []
  patterns:
    - Human approval before dependency transaction
    - Canonical sorted package rows with SHA-256 inventory digest
    - Exact scope, version, and registry integrity comparison

key-files:
  created:
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-01-PACKAGE-REVIEW.md
    - scripts/verify-phase-5-package-approval.mjs
    - tooling-tests/phase-5-package-approval.test.mjs
  modified: []

key-decisions:
  - "Mateus approved exactly 17 reviewed direct packages under digest sha256:557f4d9a4e4c70efbc32a73e684c88767bb8d350870c8b3e25083c13660ab7f1."
  - "Use seven narrow Radix behavior packages; keep native HTML for radios, tables, scrolling, fields, and other suitable primitives."
  - "Use colorjs.io 0.6.1 for deterministic OKLCH/gamut/contrast work instead of a local color-science implementation or the newly released 0.7.0."
  - "Use jsdom 27.0.1 because later releases would silently raise Rivallo's Node 22.0.0 minimum."

patterns-established:
  - "Dependency gate: no manifest or lockfile transaction may precede exact human approval."
  - "Installed comparison: name, version, owner scope, and integrity must all match the approved canonical row."

requirements-completed: [UI-01]

duration: 1h 4m
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 01: Exact Dependency Approval Gate Summary

**A digest-backed, human-approved 16-package boundary for Rivallo's icons, accessible composite behavior, color math, DOM tests, React types, and real-browser evidence**

## Performance

- **Duration:** 1h 4m
- **Started:** 2026-07-15T14:01:41.361Z
- **Completed:** 2026-07-15T15:06:12.955Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Audited registry metadata and packed tarballs for every exact direct dependency without installing or updating any dependency.
- Recorded package provenance, publication, integrity, license, lifecycle scripts, peers, dependency risk, scope ownership, and explicit exclusions.
- Added a strict parser that requires one exact Mateus approval, valid timezone-bearing ISO-8601 time, canonical digest, and conflict-free decision record.
- Added 27 focused approval tests, including installed name/version/scope/integrity divergence; the full tooling run passes 71 tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Inventory and audit the smallest exact Phase 5 package set** - `b20137b` (`chore`)
2. **Task 2: Mateus approves the exact dependency inventory** - `f8957e9` (`docs`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-01-PACKAGE-REVIEW.md` - Exact inventory, supply-chain evidence, exclusions, digest, and Mateus approval.
- `scripts/verify-phase-5-package-approval.mjs` - Canonical parser, approval validator, and installed-inventory comparator.
- `tooling-tests/phase-5-package-approval.test.mjs` - Fixture-driven acceptance and rejection coverage for the gate.

## Decisions Made

- Approved one generic icon family (`lucide-react`) and seven narrowly scoped Radix behavior packages; appearance remains fully Rivallo-owned.
- Kept radios, toast live regions, semantic tables, scrolling, and suitable form controls native to avoid unnecessary runtime packages.
- Selected `colorjs.io@0.6.1`: no dependencies, no install hook, specification-oriented gamut/contrast capability, and a longer observation window than 0.7.0.
- Selected `jsdom@27.0.1` to preserve the documented Node 22.0.0+ contract while still providing the required DOM behavior.
- Excluded shadcn, themes, table/grid/chart packages, alternate icon families, routers, scanners, branding/mascot packages, and speculative dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Approval-state test remained fixed to PENDING**

- **Found during:** Task 2 (Mateus approval verification)
- **Issue:** The checked-in record test correctly expected `PENDING` before the checkpoint but failed after the permanent approval transition.
- **Fix:** Changed the repository-record assertion to run the strict approval validator and require `APPROVED` by Mateus.
- **Files modified:** `tooling-tests/phase-5-package-approval.test.mjs`
- **Verification:** Strict CLI validation, 27 focused tests, 71 full tooling tests, and lint all pass.
- **Committed in:** `f8957e9`

---

**Total deviations:** 1 auto-fixed bug.

**Impact on plan:** Required checkpoint-state transition only; no dependency or implementation scope was added.

## Issues Encountered

- Two generic executor attempts produced no files or commits and were interrupted. Mateus selected direct inline execution; the plan then completed without losing or duplicating repository work.
- The latest jsdom releases conflicted with the existing Node 22.0.0+ minimum. Selecting 27.0.1 resolved the compatibility risk without changing the toolchain contract.

## User Setup Required

None - no dependency, browser, or external service was installed in this plan.

## Next Phase Readiness

- Plan 05-02 is unblocked to install only the 16 exact approved registry rows in their approved owner scopes.
- The strict parser and digest must pass before the transaction, and the resulting direct delta and lockfile integrities must match exactly.
- No UI implementation has begun yet.

## Self-Check: PASSED

- `node scripts/verify-phase-5-package-approval.mjs --record .../05-01-PACKAGE-REVIEW.md` — PASS
- `pnpm test -- tooling-tests/phase-5-package-approval.test.mjs` — PASS (71 total tests, 27 gate tests)
- `pnpm lint` — PASS
- Dependency manifest and lockfile diff check — PASS, no changes
- Task commits `b20137b` and `f8957e9` exist — PASS

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
