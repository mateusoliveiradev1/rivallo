# Phase 3: Rust Modular Monolith and API Contract Pipeline — Specification

**Created:** 2026-07-13  
**Ambiguity score:** 0.04 (gate: ≤ 0.20)  
**Requirements:** 8 locked

## Goal

Establish a real Rust modular-monolith core and a deterministic, versioned Rust-contract → OpenAPI → TypeScript-client pipeline without introducing product behavior, runtime product endpoints, or infrastructure.

## Background

Phase 2 established a zero-member Cargo workspace, portable Rust toolchain validation, and repeatable quality commands. No Rust member crate, OpenAPI artifact, generated TypeScript client, or architecture-dependency audit exists yet. Phase 3 must turn that empty workspace into the minimum real modular foundation required by later desktop and API phases while preserving the framework-independent domain mandate in ADR-0003.

## Requirements

1. **Real modular Rust boundaries**: Create only Rust crates with present Phase 3 responsibilities for domain, application, contracts, and platform composition; document the allowed dependency direction between them.
   - Current: The Cargo workspace has zero members and no executable Rust modular boundary.
   - Target: Domain owns framework-independent concepts; application owns use-case/port boundaries; contracts own transport-neutral shared contract schemas; platform owns integration/pipeline composition without product runtime delivery. Crates are created only when their responsibility is exercised by the architecture or pipeline checks in this phase.
   - Acceptance: `cargo metadata` lists only Phase 3 crates with documented responsibility; an automated architecture check accepts allowed edges and rejects an inverted dependency edge.

2. **Framework-independent domain**: Keep the domain crate free of direct and transitive framework, platform, network, persistence, frontend, and database dependencies.
   - Current: No domain crate or dependency-graph policy exists.
   - Target: A small domain allowlist and explicit denylist protect the domain from axum, Tauri, SQLx, rusqlite, PostgreSQL/Neon-specific crates, HTTP frameworks, and any equivalent forbidden transitive package.
   - Acceptance: A check derived from real `cargo metadata` exits non-zero when a denylisted dependency is reachable from the domain crate, and passes for the approved domain graph.

3. **Canonical Rust contract source**: Define shared contract metadata and schemas in Rust as the only source for OpenAPI and generated TypeScript request/response types.
   - Current: No Rust contract source, OpenAPI document, or TypeScript generated client exists.
   - Target: Rust contracts provide the schema/metadata needed to export the contract; TypeScript request and response types come only from generated output.
   - Acceptance: Static checks show the generated OpenAPI and TypeScript artifacts trace to Rust contracts, and no hand-maintained duplicate request/response model is introduced in TypeScript.

4. **Deterministic versioned OpenAPI**: Generate a committed `openapi.json` from Rust contracts without manual edits.
   - Current: No OpenAPI artifact or regeneration command exists.
   - Target: A contract-generation command recreates the same versioned JSON from source deterministically.
   - Acceptance: Regenerating twice with unchanged sources produces byte-identical output; a drift command regenerates, compares against Git-tracked `openapi.json`, exits non-zero on a difference, and states the regeneration command.

5. **Versioned generated TypeScript client**: Generate and commit TypeScript client/types from the versioned OpenAPI artifact, with no manually duplicated Rust/TypeScript request or response types.
   - Current: No generated TypeScript contract client or client-drift check exists.
   - Target: A generated TypeScript client/types artifact is committed and is reproducibly regenerated from OpenAPI.
   - Acceptance: A client-drift command fails non-zero if regenerated artifacts differ from tracked output and emits an actionable regeneration instruction; unchanged inputs yield byte-identical output on repeated generation.

6. **End-to-end contract pipeline proof**: Prove the complete Rust contracts → OpenAPI → TypeScript client/types path without creating a runtime product endpoint.
   - Current: No contract-pipeline integration proof exists.
   - Target: The pipeline exercises shared schemas and contract metadata; if an operation is technically required by a generator, it is a test-only fixture excluded from production runtime registration.
   - Acceptance: An automated pipeline test runs generation and both drift checks successfully; repository inspection confirms no football/product endpoint was added and any fixture is test-only.

