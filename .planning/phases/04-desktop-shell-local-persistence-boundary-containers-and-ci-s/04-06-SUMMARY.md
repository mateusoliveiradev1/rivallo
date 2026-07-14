---
phase: 04-desktop-shell-local-persistence
plan: "06"
subsystem: infrastructure
tags: [docker-compose, postgres, github-actions, ci, tauri]

requires:
  - phase: 04-04
    provides: Verified lifecycle shell and root desktop build path.
  - phase: 04-05
    provides: Inert persistence boundary with no schema or storage side effects.
provides:
  - One loopback-only local PostgreSQL Compose service with named persistent storage and healthchecking.
  - Three scoped non-publishing GitHub Actions jobs for JavaScript/TypeScript, Rust/contracts, and Linux desktop build.
  - Deterministic serial tooling tests that prevent contract writer/drift-reader races.
affects: [local-development, continuous-integration, phase-08-local-persistence]

tech-stack:
  added: [PostgreSQL 17 Alpine Compose service, GitHub Actions]
  patterns: [explicit destructive cleanup, dependency-store-only CI caching, scoped CI jobs]

key-files:
  created:
    - docker-compose.yml
    - .github/workflows/ci.yml
    - tooling-tests/phase-4-infrastructure.test.mjs
  modified:
    - docs/operations/local-development.md
    - package.json
    - scripts/run-quality.mjs
    - vitest.config.mjs

key-decisions:
  - "Use the official postgres:17-alpine major image with loopback-only publishing, environment-overridable non-secret local defaults, and a named volume."
  - "Keep CI at exactly three Ubuntu jobs and cache only the pnpm dependency store through setup-node; publish no artifacts."
  - "Run Vitest files serially because generated-contract writer tests and drift readers share tracked artifacts and must never overlap."

patterns-established:
  - "Normal Compose shutdown preserves data; destructive volume removal is a separate conspicuous operation."
  - "CI invokes existing root verification commands directly so JavaScript, Rust/contracts, and desktop failures remain independently visible."

requirements-completed: [FOUND-01, FOUND-02]

duration: 10min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 6: Local PostgreSQL and Scoped CI Summary

**A persistent loopback PostgreSQL Compose service and three-job GitHub Actions workflow now expose bounded local operations, deterministic contract checks, and a Linux no-bundle desktop build without publishing artifacts.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-14T16:30:00Z
- **Completed:** 2026-07-14T16:40:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added one official PostgreSQL 17 Alpine service with overrideable non-secret defaults, loopback port binding, `pg_isready`, and persistent named storage.
- Documented start, health inspection, preserving shutdown, and separately conspicuous destructive volume cleanup without an environment file, initialization, schema, migration, seed, or Neon surface.
- Added exactly three Ubuntu GitHub Actions jobs using frozen pnpm installs and lockfile-keyed dependency-store caching, with no matrix, packaging, credentials, target cache, volume cache, or artifact publication.
- Eliminated the transient contract-client drift race by serializing Vitest files while preserving all 44 tests and both explicit drift checks.

## Task Commits

Each task used a failing test gate followed by an implementation commit:

1. **Task 1: Declare and document bounded local PostgreSQL Compose operations** - `8c99b4c` (test), `c01cc88` (chore)
2. **Task 2: Wire the three scoped CI jobs and no-publish fence** - `dd2ff94` (test), `ec31169` (chore)

## Files Created/Modified

- `docker-compose.yml` - One bounded local PostgreSQL service, named volume, and healthcheck.
- `docs/operations/local-development.md` - Exact preserving and destructive Compose operations plus override guidance.
- `.github/workflows/ci.yml` - Three scoped Ubuntu CI jobs with dependency-store caching and no publication surface.
- `package.json` - Root `desktop:build` command and formatting coverage for infrastructure files.
- `scripts/run-quality.mjs` - Validation of the real desktop build command and phase-neutral aggregate completion output.
- `vitest.config.mjs` - Serial test-file execution for shared generated-artifact safety.
- `tooling-tests/phase-4-infrastructure.test.mjs` - Static Compose, operations, CI scope, cache, platform, and publication fences.

