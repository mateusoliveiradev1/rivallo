# Phase 2: Workspace, Toolchains and Quality Scripts - Context

**Gathered:** 2026-07-13  
**Status:** Ready for planning

<domain>
## Phase Boundary

Create the reproducible workspace/toolchain/quality foundation only. This phase configures and validates root tooling; it does not create desktop/API applications, domain crates, persistence, containers, CI workflows, or product features.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**6 requirements are locked.** See `02-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `02-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** pnpm/Turborepo/Cargo metadata; minimum-version validation; real root quality scripts/configuration; ignored local artifacts; conventions; clean-checkout documentation.

**Out of scope (from SPEC.md):** Tauri/axum applications, Rust domain/application crates, OpenAPI, databases, Docker, CI workflow, product features, automatic tool upgrades, and future-component placeholders.

</spec_lock>

<decisions>
## Implementation Decisions

### Platform and command portability

- **D-01:** Support Windows, macOS, and Linux from Phase 2; no quality workflow may depend on PowerShell or a POSIX shell.
- **D-02:** Put validation logic in Node.js or Rust; `package.json` scripts orchestrate rather than contain shell-specific logic.

### Toolchain policy

- **D-03:** Use native, versioned sources: `package.json` for Node.js/pnpm and `rust-toolchain.toml` for Rust/Cargo.
- **D-04:** Enforce stable minimum-compatible versions, not exact pins; reject pre-release versions by default.
- **D-05:** Toolchain validation fails non-zero with expected tool, minimum version, detected version when available, and concise remediation. It never installs or updates tools.
- **D-06:** Treat mismatched Rust and Cargo versions as an invalid environment and display both values.
- **D-07:** Raising a minimum version updates its native source, validator, and documentation in the same commit.

### Quality-gate behavior

- **D-08:** ESLint and Clippy warnings block Phase 2 quality checks.
- **D-09:** Aggregated checks are non-mutating. Formatting fixes require explicit write commands.
- **D-10:** Vitest uses a configuration/infrastructure smoke test only; no product behavior is invented.
- **D-11:** cargo-nextest gets a real availability/workspace-integration smoke check without adding a domain crate.

### Root scripts

- **D-12:** `pnpm check` is the primary local aggregate command and runs toolchain validation before non-mutating checks.
- **D-13:** Keep explicit atomic commands: `lint`, `format:check`, `typecheck`, `test`, `rust:fmt`, `rust:clippy`, `rust:test`, and `smoke`.
- **D-14:** `pnpm check` fails fast by layer; every failure must be reproducible with its atomic command.
- **D-15:** Document `pnpm install --frozen-lockfile` for dependency installation; it must never install Node, pnpm, Rust, or Cargo.
- **D-16:** Repeated quality/smoke runs must leave tracked files unchanged; standard local artifacts are permitted only when ignored by Git.

### the agent's Discretion

None — implementation choices must satisfy the locked SPEC and decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance

- `.planning/phases/02-workspace-toolchains-quality-scripts/02-SPEC.md` — locked Phase 2 requirements, boundaries, acceptance criteria, edge coverage, and prohibitions.
- `.planning/ROADMAP.md` — Phase 2 objective, dependencies, gate association, and Phase 3/4 separation.
- `.planning/REQUIREMENTS.md` — FOUND-01 and FOUND-02 traceability.
- `.planning/PROJECT.md` — project constraints, modular-monolith decision, authority model, and gate process.

### Repository policy and quality

- `CONTRIBUTING.md` — gate-based contribution requirements and domain/UI boundaries.
- `docs/testing/strategy.md` — TypeScript/Rust quality-tool responsibilities and later CI structure.
- `docs/operations/local-development.md` — local-development documentation baseline.
- `docs/adr/ADR-0001-monorepo-workspaces.md` — workspace decision.
- `docs/adr/ADR-0002-tauri-react-rust.md` — future platform stack boundary.
- `docs/adr/ADR-0003-independent-domain-core.md` — framework-independent Rust core constraint.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- No executable workspace, applications, crates, manifests, or quality configuration exist yet.

### Established Patterns

- Planning documents require gate approval, explicit authority boundaries, and separate responsibilities for ESLint, Prettier, TypeScript, and visual tooling.

### Integration Points

- Phase 2 root workspace/configuration becomes the sole foundation consumed by Phase 3 Rust crates and Phase 4 desktop/API shell.

</code_context>

<specifics>
## Specific Ideas

No additional product or visual requirements — standard implementation is acceptable only where it preserves the explicit portability, validation, quality, and no-placeholder decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-workspace-toolchains-quality-scripts*  
*Context gathered: 2026-07-13*
