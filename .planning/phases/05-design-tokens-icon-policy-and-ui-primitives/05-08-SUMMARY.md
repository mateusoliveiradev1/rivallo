---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: '08'
subsystem: ui-foundation
tags: [react, ui-lab, accessibility, responsive, dense-table, shell]

requires:
  - phase: 05-design-tokens-icon-policy-and-ui-primitives
    provides: Semantic tokens, icon boundaries, accessible primitives, and DenseTable
provides:
  - Development-only UI Lab excluded from production behavior and service boundaries
  - Exact seven-category visual inventory with real component and contrast evidence
  - Deterministic viewport, DenseTable, accessibility, and 232px/56px shell proofs
affects: [05-09, 05-10, visual-verification, future-product-screens]

tech-stack:
  added: []
  patterns:
    - Compile-time DEV guard and dynamic imports isolate inspection surfaces from production
    - All Lab controls use reset-on-remount React state without persistence or service authority
    - Labelled preview frames distinguish deterministic layout evidence from device emulation

key-files:
  created:
    - apps/desktop/src/ui-lab/UiLab.tsx
    - apps/desktop/src/ui-lab/UiLab.css
    - apps/desktop/src/ui-lab/specimens.tsx
    - apps/desktop/src/ui-lab/UiLab.test.tsx
  modified:
    - apps/desktop/src/main.tsx
    - tooling-tests/phase-4-desktop.test.mjs

key-decisions:
  - 'Keep `/__ui-lab` behind the exact compile-time DEV predicate and select App/UI Lab through dynamic imports so production cannot expose the inspection surface.'
  - 'Treat 1366×768, 1920×1080, and 2560×1080 as labelled deterministic layout frames, never as claims of browser or device emulation.'
  - 'Keep viewport, DenseTable, and shell configuration local to each mount; persistence, preferences, lifecycle, API, network, and Tauri remain outside the Lab.'
  - 'Apply shell width changes instantly while retaining restrained label opacity feedback, avoiding layout-property animation and preserving toggle focus.'

patterns-established:
  - 'Inspection hierarchy: contextual category heading, dominant specimen frame, then neutral local controls and evidence.'
  - 'Accessibility fixture: keyboard order, visible focus, non-colour status, 200% copy, text spacing, reduced motion, and contrast are explicit inspectable evidence.'
  - 'Shell proof: the same icon set and DOM order survive 232px/56px navigation changes while the workspace expands locally.'

requirements-completed: [UI-01]

duration: 17 min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 08: Development UI Lab Summary

**Rivallo now has an isolated, deterministic UI Lab that makes the visual foundation, dense data behavior, accessibility, target viewports, and shell collapse directly inspectable without leaking into production.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-15T13:33:28-03:00
- **Completed:** 2026-07-15T13:49:54-03:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added exact `/__ui-lab` development access with dynamic App/Lab imports, no production navigation, no service-readiness wait, and no production bundle copy or route leakage.
- Assembled exactly seven approved categories covering authored/resolved tokens, the isolated typography scale, all icons at 16/20/24px, every primitive, DenseTable, accessibility, and shell composition.
- Added labelled 1366×768, 1920×1080, and 2560×1080 frames with compact/default/ultrawide bounds and explicit wording that the evidence is not device emulation.
- Added real local DenseTable density, content-state, column-priority, visibility, sort, selection, and action evidence that resets on remount.
- Added keyboard order, visible focus, non-colour status, long Portuguese copy, 200% text expansion, text-spacing, contrast, and reduced-motion evidence.
- Added a local shell proof whose 232px/56px navigation keeps icons, content order, accessible names, tooltips, workspace continuity, and toggle focus intact.

## Task Commits

Each behavior task followed a RED/GREEN TDD sequence:

1. **Task 1: Development-only, service-independent Lab boundary** — `ea23167` (`test`), `24c54a1` (`feat`)
2. **Task 2: Seven-category hierarchy and real specimens** — `9f04926` (`test`), `1998abf` (`feat`)
3. **Task 3: Viewports, table controls, accessibility, and shell collapse** — `72045e1` (`test`), `6193d46` (`feat`)

