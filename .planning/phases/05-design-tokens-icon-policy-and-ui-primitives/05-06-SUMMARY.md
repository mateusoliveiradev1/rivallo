---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: "06"
subsystem: ui-foundation
tags: [radix-ui, accessibility, keyboard, focus-management, dialogs, toast]

requires:
  - phase: 05-design-tokens-icon-policy-and-ui-primitives
    provides: Native action, form, status, feedback, pagination, and overflow primitives
provides:
  - Tooltip, Popover, and Menu boundaries with tested keyboard, Escape, and focus-return behavior
  - Tabs, native arrow-complete RadioGroup, and explicit-state Switch primitives
  - Focus-contained Dialog, safe no-mutation AlertDialog proof, and brief Toast feedback
affects: [05-07, 05-08, 05-09, 05-10, ui-lab]

tech-stack:
  added: []
  patterns:
    - Approved Radix packages own difficult keyboard and focus behavior while Rivallo owns appearance
    - Stable-position icon-only actions retain independent accessible names plus supplemental tooltips
    - Persistent conditions use Status; Toast accepts only brief neutral or positive feedback

key-files:
  created:
    - apps/desktop/src/ui/primitives/disclosure.tsx
    - apps/desktop/src/ui/primitives/selection.tsx
    - apps/desktop/src/ui/primitives/dialogs.tsx
    - apps/desktop/src/ui/primitives/toast.tsx
    - apps/desktop/src/ui/primitives/composites.test.tsx
  modified:
    - apps/desktop/src/ui/primitives/actions.tsx
    - apps/desktop/src/ui/primitives/forms.tsx
    - apps/desktop/src/ui/primitives/primitives.css

key-decisions:
  - "Require stablePosition=true at the type boundary before IconButton may compose a tooltip; the button label remains authoritative."
  - "Reuse native radio inputs and add deterministic cyclic arrow handling instead of installing or duplicating another selection implementation."
  - "Use approved Radix only for Tooltip, Popover, Menu, Tabs, Switch, Dialog, and AlertDialog behavior; every class and visual state remains Rivallo-owned."
  - "Implement Toast as a narrow expiring polite live region with only neutral/positive tones so persistent danger/offline conditions cannot migrate into ephemeral feedback."

patterns-established:
  - "Composite focus: labelled trigger, Escape/outside dismissal where applicable, contained modal tab order, and invoker focus return."
  - "Selection: visible text/marker plus native or Radix checked/selected semantics; disabled choices are skipped by keyboard traversal."
  - "Overlay layering: semantic backdrop/modal/popover/tooltip/toast tokens with restrained elevation and reduced-motion fallbacks."

requirements-completed: [UI-01]

duration: 9 min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 06: Accessible Composite Primitives Summary

**Rivallo now has keyboard-complete disclosure, selection, modal, and brief-feedback primitives with tested focus containment/return and no template styling or fake product behavior.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-15T16:05:30Z
- **Completed:** 2026-07-15T16:14:39Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Finalized IconButton tooltip composition so accessible naming exists before, during, and after hover/focus disclosure; tooltip content is text-only and non-interactive.
- Added contextual Popover and command/checked-item Menu boundaries with outside/Escape close, focus return, Home/End/Arrow traversal, disabled skipping, and visible checked text.
- Added roving-focus Tabs, native radios with deterministic cyclic arrows and error association, and Switch with visible state description plus Space/Enter operation.
- Added modal Dialog focus containment across repeated opens and exact safe-default AlertDialog proof copy with no mutation callback or product action.
- Added an expiring/dismissible polite Toast restricted to brief neutral or positive feedback; persistent risk, error, and offline state remain owned by Status.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Tooltip, Popover, and Menu behavior boundaries** - `ff9b649` (`feat`)
2. **Task 2: Implement Tabs, RadioGroup, and Switch selection primitives** - `db02b82` (`feat`)
3. **Task 3: Implement Dialog, AlertDialog, and brief Toast proofs** - `ccbfa01` (`feat`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `apps/desktop/src/ui/primitives/disclosure.tsx` - Text-only Tooltip, contextual Popover, and typed command/checkbox Menu APIs.
- `apps/desktop/src/ui/primitives/selection.tsx` - Tabs, Switch, and the canonical native RadioGroup re-export.
- `apps/desktop/src/ui/primitives/dialogs.tsx` - Genuine-interruption Dialog and exact no-mutation AlertDialog proof.
- `apps/desktop/src/ui/primitives/toast.tsx` - Brief expiring/dismissible polite live feedback.
- `apps/desktop/src/ui/primitives/composites.test.tsx` - Nine real keyboard, focus, naming, dismissal, and announcement tests.
- `apps/desktop/src/ui/primitives/actions.tsx` - Stable-position tooltip type contract for IconButton.
- `apps/desktop/src/ui/primitives/forms.tsx` - Native cyclic arrow traversal for radios, including disabled skipping.
- `apps/desktop/src/ui/primitives/primitives.css` - Rivallo-owned composite, portal, selection, modal, and toast styles.

## Decisions Made

- Tooltip accepts only a string, making interactive descendants impossible at the public API boundary.
- Native radios remain native. The explicit key handler makes cyclic arrow behavior deterministic and skips disabled options without introducing another package.
- Dialog close stays visually top-right but follows the content action in DOM order, allowing useful initial focus while preserving a familiar visual affordance.
- AlertDialog exposes no confirmation callback: its exact copy and closing action prove behavior without creating a real destructive path.

## Deviations from Plan

None - plan executed as specified with only the already-approved packages.

## Issues Encountered

None unresolved.

## User Setup Required

None - no external service, credential, browser install, or dependency transaction is required.

## Next Phase Readiness

- Plan 05-07 can build DenseTable on complete action, selection, menu, feedback, pagination, and overflow primitives.
- UI Lab fixtures can exercise real keyboard and focus behavior instead of cosmetic state classes.
- Product screens remain out of scope; no preference, persistence, API, or domain behavior was introduced.

## Self-Check: PASSED

- Focused primitive/composite suite — PASS, 34/34 tests.
- Complete suite — PASS, 140/140 tests across 17 files.
- Desktop production build, TypeScript, ESLint, Prettier, token drift, frozen install, and whitespace validation — PASS.
- Supply-chain installed gate — PASS, approved 16-package inventory unchanged.
- No shadcn markup, raw HTML, custom scrollbar, product action, persistence, or unapproved package — PASS.
- Task commits `ff9b649`, `db02b82`, and `ccbfa01` exist — PASS.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
