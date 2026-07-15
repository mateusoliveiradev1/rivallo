---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: '12'
subsystem: ui
tags: [react, css, dense-table, playwright, accessibility]

requires:
  - phase: 05-07
    provides: Semantic DenseTable, finite column definitions, density modes, and labelled native ScrollArea
  - phase: 05-10
    provides: Human rejection evidence identifying the pathological width and unreachable-content gap
provides:
  - Bounded DenseTable and ScrollArea sizing without nested max-content amplification
  - Three-viewport Chromium regression for finite geometry and reachable inline edges
  - Executed Nyquist evidence for validation rows 05-12-01 and 05-12-02
affects: [05-13, 05-15, 05-16, phase-6-screen-contracts, phase-9-table-integration]

tech-stack:
  added: []
  patterns:
    - Native overflow ownership stays on the labelled ScrollArea while finite colgroup widths own table overflow
    - Browser geometry bounds derive from active column widths and the selected logical viewport frame

key-files:
  created:
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-12-SUMMARY.md
  modified:
    - apps/desktop/src/ui/DenseTable/DenseTable.css
    - apps/desktop/src/ui/primitives/primitives.css
    - browser-tests/ui-lab.spec.ts
    - tooling-tests/phase-5-quality.test.mjs
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-VALIDATION.md

key-decisions:
  - 'Use width: 100% with min-width: 0 on DenseTable so the fixed colgroup can expand it only to finite declared geometry.'
  - 'Keep ScrollArea as the only native overflow owner with width/min/max constraints and a non-amplifying content wrapper.'
  - 'Exercise the UI Lab preset matching each Playwright project before measuring and operating both table edges.'

patterns-established:
  - 'Finite table evidence: declared selection/data/action columns plus logical available width define the upper bound.'
  - 'Reachability evidence: verify both edge geometry, then focus and operate a real row action.'

requirements-completed: []

duration: 15 min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 12: DenseTable Width and Overflow Gap Closure Summary

**Finite colgroup-driven DenseTable geometry with one labelled native overflow owner and real Chromium reachability evidence at all three desktop targets.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-15T20:55:00Z
- **Completed:** 2026-07-15T21:10:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Removed the nested `max-content` sizing chain that had allowed the browser to clamp the table at 1,000,000px.
- Preserved semantic table markup, fixed colgroup widths, sticky headers, row actions, native scrolling, and the 12px/14px operational type floors.
- Added a Playwright regression that selects 1366×768, 1920×1080, and 2560×1080 logical frames, derives a finite bound from the active columns, and reaches both inline edges.
- Recorded executed validation evidence while leaving 05-13 through 05-16 planned or human-pending.

## Task Commits

Each task was committed atomically, with a separate RED proof for the browser regression:

1. **Task 2 RED: expose pathological DenseTable geometry** — `4943800` (test)
2. **Task 1: repair the DenseTable and ScrollArea width contract** — `f6f8514` (fix)
3. **Task 2 GREEN: prove finite and reachable table geometry** — `c2219fa` (fix)
4. **Post-wave integration: align the quality gate with the 36-row Nyquist map** — `c7c78a6` (test)

## Files Created/Modified

- `apps/desktop/src/ui/DenseTable/DenseTable.css` — allows the fixed colgroup to define finite overflow without a max-content minimum.
- `apps/desktop/src/ui/primitives/primitives.css` — bounds the native ScrollArea and removes intrinsic amplification from its content wrapper.
- `browser-tests/ui-lab.spec.ts` — measures finite geometry, checks both inline edges, operates a row action, and verifies density type floors in all three projects.
- `tooling-tests/phase-5-quality.test.mjs` — proves all 36 Nyquist rows, the eight gap-closure IDs, their planned/executed boundaries, and the human-only 05-16 decision boundary.
- `.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-VALIDATION.md` — records exact 05-12-01 and 05-12-02 outcomes while preserving later gap rows.

## Verification

