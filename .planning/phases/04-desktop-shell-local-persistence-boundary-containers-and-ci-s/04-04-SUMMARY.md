---
phase: 04-desktop-shell-local-persistence
plan: "04"
subsystem: desktop
tags: [tauri, react, sidecar, lifecycle, recovery, accessibility]

requires:
  - phase: 04-02
    provides: Fixed loopback readiness contract and private sidecar shutdown message.
  - phase: 04-03
    provides: Pinned Tauri/React workspace and named packaged sidecar boundary.
provides:
  - Ownership-aware Tauri lifecycle manager with compatible reuse, bounded startup, monitoring, retry, and owned-child shutdown.
  - Accessible React operational shell for initializing, ready, and recoverable-failure states.
  - Development-only copyable diagnostics without ordinary-UI process detail.
affects: [04-06-ci, phase-05-design-system, desktop-runtime]

tech-stack:
  added: [tauri-plugin-shell 2.3.5]
  patterns:
    - Typed Tauri command bridge with no UI-controlled process arguments.
    - Continuous status observation with explicit recovery and ownership-safe shutdown.

key-files:
  created:
    - apps/desktop/src/App.tsx
    - apps/desktop/src/main.tsx
    - apps/desktop/src/styles.css
    - apps/desktop/src/react-runtime.d.ts
    - apps/desktop/src-tauri/capabilities/default.json
    - tooling-tests/phase-4-desktop.test.mjs
  modified:
    - apps/desktop/src-tauri/src/main.rs
    - apps/desktop/src-tauri/Cargo.toml
    - apps/desktop/index.html
    - package.json
    - tsconfig.json

key-decisions:
  - "Lifecycle status remains a host-owned typed union; React can only read status and request retry, never select a process, path, port, or shell command."
  - "Copyable lifecycle diagnostics are compiled out of production and appear only inside an explicitly development-oriented disclosure."

patterns-established:
  - "Retries always re-enter initializing and delegate probe/reuse/spawn decisions to the native lifecycle manager."
  - "The operational shell polls typed lifecycle status so post-Ready owned-child or readiness loss becomes visible without widening native authority."

requirements-completed: [FOUND-01]

duration: 17min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 4: Owned Local API Lifecycle and Operational Shell Summary

**A Tauri-owned sidecar lifecycle now pairs strict compatible reuse and monitored recovery with an accessible React shell whose safe diagnostics exist only in development builds.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-14T16:12:49Z
- **Completed:** 2026-07-14T16:29:35Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Added `probe → reuse | spawn → bounded wait → ready | recoverable failure`, retaining authority only over the child created by this desktop instance.
- Continued monitoring owned children and readiness after Ready, mapping unexpected exit or compatibility loss to typed recoverable status while leaving reused responders untouched.
- Added a keyboard-operable operational React shell with distinct initializing, ready, and failure states, retry, safe user copy, reduced-motion support, and production-excluded copyable diagnostics.
- Preserved the Phase 4 boundary: no dashboard, football feature, persistence behavior, direct React shell access, alternate port, or UI-selected process input was added.

## Task Commits

Each TDD task was committed with a RED gate followed by its implementation:

1. **Task 1: Implement the narrow owned-sidecar lifecycle host** - `0176a62` (test), `192b0de` (feat)
2. **Task 2: Render the accessible operational lifecycle shell** - `21e3b8c` (test), `a0244a8` (feat)

## Files Created/Modified

- `apps/desktop/src-tauri/src/main.rs` - Ownership-aware lifecycle state machine, strict readiness probing, retry commands, monitoring, and owned-child shutdown.
- `apps/desktop/src-tauri/capabilities/default.json` - Exact argument-free permission for the packaged `local_api` sidecar.
- `apps/desktop/src/App.tsx` - Typed operational lifecycle UI and recovery behavior.
- `apps/desktop/src/main.tsx` - Checked React entrypoint.
- `apps/desktop/src/styles.css` - Shell-scoped accessible visual states and reduced-motion behavior.
- `apps/desktop/src/react-runtime.d.ts` - Narrow runtime declarations required by the already-approved React package set.
- `apps/desktop/index.html` - Loads the checked React entrypoint instead of the Phase 04-03 hidden stub.
- `tooling-tests/phase-4-desktop.test.mjs` - Lifecycle ownership, shell state, retry, diagnostic, and authority regression gates.
- `scripts/verify-cargo-architecture.mjs` and `tooling-tests/verify-cargo-architecture.test.mjs` - Live Cargo metadata buffer aligned with the resolved desktop graph.
- `tooling-tests/workspace-config.test.mjs` - Workspace membership assertion independent of entry order.
- `package.json` and `tsconfig.json` - Format and typecheck coverage for the new TSX/CSS entrypoint.

