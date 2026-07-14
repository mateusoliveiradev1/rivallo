---
phase: 03
slug: rust-modular-monolith-and-api-contract-pipeline
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|---|---|
| **Framework** | Node built-in test runner for tooling tests; Cargo nextest for Rust crates |
| **Config file** | `package.json`, `tooling-tests/`, and Cargo workspace manifests |
| **Quick run command** | `pnpm test -- tooling-tests/<focused-test>.test.mjs` |
| **Full suite command** | `pnpm check` |
| **Estimated runtime** | Under 60 seconds on a prepared local toolchain |

## Sampling Rate

- **After every task commit:** Run the task's focused automated command.
- **After every plan wave:** Run `pnpm check`.
- **Before `$gsd-verify-work`:** Run `pnpm check` from a clean tracked tree twice.
- **Max feedback latency:** 60 seconds for focused tooling/Rust checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---:|---:|---|---|---|---|---|---|---|
| 03-01-01 | 01 | 1 | FOUND-03 | T-03-01 | Four crates compile with inward responsibilities and no transport entrypoint. | Rust unit/metadata smoke | `pnpm toolchains && cargo check --workspace && cargo metadata --format-version=1 --no-deps` | ❌ created by task | ⬜ pending |
| 03-01-02 | 01 | 1 | FOUND-03 | T-03-02 | Real metadata traversal rejects inverted edges and transitive forbidden domain dependencies. | Node unit + integration | `pnpm test -- tooling-tests/verify-cargo-architecture.test.mjs && node scripts/verify-cargo-architecture.mjs` | ❌ created by task | ⬜ pending |
| 03-02-01 | 02 | 2 | FOUND-03 | T-03-03 | The Plan 03-02 Task 1 quality wrapper checks the real workspace with no auto-install, and real metadata enforces domain none, application-to-domain only, contracts none, platform-to-application/contracts only, including an application-to-contracts rejection. | Node unit + integration | `node scripts/check-rust-quality.mjs check && pnpm test -- tooling-tests/verify-cargo-architecture.test.mjs && node scripts/verify-cargo-architecture.mjs` | ❌ extended by task | ⬜ pending |
| 03-03-01 | 03 | 2 | DATA-02 | T-03-04 | The SUS generator is neither installed nor used before explicit human approval. | Human checkpoint | `MISSING — record exact package approval in 03-03-SUMMARY.md` | ❌ summary created by task | ⬜ pending |
| 03-04-01 | 04 | 3 | DATA-02 | T-03-05 | Rust-owned schemas and semantic version compose a schema-only OpenAPI document without a runtime operation. | Rust unit | `cargo test --workspace` | ❌ created by task | ⬜ pending |
| 03-05-01 | 05 | 4 | DATA-02 | T-03-06 | The Plan 03-05 Task 1 writer materializes committed OpenAPI deterministically from the Rust exporter. | Node integration | `pnpm contracts:openapi:generate && pnpm contracts:openapi:generate && git diff --exit-code -- contracts/openapi.json` | ❌ created by task | ⬜ pending |
| 03-05-02 | 05 | 4 | DATA-02 | T-03-06 | The Plan 03-05 Task 2 verifier uses isolated output, detects drift without repair, and the focused OpenAPI pipeline tests prove schema-only provenance. | Node integration | `pnpm contracts:openapi:check && pnpm test -- tooling-tests/openapi-pipeline.test.mjs && git diff --exit-code -- contracts/openapi.json` | ❌ created by task | ⬜ pending |
| 03-06-01 | 06 | 5 | DATA-02 | T-03-07 | Generated-only contracts client derives types, metadata, and a minimal client exclusively from committed OpenAPI through the root writer command. | Generation/writer/typecheck | `pnpm contracts:client:generate && pnpm typecheck` | ❌ created by task | ⬜ pending |
| 03-06-02 | 06 | 5 | DATA-02 | T-03-08 | Client drift verifier consumes the writer interface, uses isolated output, and rejects hand-authored schema duplicates. | Node integration | `pnpm contracts:client:check && pnpm test -- tooling-tests/contracts-client-generation.test.mjs` | ❌ created by task | ⬜ pending |
| 03-07-01 | 07 | 6 | FOUND-03, DATA-02 | T-03-09 | Root verification is toolchain-first, warnings-denied, and invokes no writer. | Workspace configuration | `pnpm rust:fmt && pnpm rust:clippy && pnpm rust:test && pnpm rust:architecture && pnpm check` | ❌ extended by task | ⬜ pending |
| 03-07-02 | 07 | 6 | FOUND-03, DATA-02 | T-03-10 | Pipeline provenance and scope fences reject runtime/product/persistence/desktop leakage. | Node integration | `pnpm test -- tooling-tests/phase-3-scope.test.mjs && pnpm contracts:openapi:check && pnpm contracts:client:check` | ❌ created by task | ⬜ pending |
| 03-07-03 | 07 | 6 | FOUND-03, DATA-02 | T-03-11 | Documentation names exact writers/checks and preserves later-phase boundaries. | Documentation + aggregate check | `pnpm format:check && pnpm check` | ❌ updated by task | ⬜ pending |
| 03-08-01 | 08 | 7 | DATA-02 | T-03-12 | The exact bundled generator remains pinned; the package root transparently exports only the generated Fetch public surface and no new runtime package, auth, retry, or backoff configuration is added. | Node integration + package import | `pnpm contracts:client:generate && pnpm contracts:client:check && pnpm test -- tooling-tests/contracts-client-generation.test.mjs` | ✅ extended by task | ✅ passed |
| 03-08-02 | 08 | 7 | DATA-02 | T-03-12, T-03-13, T-03-14 | The approved dormant generator-core inventory is private and inactive: it is absent from root exports and generated public types/metadata, cannot be configured or invoked through the public entrypoint, and isolated drift verification leaves tracked bytes unchanged. | Node integration + source/inventory/scope regression | `pnpm test -- tooling-tests/contracts-client-generation.test.mjs tooling-tests/phase-3-scope.test.mjs && pnpm contracts:client:check && pnpm check` | ✅ extended by task | ✅ passed |

