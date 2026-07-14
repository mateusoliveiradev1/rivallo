---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
verified: 2026-07-14T12:28:00Z
status: gaps_found
score: 12/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/13
  gaps_closed:
    - "Consumers can import the generated Fetch client and its generated configuration/type surface from @rivallo/contracts-client."
  gaps_remaining:
    - "The approved bundled generator's dormant auth, SSE, and internal support modules remain private and inert: they are not exported, configured, invoked, or reachable through generated public types or metadata."
  regressions: []
gaps:
  - truth: "The approved bundled generator's dormant auth, SSE, and internal support modules remain private and inert: they are not exported, configured, invoked, or reachable through generated public types or metadata."
    status: failed
    reason: "The package root publicly exports createClient and Client/RequestOptions-related types. The generated client returned by createClient exposes sse methods, accepts security on requests, calls setAuthParams when security is present, and constructs createSseClient. Its public request types expose Auth plus SSE retry/backoff options. This makes the dormant bundled core publicly reachable and behaviorally usable, contrary to the dated D-10 exception."
    artifacts:
      - path: "packages/contracts-client/src/index.ts"
        issue: "Publicly re-exports createClient and types that expose the generated client capability surface."
      - path: "packages/contracts-client/src/generated/client/client.gen.ts"
        issue: "Public createClient path calls setAuthParams and exposes sse operations backed by createSseClient."
      - path: "packages/contracts-client/src/generated/client/types.gen.ts"
        issue: "Public request/client types expose security and sseDefaultRetryDelay, sseMaxRetryAttempts, and sseMaxRetryDelay."
    missing:
      - "Use an approved generator/configuration or a genuinely narrower generated public surface that prevents public auth and SSE/retry/backoff reachability while preserving generated-only ownership and deterministic drift verification."
---

# Phase 3: Rust Modular Monolith and API Contract Pipeline Verification Report

**Phase Goal:** Establish only the Rust crate boundaries with real responsibilities and the backend-owned API contract pipeline.
**Verified:** 2026-07-14T12:28:00Z
**Status:** gaps_found
**Re-verification:** Yes — after Plan 03-08 gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Four exercised Rust crates have D-01's strict production direction: domain none, application → domain only, contracts none, platform → application/contracts. | VERIFIED | `pnpm rust:architecture` passed against resolved Cargo metadata; manifests and sources match D-01. |
| 2 | Domain and application remain framework/product neutral and application provides real contract preparation without importing contracts. | VERIFIED | `crates/domain/src/lib.rs` owns `ModuleId`/`PreparedContractInput`; `crates/application/src/lib.rs` consumes only those domain values. |
| 3 | Domain's direct and transitive closure is allowlisted and rejects forbidden platform, frontend, network, persistence, and database packages. | VERIFIED | Live resolved-metadata architecture audit passed; the audit has controlled forbidden-edge coverage. |
| 4 | The exact `@hey-api/openapi-ts@0.97.3` generator was human-approved before use. | VERIFIED | `03-03-SUMMARY.md` records Mateus's 2026-07-14 approval; `package.json` retains exactly `0.97.3`. |
| 5 | Rust contracts own semantic version/schema and platform produces schema-only OpenAPI with no runtime operation. | VERIFIED | Contracts own `CONTRACT_VERSION`/`ContractManifest`; `contracts/openapi.json` has empty `paths`. |
| 6 | OpenAPI generation is deterministic and verification is isolated, actionable, and non-mutating. | VERIFIED | Passed via `pnpm check`; the drift verifier generates to a temporary path and compares bytes. |
| 7 | Generated TypeScript output is deterministic and client drift verification is isolated and actionable. | VERIFIED | `pnpm contracts:client:check` passed through the aggregate; complete temporary-tree byte comparison is implemented. |
| 8 | The dedicated TypeScript package exposes generated types, contract metadata, and a minimum Fetch client derived only from committed OpenAPI. | VERIFIED | `packages/contracts-client/src/index.ts` transparently exports generated `client`, `createClient`, `createConfig`, and generated type surface; public-entrypoint test passes. |
| 9 | The approved bundled generator's dormant auth, SSE, and internal support modules remain private and inert, with no authentication, retry, or backoff behavior. | FAILED | Public `createClient` returns `sse` methods and supports `security`; generated code calls `setAuthParams` and `createSseClient`, while public request types expose Auth and SSE retry/backoff options. |
| 10 | The end-to-end pipeline has no runtime product registration or later-phase product leakage. | VERIFIED | Scope test and independent source inventory found only architecture-policy references to forbidden runtime terms; OpenAPI remains schema-only. |
| 11 | `pnpm check` is toolchain-first, writer-free, and validates formatting, linting, types, tests, Rust quality, architecture, and drift checks. | VERIFIED | `pnpm check` passed with the established Cargo bin on PATH: 28 tests, Rust checks, architecture audit, and both drift checks. |
| 12 | Domain/application boundaries compile without React, Tauri, axum, SQLite, or PostgreSQL dependencies. | VERIFIED | Resolved Cargo graph passed D-01/domain-closure policy; domain has no dependencies and application only depends on `rivallo-domain`. |
| 13 | No competitive domain rule is placed in TypeScript. | VERIFIED | The package has generated contract output plus a transparent boundary only; no football/product model is present in handwritten TypeScript. |

