# Phase 2: Workspace, Toolchains and Quality Scripts — Specification

**Created:** 2026-07-13  
**Ambiguity score:** 0.04 (gate: ≤ 0.20)  
**Requirements:** 6 locked

## Goal

The empty Rivallo repository becomes a reproducible pnpm/Turborepo/Cargo workspace with real root quality commands and documented toolchain validation, without creating product applications, domain crates, or infrastructure services.

## Background

The repository currently contains approved Gate 0 planning, product, design, and ADR documentation but no workspace manifests, apps, crates, toolchain configuration, or executable quality scripts. Phase 3 needs a stable Rust workspace and contract-pipeline base; Phase 4 will create the executable desktop/API shell and container/CI skeleton.

## Requirements

1. **Workspace roots**: Define valid pnpm, Turborepo, and Cargo workspace roots for the future monorepo.
   - Current: No JavaScript or Cargo workspace manifest exists.
   - Target: Root manifests describe only real Phase 2 configuration/package locations and remain valid with no product apps or crates.
   - Acceptance: Package-manager and Cargo workspace metadata commands succeed without adding fake apps, crates, or no-op members.

2. **Toolchain contract**: Define and validate minimum Node.js, pnpm, Rust, and Cargo requirements.
   - Current: No version policy or validation command exists.
   - Target: A root validation command checks the required toolchains before quality work starts.
   - Acceptance: A missing or below-minimum toolchain exits non-zero and reports expected tool, minimum version, detected version when available, and a concise remediation instruction; it never installs or upgrades tooling.

3. **Quality configuration**: Configure TypeScript typechecking, ESLint, Prettier, rustfmt, Clippy, cargo-nextest, and Vitest only to the extent meaningful for Phase 2 configuration.
   - Current: No lint, format, typecheck, Rust quality, unit-test, or test-runner configuration exists.
   - Target: Root configuration and scripts execute real validation of the workspace/configuration now present, with Vitest prepared but no invented product tests.
   - Acceptance: Every declared Phase 2 quality script performs a real check and returns its actual exit status; no script succeeds merely because a future app or crate is absent.

4. **Repeatable quality commands**: Make root validation safe to re-run.
   - Current: No quality commands exist.
   - Target: Repeated validation commands leave tracked files and configuration unchanged.
   - Acceptance: Starting from a clean repository, re-running all Phase 2 quality/smoke commands leaves `git status --porcelain` empty; local `node_modules`, `.turbo`, and `target` artifacts are Git-ignored and not committed.

5. **File and script conventions**: Record configuration ownership and script naming boundaries.
   - Current: No documented repository conventions exist for workspace/tooling files.
   - Target: Documentation identifies root-owned configuration, future application/crate ownership, and which scripts are deliberately deferred.
   - Acceptance: Documentation states that app, crate, Tauri, axum/API, persistence, integration, Docker, and CI-specific scripts are absent by design until their responsible phases.

6. **Developer command documentation**: Document how a contributor validates Phase 2 from a clean checkout.
   - Current: Local-development documentation is planning-only.
   - Target: README/local-development material lists prerequisites and the exact root setup, validation, lint, format, typecheck, Rust quality, and smoke commands.
   - Acceptance: A contributor can follow the documented sequence on a supported machine without real credentials, Neon, Docker, or product services.

## Boundaries

**In scope:**

- pnpm workspace, Turborepo, and Cargo workspace metadata.
- Minimum toolchain requirements and a non-mutating validation command.
- Root scripts and configuration for ESLint, Prettier, TypeScript, rustfmt, Clippy, cargo-nextest, and Vitest preparation.
- Git-ignore rules for standard local build/cache artifacts.
- File/script conventions and reproducible developer-command documentation.

**Out of scope:**

- Tauri desktop application and axum API implementation — Phase 4 establishes the executable shell.
- Rust domain/application crates and OpenAPI contracts — Phase 3 owns those boundaries.
- SQLite, PostgreSQL, Neon, Docker, and CI workflow — persistence/containers/CI skeleton belong to Phase 4.
- Dashboard, squad, visual components, authentication, simulation, multiplayer, editor, and mods — later approved phases own product capability.
- Automatic toolchain installation or updates — developer environments must remain explicit and controlled.
- Placeholder scripts for future apps/crates — they would falsely report readiness.

