---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "04"
subsystem: contracts
tags: [rust, utoipa, openapi, schema-only, exporter]
requires:
  - phase: 03-01
    provides: strict inward application and platform crate topology
  - phase: 03-02
    provides: Cargo metadata architecture enforcement
provides:
  - Canonical Rust transport schema metadata and semantic contract version
  - Deterministic schema-only OpenAPI exporter binary
affects: [03-05, 03-06, contract-pipeline]
tech-stack:
  added: [utoipa 5.5.0, serde_json]
  patterns: [contracts-owned schemas, platform-only OpenAPI composition, explicit output-path exporter]
key-files:
  created: [crates/platform/src/bin/export_openapi.rs]
  modified: [Cargo.toml, Cargo.lock, crates/contracts/Cargo.toml, crates/contracts/src/lib.rs, crates/platform/Cargo.toml, crates/platform/src/lib.rs]
key-decisions:
  - "Contracts owns ContractManifest, CONTRACT_VERSION, and the ToSchema derivation."
  - "Platform derives a components-only Utoipa document with no paths and serializes it with stable pretty JSON."
  - "The export-openapi binary accepts only --output <path>, keeping artifact writing explicit and runtime-free."
metrics:
  duration: 12min
  completed: 2026-07-14
status: complete
---

# Phase 3 Plan 04: Canonical Rust Contract Exporter Summary

**Rust-owned contract schemas now compose into a deterministic schema-only OpenAPI document through an explicit platform exporter.**

## Accomplishments

- Added `utoipa` 5.5.0 schema metadata to the contracts boundary and kept the semantic `CONTRACT_VERSION` as its sole version authority.
- Added the neutral `ContractManifest` schema, derived from Rust rather than manually assembled JSON.
- Added platform-only Utoipa composition containing only neutral components and an empty `paths` object.
- Added `cargo run --quiet --package rivallo-platform --bin export-openapi -- --output <path>` for deterministic JSON export.

## Task Commits

1. **Task 1: Make Rust contracts canonical and compose schema-only OpenAPI**
   - `1b6a1ad` test RED: add failing canonical contract schema test
   - `000866c` feat GREEN: make Rust contract schema canonical
2. **Task 2: Compose the schema-only platform exporter executable**
   - `72084d8` test RED: add failing schema-only exporter test
   - `3ac9650` feat GREEN: export schema-only OpenAPI document

## Verification

- `cargo fmt --check` passed.
- `cargo test --workspace` passed with contract and platform schema-only tests.
- `cargo clippy --workspace --all-targets -- -D warnings` passed.
- `cargo run --quiet --package rivallo-platform --bin export-openapi -- --output target/openapi-test.json` wrote deterministic schema-only JSON with an empty `paths` object.

## Decisions Made

- The platform crate alone derives and serializes the OpenAPI document; application remains independent of contracts.
- The exporter has no listener, endpoint, fixture, persistence adapter, authentication, or runtime registration.
- The document's version is `CONTRACT_VERSION` from `rivallo-contracts`, not a second platform-owned value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Explicitly named the hyphenated Cargo binary**
- **Found during:** Task 2 exporter-interface verification
- **Issue:** Cargo derives `export_openapi` from the source filename, which did not satisfy the required stable `--bin export-openapi` command.
- **Fix:** Added an explicit `[[bin]]` entry mapping `export-openapi` to `src/bin/export_openapi.rs`.
- **Files modified:** `crates/platform/Cargo.toml`
- **Commit:** `3ac9650`

## TDD Gate Compliance

- Each task began with a focused failing Rust test and a dedicated `test(03-04)` RED commit before its implementation commit.

## Scope and Security Review

- No new network endpoint, runtime listener, auth path, persistence adapter, file read surface, or schema trust boundary was introduced beyond explicit output-file writing by the requested exporter.
- No stubs, fixtures, product models, football concepts, generated artifacts, or TypeScript package were added.

## Self-Check: PASSED

- Canonical schema source, platform composition library, and `export-openapi` binary exist.
- Task commits `1b6a1ad`, `000866c`, `72084d8`, and `3ac9650` exist and contain no tracked-file deletions.
