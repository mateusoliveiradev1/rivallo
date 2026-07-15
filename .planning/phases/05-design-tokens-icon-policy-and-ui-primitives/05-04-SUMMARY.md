---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: "04"
subsystem: iconography
tags: [lucide-react, react, svg, accessibility, provenance, icon-registry]

requires:
  - phase: 05-design-tokens-icon-policy-and-ui-primitives
    provides: Approved Lucide dependency, exact React platform, DOM harness, and semantic token foundation
provides:
  - Typed 19-name semantic generic icon boundary with fixed 16/20/24 geometry and 1.75px stroke
  - Three-entry fixed local football SVG proof registry with version/source metadata
  - Decorative and meaningful accessibility contracts for generic and football icons
  - Authorship record and unsafe SVG input/attribute fences
affects: [05-05, 05-06, 05-07, 05-08, 05-10, ui-primitives]

tech-stack:
  added: []
  patterns:
    - Semantic icon names mapped privately to one generic implementation family
    - Fixed React-authored SVG geometry with no consumer markup surface
    - Human-only originality and optical-harmony judgment

key-files:
  created:
    - packages/icons/src/Icon.tsx
    - packages/icons/src/football-icons.tsx
    - packages/icons/src/Icon.test.tsx
    - packages/icons/AUTHORSHIP.md
  modified:
    - packages/icons/src/index.ts
    - packages/icons/package.json
    - vitest.config.mjs
    - scripts/verify-phase-5-package-approval.mjs
    - tooling-tests/phase-5-package-approval.test.mjs
    - pnpm-lock.yaml

key-decisions:
  - "Expose 19 semantic generic names rather than Lucide implementation names; consumers cannot pass arbitrary paths, stroke, color, style, animation, or family."
  - "Declare React 19.2.7 as one exact pre-existing platform peer for @rivallo/icons instead of relying on aliases or package-manager hoisting."
  - "Keep the original football proof set to football-ball, goal-frame, and training-cone; no pitch, crest, mascot, or product identity geometry is included."
  - "Automated checks validate provenance metadata and safe fixed geometry but reserve originality, non-imitation, and optical balance for human review."

patterns-established:
  - "Icon accessibility: decorative by default; meaningful standalone rendering requires decorative=false plus a non-empty label."
  - "SVG safety: fixed local React geometry, currentColor, no URL/use/image/raw HTML/style/handler/animation surface."

requirements-completed: [UI-01]

duration: 10min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 04: Icon Boundary and Football Registry Summary

**One curated Lucide boundary plus three fixed local football SVG proofs, all constrained to semantic names, accessible modes, 16/20/24px grids, and 1.75px optical stroke**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-15T12:32:00-03:00
- **Completed:** 2026-07-15T12:42:00-03:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Curated 19 generic meanings behind one Rivallo API while keeping every Lucide component name and configurable visual prop private.
- Enforced exact approved sizes, `currentColor`, fixed stroke, decorative hiding, deliberate semantic labels, and runtime/type rejection of unsupported configuration.
- Authored a bounded three-icon football proof registry with safe local geometry, stable version/source metadata, and one public component boundary.
- Recorded the authoring process and proved that markup cannot accept paths, remote references, handlers, raw HTML, styles, or animation from consumers.
- Preserved the exact 16-package supply-chain inventory while declaring React 19.2.7 as a pre-existing peer contract required by the reusable React package.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the curated Lucide boundary and accessibility contract** - `af5f65f` (`feat`)
2. **Task 2: Add a bounded original football SVG registry** - `753b551` (`feat`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `packages/icons/src/Icon.tsx` - Semantic generic map, fixed optical rules, and accessibility union.
- `packages/icons/src/football-icons.tsx` - Three fixed local SVG geometries and versioned metadata.
- `packages/icons/src/Icon.test.tsx` - DOM, accessibility, runtime/type fence, safety, and authorship checks.
- `packages/icons/AUTHORSHIP.md` - Project provenance, authoring method, entries, and human-review boundary.
- `packages/icons/src/index.ts` - Single narrow public entrypoint for both registries.
- `packages/icons/package.json` - Exact React peer declaration for a correct reusable React package boundary.
- `vitest.config.mjs` - Discovers icon DOM tests in the real jsdom project.
- `scripts/verify-phase-5-package-approval.mjs` - Separately permits and verifies one exact pre-existing platform peer.
- `tooling-tests/phase-5-package-approval.test.mjs` - Rejects missing or mismatched React peer metadata.
- `pnpm-lock.yaml` - Records peer-correct workspace resolution without adding a registry package.

## Decisions Made

- Generic API names describe intent (`warning`, `retry`, `collapse-navigation`) instead of leaking library identifiers.
- React is an exact peer of the icon package, not an alias, hoisted accident, duplicate runtime, or new registry addition.
- Football proof geometry is deliberately small and generic. A tactical pitch, crest, uniform, mascot, final mark, or club identity would overstep this phase.
- Originality claims are not automated. Phase 05-10 must still inspect every football icon at all three sizes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Reusable React package lacked an explicit React peer**

- **Found during:** Task 1 (generic icon DOM execution)
- **Issue:** The icon source correctly used React, but its owner manifest declared only Lucide. Tests exposed that resolution would otherwise depend on aliases or package-manager hoisting.
- **Fix:** Declared exact `react: 19.2.7` peer metadata, created a separately named gate allowance for that already-installed desktop platform, and added missing/mismatch tests. No new registry package was installed.
- **Files modified:** `packages/icons/package.json`, `pnpm-lock.yaml`, `scripts/verify-phase-5-package-approval.mjs`, `tooling-tests/phase-5-package-approval.test.mjs`
- **Verification:** Strict installed gate reports 16 registry additions, 2 workspace links, and exactly 1 pre-existing platform peer; frozen install and all tests pass.
- **Committed in:** `af5f65f`

**2. [Rule 3 - Blocking] DOM project did not discover package-owned TSX tests**

- **Found during:** Task 1 (generic icon DOM execution)
- **Issue:** The real DOM project initially included only desktop application tests.
- **Fix:** Added the package icon test path to the existing DOM project without creating a second test environment.
- **Files modified:** `vitest.config.mjs`
- **Verification:** Focused icon suite runs in `desktop-dom` and the aggregate remains serial.
- **Committed in:** `af5f65f`

---

**Total deviations:** 2 auto-fixed (1 missing critical contract, 1 blocking test discovery gap).

**Impact on plan:** Both fixes are required for a real reusable React icon boundary. The approved registry package inventory remains unchanged.

## Issues Encountered

None beyond the two resolved boundary gaps above.

## User Setup Required

None - no external asset, font, browser, service, credential, or new package is required.

## Next Phase Readiness

- Plan 05-05 can consume accessible icons through semantic names only while building native-first actions, fields, status, and feedback primitives.
- The UI Lab can later render every used icon at 16/20/24px for human optical review.
- Originality, non-imitation, and optical harmony remain intentionally pending Phase 05-10 human approval.

## Self-Check: PASSED

- Focused icon suite — PASS, 16/16 tests.
- Complete suite — PASS, 106/106 tests across 15 files.
- Supply-chain installed gate — PASS, 16 registry additions, 2 workspace links, 1 exact pre-existing peer.
- TypeScript, ESLint, Prettier, token drift, frozen install, and whitespace validation — PASS.
- Task commits `af5f65f` and `753b551` exist — PASS.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
