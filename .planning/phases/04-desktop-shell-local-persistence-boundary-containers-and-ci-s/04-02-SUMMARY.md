---
phase: 04-desktop-shell-local-persistence
plan: "02"
subsystem: api
tags: [rust, axum, tokio, loopback, sidecar, graceful-shutdown]

requires:
  - phase: 03-rust-modular-monolith-and-api-contract-pipeline
    provides: Contracts-owned compatibility version and inward crate dependency boundaries.
provides:
  - Fixed loopback-only Axum health and compatibility-aware readiness service.
  - Strict readiness validation over service identity, contract version, and runtime protocol.
  - Packagable sidecar binary with private stdin-driven graceful shutdown.
affects: [04-03-desktop-workspace, 04-04-desktop-lifecycle]

tech-stack:
  added: [axum 0.8.9, tokio 1.52.3]
  patterns:
    - Outer platform runtime with framework-independent domain, application, and contracts crates.
    - One cancellation token shared by the Axum graceful-shutdown path and private child stdin control.

key-files:
  created:
    - crates/platform/src/runtime.rs
    - tooling-tests/phase-4-runtime.test.mjs
  modified:
    - Cargo.lock
    - crates/platform/Cargo.toml
    - crates/platform/src/lib.rs
    - crates/platform/src/bin/local_api.rs
    - tooling-tests/phase-3-scope.test.mjs

key-decisions:
  - "The approved Axum/Tokio runtime remains exclusively in the outer platform crate; domain, application, and contracts stay runtime-framework independent."
  - "The sidecar accepts only the fixed private stdin shutdown message and shares its cancellation token with Axum graceful shutdown; no HTTP management route or runtime address argument exists."

patterns-established:
  - "Readiness compatibility requires exact service, contractVersion, and runtimeProtocol equality before a responder is reusable."
  - "Phase-specific architecture fences target protected inner boundaries instead of forbidding approved later-phase implementation in outer platform code."

requirements-completed: [FOUND-01]

duration: 8min
completed: 2026-07-14
status: complete
---

# Phase 4 Plan 2: Loopback Runtime Sidecar Summary

**Fixed-loopback Axum sidecar with exact compatibility-aware readiness and private stdin cancellation wired into graceful server shutdown.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-14T12:26:38-03:00
- **Completed:** 2026-07-14T12:33:58-03:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added loopback-only `/health` and `/ready` routes with a bounded, exact readiness payload derived from the contracts-owned version.
- Added strict diagnostics for unhealthy, malformed, or incompatible readiness responses and cancellation-driven Axum shutdown.
- Packaged the runtime as a thin `local_api` sidecar whose only control channel is the fixed private stdin `shutdown` message.
- Preserved runtime-framework independence for domain, application, and contracts through focused source and manifest regression checks.

## Task Commits

Each task was committed atomically using TDD test and implementation commits:

1. **Task 1: Define and test the loopback runtime protocol and Axum service** - `fbcb370` (test), `6b92592` (feat)
2. **Task 2: Package the runtime as a sidecar-only binary and add scope regression proof** - `7bb0dd8` (test), `e03cf04` (feat)

## Files Created/Modified

- `Cargo.lock` - Locks the approved Axum and Tokio dependency graph.
- `crates/platform/Cargo.toml` - Adds narrowly scoped Axum and Tokio runtime dependencies to platform only.
- `crates/platform/src/lib.rs` - Exposes the bounded runtime surface needed by the sidecar and later desktop host.
- `crates/platform/src/runtime.rs` - Implements fixed loopback routing, readiness validation, private shutdown control, and graceful serving.
- `crates/platform/src/bin/local_api.rs` - Runs the sidecar and shares one cancellation token between stdin control and server shutdown.
- `tooling-tests/phase-4-runtime.test.mjs` - Enforces loopback, route, readiness, control-channel, and inner-crate dependency boundaries.
- `tooling-tests/phase-3-scope.test.mjs` - Keeps Phase 3 inner-crate and contract-pipeline fences while allowing Phase 4 platform runtime code.

## Decisions Made

- Axum and Tokio are platform implementation details. The protected inner crates remain free of runtime, UI, persistence, and transport frameworks.
- Readiness reuse is all-or-nothing: the service identity, contracts version, runtime protocol, and payload shape must all match exactly.
- Graceful shutdown is reachable only through the managed child's stdin and is not exposed as an HTTP route or user-controlled command.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Test] Narrowed the superseded Phase 3 runtime fence**
- **Found during:** Task 2 aggregate verification.
- **Issue:** `phase-3-scope.test.mjs` blanket-scanned all of `crates/` and rejected Axum anywhere, which conflicted with the explicitly approved Phase 4 outer platform runtime.
- **Fix:** Limited that fence to `domain`, `application`, `contracts`, and the contract pipeline scripts. The protected inner boundaries remain fully enforced while `platform` may host the approved runtime.
- **Files modified:** `tooling-tests/phase-3-scope.test.mjs`
- **Verification:** Focused Phase 3 and Phase 4 suites passed together (7 tests), and the full Vitest run passed 31 tests during aggregate verification.
- **Committed in:** `e03cf04`

**2. [Rule 3 - Blocking Quality] Satisfied repository type and Rust formatting gates**
- **Found during:** Task 2 aggregate verification.
- **Issue:** The new JavaScript helper lacked its required JSDoc parameter type, and Task 1 Rust source had not yet been normalized by `cargo fmt`.
- **Fix:** Added the helper annotation and formatted the plan's Rust sources without changing behavior.
- **Files modified:** `tooling-tests/phase-4-runtime.test.mjs`, `crates/platform/src/runtime.rs`
- **Verification:** Type checking and all 31 Vitest tests passed in the aggregate run; `pnpm rust:fmt` passed after formatting.
- **Committed in:** `e03cf04`

---

**Total deviations:** 2 auto-fixed (2 Rule 3 blocking issues).
**Impact on plan:** Both fixes were required to complete the existing quality gates and preserved the intended architecture without expanding runtime scope.

## Issues Encountered

- Cargo was not initially discoverable on this Windows shell's `PATH`; verification used the already-installed `<local-user>\.cargo\bin` location documented by phase research, with `RUSTUP_AUTO_INSTALL=0` preserved by project scripts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-03 can package the fixed `local_api` binary without redefining its address or runtime protocol.
- Plan 04-04 can probe the exported compatibility schema and own the child process through the private stdin shutdown channel.
- No blockers remain for downstream desktop lifecycle work.

## Self-Check: PASSED

- Runtime, sidecar, and regression-test files exist.
- Task commits `fbcb370`, `6b92592`, `7bb0dd8`, and `e03cf04` exist in git history.
- Focused Phase 3/4 tests, Rust tests, Clippy, architecture, and Rust formatting checks passed.
- No known stubs or unplanned threat surface remain; the loopback endpoints and fixed runtime inputs are covered by the plan threat model.

---
*Phase: 04-desktop-shell-local-persistence*
*Completed: 2026-07-14*
