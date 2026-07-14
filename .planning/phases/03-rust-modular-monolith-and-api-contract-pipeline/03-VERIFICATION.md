---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
verified: 2026-07-14T11:20:21Z
status: gaps_found
score: 11/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The dedicated TypeScript package exposes generated types, contract metadata, and a minimum Fetch client derived only from contracts/openapi.json."
    status: failed
    reason: "The package public entrypoint re-exports only types; it does not export the generated client or client factory. Consumers of @rivallo/contracts-client therefore cannot use the claimed minimum client through the package API."
    artifacts:
      - path: "packages/contracts-client/src/index.ts"
        issue: "Exports only ./generated/index.js, whose barrel contains only type exports."
      - path: "packages/contracts-client/src/generated/client.gen.ts"
        issue: "Creates the Fetch client, but it is unreachable from the package public entrypoint."
    missing:
      - "Generate or expose the minimal client from the generated public barrel and prove it is importable from @rivallo/contracts-client."
  - truth: "The minimum generated client does not add authentication or retry behavior."
    status: failed
    reason: "The committed generated tree includes authentication and retry-capable code, contrary to D-10 and Plan 03-06's explicit prohibition."
    artifacts:
      - path: "packages/contracts-client/src/generated/core/auth.gen.ts"
        issue: "Generated authentication token handling is shipped."
      - path: "packages/contracts-client/src/generated/core/serverSentEvents.gen.ts"
        issue: "Generated retry/backoff behavior is shipped."
    missing:
      - "Configure the approved generator to omit auth/retry-capable output, or obtain an explicit approved exception and revise the locked contract."
---

# Phase 3: Rust Modular Monolith and API Contract Pipeline — Verification Report

**Phase Goal:** Establish only the Rust crate boundaries with real responsibilities and the backend-owned API contract pipeline.
**Verified:** 2026-07-14T11:20:21Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Four exercised Rust crates have D-01's strict production direction: domain none, application → domain, contracts none, platform → application/contracts. | VERIFIED | Actual manifests and `pnpm rust:architecture` verify the resolved `cargo metadata` graph; the 25-test aggregate passed. |
| 2 | Domain and application remain framework/product neutral and application provides real contract preparation without importing contracts. | VERIFIED | `crates/domain/src/lib.rs` owns `ModuleId`/`PreparedContractInput`; `crates/application/src/lib.rs` consumes and returns only those domain types. |
| 3 | Domain's direct and transitive closure is allowlisted and rejects forbidden platform, frontend, network, persistence, and database packages. | VERIFIED | `scripts/verify-cargo-architecture.mjs` traverses `resolve.nodes`; focused tests include transitive `serde → reqwest` rejection and live metadata passed. |
| 4 | The exact `@hey-api/openapi-ts@0.97.3` generator was human-approved before use. | VERIFIED | `03-03-SUMMARY.md` records Mateus's 2026-07-14 approval; `package.json` and `pnpm-lock.yaml` use only `0.97.3`. |
| 5 | Rust contracts own the semantic version/schema and platform produces schema-only OpenAPI with no runtime operation. | VERIFIED | `CONTRACT_VERSION` and `ContractManifest` are in contracts; platform derives components-only Utoipa OpenAPI; committed JSON has `"paths": {}`. |
| 6 | OpenAPI generation is deterministic and verification is isolated, actionable, and non-mutating. | VERIFIED | `pnpm contracts:openapi:check` passed; its verifier exports to a unique temp directory and prints `pnpm contracts:openapi:generate` on drift. |
| 7 | Generated TypeScript output is deterministic and client drift verification is isolated and actionable. | VERIFIED | `pnpm contracts:client:check` passed; its verifier generates to a unique temp tree and byte-compares the complete generated inventory. |
| 8 | The dedicated TypeScript package exposes generated types, contract metadata, and a minimum Fetch client derived only from committed OpenAPI. | FAILED | Public `src/index.ts` re-exports generated `index.ts`, which contains only type exports; the generated `client`/`createClient` are not publicly exported. |
| 9 | The minimum generated client adds no authentication, retries, product transport conveniences, or application coupling. | FAILED | Generated `core/auth.gen.ts` and `core/serverSentEvents.gen.ts` ship auth and retry/backoff mechanisms. No application coupling was found. |
| 10 | The end-to-end pipeline has no runtime product registration or later-phase product leakage. | VERIFIED | `pnpm exec vitest run tooling-tests/phase-3-scope.test.mjs` passed; independent source inventory found only policy/test references to forbidden runtime terms. |
| 11 | `pnpm check` is toolchain-first, writer-free, and validates formatting, linting, types, tests, Rust quality, architecture, and drift checks. | VERIFIED | With `C:\Users\Liiiraa\.cargo\bin` prepended to PATH, `pnpm check` passed: 25 tests, Clippy warnings denied, nextest, architecture audit, and both drift checks. |
| 12 | Domain/application boundaries compile without React, Tauri, axum, SQLite, or PostgreSQL dependencies. | VERIFIED | Live Cargo metadata and architecture audit passed; domain has no dependencies and application has only `rivallo-domain`. |
| 13 | No competitive domain rule is placed in TypeScript. | VERIFIED | TypeScript package contains only generated contract code and a re-export; no football/product models were found in production source. |