**Regression alignment:** `d95b5d8` (`test`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `apps/desktop/src/main.tsx` — Exact DEV/path selection with dynamic imports and one shared mount.
- `apps/desktop/src/ui-lab/UiLab.tsx` — Seven-category navigation, target-resolution frames, and local preview selection.
- `apps/desktop/src/ui-lab/specimens.tsx` — Real token, typography, icon, primitive, DenseTable, accessibility, and shell specimens.
- `apps/desktop/src/ui-lab/UiLab.css` — Token-only dark-first composition, bounded target frames, constrained-width reflow, focus, shell, and reduced-motion behavior.
- `apps/desktop/src/ui-lab/UiLab.test.tsx` — Ten boundary, inventory, viewport, reset, keyboard, accessibility, and shell tests.
- `tooling-tests/phase-4-desktop.test.mjs` — Updated operational-shell regression for the dynamic surface boundary.

## Decisions Made

- The inspection route is a compile-time development branch rather than a router destination or production feature.
- Preview dimensions are explicit evidence constraints; the Lab never presents them as a substitute for real browser or human verification.
- All specimen configuration is intentionally ephemeral. A remount restores the standard 1920×1080 frame, compact ready table, full column priority, and expanded shell.
- The shell width changes without animating a layout property; only restrained label feedback may transition, and reduced motion removes it.
- The Lab composes existing exports and fictional evidence only. It owns no application lifecycle, persistence, domain, football feature, or product navigation.

## Deviations from Plan

### Auto-fixed Issues

**1. Regression test still expected a static `<App />` mount**

- **Found during:** Complete repository regression after Task 3.
- **Issue:** The Phase 4 source-boundary test encoded the old literal mount even though the new entrypoint safely selects a dynamically imported surface.
- **Fix:** The test now requires the normal `App` import branch, `surfaceModule.App`, and the shared `<Surface />` mount while preserving every authority and persistence assertion.
- **Files modified:** `tooling-tests/phase-4-desktop.test.mjs`
- **Verification:** Complete 161-test suite and ESLint pass.
- **Committed in:** `d95b5d8`

**2. Detector rejected layout-property animation**

- **Found during:** Impeccable static inspection of Task 3.
- **Issue:** A width transition on the local shell proof could cause layout work and produced a detector warning.
- **Fix:** Navigation width now changes immediately while focus, DOM order, workspace expansion, and optional label-opacity feedback remain intact.
- **Files modified:** `apps/desktop/src/ui-lab/UiLab.css`
- **Verification:** Impeccable detector returns an empty finding set and shell tests pass.
- **Committed in:** `6193d46`

---

**Total deviations:** 2 auto-fixed (1 regression compatibility, 1 interaction quality).
**Impact on plan:** Both fixes strengthen verification and performance without expanding product scope.

## Issues Encountered

- The repository has no root `build` or `whitespace:check` alias. Verification used the real desktop production build, existing root lint/format/typecheck/token scripts, and the full test suite rather than adding false scripts outside Phase 5 scope.

## User Setup Required

None - no dependency, service, Docker runtime, credential, API, network, or external asset is required.

## Next Phase Readiness

- Plan 05-09 can add browser-level Playwright evidence, quality aggregation, CI integration, and clean-worktree checks around the completed Lab.
- Plan 05-10 can perform the required human visual and interaction review using the deterministic categories and presets.
- Dashboard, squad, tactics, pitch, scouting, mascot, logo, final identity, persistence, and product behavior remain deliberately deferred.

## Self-Check: PASSED

- UI Lab focused suite — PASS, 10/10 tests.
- Complete repository suite — PASS, 161/161 tests across 19 files.
- TypeScript, ESLint, Prettier, token drift, and desktop production build — PASS.
- Production bundle isolation — PASS, no UI Lab route or heading.
- Impeccable detector — PASS, zero findings across Lab source and CSS.
- TDD RED/GREEN sequence — PASS for all three tasks.
- No dependency transaction, PRODUCT.md change, API/network/Tauri/persistence access, or product-screen implementation — PASS.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
