# Phase 2 Validation Matrix

**Phase:** 02-workspace-toolchains-quality-scripts  
**Gate:** Gate 1 — Scaffold and Toolchains  
**Mode:** automated validation with clean-tree evidence

## Validation Contract

All commands are run from a clean tracked checkout on Windows, macOS, and Linux. They are repeatable and must leave `git status --porcelain` empty after the declared local artifacts are ignored. A missing required executable, unsupported stable version, prerelease, unavailable selected Rust toolchain, or Rust/Cargo mismatch must fail non-zero with the required actionable diagnostic; no command may install or update a toolchain. Every Phase 2 Rust/Cargo probe and quality child is launched through portable Node environment handling with `RUSTUP_AUTO_INSTALL=0`, so rustup cannot download a selected channel implicitly.

## Task-to-Evidence Mapping

| Plan / task | Automated evidence | Required result |
|---|---|---|
| 02-01 / Task 1 | `pnpm install --frozen-lockfile`; `pnpm exec turbo --version`; `pnpm list --depth -1` | Committed lockfile resolves local quality tools; pnpm workspace and local Turbo are real. |
| 02-01 / Task 2 | `node scripts/verify-cargo-workspace.mjs` | Zero-member virtual Cargo workspace is structurally valid through a metadata child with `RUSTUP_AUTO_INSTALL=0`. |
| 02-02 / Task 1 | `pnpm test -- --run tooling-tests/check-toolchains.test.mjs` | Controlled diagnostic paths, including unavailable selected toolchain, fail or pass as specified; each Rust/Cargo child receives `RUSTUP_AUTO_INSTALL=0` and leaves no tracked write. |
| 02-02 / Task 2 | `pnpm test -- --run tooling-tests/check-toolchains.test.mjs`; `pnpm toolchains` | Native manifests drive the portable validator and a supported stable environment passes. |
| 02-03 / Task 1 | `pnpm format:check`; `pnpm lint`; `pnpm typecheck` | Existing Phase 2 files are checked, lint warnings block, and checks do not write. |
| 02-03 / Task 2 | `pnpm test -- --run tooling-tests/workspace-config.test.mjs` | Vitest configuration and a real workspace smoke test exist before Plan 02 uses Vitest. |
| 02-03 / Task 3 | `pnpm lint`; `pnpm format:check`; `pnpm typecheck`; `pnpm test`; `pnpm smoke`; `pnpm exec turbo run quality` | Each JavaScript atomic command and the root Turbo task performs a real check. |
| 02-04 / Task 1 | `pnpm rust:fmt`; `pnpm rust:clippy`; `pnpm rust:test`; `node scripts/verify-cargo-workspace.mjs` | For the valid zero-member workspace, rustfmt, Clippy, and nextest checks succeed through explicit component/availability plus Cargo-metadata evidence, with every Rust/Cargo child carrying `RUSTUP_AUTO_INSTALL=0`. `rust:clippy` reports zero members and never labels a Cargo no-op as source lint; a later non-empty workspace runs Clippy with warnings denied. |
| 02-04 / Task 2 | `pnpm check`; `pnpm check`; `git status --porcelain` | Final aggregate is fail-fast and two consecutive runs keep the tracked tree clean. |
| 02-04 / Task 3 | `pnpm check`; `git diff --check`; `git status --porcelain` | Documentation sequence is executable and leaves no tracked change. |

## Gate Evidence

1. Begin with `git status --porcelain`; it must be empty before the suite.
2. Run `pnpm install --frozen-lockfile`, every mapped atomic command, then `pnpm smoke` and `pnpm check` twice.
3. Run `git diff --check` and `git status --porcelain`; both must show no tracked-file mutation.
4. Inspect the root script inventory and configuration paths: no app, crate, Tauri, axum/API, persistence, Docker, CI, or Playwright command is present.
5. Confirm only ignored local artifacts such as `node_modules`, `.turbo`, and `target` were created.
6. Run the controlled unavailable-selected-toolchain validator case; confirm non-zero status, expected tool/minimum/detected details when available, manual installation remediation, and no network-triggering rustup invocation.

## Requirement Coverage

| Requirement | Evidence |
|---|---|
| FOUND-01 | Workspace discovery, Cargo metadata, native toolchain policy, lockfile install, and clean-tree repetition. |
| FOUND-02 | Local TypeScript/ESLint/Prettier/Vitest/Turbo checks plus Rust formatting, Clippy, nextest, and final aggregate evidence. |
