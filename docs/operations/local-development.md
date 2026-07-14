# Local Development

## Phase 2 boundary

This phase is a configuration-only foundation for Windows, macOS, and Linux. It has no application, API, Rust member crate, database, Docker service, cloud resource, credential, or CI workflow. Do not expect Tauri, axum/API, persistence, integration, Docker, or CI-specific commands yet.

Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `Cargo.toml`, and `rust-toolchain.toml` are root-owned configuration. Phase 3 owns real Rust crates and the contract pipeline. Phase 4 owns the desktop/API shell, local persistence boundary, containers, and CI skeleton.

## Prerequisites

Install stable Node.js 22.0.0 or newer, pnpm 10.0.0 or newer, and matching stable Rust/Cargo 1.88.0 or newer yourself. Rust must also provide the `rustfmt` and `clippy` components, and `cargo-nextest` is required for `pnpm rust:test`.

The validator accepts compatible stable releases and rejects prereleases. A failure reports the expected tool, minimum version, detected version when available, and a concise remediation. Follow that remediation manually; no project command installs or updates a toolchain.

All Rust/Cargo subprocesses set `RUSTUP_AUTO_INSTALL=0`. If the selected Rust channel is unavailable, install it and required components manually before rerunning the validator. `pnpm install --frozen-lockfile` installs only the lockfile's JavaScript dependencies; it is not toolchain setup.

## Clean-checkout validation

Run these commands from the repository root:

```text
pnpm install --frozen-lockfile
pnpm toolchains
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm rust:fmt
pnpm rust:clippy
pnpm rust:test
pnpm smoke
pnpm check
```

`pnpm check` executes the same meaningful layers in fail-fast order, beginning with `pnpm toolchains`. Each layer is runnable independently for reproduction. All validation commands are non-mutating: use a dedicated formatter write command only when intentionally changing formatting.

Repeated validation may create ignored local artifacts such as `node_modules/`, `.turbo/`, `target/`, coverage data, and `tooling-tests/.tmp/`. Starting from a clean tracked tree, commands must leave `git status --porcelain` empty. No credentials, Neon, Docker, or product services are required.
