---
phase: 06-first-playable-matchday
plan: '02'
subsystem: ui
tags: [react, radix, popover, tooltip, nationality, playwright]
requires:
  - phase: 06-first-playable-matchday
    provides: Real Elenco/Táticas first-playable surface and persisted matchday loop
provides:
  - Controlled density and columns disclosures with stable focus and cleanup
  - Shared tooltip provider and accessible portalled focus treatment
  - Local nationality catalog, flags, fallbacks and shared display component
  - Preference compatibility repair and browser-wide console/page-error guards
affects: [sm-2-table-views, sm-3-tactics, squad, ui-foundation]
tech-stack:
  added: []
  patterns:
    - Controlled non-modal Radix disclosure owned by the product screen
    - Local presentation catalogs keep domain contracts unchanged
key-files:
  created:
    - apps/desktop/src/ui/Nationality/NationalityDisplay.tsx
    - apps/desktop/src/ui/Nationality/country-catalog.ts
    - apps/desktop/src/assets/flags/PROVENANCE.md
  modified:
    - apps/desktop/src/matchday/SquadWorkspace.tsx
    - apps/desktop/src/ui/primitives/disclosure.tsx
    - browser-tests/matchday.spec.ts
key-decisions:
  - Keep the existing squad table and AppShell; repair disclosure behavior in place.
  - Treat nationality as a presentation adapter and leave the Rust Player contract unchanged.
  - Preserve deliberate outside-click focus while restoring the trigger after internal or Escape dismissal.
patterns-established:
  - Product tooltips share one provider, retain independent accessible names and remain hoverable.
  - Legacy preference payloads preserve intentional empty views but quarantine all-invalid column selections.
requirements-completed: [SM-01]
duration: multi-session
completed: 2026-07-16
status: complete
---

# Phase 6 Plan 02: Sports-Management Stabilization Summary

**The real Elenco workspace now has deterministic density/column disclosures, shared accessible tooltips, local nationality flags and browser-level regression guards without a redesign or sports-domain rewrite.**

## Performance

- **Duration:** Multi-session product audit, implementation and review
- **Started:** 2026-07-15
- **Completed:** 2026-07-16T03:04:25-03:00
- **Tasks:** 6, including the deferred human checkpoint
- **Files modified:** 23 product/test files plus planning artifacts

## Accomplishments

- Replaced the uncontrolled product `<details>` seam with coordinated Radix popovers that close by selection, close action, Escape and outside pointer without stale layers.
- Made compact, standard and comfortable density change row height, cell padding and player-cell gap while retaining persisted preferences.
- Added one tooltip provider, hoverable content, visible portalled focus and reduced nationality tab stops.
- Added local BR/AR/UY/PT flag assets, ISO/FIFA aliases, full-name tooltips and deterministic unknown/image-error fallbacks.
- Added component and browser regressions for the original Colunas → Densidade sequence, legacy preference recovery, repeated focus cycles, all Matchday console errors and 1024–2560 px evidence.

## Task Commits

1. **Tasks 1–5: Stabilization implementation and regression evidence** — `6ea4d96` (`fix`)
2. **Task 6: Human product checkpoint** — explicitly deferred by the user on 2026-07-16 while authorizing autonomous continuation; no visual approval is claimed.

## Files Created/Modified

- `apps/desktop/src/ui/Nationality/` — shared country resolution, display and tests.
- `apps/desktop/src/assets/flags/` — local compact SVG flags with provenance.
- `apps/desktop/src/ui/primitives/disclosure.tsx` — shared tooltip provider and controlled Popover API.
- `apps/desktop/src/matchday/SquadWorkspace.tsx` — repaired table controls and shared nationality display.
- `apps/desktop/src/matchday/MatchdayScreen.tsx` — safe preference compatibility recovery.
- `apps/desktop/src/matchday/matchday.css` — density geometry and bounded disclosure styling.
- `browser-tests/matchday.spec.ts` — all-test console/page-error guards and real-browser regression paths.

## Decisions Made

- Preserved the current AppShell, navigation, routes/entry behavior, tokens, squad table, Tactics workspace, Tauri commands and Rust matchday authority.
- Kept `localStorage` as a transitional compatibility boundary; no Table View Engine repository or future sync contract was implemented early.
- Made table nationalities non-tabbable by default while keeping the selected-player dossier keyboard-discoverable; screen readers retain full names through `aria-label` in every cell.
- Recorded zero relevant console/page errors observed rather than claiming an unidentified error was fixed.

## Deviations from Plan

### Auto-fixed Issues

**1. Accessibility audit found non-hoverable tooltip content and weak portalled focus**

- **Found during:** Final Impeccable review
- **Fix:** Enabled hoverable tooltip content and applied the semantic focus token to Popover buttons.
- **Verification:** Chromium confirmed persistent hover and a 2px tokenized focus outline; targeted and browser tests passed.

**2. Preference audit found an all-invalid legacy payload edge case**

- **Found during:** Independent regression review
- **Fix:** Intentional `[]` remains valid, while non-empty payloads with zero recognized IDs restore defaults.
- **Verification:** Dedicated component regression plus full quality gate.

**3. Browser error collection originally covered only personalization**

- **Found during:** Independent regression review
- **Fix:** Moved console/page-error collection to Playwright `beforeEach`/`afterEach` for every Matchday test.
- **Verification:** All 16 applicable Matchday browser scenarios passed with zero captured errors.

---

**Total deviations:** 3 auto-fixed correctness/accessibility gaps.
**Impact on plan:** All fixes stayed inside SM-1 and strengthened the requested non-regression proof.

## Issues Encountered

- The repository does not install jest-dom matchers; the unknown-nationality regression uses direct `textContent` assertions.
- The human fullscreen Tauri checkpoint was not performed by Mateus. The user explicitly authorized continuing autonomously, so validation remains documented as deferred rather than passed.

## User Setup Required

None — no package, service or environment setup was added.

## Next Phase Readiness

- SM-1 automated gates are green and the product build is available at `target/release/rivallo-desktop.exe`.
- The next authorized slice is SM-2, but it must implement the existing canonical Table View Engine contract rather than extend screen-specific `localStorage` state.
- Human visual validation remains an open product-review item and may generate a bounded follow-up without invalidating the automated stabilization evidence.

---

_Phase: 06-first-playable-matchday_
_Completed: 2026-07-16_