7. **Phase-appropriate quality and documentation**: Extend root quality commands and local-development guidance only for Phase 3 crates, architecture validation, contract generation, and drift checks.
   - Current: Root quality commands validate only the zero-member Phase 2 workspace.
   - Target: Rust formatting, Clippy warnings-as-errors, nextest, contract checks, and documented commands validate the new real artifacts without claiming later API/desktop/infrastructure coverage.
   - Acceptance: The declared Phase 3 commands pass on a clean checkout, are repeatable without tracked-file changes in check mode, and documentation identifies generation versus verification commands.

8. **Scope preservation**: Do not implement football domain behavior, product runtime endpoints, desktop integration, authentication, persistence, containers, cloud infrastructure, or multiplayer.
   - Current: None of those later-phase capabilities exists.
   - Target: Phase 3 contains only modular boundaries and contract-pipeline foundation.
   - Acceptance: Source and script inventory contains no dashboard/squad logic, club selection, production API route, Tauri integration, persistence adapter, Docker/CI setup, authentication, or multiplayer implementation.

## Boundaries

**In scope:**

- Real Rust crates for domain, application, contracts, and platform responsibilities when each responsibility is exercised now.
- Dependency-direction documentation and automated `cargo metadata` architecture validation.
- Domain allowlist/denylist policy covering direct and transitive dependencies.
- Rust-derived, Git-versioned deterministic `openapi.json` generation and drift verification.
- Generated, Git-versioned TypeScript client/types and its deterministic drift verification.
- A test-only pipeline fixture only when generator mechanics require an operation.
- Phase-3-only quality scripts, tests, and local-development documentation.

**Out of scope:**

- Football rules, simulation, roster/dashboard/squad features, or club selection — product behavior belongs to later phases.
- Production API endpoints, health/readiness implementation, authentication, or sessions — Phase 4/7 own runtime/API work.
- React, Tauri, desktop shell, or UI — Phase 4+ own executable desktop surfaces.
- SQLite, PostgreSQL, Neon, migrations, repositories, Docker, CI workflows, and provisioning — persistence/infrastructure is outside this phase.
- Multiplayer, real-time delivery, editor/mod support, or fixtures representing football data — later product phases own them.

## Constraints

- The domain crate must remain independent of React, TypeScript, Tauri, axum, SQLite, PostgreSQL, Neon, HTTP frameworks, and persistence/network adapters.
- Architectural validation must inspect the real graph emitted by `cargo metadata`, not only manifest text.
- All OpenAPI and TypeScript generated artifacts are versioned; generated files are never hand-edited.
- Verification commands are repeatable and non-mutating; explicit regeneration commands may update generated artifacts intentionally.
- A generation/drift process must not run concurrent writers against the same generated artifacts.
- Rust/Cargo child processes retain Phase 2's `RUSTUP_AUTO_INSTALL=0` protection.

## Acceptance Criteria

- [ ] Cargo contains only Phase 3 crates with documented domain, application, contracts, or platform responsibility; no anticipatory empty crate exists.
- [ ] An automated `cargo metadata` graph check validates allowed dependency direction and fails for an inverted edge.
- [ ] The domain graph check uses a small allowlist and denylist, fails for direct or transitive forbidden dependencies, and passes for the approved graph.
- [ ] The domain crate has no reachable axum, Tauri, SQLx, rusqlite, PostgreSQL/Neon-specific, HTTP-framework, frontend, network, or persistence dependency.
- [ ] A Rust-contract generation command creates the committed `openapi.json`; repeating generation with unchanged sources is byte-identical.
- [ ] OpenAPI drift verification regenerates, compares to the tracked file, returns non-zero on difference, and gives a regeneration command.
- [ ] A TypeScript generation command creates the committed client/types from OpenAPI; repeating it with unchanged input is byte-identical.
- [ ] TypeScript drift verification returns non-zero on generated-client differences and gives a regeneration command.
- [ ] An automated integration proof covers Rust contracts → OpenAPI → TypeScript client/types without exposing a production endpoint; any required operation fixture is test-only.
- [ ] No generated OpenAPI/client file is manually edited and no request/response type is duplicated manually between Rust and TypeScript.
- [ ] `rustfmt`, warnings-denied Clippy, nextest, architecture checks, and contract drift checks pass in a clean checkout without changing tracked files in verification mode.
- [ ] No football feature, runtime product endpoint, authentication, persistence, Docker, CI workflow, Tauri integration, or multiplayer implementation is added.

