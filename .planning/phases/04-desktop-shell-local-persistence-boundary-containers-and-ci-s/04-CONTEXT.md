# Phase 4: Desktop Shell, Local Persistence Boundary, Containers and CI Skeleton - Context

**Gathered:** 2026-07-14  
**Status:** Ready for planning

<domain>
## Phase Boundary

Produce the minimum executable Tauri desktop and local Axum API shell, prepare the local-persistence boundary, provide a local Docker PostgreSQL environment, and establish scoped CI. This phase deliberately excludes football features, final identity, migrations, persistence behavior, hosted infrastructure, and a complete UI.

</domain>

<decisions>
## Implementation Decisions

### Desktop and local API lifecycle

- **D-01:** The Tauri desktop owns the local API lifecycle: it starts, monitors, and stops the local Axum service automatically.
- **D-02:** On launch, the desktop detects and reuses a healthy compatible Rivallo local service. A conflicting or unhealthy process produces an actionable diagnostic; it is never terminated automatically and the port is not silently changed.
- **D-03:** The desktop waits for `/ready` for a short bounded interval, presenting an initializing state. A timeout or failure is recoverable through retry.
- **D-04:** Startup failures present a clear user-facing message and retry action. Copyable technical diagnostics are restricted to a development-oriented area; raw logs are not shown in the ordinary UI.

### SQLite local-persistence boundary

- **D-05:** Phase 4 prepares only the persistence port and an outer SQLite adapter boundary. It creates no database file, schema, migration, seed, or product persistence behavior.
- **D-06:** The application owns the persistence port; the SQLite adapter belongs to platform. The domain, React UI, and Tauri-facing UI layer must not know SQLite.
- **D-07:** The platform resolves a per-user local-data location through an abstraction. No repository-relative database path is fixed and no file is created in this phase.
- **D-08:** The boundary anticipates typed, recoverable persistence failures that distinguish local-store unavailability from invalid data, without leaking database details to UI consumers.

### Local PostgreSQL in Docker

- **D-09:** Local PostgreSQL is operated with documented Docker Compose commands for start, health verification, and stop. The phase does not provision external services or Neon.
- **D-10:** A named Docker volume persists local PostgreSQL data by default. Destructive removal is available only through a separate, explicit documented command.
- **D-11:** Development connection values may be documented and overridden with environment variables, but are non-secret local defaults. No real credential or committed `.env` file is permitted.
- **D-12:** Docker provides only container, network, volume, and database healthcheck. It creates no schema, migrations, fixtures, or product tables.

### CI skeleton

- **D-13:** Use GitHub Actions for pull requests and pushes to the primary branch.
- **D-14:** CI separates the minimum relevant work into JavaScript/TypeScript quality, Rust/contracts quality, and desktop-build jobs rather than one opaque aggregate job.
- **D-15:** The initial desktop integration build runs on Linux only. Windows/macOS packaging and a cross-platform build matrix are deferred.
- **D-16:** Dependency caches are permitted for CI speed. This phase publishes no installers, screenshots, or application artifacts.

### the agent's Discretion

- Exact process-management API, retry interval, readiness timeout, healthcheck interval, Compose service names, action versions, and job-command mapping may be selected during research/planning, provided they preserve D-01 through D-16 and the pre-existing architecture boundaries.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and constraints

- `.planning/ROADMAP.md` — Phase 4 objective, Gate 1 association, dependencies, and acceptance criteria.
- `.planning/REQUIREMENTS.md` — FOUND-01/FOUND-02 traceability and later SQLite/PostgreSQL scope separation.
- `.planning/PROJECT.md` — desktop-first stack, local-versus-online authority, gate process, and provisional product name.
- `.planning/STATE.md` — current phase and prior delivery state.

### Phase 2–3 foundations

- `.planning/phases/02-workspace-toolchains-quality-scripts/02-CONTEXT.md` — portability, no-auto-install, non-mutating verification, and root-script policy.
- `.planning/phases/02-workspace-toolchains-quality-scripts/02-VERIFICATION.md` — verified workspace and quality baseline.
- `.planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-CONTEXT.md` — crate dependency boundaries and contract-client ownership that Phase 4 must preserve.
- `.planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-VERIFICATION.md` — Phase 3 verification evidence and scope fences.

### Architecture and operations

- `docs/adr/ADR-0001-monorepo-workspaces.md` — pnpm/Turborepo/Cargo workspace decision.
- `docs/adr/ADR-0002-tauri-react-rust.md` — Tauri 2, React/TypeScript/Vite, and Rust platform decision.
- `docs/adr/ADR-0003-independent-domain-core.md` — framework-independent domain/application constraint.
- `docs/operations/local-development.md` — cross-platform local command and clean-checkout baseline.
- `docs/testing/strategy.md` — quality, contract drift, and future CI responsibilities.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- Root `package.json` provides cross-platform Node-orchestrated quality, contract generation/drift, and Rust quality commands.
- The Cargo workspace already contains `domain`, `application`, `contracts`, and `platform` crates with audited dependency boundaries.
- `packages/contracts-client` contains the committed generated TypeScript client derived solely from `contracts/openapi.json`.

### Established Patterns

- Root scripts are repeatable and non-mutating checks; generation writers are explicit rather than hidden in aggregate commands.
- Every Rust/Cargo child process is mediated by Node and uses `RUSTUP_AUTO_INSTALL=0`.
- The domain remains independent of React, Tauri, Axum, SQLite, PostgreSQL, Neon, and other platform frameworks.

### Integration Points

- The Phase 4 API runtime and persistence adapter must compose outward from the existing application/contracts/platform boundaries without moving domain rules into UI or runtime handlers.
- The desktop shell consumes the generated TypeScript contract client rather than defining duplicate transport types.
- New local Docker and CI configuration must call existing real quality/drift commands and preserve their clean-worktree guarantee.

</code_context>

<specifics>
## Specific Ideas

- The shell should feel operationally dependable: automatic startup, bounded readiness, reuse of a healthy instance, and actionable recovery rather than opaque failure.
- PostgreSQL is strictly local development infrastructure in this phase; SQLite is a prepared boundary, not an implemented persistence feature.

</specifics>

<deferred>
## Deferred Ideas

- Cross-platform CI build matrix and distributable desktop packages — later release/verification work.
- SQLite schema, migrations, local-career storage, cache, and restoration — Phase 8 and Phase 9.
- PostgreSQL schema, migrations, hosted Neon, and multiplayer persistence — later data and V0.2 phases.

</deferred>

---

*Phase: 04-desktop-shell-local-persistence-boundary-containers-and-ci-skeleton*  
*Context gathered: 2026-07-14*
