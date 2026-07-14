---
phase: 02-workspace-toolchains-quality-scripts
plan: 01
subsystem: infra
tags: [pnpm, turborepo, cargo, rustup, workspace]

requires:
  - phase: 01-gate-0-foundation
    provides: Approved product, architecture, quality, and toolchain decisions.
provides:
  - Root-only pnpm and Turborepo metadata with committed local tooling lockfile.
  - Zero-member virtual Cargo workspace with a numbered stable Rust minimum.
  - Cargo metadata structural probe that blocks implicit Rustup downloads.
affects: [02-workspace-toolchains-quality-scripts, 03-rust-modular-monolith-api-contracts, 04-desktop-shell-local-persistence]

tech-stack:
  added: [pnpm, Turborepo, Cargo workspace, Rust 1.88.0]
  patterns: [root-only workspace metadata, numeric stable toolchain minimum, Node-owned Cargo metadata boundary]

key-files:
  created: [package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json, Cargo.toml, rust-toolchain.toml, scripts/verify-cargo-workspace.mjs]
  modified: []

key-decisions:
  - "Rust 1.88.0 is encoded as a numbered stable minimum rather than an exact lock or an unbounded stable alias."
  - "Cargo metadata is invoked only through a Node child-process boundary with RUSTUP_AUTO_INSTALL=0."

patterns-established:
  - "Root workspace: Phase 2 creates no application, package, or Rust crate members."
  - "Rust commands: future structural probes must merge the parent environment and set RUSTUP_AUTO_INSTALL=0."

requirements-completed: [FOUND-01]

duration: 4min
completed: 2026-07-14
status: complete
---

# Phase 2 Plan 01: Workspace Metadata Summary

**Root pnpm/Turborepo and zero-member Cargo workspaces now provide reproducible local tooling metadata without introducing application or domain scaffolding.**

## Performance

- **Duration:** 4 min
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added the root pnpm workspace, local quality-tool declarations, deterministic lockfile, and an intentionally empty Turbo task graph.
- Added a virtual Cargo workspace with no member crates and a Rust 1.88.0 stable minimum with `rustfmt` and `clippy` components.
- Added a cross-platform Node Cargo metadata probe that disables implicit Rustup downloads.

## Task Commits

1. **Task 1: Establish root pnpm metadata, locally declared tools, and the committed lockfile** - `bc9fb09` (chore)
2. **Task 2: Establish the virtual Cargo root and resolve Rust minimum encoding** - `8de22ba` (chore)

## Files Created/Modified

- `package.json` - root package identity, minimum Node/pnpm policy, and local quality dependencies.
- `pnpm-workspace.yaml` - explicit zero-package pnpm workspace configuration.
- `pnpm-lock.yaml` - deterministic resolution for local tooling.
- `turbo.json` - valid empty task configuration until a real quality task exists.
- `Cargo.toml` - virtual Cargo workspace with an explicit empty member list.
- `rust-toolchain.toml` - numbered stable Rust minimum and required components.
- `scripts/verify-cargo-workspace.mjs` - non-installing Cargo metadata structural verification.

## Decisions Made

- The numeric `1.88.0` Rust channel is the accepted minimum; later validation may accept stable compatible releases at or above it but must reject prereleases.
- Rust/Cargo structural verification uses Node argument-array process APIs with `RUSTUP_AUTO_INSTALL=0`, preventing a missing selected channel from downloading automatically.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Rust/Cargo was initially unavailable to the prior executor. The user explicitly authorized installation; the resumed task verified Rust/Cargo 1.88.0, `rustfmt`, and `clippy` before creating the Task 2 commit. No toolchain was installed by this execution step.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-03 can add the actual root quality configuration and commands. Plans 02-02 and 02-04 must retain the `RUSTUP_AUTO_INSTALL=0` boundary for Rust/Cargo child processes.

---
*Phase: 02-workspace-toolchains-quality-scripts*
*Plan: 01*
*Completed: 2026-07-14*
