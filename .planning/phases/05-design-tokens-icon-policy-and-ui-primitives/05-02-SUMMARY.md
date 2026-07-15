---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: "02"
subsystem: ui-foundation
tags: [react, radix-ui, lucide, colorjs, vitest, jsdom, testing-library, playwright]

requires:
  - phase: 05-design-tokens-icon-policy-and-ui-primitives
    provides: Exact 16-package inventory approved by Mateus under a digest-backed gate
provides:
  - Frozen exact Phase 5 dependency transaction with four narrow owner scopes
  - Stable installed-inventory verifier for baseline, scope, workspace-link, and lockfile-integrity drift
  - Official React 19 typings and separate serial Node plus browser-like DOM Vitest projects
  - Real DOM proof for accessible interaction, automatic cleanup, and render-error surfacing
affects: [05-03, 05-04, 05-05, 05-06, 05-07, 05-08, 05-09]

tech-stack:
  added:
    - lucide-react@1.24.0
    - colorjs.io@0.6.1
    - seven approved Radix behavior packages
    - Testing Library, jsdom, official React types, and Playwright
  patterns:
    - Digest-gated exact dependency transactions with immutable direct baselines
    - Package-owned design-token and icon boundaries with narrow exports
    - Explicit Vitest projects with serial tracked-artifact protection

key-files:
  created:
    - packages/icons/package.json
    - packages/design-tokens/package.json
    - apps/desktop/src/test/dom-environment.test.tsx
  modified:
    - package.json
    - apps/desktop/package.json
    - pnpm-lock.yaml
    - apps/desktop/src/react-runtime.d.ts
    - scripts/verify-phase-5-package-approval.mjs
    - tooling-tests/phase-5-package-approval.test.mjs
    - vitest.config.mjs

key-decisions:
  - "Keep the pre-transaction direct dependency baseline inside the verifier so --installed remains authoritative after HEAD advances."
  - "Allow exactly two new workspace links: @rivallo/icons and @rivallo/design-tokens, both owned by the desktop with workspace:* specifiers."
  - "Apply fileParallelism: false at the aggregate Vitest level because tracked contract-generation tests must never race, while retaining named Node and DOM environments."
  - "Remove the obsolete React ambient modules completely and retain only project-specific CSS and ImportMeta declarations."

patterns-established:
  - "Installed inventory proof: preserve every baseline section/name/specifier, match every approved addition by owner and integrity, and reject every other delta."
  - "DOM infrastructure proof: query by accessible role/name, interact with user-event, prove automatic cleanup, and assert thrown render errors."

requirements-completed: [UI-01]

duration: 9min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 02: Approved Dependency Transaction and DOM Harness Summary

**Sixteen reviewed UI-foundation packages frozen in four owner scopes with official React typing and a deterministic 80-test Node/DOM harness**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-15T12:10:48-03:00
- **Completed:** 2026-07-15T12:19:40-03:00
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Revalidated all 16 registry integrities immediately before installation, then installed only the approved exact versions in their approved scopes.
- Added a stable installed-state verifier that rejects baseline mutation, missing or extra packages, wrong scopes, unapproved workspace links, and lockfile-integrity drift.
- Replaced the bootstrap React ambient shim with official React 19 and React DOM types without weakening TypeScript.
- Split Vitest into explicit Node and desktop DOM projects while preserving serial execution for tests that share tracked generated artifacts.
- Proved real React rendering, accessible interaction, cross-test cleanup, and render-error propagation; the complete suite passes 80 tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install only the exact approved packages in their approved scopes** - `10ef73f` (`chore`)
2. **Task 2: Establish real non-watch DOM/component test configuration** - `f70e58c` (`test`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `packages/icons/package.json` - Private ESM owner for the sole generic icon family.
- `packages/design-tokens/package.json` - Private ESM owner for deterministic color resolution.
- `apps/desktop/package.json` - Seven Radix behavior dependencies and exactly two internal workspace links.
- `package.json` - Approved root-only test, type, and browser-evidence dependencies.
- `pnpm-lock.yaml` - Frozen resolution and integrity evidence for the approved transaction.
- `scripts/verify-phase-5-package-approval.mjs` - Stable baseline, scope, link, exact-version, and lockfile-integrity enforcement.
- `tooling-tests/phase-5-package-approval.test.mjs` - Positive and negative fixtures for every installed-state boundary.
- `apps/desktop/src/react-runtime.d.ts` - Only project-specific CSS and Vite environment declarations remain.
- `vitest.config.mjs` - Named serial Node and jsdom test projects.
- `apps/desktop/src/test/dom-environment.test.tsx` - Infrastructure proof for render, interaction, cleanup, and error behavior.

## Decisions Made

- Captured the pre-transaction direct baseline as audited data inside the verifier rather than deriving it from a moving `HEAD` after commit.
- Kept icon and token packages private with one narrow root export each; later plans must implement those real exports without widening dependency ownership.
- Kept aggregate test files serial. Contract-generation tests share tracked artifacts, so parallel file execution would be nondeterministic even though the DOM project itself is isolated.
- Used Testing Library's automatic cleanup through the DOM project's Vitest globals instead of adding a manual cleanup shim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Project-local fileParallelism was not a valid Vitest project option**

- **Found during:** Task 2 (DOM/component test configuration)
- **Issue:** Vitest accepted the runtime shape but TypeScript correctly rejected `fileParallelism` inside an individual project, and the option therefore failed to protect existing generated-artifact tests.
- **Fix:** Moved `fileParallelism: false` to the aggregate test configuration while keeping environment and include rules inside their named projects.
- **Files modified:** `vitest.config.mjs`
- **Verification:** The previously exposed contract-client race no longer occurs; focused DOM, full 80-test suite, and typecheck all pass.
- **Committed in:** `f70e58c`

---

**Total deviations:** 1 auto-fixed bug.

**Impact on plan:** The fix enforces the plan's existing serial-protection requirement; no dependency, feature, or UI scope was added.

## Issues Encountered

- The first aggregate run exposed a real race between generated-client writer and drift-reader tests. Serial aggregate execution resolves the shared-artifact constraint deterministically.
- pnpm reports one deprecated transitive package, `whatwg-encoding@3.1.1`, within the approved frozen graph. No direct unapproved dependency or lifecycle hook was introduced.

## User Setup Required

None - no external service, browser binary, credential, or system tool is required for this plan's checks.

## Next Phase Readiness

- Plan 05-03 can now implement deterministic semantic tokens using the approved `colorjs.io` boundary.
- Plan 05-04 can implement the constrained Lucide wrapper and original football SVG boundary.
- No visual component, dashboard, table, or product screen was implemented ahead of its owning plan.

## Self-Check: PASSED

- Strict approval plus installed inventory validation — PASS, 16 registry additions and 2 workspace links.
- Registry integrity re-query — PASS, all 16 values unchanged from Mateus's approved digest.
- Focused desktop DOM tests — PASS, 3/3.
- Complete test suite — PASS, 80/80 across 13 files.
- TypeScript, ESLint, Prettier, frozen install, and `git diff --check` — PASS.
- Task commits `10ef73f` and `f70e58c` exist — PASS.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