## Constraints

- No production application code, product behavior, credentials, cloud provisioning, or real infrastructure may be added.
- Root scripts must validate only resources that exist in Phase 2 and must propagate genuine failures.
- Standard local caches are permitted only when ignored by Git and when they do not modify tracked configuration.
- TDD applies only to behavior that is testable in this configuration phase; setup is verified through build, lint, typecheck, format, and smoke commands.

## Acceptance Criteria

- [ ] `pnpm`, Turborepo, and Cargo identify valid root workspaces without fake apps or crates.
- [ ] The documented minimum Node.js, pnpm, Rust, and Cargo requirements are checked before quality commands; an unsatisfied requirement fails non-zero with expected tool, minimum, detected version when available, and remediation.
- [ ] Toolchain validation never installs or updates a toolchain.
- [ ] Root lint, format-check, TypeScript typecheck, Rust format-check, Clippy, nextest, Vitest-preparation, and smoke commands each perform a real Phase 2 check and propagate failure.
- [ ] Re-running all Phase 2 commands from a clean checkout leaves tracked files unchanged and `git status --porcelain` empty; permitted local artifacts are ignored.
- [ ] No app-, crate-, Tauri-, axum/API-, persistence-, integration-, Docker-, or CI-specific scripts exist as placeholders.
- [ ] Documentation provides an executable clean-checkout sequence without credentials, Neon, Docker, or product services.
- [ ] No production application code, product feature, database, container, cloud resource, or CI workflow is introduced.

## Edge Coverage

**Coverage:** 3/3 applicable edges resolved · 0 unresolved

| Category | Requirement | Status | Resolution / Reason |
|---|---|---|---|
| Boundary values | R2 | ✅ covered | Toolchain validator handles missing, below-minimum, and supported-version cases via acceptance criteria 2. |
| Idempotency / repetition | R4 | ✅ covered | Repeated root command execution leaves `git status --porcelain` empty via acceptance criterion 5. |
| Concurrency / effect ordering | R4 | ⛔ dismissed | Parallel invocation is not a Phase 2 guarantee; each supported individual run must preserve the tracked tree. |

## Prohibitions (must-NOT)

**Coverage:** 2/2 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|---|---|---|---|
| MUST NOT silently install or update Node, pnpm, Rust, or Cargo. | R2 | resolved | Acceptance criterion 3; deterministic command-behavior check. |
| MUST NOT report success through fake or placeholder scripts for future components. | R3/R5 | resolved | Acceptance criteria 4 and 6; script inventory and command execution. |

## Ambiguity Report

| Dimension | Score | Min | Status | Notes |
|---|---:|---:|---|---|
| Goal Clarity | 0.96 | 0.75 | ✓ | Reproducible configuration-only outcome locked. |
| Boundary Clarity | 0.98 | 0.70 | ✓ | Later-phase capabilities explicitly excluded. |
| Constraint Clarity | 0.96 | 0.65 | ✓ | Toolchain failure, idempotency, and no-placeholder rules locked. |
| Acceptance Criteria | 0.94 | 0.70 | ✓ | Eight pass/fail checks. |
| **Ambiguity** | **0.04** | **≤0.20** | **✓** | Ready for planning discussion. |

## Interview Log

| Round | Perspective | Question summary | Decision locked |
|---|---|---|---|
| 1 | Researcher | What exists and what belongs to Phase 2? | Repository is planning-only; Phase 2 owns workspaces, toolchains, quality scripts, and docs only. |
| 1 | Simplifier | What is the smallest meaningful validation? | Real root checks for existing configuration; no apps, crates, or future placeholders. |
| 2 | Failure Analyst | What happens with missing tools and repeat runs? | Non-zero actionable failures, no auto-install, and clean idempotent re-runs. |

---

*Phase: 02-workspace-toolchains-quality-scripts*  
*Spec created: 2026-07-13*  
*Next step: $gsd-discuss-phase 2 — implementation decisions only*