## Decisions Made

- Kept the command bridge pull-based and typed: the shell polls `lifecycle_status` and invokes only `retry_lifecycle`; the native host remains the sole process authority.
- Used the host-provided safe message for ordinary recovery UI while exposing only the bounded failure code/diagnostic pair in a development build disclosure.
- Added narrow local React runtime declarations instead of installing unreviewed type packages outside the exact approved dependency set.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Quality] Updated stale workspace and Cargo metadata checks**
- **Found during:** Task 1 verification.
- **Issue:** The workspace test assumed `packages/*` was the first entry, and live Cargo metadata exceeded Node's default synchronous output buffer after the desktop graph was added.
- **Fix:** Asserted both workspace globs independently and raised only the Cargo metadata subprocess buffer to 64 MiB with matching regression coverage.
- **Files modified:** `tooling-tests/workspace-config.test.mjs`, `scripts/verify-cargo-architecture.mjs`, `tooling-tests/verify-cargo-architecture.test.mjs`
- **Verification:** Live `pnpm rust:architecture` passes against the resolved workspace graph.
- **Committed in:** `192b0de`

**2. [Rule 3 - Blocking Entry Wiring] Replaced the hidden inline stub with the planned React entrypoint**
- **Found during:** Task 2 implementation.
- **Issue:** Plan 04-03 intentionally left an inline hidden root and Plan 04-04's file list did not name `index.html`; the new `main.tsx` would not execute without replacing it.
- **Fix:** Pointed the existing root at `/src/main.tsx` without adding navigation, product UI, or another runtime surface.
- **Files modified:** `apps/desktop/index.html`
- **Verification:** The production Vite build passes and emits the operational shell bundle.
- **Committed in:** `a0244a8`

**3. [Rule 3 - Blocking Type Coverage] Added checked TSX coverage without widening dependencies**
- **Found during:** Task 2 typecheck.
- **Issue:** The root TypeScript configuration excluded TSX, and the approved dependency transaction did not include React declaration packages. Loading all Vite client globals also collided with Vitest's Vite 7 declarations.
- **Fix:** Included TSX with `react-jsx`, added narrow local runtime/import-meta declarations, and extended the repository format gate to the new source files.
- **Files modified:** `tsconfig.json`, `package.json`, `apps/desktop/src/react-runtime.d.ts`
- **Verification:** `pnpm typecheck` passes with no errors; the focused suite and Vite production build also pass.
- **Committed in:** `a0244a8`

---

**Total deviations:** 3 auto-fixed (3 Rule 3 blocking issues).
**Impact on plan:** Each change was necessary to execute or verify the requested lifecycle shell; no product, persistence, network, or shell authority scope was added.

## Issues Encountered

- The required aggregate `pnpm check` was run once with Cargo available. Toolchains, formatting, lint, typecheck, all six Plan 04-04 desktop tests, and 34 other tests passed; the run stopped at 40/41 tests because the pre-existing Phase 3 scope test raced the contract-client generation suite and reported transient drift. `pnpm contracts:client:check` passed immediately in isolation. The concurrency repair is recorded in `deferred-items.md` and was not changed in this desktop lifecycle plan.

## Verification

- Focused desktop lifecycle suite: 6/6 passed.
- Root TypeScript typecheck: passed.
- Desktop Vite production build: passed.
- Rust workspace tests: passed.
- Live Cargo architecture policy: passed.
- Repository formatting stage, lint stage, and `git diff --check`: passed.
- Production bundle scan found no `Development diagnostics` or `Copy diagnostic` strings.
- Stub scan found no TODO, FIXME, placeholder, empty-render data, or deferred UI content in the created shell files.

## Known Stubs

None.

## Threat Surface

No unplanned threat surface was introduced. The fixed packaged-sidecar capability, loopback readiness probe, native commands, and development diagnostic boundary are the surfaces explicitly covered by the plan threat model.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-06 can consume the verified desktop build and quality commands in its scoped Linux CI job.
- Phase 5 can replace this deliberately narrow operational styling with approved tokens and primitives without changing lifecycle authority.
- The unrelated aggregate Vitest concurrency race remains deferred; isolated contract-client drift verification is green.

## Self-Check: PASSED

- Native lifecycle host, React shell, focused regression suite, and summary files exist.
- Task commits `0176a62`, `192b0de`, `21e3b8c`, and `a0244a8` exist in git history.
- Summary frontmatter records `status: complete` and requirement `FOUND-01`.

---
*Phase: 04-desktop-shell-local-persistence*
*Completed: 2026-07-14*
