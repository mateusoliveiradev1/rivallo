---
phase: 02-workspace-toolchains-quality-scripts
plan: 04
subsystem: infra
tags: [cargo, clippy, rustfmt, cargo-nextest, pnpm, quality]
requires:
  - phase: 02-workspace-toolchains-quality-scripts
    provides: Root workspace metadata, toolchain validator, and JavaScript quality commands.
provides:
  - Meaningful Rust quality commands for the zero-member virtual workspace.
  - A fail-fast, non-mutating root quality aggregate and narrow local-cache ignores.
  - Reproducible local-development documentation without infrastructure requirements.
affects: [03-rust-modular-monolith-api-contracts, 04-desktop-shell-local-persistence]
tech-stack:
  added: [cargo-nextest]
  patterns: [RUSTUP_AUTO_INSTALL=0 Rust child processes, explicit zero-member quality contract]
key-files:
  created: [scripts/check-rust-quality.mjs]
  modified: [package.json, scripts/run-quality.mjs, .gitignore, README.md, docs/operations/local-development.md]
key-decisions:
  - Zero-member Rust quality validates components and workspace metadata instead of misrepresenting a Cargo no-op as source linting.
  - All Rust/Cargo child processes use Node adapters that set RUSTUP_AUTO_INSTALL=0.
  - The aggregate runs real atomic commands in fail-fast order and remains non-mutating.
patterns-established:
  - Non-empty Rust workspaces must run Clippy with warnings denied.
  - Quality commands may create only narrow ignored cache artifacts and must preserve a clean tracked tree.
requirements-completed: [FOUND-01, FOUND-02]
duration: 18min
completed: 2026-07-14
status: complete
---

# Phase 2 Plan 04: Rust Quality and Reproducibility Summary

**A zero-member Cargo workspace now proves its formatter, Clippy, nextest, and metadata boundaries without inventing a crate or allowing Rustup downloads.**

## Accomplishments

- Added portable Rust-quality commands that distinguish explicit zero-member component/structure checks from non-empty source linting.
- Added `pnpm check`, which validates toolchains first and runs all real atomic checks fail-fast.
- Added narrow cache ignores and clean-checkout instructions with no credentials, cloud services, Docker, or product applications.

## Task Commits

1. **Task 1: Empirically establish meaningful Rust quality behavior for an empty virtual workspace** — `6e00acb`
2. **Task 2: Complete check and smoke scripts with clean-tree enforcement** — `5f2d12c`
3. **Task 3: Publish exact clean-checkout commands and ownership boundaries** — `ef72ece`

## Verification

- Ran `pnpm rust:fmt`, `pnpm rust:clippy`, `pnpm rust:test`, and `node scripts/verify-cargo-workspace.mjs` through Node adapters with `RUSTUP_AUTO_INSTALL=0`.
- Ran `pnpm check` twice; both runs passed, including formatting, lint, typecheck, Vitest, Rust checks, metadata, and smoke checks.
- Ran `git diff --check`; it passed. Local `target/` remained ignored.

## Decisions Made

- A zero-member workspace reports its state and verifies the required component plus Cargo metadata; it is never called a source-lint success.
- When Phase 3 adds members, `rust:fmt` runs check mode and `rust:clippy` runs workspace/all-target linting with `-D warnings`.
- `cargo-nextest` is validated by its version command plus Cargo workspace metadata; no fabricated test crate was introduced.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule 3 - Blocking] Used the installed pnpm JavaScript entry point on Windows.**
   - **Issue:** Direct Node spawning of `pnpm.cmd` returns `EINVAL` on Windows.
   - **Fix:** The aggregate resolves the installed pnpm shim and invokes its `pnpm.mjs` entry point with Node.
   - **Verification:** `pnpm check` passed twice on Windows.

## Issues Encountered

`cargo-nextest` was absent at the prior checkpoint. The user explicitly authorized its installation; this continuation only used the available `cargo-nextest 0.9.114` and installed no additional tool.

## User Setup Required

None — no external service configuration is required.

## Next Phase Readiness

Phase 3 can add real Rust crates and API-contract tooling while preserving the Rust child-process boundary and replacing the zero-member branches with source-level checks.

---
*Phase: 02-workspace-toolchains-quality-scripts*
*Plan: 04*
*Completed: 2026-07-14*