**Score:** 11/13 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `crates/{domain,application,contracts,platform}` | Exercised D-01 crate responsibilities | VERIFIED | Substantive Rust sources, compiled by the aggregate, and connected through the resolved Cargo graph. |
| `scripts/verify-cargo-architecture.mjs` | Real-metadata direction and domain-closure audit | VERIFIED | Uses `cargo metadata --format-version=1`, resolved-node traversal, controlled negative fixtures, and live graph check. |
| `contracts/openapi.json` | Committed Rust-derived schema-only contract | VERIFIED | Version `0.1.0`, `ContractManifest`, empty paths; temporary-output drift verifier passed. |
| `packages/contracts-client/src/generated/` | Deterministic generated client/types package | PARTIAL | Complete-tree drift check passes, but public package API does not expose its client and tree contains forbidden auth/retry mechanisms. |
| `tooling-tests/phase-3-scope.test.mjs` | Pipeline provenance and scope fence | VERIFIED | Runs both non-mutating drift checks and rejects runtime/product terms in crates/scripts. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- |
| application | domain | `ContractPreparationService` imports domain values only | VERIFIED | Actual source import is `rivallo_domain::{ModuleId, PreparedContractInput}`. |
| platform | application and contracts | Cargo dependencies and schema composition | VERIFIED | Only permitted phase-crate edges appear in resolved metadata. |
| contracts schemas/version | platform exporter | `ContractManifest`/`CONTRACT_VERSION` → Utoipa document | VERIFIED | Exporter output has the contracts-owned version and schema. |
| `contracts/openapi.json` | generator configuration | local `input: '../../contracts/openapi.json'` | VERIFIED | No remote URL is configured. |
| generated Fetch client | public contracts-client package | package export barrel | NOT_WIRED | `client.gen.ts` defines `client` and imports `createClient`, but both are absent from the public barrel. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full quality and pipeline verification | `PATH+=C:\Users\Liiiraa\.cargo\bin; pnpm check` | Passed: 25 Vitest tests, Rust fmt/Clippy/nextest, architecture, both drift checks | PASS |
| D-01/domain closure | `pnpm rust:architecture` | Resolved Cargo policy passed | PASS |
| OpenAPI drift/non-mutation | `pnpm contracts:openapi:check` | Passed | PASS |
| Client drift/non-mutation | `pnpm contracts:client:check` | Passed | PASS |
| Scope proof | `pnpm exec vitest run tooling-tests/phase-3-scope.test.mjs` | 2 tests passed | PASS |
| Tracked-tree integrity | `git diff --check`; `git status --short` | Both clean after verification | PASS |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| --- | --- | --- | --- |
| FOUND-03 | 03-01, 03-02, 03-04, 03-07 | SATISFIED | The framework-independent domain/application core compiles and its resolved dependency closure is mechanically audited. |
| DATA-02 contract foundation | 03-01, 03-03 through 03-07 | BLOCKED | Rust → OpenAPI provenance and deterministic drift checks work, but the public generated-client boundary and D-10 auth/retry prohibition are not met. Runtime `/api/v1` endpoints are correctly deferred to Phase 7. |

### Prohibitions and Anti-Patterns

| Check | Status | Evidence |
| --- | --- | --- |
| No forbidden domain dependency | VERIFIED | Live resolved-metadata audit and negative-fixture tests pass. |
| No hand-edited generated OpenAPI/client output | VERIFIED | Generated headers, isolated byte comparisons, and deterministic checks pass. |
| No runtime endpoint or test-only fixture leak | VERIFIED | Schema-only OpenAPI has empty paths; no axum/Tauri/runtime registration found. |
| No product, desktop, persistence, infrastructure, auth, or multiplayer implementation | FAILED (client scope) | No product/runtime implementation was found, but generated auth and retry behavior violates the explicit generated-client prohibition. |
| Debt/stub markers in Phase 3 production artifacts | VERIFIED | No TODO/FIXME/XXX/HACK/PLACEHOLDER markers found outside generated output. |

### Disconfirmation Findings

1. The focused generated-client test proves `client.gen.ts` contains `createClient`, but it never tests importing a client from `@rivallo/contracts-client`; the public barrel drops it.
2. The scope test scans only `crates` and `scripts`, so it does not detect prohibited auth/retry mechanisms shipped under `packages/contracts-client/src/generated`.
3. The implementation therefore passes determinism/provenance checks while missing two locked D-10 delivery constraints.

### Gaps Summary

The Rust modular-monolith and schema-only OpenAPI pipeline are substantively implemented, deterministic, non-mutating in check mode, and correctly free of runtime API/persistence/UI/product scope. Phase 3 cannot pass, however, because the claimed generated minimum client is not usable through its dedicated package and the generated package ships authentication/retry mechanisms explicitly forbidden by the phase contract. These are immediate Phase 3 corrections, not later-phase work; no human verification is needed to establish either gap.

---

_Verified: 2026-07-14T11:20:21Z_  
_Verifier: generic-agent workaround acting as gsd-verifier_