## Edge Coverage

**Coverage:** 7/7 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| idempotency | R1 | ✅ covered | Generation/check commands distinguish explicit writes from non-mutating verification; repeated unchanged runs are byte-identical. |
| concurrency | R1 | ✅ covered | Generation writers are serialized per artifact; drift checks do not write tracked artifacts. |
| concurrency | R2 | ⛔ dismissed | `cargo metadata` graph inspection is read-only and produces no shared mutable state. |
| unclassified | R4 | ✅ covered | TypeScript artifacts are regenerated only from OpenAPI and compared deterministically. |
| concurrency | R4 | ✅ covered | Client generation is serialized per artifact; drift verification does not write tracked artifacts. |
| concurrency | R5 | ⛔ dismissed | The pipeline fixture is isolated to tests and does not register a concurrent runtime operation. |
| unclassified | R6 | ✅ covered | Source/script inventory acceptance criterion rejects later-phase implementation. |

## Prohibitions (must-NOT)

**Coverage:** 4/4 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT introduce a direct or transitive forbidden dependency into the domain crate. | R2 | resolved | test — real `cargo metadata` graph audit with a negative fixture or controlled graph assertion. |
| MUST NOT hand-edit generated OpenAPI or TypeScript artifacts, or duplicate Rust request/response models manually in TypeScript. | R3/R4 | resolved | judgment — generated-output ownership and source inventory review. |
| MUST NOT expose a test-only generator fixture in the production runtime. | R6 | resolved | test — pipeline/runtime registration assertion. |
| MUST NOT add product, desktop, persistence, infrastructure, authentication, or multiplayer implementation. | R8 | resolved | judgment — source and script inventory review. |

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|---|---:|---:|---|---|
| Goal Clarity | 0.96 | 0.75 | ✓ | Modular core plus deterministic contract pipeline are measurable. |
| Boundary Clarity | 0.98 | 0.70 | ✓ | Explicit exclusions protect Phase 3 from runtime/product scope. |
| Constraint Clarity | 0.96 | 0.65 | ✓ | Dependency graph, deterministic generation, and no-auto-install constraints are locked. |
| Acceptance Criteria | 0.95 | 0.70 | ✓ | Twelve pass/fail checks cover artifacts, drift, graph policy, and exclusions. |
| **Ambiguity** | **0.04** | **≤0.20** | **✓** | Requirements are ready for implementation-decision discussion. |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|---|---|---|---|
| 1 | Researcher | What exists and what must prove the pipeline? | Phase 2 is root-only; Phase 3 starts the first real Rust members and contract artifacts. |
| 1 | Researcher | How must OpenAPI drift behave? | Rust generates versioned `openapi.json`; regeneration is deterministic and a non-zero actionable drift check protects it. |
| 1 | Simplifier | Is the TypeScript client already required? | Yes: versioned generated client/types prove the full pipeline without product endpoints. |
| 1 | Boundary Keeper | How is the domain protected? | `cargo metadata` graph validation with small allowlist and direct/transitive denylist protects framework independence. |
| 2 | Failure Analyst | What prevents unsafe generation behavior? | Verification is non-mutating, writers are serialized, and test-only fixtures never reach runtime registration. |

---

*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*  
*Spec created: 2026-07-13*  
*Next step: $gsd-discuss-phase 3 — implementation decisions (how to build the locked requirements above)*