**Score:** 12/13 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `crates/{domain,application,contracts,platform}` | Exercised D-01 responsibilities | VERIFIED | Substantive Rust sources compile and are connected by the resolved Cargo graph. |
| `scripts/verify-cargo-architecture.mjs` | Real-metadata direction and domain-closure audit | VERIFIED | `pnpm rust:architecture` passed. |
| `contracts/openapi.json` | Committed Rust-derived schema-only contract | VERIFIED | Version `0.1.0`, `ContractManifest`, empty paths; isolated drift check passed. |
| `packages/contracts-client/src/index.ts` | Public generated type/metadata/Fetch boundary | PARTIAL | Public Fetch export is reachable, but its selected generated surface retains public auth/SSE capability. |
| `packages/contracts-client/src/generated/client/{client,types}.gen.ts` | Private/inert bundled-core boundary | FAILED | Generated public client code invokes auth/SSE support and exports types that expose security and retry/backoff capabilities. |
| `tooling-tests/contracts-client-generation.test.mjs` | Public boundary and dormant-core regression proof | PARTIAL | Tests pass, but only inspect direct barrel text and default config; they do not detect transitive public type reachability or callable auth/SSE paths. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| application | domain | `ContractPreparationService` imports domain values only | VERIFIED | Actual import is `rivallo_domain::{ModuleId, PreparedContractInput}`. |
| platform | application and contracts | Cargo dependencies and schema composition | VERIFIED | Only permitted Phase 3 edges appear in resolved metadata. |
| contracts schemas/version | platform exporter | `ContractManifest`/`CONTRACT_VERSION` → Utoipa document | VERIFIED | Exported document has contracts-owned version and schema. |
| `contracts/openapi.json` | generator configuration | local `input: '../../contracts/openapi.json'` | VERIFIED | No remote URL is configured. |
| generated Fetch client | public contracts-client package | transparent ESM root re-exports | VERIFIED | Root exports `client`, `createClient`, `createConfig`, and generated types; focused public-import test passes. |
| public Fetch client | dormant auth/SSE core | generated client implementation/types | NOT_WIRED TO EXCEPTION | Public `createClient` calls `setAuthParams` for `security` and creates SSE clients; exported `Client`/`RequestOptions` surface those capabilities. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full quality and pipeline verification | `pnpm check` with `C:\Users\Liiiraa\.cargo\bin` on PATH | 28 tests plus formatting, lint, types, Rust quality, architecture, and drift checks passed | PASS |
| D-01/domain closure | `pnpm rust:architecture` | Resolved Cargo policy passed | PASS |
| Public package Fetch export | `pnpm exec vitest run tooling-tests/contracts-client-generation.test.mjs` | 7 focused tests passed | PASS (partial coverage) |
| Scope/pipeline proof | `pnpm exec vitest run tooling-tests/phase-3-scope.test.mjs` with Cargo on PATH | 3 focused tests passed | PASS (partial coverage) |
| D-10 public-reachability audit | Source trace: root export → `createClient` → `setAuthParams`/`createSseClient`; exported `RequestOptions` | Auth and SSE/retry paths are publicly usable | FAIL |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| FOUND-03 | 03-01, 03-02, 03-04, 03-07 | Framework-independent domain/application core | SATISFIED | D-01 audit and full quality aggregate pass. |
| DATA-02 | 03-01, 03-03 through 03-08 | Contract foundation and generated client provenance | BLOCKED | Rust → OpenAPI provenance and public Fetch export work, but D-10's active/public auth-SSE capability violates the approved bounded exception. Runtime `/api/v1` endpoints remain correctly deferred to Phase 7. |

### Prohibitions and Anti-Patterns

| Check | Status | Evidence |
| --- | --- | --- |
| No forbidden domain dependency | VERIFIED | Live resolved-metadata audit passed. |
| No hand-edited generated OpenAPI/client output | VERIFIED | Complete-tree deterministic regeneration and isolated byte comparisons pass. |
| No runtime endpoint or test-only fixture leak | VERIFIED | Schema-only OpenAPI has empty paths; no runtime registration is present. |
| No product, desktop, persistence, infrastructure, auth, or multiplayer implementation | VERIFIED | Independent source inventory found no product/runtime implementation; the remaining failure is a generated public-client capability, not product auth. |
| D-10 approved exception remains private and inert | FAILED | The generator-owned core is bounded in inventory but not private/inert through the public client API. |
| Debt/stub markers in handwritten Phase 3 artifacts | VERIFIED | No blocking marker found in handwritten artifacts; generated implementation comments are generator-owned and covered by D-11. |

### Disconfirmation Findings

1. The Plan 03-08 tests prove root exports and default configuration, but a default config without `auth`/retry fields does not prove that the exported client cannot accept them per request.
2. The direct-barrel regex excludes `generated/core` strings, yet `Client` and `RequestOptions` transitively import `Auth` and `ServerSentEventsOptions`; the public type/behavior path is therefore missed.
3. `client.gen.ts` makes the gap executable, not merely type-level: `if (opts.security) await setAuthParams(opts)`, and each public `client.sse.*` method invokes `createSseClient` with retry/backoff support.

### Gaps Summary

Plan 03-08 closed the original public-export gap: consumers can import the generated Fetch client from `@rivallo/contracts-client`, and the deterministic non-mutating pipeline remains intact. It did not close the D-10 exception gap. The chosen generated public client still exposes and invokes the bundled authentication and SSE/retry machinery. The current tests are insufficient because they inspect only direct exports and default configuration. This is an immediate Phase 3 correction, not a deferred later-phase concern; no human verification is needed to establish it.

---

_Verified: 2026-07-14T12:28:00Z_  
_Verifier: generic-agent workaround acting as gsd-verifier_
