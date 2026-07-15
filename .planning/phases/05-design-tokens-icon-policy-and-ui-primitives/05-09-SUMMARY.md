---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: '09'
subsystem: testing-ci
tags: [playwright, chromium, ci, quality, idempotency, nyquist]

requires:
  - phase: 05-design-tokens-icon-policy-and-ui-primitives
    provides: Isolated UI Lab, accessible primitives, DenseTable, tokens and icon evidence
provides:
  - Real Chromium evidence at all three target desktop resolutions
  - Complete non-mutating local quality aggregate and repeated exact-porcelain proof
  - Hosted UI Lab evidence in the existing three-job CI without artifact publication
  - Concrete Nyquist map for all 26 Phase 5 tasks
affects: [05-10, visual-review, ci, future-ui-phases]

tech-stack:
  added: []
  patterns:
    - Vite-only Playwright servers prove development Lab behavior and production exclusion without Tauri or API startup
    - Quality writers remain explicit while aggregate commands invoke only checks
    - Clean-status verification accepts unchanged dirty baselines and rejects any tracked or untracked delta

key-files:
  created:
    - playwright.config.ts
    - browser-tests/ui-lab.spec.ts
    - scripts/verify-clean-worktree.mjs
    - tooling-tests/phase-5-quality.test.mjs
  modified:
    - .gitignore
    - package.json
    - scripts/run-quality.mjs
    - eslint.config.mjs
    - tsconfig.json
    - .github/workflows/ci.yml
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-VALIDATION.md

key-decisions:
  - 'Run Chromium against independent development and production Vite servers so UI Lab evidence never depends on Tauri, sidecar, API or Docker state.'
  - 'Keep `pnpm quality` writer-free and make `pnpm quality:clean` run the complete aggregate plus desktop build twice against an exact porcelain baseline.'
  - 'Install the approved Playwright Chromium binary explicitly in CI while keeping browser installation outside test and quality commands.'
  - 'Treat visual hierarchy, icon originality and terminal approval as human-only judgments while automating every structural, behavioral and reproducibility claim.'

patterns-established:
  - 'Browser evidence: exact named 1366×768, 1920×1080 and 2560×1080 projects with deterministic locale, timezone and one worker.'
  - 'Ephemeral evidence: screenshots, traces and reports stay under narrowly ignored Playwright output and are never uploaded.'
  - 'Quality idempotency: compare exact `git status --porcelain=v1 --untracked-files=all` after each of two sequential runs.'

requirements-completed: [UI-01]

duration: 13 min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 09: Browser Evidence, Quality and CI Summary

**Rivallo's visual foundation is now continuously proven by real Chromium, complete local quality tooling, repeated clean-worktree verification, and hosted CI without publishing ephemeral evidence.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-15T13:54:41-03:00
- **Completed:** 2026-07-15T14:07:35-03:00
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added 13 passing Chromium checks across exact 1366×768, 1920×1080 and 2560×1080 projects, with two intentional production-boundary skips to avoid redundant execution.
- Proved viewport dimensions, keyboard table behavior, selection, shell focus retention, modal containment/return, 200%-effective width, long text, non-colour status, reduced motion and production Lab exclusion.
- Expanded formatting, ESLint and TypeScript coverage to every authored Phase 5 source, config, browser and test surface.
- Made `pnpm quality` a real writer-free aggregate covering 165 Vitest tests, token drift, browser evidence, Rust, contracts and architecture.
- Added `pnpm quality:clean`, which passed two complete aggregate/build runs in 98 seconds without changing exact Git porcelain state.
- Kept exactly three CI jobs and added explicit approved Chromium installation plus token, component and UI Lab checks to the JavaScript/TypeScript responsibility.
- Replaced the draft validation map with 26 concrete task mappings and explicit human-only boundaries.

## Task Commits