| 03-09-01 | 09 | 8 | DATA-02 | T-03-15, T-03-SC | Exact approved `orval@8.21.0` is registry-provenanced, lockfile-pinned, and has no install lifecycle hook or paired runtime package. | Package provenance + lifecycle inspection | `pnpm install --frozen-lockfile && pnpm view orval@8.21.0 repository scripts dist.integrity --json` | ✅ approval/config added by task | ✅ passed |
| 03-09-02 | 09 | 8 | DATA-02 | T-03-16 | The package root exposes only Orval-generated `ContractManifest` metadata/types and the direct Fetch operation, with ordinary `RequestInit` options and no public auth, security, SSE, retry, or backoff surface. | Vitest public-import/source regression | `pnpm exec vitest run tooling-tests/contracts-client-generation.test.mjs` | ✅ extended by task | ✅ passed |
| 03-09-03 | 09 | 8 | DATA-02 | T-03-17, T-03-18 | The complete generated tree is regenerated in a fresh temporary directory for byte/inventory drift comparison, and the only operation is neutral test-only metadata with no runtime registration. | Vitest drift/scope regression | `pnpm exec vitest run tooling-tests/contracts-client-generation.test.mjs tooling-tests/phase-3-scope.test.mjs && pnpm contracts:client:check` | ✅ extended by task | ✅ passed |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] `tooling-tests/verify-cargo-architecture.test.mjs` — controlled Cargo metadata graph fixtures.
- [ ] `tooling-tests/openapi-pipeline.test.mjs` — deterministic OpenAPI export and drift checks.
- [ ] `tooling-tests/contracts-client-generation.test.mjs` — generated-client provenance and drift checks.
- [ ] `tooling-tests/phase-3-scope.test.mjs` — prohibitions and fixture non-leakage regression coverage.
- [ ] Existing Node test runner and Cargo nextest remain the validation frameworks; no new test framework is required.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|
| Approve the exact `@hey-api/openapi-ts@0.97.3` pin | DATA-02 | The package-legitimacy gate marked the most recent release SUS for recency, requiring a human security decision before installation. | Review `03-RESEARCH.md`, record approval or rejection in `03-03-SUMMARY.md`, and proceed to Plan 05 only after approval. |

## Validation Sign-Off

- [x] Every planned task has an automated verification command or an explicit human checkpoint.
- [x] Sampling continuity has no three consecutive tasks without focused automated verification.
- [x] Wave 0 identifies all missing test files and uses existing frameworks.
- [x] No watch-mode flags are permitted.
- [x] Focused feedback target is under 60 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** planning-ready 2026-07-13