## Decisions Made

- Selected `postgres:17-alpine`, a supported official major image, to keep the local service small and explicit without introducing initialization behavior.
- Pinned CI's existing Rust test prerequisite to `cargo-nextest 0.9.114`, whose declared minimum Rust version matches the repository's Rust 1.88 baseline.
- Installed the exact Rust toolchain explicitly in Rust-requiring jobs while retaining `RUSTUP_AUTO_INSTALL=0`; project commands still never install toolchains implicitly.
- Used `actions/setup-node@v4` pnpm caching keyed by `pnpm-lock.yaml`; Cargo targets, artifacts, credentials, generated application output, and PostgreSQL data are not cached.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Race condition] Serialized generated-artifact tooling tests**
- **Found during:** Task 2 aggregate verification.
- **Issue:** The documented Phase 3 contract-client writer test could overlap a drift reader under Vitest's file parallelism, producing transient CI drift from a clean checkout.
- **Fix:** Set `fileParallelism: false` so writer and reader test files cannot overlap, without skipping or weakening any test or drift command.
- **Files modified:** `vitest.config.mjs`, `tooling-tests/phase-4-infrastructure.test.mjs`, phase `deferred-items.md`
- **Verification:** `pnpm check` passed all 44 tests; the contract-client generation suite, Phase 3 scope suite, and both explicit drift checks were green.
- **Committed in:** `ec31169`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 race condition).
**Impact on plan:** The repair makes CI deterministic while retaining the full verification surface and introduces no product or publication behavior.

## Verification

- Focused infrastructure suite: 3/3 passed.
- Full `pnpm check`: 11 files and 44 tests passed, followed by Rust fmt, warnings-denied Clippy, nextest, architecture, OpenAPI drift, and contract-client drift.
- Root `pnpm desktop:build`: passed with the named sidecar and Tauri `--no-bundle` path.
- `pnpm install --frozen-lockfile`, formatting, lint, typecheck, and `git diff --check`: passed.
- Docker Compose configuration/runtime health: not executable on this host because Docker/Compose is not installed. Prettier YAML parsing and the focused static contract passed; no external infrastructure was provisioned.
- Hosted GitHub Actions run: not observable without pushing this local branch. Workflow syntax/shape is covered by Prettier parsing and static regression assertions.

## Issues Encountered

- The GSD `state.advance-plan` handler could not parse this repository's frontmatter-only progress format. The remaining state handlers successfully recalculated progress, recorded metrics/decisions/session, updated requirements, and audited roadmap progress; the status and next-action fields were then aligned to the handler's documented phase-complete values.

## Known Stubs

None.

## Threat Surface

No unplanned threat surface was introduced. The only new listener mapping is the planned PostgreSQL port bound to `127.0.0.1`; CI has read-only repository contents permission and no secrets or publication steps.

## User Setup Required

Docker Desktop or another Docker Compose v2 installation is required only to exercise the documented local PostgreSQL runtime and healthcheck. No credentials, hosted service, or committed environment file is required.

## Next Phase Readiness

- Developers can start and stop persistent local PostgreSQL without accidentally removing its named volume.
- Pull requests and main-branch pushes expose independent JavaScript/TypeScript, Rust/contracts, and Linux desktop-build responsibilities.
- Runtime Compose health and a hosted green Actions run remain environment verification items for Gate 1; the repository-side contracts are complete.

## Self-Check: PASSED

- Compose, workflow, focused infrastructure test, and summary files exist.
- Task commits `8c99b4c`, `c01cc88`, `dd2ff94`, and `ec31169` exist in git history.
- Summary frontmatter records `status: complete` and both plan requirements.
- No tracked files were deleted by any task commit.

---
*Phase: 04-desktop-shell-local-persistence*
*Completed: 2026-07-14*
