# Phase 3: Rust Modular Monolith and API Contract Pipeline - Context

**Gathered:** 2026-07-13  
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the first real Rust modular-monolith crates and a deterministic, versioned Rust contracts → OpenAPI → TypeScript client pipeline. This phase establishes architecture and contract-generation foundations only; it does not deliver product runtime behavior, endpoints, persistence, desktop integration, or infrastructure.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**8 requirements are locked.** See `03-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `03-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** real Rust boundary crates; metadata-graph architecture validation; domain allowlist/denylist; versioned deterministic OpenAPI and TypeScript client generation; drift checks; test-only pipeline fallback; and scoped quality/documentation work.

**Out of scope (from SPEC.md):** football features, production endpoints, health/readiness runtime, authentication, React/Tauri desktop, persistence, Docker/CI/provisioning, multiplayer, and football fixtures.

</spec_lock>

<decisions>
## Implementation Decisions

### Crate topology and dependency direction

- **D-01:** Enforce strict inward dependencies: `domain` depends on no other phase crate; `application` depends on `domain`; `contracts` depends only on permitted core types; `platform` is the only outer layer that may depend on `application` and `contracts`.
- **D-02:** Create `platform` now only because it owns contract composition, OpenAPI export, pipeline integration, and test-only fixtures. It must not host an HTTP server or persistence adapter.
- **D-03:** `application` must have a real, non-product responsibility: a contract-preparation service that orchestrates assembly from `domain` and `contracts` without an HTTP endpoint.
- **D-04:** `domain` contains neutral core primitives and module identity used by contract preparation. It must not contain clubs, players, matches, leagues, or other football entities.

### Canonical Rust contract and OpenAPI export

- **D-05:** `contracts` is the canonical location for transport schemas and OpenAPI metadata; `platform` only composes and exports the document.
- **D-06:** Define one explicit semantic-version constant in `contracts`; OpenAPI and generated TypeScript output consume that same version.
- **D-07:** Use a mature code-first Rust OpenAPI library. Research/planning selects the exact library only if it supports deterministic output and preserves `contracts` as the source of truth.
- **D-08:** Version the generated OpenAPI document at `contracts/openapi.json`.

### Generated TypeScript contract client

- **D-09:** Put generated TypeScript artifacts in the dedicated workspace package `packages/contracts-client`, independent of any application.
- **D-10:** Generate types, contract metadata, and a minimum client only. Do not add authentication, retries, product transport conveniences, or hand-maintained request/response duplicates.
- **D-11:** Research/planning selects a mature deterministic TypeScript generator; it must generate the required types and minimum client without manually editing output.
- **D-12:** Expose explicit root commands for OpenAPI generation, TypeScript client generation, and drift verification. `pnpm check` invokes verification-only, non-mutating commands.

### Test-only contract-pipeline fixture

- **D-13:** Prefer schema-only generation. Add a fixture only if the selected tool genuinely requires an operation to prove the pipeline.
- **D-14:** Any required fixture is a test-only module with no runtime registration and no runtime artifact.
- **D-15:** A permitted fixture exposes only neutral contract introspection metadata; it has no state, football data, authentication, or persistence.
- **D-16:** Automated tests must prove that a fixture is usable by the pipeline yet absent from every production runtime registration.

### the agent's Discretion

- Exact crate names, generator libraries, dependency-policy file format, OpenAPI metadata fields beyond the explicit contract version, and test implementation patterns may be selected through research, provided they satisfy D-01 through D-16 and `03-SPEC.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance

- `.planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-SPEC.md` — locked Phase 3 requirements, prohibitions, edge coverage, and pass/fail acceptance criteria.
- `.planning/ROADMAP.md` — Phase 3 objective, dependencies, Gate 1 association, and Phase 4 separation.
- `.planning/REQUIREMENTS.md` — FOUND-03 and DATA-02 contract-foundation traceability.
- `.planning/PROJECT.md` — modular-monolith, authority, and gate constraints.

### Prior workspace and quality policy

- `.planning/phases/02-workspace-toolchains-quality-scripts/02-CONTEXT.md` — portability, no-auto-install, warning-blocking, non-mutating checks, and root script constraints carried forward.
- `.planning/phases/02-workspace-toolchains-quality-scripts/02-VERIFICATION.md` — validated Phase 2 workspace behavior and the zero-member Rust boundary Phase 3 replaces with real source checks.
- `docs/testing/strategy.md` — Rust quality and generated OpenAPI/client drift responsibilities.
- `docs/operations/local-development.md` — clean-checkout and toolchain command baseline.

### Architecture decisions

- `docs/adr/ADR-0001-monorepo-workspaces.md` — pnpm/Turborepo/Cargo workspace decision.
- `docs/adr/ADR-0002-tauri-react-rust.md` — future Tauri/React/Rust platform boundary that remains outside Phase 3 runtime.
- `docs/adr/ADR-0003-independent-domain-core.md` — framework-independent domain/application core constraint.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- Root `Cargo.toml` is an explicit zero-member virtual workspace and `rust-toolchain.toml` selects Rust 1.88.0 with rustfmt and Clippy.
- `scripts/verify-cargo-workspace.mjs` and `scripts/check-rust-quality.mjs` already enforce Node-mediated Rust/Cargo child execution with `RUSTUP_AUTO_INSTALL=0`.
- Root `package.json`, `scripts/run-quality.mjs`, Vitest tooling setup, and `packages/*` workspace convention are available for real Phase 3 scripts and client package work.

### Established Patterns

- Root scripts are cross-platform and orchestrate through Node rather than shell-specific chains.
- Quality checks are non-mutating, fail fast, warnings block, and every aggregate failure maps to an atomic command.
- No placeholder apps, crates, APIs, or future-component commands are acceptable.

### Integration Points

- Phase 3 replaces Cargo's zero-member boundary with the first real source crates and must update Rust quality behavior accordingly.
- `contracts/openapi.json` becomes the sole OpenAPI input to `packages/contracts-client`.
- Phase 4 will consume the modular crates and generated client from a real desktop/API shell, without renegotiating Phase 3 boundaries.

</code_context>

<specifics>
## Specific Ideas

- The full pipeline must be visibly provable: Rust contracts → OpenAPI → TypeScript client/types → drift checks.
- Generated artifacts are versioned in Git and never manually edited.
- Architecture enforcement must analyze real `cargo metadata`, including transitive domain dependencies.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

</deferred>

---

*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*  
*Context gathered: 2026-07-13*