- RED evidence: the new title-filtered Playwright test failed in all three projects against the original CSS; 1920×1080 and 2560×1080 reported 1,000,000px scroll width.
- `pnpm exec vitest run apps/desktop/src/ui/DenseTable/DenseTable.test.tsx` — 11/11 tests passed.
- `pnpm --filter @rivallo/desktop build` — 1,851 modules transformed; production build completed in 112ms.
- `pnpm exec playwright test browser-tests/ui-lab.spec.ts --grep "keeps DenseTable width finite and reaches both horizontal edges"` — 3/3 Chromium projects passed in 3.8s.
- `pnpm exec vitest run tooling-tests/phase-5-quality.test.mjs` — 4/4 focused quality-surface tests passed.
- `pnpm test` — 21/21 test files and 172/172 tests passed.
- `pnpm --filter @rivallo/desktop build` — post-integration production build passed with 1,851 modules transformed in 112ms.
- Validation-map integrity — exactly 36 rows and all eight pre-assigned gap IDs remain present.
- Full repeated `pnpm quality:clean` evidence remains intentionally assigned to Plan 05-15.

## Decisions Made

- DenseTable keeps percentage fill but drops the max-content minimum; fixed column widths create finite intentional overflow rather than an intrinsic layout chain.
- ScrollArea owns width, border-box sizing, focus, and native overflow; its content wrapper contributes no independent intrinsic minimum or second scrolling layer.
- Browser evidence uses the selected UI Lab logical frame as the available-width boundary, so each Playwright project proves its corresponding target instead of measuring the default preset.
- UI-01 remains open at the phase level because Plans 05-13 through 05-16 and Mateus's terminal visual review are still outstanding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Explicitly bounded the ScrollArea grid/flex item**

- **Found during:** Task 2 GREEN verification
- **Issue:** Removing nested max-content minimums fixed the million-pixel clamp, but the 1366×768 frame still allowed a 1,844px ScrollArea client width through its automatic minimum.
- **Fix:** Added `width: 100%`, `min-width: 0`, and `box-sizing: border-box` to the existing native overflow owner.
- **Files modified:** `apps/desktop/src/ui/primitives/primitives.css`
- **Verification:** The title-filtered three-project Playwright command passed and retained native overflow.
- **Committed in:** `c2219fa`

**2. [Rule 1/3 - Bug / blocking integration] Updated the stale Phase 5 quality-map contract**

- **Found during:** Post-wave full-suite verification
- **Issue:** `phase-5-quality.test.mjs` still required the historical 28-row Nyquist map, so the approved 36-row gap-closure map caused the otherwise green full `pnpm test` run to fail.
- **Fix:** Required exactly 36 rows, asserted every 05-12 through 05-16 task ID, preserved the executed/planned boundaries, and proved that 05-16-01 stays `human-pending` with structural verification unable to grant approval.
- **Files modified:** `tooling-tests/phase-5-quality.test.mjs`
- **Verification:** Focused quality test passed 4/4; full test passed 172/172; desktop production build passed.
- **Committed in:** `c7c78a6`

---

**Total deviations:** 2 auto-fixed issues (one Rule 1 bug and one Rule 1/3 blocking integration bug).
**Impact on plan:** Both adjustments were required to satisfy the bounded overflow contract and keep the approved Nyquist gap map enforceable. They introduced no new abstraction, dependency, production behavior, or scope.

## Issues Encountered

- The first GREEN attempt also exposed an ambiguous broad label locator. The regression now requests the exact first-row identifier, preventing the checkbox and overflow action from satisfying the cell assertion.
- No unresolved implementation issue remains.

## Known Stubs

None. The modified UI files add no placeholder data or future-feature behavior; the browser test exercises existing deterministic evidence fixtures.

## Threat Surface Scan

- T-05-12-DoS is mitigated by finite column-derived geometry and a bounded overflow owner.
- T-05-12-SP is mitigated by visible first/last-edge content plus a focusable and operable real row action.
- No new endpoint, authentication path, file access, persistence boundary, schema, or dependency was introduced.

## User Setup Required

None — no external service or dependency configuration is required.

## Next Phase Readiness

- DenseTable geometry is ready for Plan 05-13's cross-phase Table View Engine contract and Plan 05-15's aggregate evidence assembly.
- Phase 5 and Gate 2 remain open. Icon refinement, fresh evidence, and Mateus's terminal visual decision still belong to Plans 05-14 through 05-16.

## Self-Check: PASSED

- Summary and all four claimed modified artifacts exist.
- Commits `4943800`, `f6f8514`, `c2219fa`, and `c7c78a6` exist in Git history.
- Task-local and plan-level verification commands pass.
- UI-01 and Phase 5 were not advanced to terminal completion.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_
_Completed: 2026-07-15_
