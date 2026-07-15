---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: "03"
subsystem: design-tokens
tags: [oklch, wcag, colorjs, css-custom-properties, deterministic-generation, drift-check]

requires:
  - phase: 05-design-tokens-icon-policy-and-ui-primitives
    provides: Approved colorjs dependency, official TypeScript foundation, and deterministic test environments
provides:
  - Canonical semantic OKLCH, typography, spacing, radius, elevation, layer, dimension, and motion contract
  - Browser-target sRGB gamut mapping plus WCAG 2.2 AA evidence for declared text and non-text pairs
  - Tracked deterministic generated CSS with static reduced-motion behavior
  - Non-mutating isolated token drift check with actionable repair guidance
affects: [05-04, 05-05, 05-06, 05-07, 05-08, 05-09, desktop-ui]

tech-stack:
  added: []
  patterns:
    - TypeScript-authored design tokens compiled in memory for Node 22-compatible generation
    - Measured sRGB contrast evidence derived from authored OKLCH values
    - Temporary-output byte comparison for generated CSS drift

key-files:
  created:
    - packages/design-tokens/src/tokens.ts
    - packages/design-tokens/src/contrast.ts
    - packages/design-tokens/src/generated.css
    - packages/design-tokens/src/index.ts
    - scripts/generate-design-tokens.mjs
    - scripts/verify-design-token-drift.mjs
    - tooling-tests/design-tokens.test.mjs
  modified:
    - package.json

key-decisions:
  - "Raise only color-border from the provisional L 0.330 candidate to L 0.520 so control boundaries pass 3:1 against raised surfaces; keep color-border-subtle quiet for non-critical separators."
  - "Use the existing TypeScript compiler to transpile the import-free canonical tokens module in memory, preserving Node 22.0 compatibility without an unapproved runtime package."
  - "Generate authored OKLCH custom properties under the --rv-* namespace while exporting separately measured sRGB evidence for the UI Lab."
  - "Override all nonessential motion to 0.01ms and one iteration under prefers-reduced-motion."

patterns-established:
  - "Token ownership: authored values live only in tokens.ts; generated.css is tracked and never manually repaired."
  - "Contrast proof: every pair records authored tokens, resolved hex values, ratio, threshold, kind, and pass state."

requirements-completed: [UI-01]

duration: 11min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 03: Semantic Tokens and Contrast Evidence Summary

**Noite de Comando tokens with deterministic `--rv-*` CSS, real sRGB WCAG evidence, and non-mutating generated-artifact drift enforcement**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-15T12:20:00-03:00
- **Completed:** 2026-07-15T12:31:30-03:00
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Authored the complete provisional semantic color system and all fixed product UI scales from the approved UI-SPEC in one TypeScript source.
- Measured every declared text, action, focus, border, and state pair after sRGB gamut mapping; normal text passes 4.5:1 and meaningful non-text UI passes 3:1.
- Adjusted the control-border candidate based on evidence while preserving subdued row separators and the restrained ≥90% graphite composition.
- Generated one stable custom property per public token plus the mandatory reduced-motion contract in tracked CSS.
- Added isolated repeated-generation and controlled-drift tests that never repair or mutate the tracked artifact during checks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the semantic OKLCH contract and rendered contrast engine** - `a13bbc6` (`feat`)
2. **Task 2: Generate tracked semantic CSS deterministically** - `e8c4940` (`feat`)
3. **Task 3: Enforce non-mutating drift and clean-check behavior** - `0bea100` (`test`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `packages/design-tokens/src/tokens.ts` - Canonical semantic colors, fixed scales, policy metadata, public CSS inventory, and contrast pairs.
- `packages/design-tokens/src/contrast.ts` - Color.js-backed sRGB resolution, WCAG measurement, and actionable assertions.
- `packages/design-tokens/src/index.ts` - Narrow public design-token and evidence API.
- `packages/design-tokens/src/generated.css` - Tracked deterministic custom properties and reduced-motion behavior.
- `scripts/generate-design-tokens.mjs` - Node-compatible in-memory TypeScript token loader and isolated writer.
- `scripts/verify-design-token-drift.mjs` - Temporary-output byte comparison and exact repair instruction.
- `tooling-tests/design-tokens.test.mjs` - Inventory, policy, contrast, generation, failure, drift, and porcelain-baseline tests.
- `package.json` - Real `tokens:generate` and `tokens:check` commands.

## Decisions Made

- Set `color-border` to `oklch(0.52 0.022 190)` because the provisional L 0.330 value measured only about 1.5:1 against raised graphite; the adjusted control boundary exceeds 3:1. `color-border-subtle` remains the restrained table/separator role.
- Kept generated CSS on authored OKLCH values for modern WebView rendering while contrast evidence records browser-target sRGB hex values separately.
- Used TypeScript's already-approved compiler API rather than adding `tsx`, a loader, or duplicated JSON token source.
- Kept the writer out of non-mutating quality commands; `tokens:check` is the safe verifier.

## Deviations from Plan

None - candidate adjustment, deterministic generation, and isolated drift enforcement were explicitly required by the plan.

## Issues Encountered

- Prettier normalizes redundant decimal zeroes inside CSS color functions. Equivalent authored OKLCH strings were normalized in the canonical source so fresh generator output passes formatting without a post-generation rewrite.

## User Setup Required

None - no font binary, browser binary, credential, external service, or new dependency is required.

## Next Phase Readiness

- Plan 05-04 can consume the stable token namespace while implementing the sole Lucide wrapper and original football SVG registry.
- Later primitives can use semantic border/focus/motion/layer tokens without raw values or color-only state.
- Exact palette values remain Design Foundation V0 and can still evolve through evidence-backed human approval while Rivallo remains a working name.

## Self-Check: PASSED

- Focused token suite — PASS, 9/9 tests including controlled drift and exact porcelain preservation.
- Complete suite — PASS, 89/89 tests across 14 files.
- `tokens:generate` repeated bytes and `tokens:check` — PASS.
- TypeScript, ESLint, Prettier, frozen install, and whitespace validation — PASS.
- Task commits `a13bbc6`, `e8c4940`, and `0bea100` exist — PASS.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
