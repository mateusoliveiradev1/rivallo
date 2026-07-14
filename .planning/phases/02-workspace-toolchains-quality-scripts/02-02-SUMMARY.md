---
phase: 02-workspace-toolchains-quality-scripts
plan: 02
subsystem: toolchain-validation
tags: [node, pnpm, rust, cargo, rustup, vitest]
dependency_graph:
  requires: [02-01, 02-03]
  provides: [portable-toolchain-validator, actionable-toolchain-diagnostics]
  affects: [02-04, 03-rust-modular-monolith-api-contracts]
key_files:
  created:
    - scripts/check-toolchains.mjs
    - tooling-tests/check-toolchains.test.mjs
    - tooling-tests/fixtures/tool-version.mjs
  modified:
    - package.json
decisions:
  - Toolchain minima are read only from package.json and rust-toolchain.toml.
  - Every rustc and Cargo child is launched with RUSTUP_AUTO_INSTALL=0.
  - Windows pnpm detection runs the installed shim's JavaScript entry through Node without shell interpolation.
metrics:
  completed_date: 2026-07-14
status: complete
---

# Phase 2 Plan 02: Portable Toolchain Validation Summary

Implemented the real root `pnpm toolchains` validator and automated its compatible, incompatible, and unavailable-toolchain behavior.

## Tasks Completed

1. Added a portable Vitest contract with isolated Node fixtures for stable, missing, below-minimum, unparsable, prerelease, mismatched, and unavailable-selected-toolchain cases.
2. Added manifest-driven validation for Node, pnpm, rustc, and Cargo, including actionable remediation and a Rust/Cargo mismatch diagnostic.

## Verification

- `rustc --version` — `1.88.0`
- `cargo --version` — `1.88.0`
- `pnpm toolchains`
- `pnpm test -- --run tooling-tests/check-toolchains.test.mjs`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `git diff --check`

All passed after the user-installed Rust toolchain was added to the active shell PATH. No installer, updater, package-manager toolchain action, or tracked-file write is performed by the validator.

## Task Commits

1. **Portable validator behavior contract** — `2136a2f` (`test`)
2. **Manifest-driven validator implementation** — `172c3ab` (`feat`)

## Deviations from Plan

### Rule 3 — Windows pnpm shim compatibility

Windows `.cmd` shims cannot be executed directly through a shell-free Node child process. The validator resolves the installed `pnpm.cmd` path with `where.exe` and invokes its standard JavaScript entry with `process.execPath`, retaining argument-array execution and avoiding shell interpolation.

## Notes

The pre-existing unstaged `.gitignore` edit and untracked Gate 0 / phase README planning artifacts were preserved and were not staged.