1. **Task 1: Deterministic non-watch Playwright evidence** — `e1d5b1a` (`test`), `0fd79ba` (`test/config`)
2. **Task 2: Complete quality and clean-worktree commands** — `0158e7c` (`test`), `e02007e` (`feat`)
3. **Task 3: Hosted browser evidence and Nyquist map** — `a6bfa07` (`test`), `27130e3` (`ci`)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `playwright.config.ts` — Deterministic Chromium projects plus isolated development/production Vite servers.
- `browser-tests/ui-lab.spec.ts` — Browser assertions and per-run ignored screenshots.
- `scripts/verify-clean-worktree.mjs` — Exact baseline/delta comparison around two aggregate runs.
- `scripts/run-quality.mjs` and `package.json` — Real root quality, component, browser and clean commands.
- `tooling-tests/phase-5-quality.test.mjs` — Static command/CI boundaries and isolated Git-fixture tests.
- `eslint.config.mjs` and `tsconfig.json` — TypeScript/TSX/browser coverage in intended environments.
- `.github/workflows/ci.yml` — Hosted Chromium setup and UI foundation checks in the existing JS/TS job.
- `.gitignore` — Narrow local Playwright evidence exclusions.
- `05-VALIDATION.md` — Implemented Nyquist map with irreducible human review clearly separated.

## Decisions Made

- Browser tests run with Vite only; no mock API, sidecar, Docker or Tauri process is started to make the Lab pass.
- Browser binaries are an explicit environment prerequisite and CI setup step, never an automatic side effect of `ui-lab:test` or `quality`.
- The clean verifier compares exact status text instead of requiring a clean baseline, so a user's pre-existing edits are preserved and accepted only when unchanged.
- The full quality command excludes `tokens:generate` and every other writer. Drift checks create isolated temporary output.
- CI retains the existing three-job ownership model and uploads no screenshots, traces, reports or binaries.

## Deviations from Plan

### Auto-fixed Issues

**1. Existing Phase 3 aggregate test assumed script literals lived inside the execution branch**

- **Found during:** Task 2 full quality run.
- **Fix:** Kept the named aggregate list inside the non-mutating branch while preserving the new reusable mode logic.
- **Verification:** Existing workspace command test and complete quality suite pass.
- **Committed in:** `e02007e`

**2. Shared reduced-motion token resolves to 0.01ms rather than literal 0s**

- **Found during:** Task 1 real-browser run.
- **Fix:** Browser evidence now asserts every transition duration is at most 0.01ms, matching the canonical token and accessible instant-response behavior.
- **Verification:** All Chromium projects pass.
- **Committed in:** `0fd79ba`

---

**Total deviations:** 2 auto-fixed (1 regression compatibility, 1 canonical-token alignment).
**Impact on plan:** No scope expansion; both fixes preserve existing contracts and strengthen truthful verification.

## Issues Encountered

- The first browser focus assertion reused a locator whose accessible-name query changed after shell collapse. The assertion now reacquires the same focused control by its new accessible name.
- The first `quality:clean` run exposed one ESLint regex-style violation in the newly added static test. It was corrected before the successful two-run proof.

## User Setup Required

None on this workstation — the approved Chromium binary was already available. A fresh machine receives an actionable failure and must run `pnpm exec playwright install chromium` manually.

## Next Phase Readiness

- Plan 05-10 can now perform the required human visual/interaction review on deterministic ignored screenshots and live Lab evidence.
- Every automatable claim is green; optical hierarchy, originality, non-imitation and final approval remain intentionally human-owned.
- No product screen, dashboard, squad, tactics, pitch, mascot, logo, domain behavior, API or persistence was added.

## Self-Check: PASSED

- Complete Vitest suite — PASS, 165/165 tests across 20 files.
- Playwright — PASS, 13/13 executed checks across three exact viewport projects; 2 intentional skips.
- `pnpm quality` — PASS.
- `pnpm quality:clean` — PASS, two full aggregate/build runs with unchanged exact porcelain state.
- Format, ESLint, TypeScript, tokens, Rust, contracts, architecture and desktop build — PASS.
- CI static policy — PASS, exactly three jobs, explicit Chromium, no writers or artifact upload.
- No dependency transaction, PRODUCT.md change, browser auto-install, service mock or product-feature implementation — PASS.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_

_Completed: 2026-07-15_
