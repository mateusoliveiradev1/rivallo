# Phase 2 Research: Workspace, Toolchains and Quality Scripts

**Phase:** 02-workspace-toolchains-quality-scripts  
**Researched:** 2026-07-13  
**Scope:** configuration-only foundation; no applications, domain crates, services, containers, CI, or product behavior.

## Research question

What is the smallest, real, cross-platform pnpm/Turborepo/Cargo foundation that can validate its own toolchain and quality configuration without inventing an app, a Rust crate, or a no-op future script?

## Locked constraints applied

- Windows, macOS, and Linux are first-class. Package scripts must not contain PowerShell, Bash, `cmd.exe`, or platform-specific conditionals; validation logic belongs in a versioned Node program.
- `package.json` and `rust-toolchain.toml` are native version-policy sources. Stable versions at or above documented minima are accepted; prereleases are rejected.
- A failed tool check reports tool, required minimum, detected version when known, and a concise remediation step. It never installs or updates tools.
- Root checks are real, non-mutating, fail-fast, and leave a previously clean tracked tree clean. Warnings fail ESLint and Clippy checks.
- There are no future-facing app, API, Tauri, axum, database, Docker, CI, or integration placeholders.

## Findings

### 1. Empty-but-real workspaces are feasible

- **pnpm:** A root `pnpm-workspace.yaml` is the workspace marker. It may declare future location globs (`apps/*`, `packages/*`) without creating matching packages; pnpm's workspace documentation treats the YAML file as the workspace root requirement. The root package remains the only actual package in Phase 2. **[Official: pnpm Workspace]**
- **Turborepo:** `turbo.json` can be valid with a root task definition, while the root package is the only current package. Phase 2 should configure only tasks that actually execute at the root; it must not define `build`, `dev`, or package pipeline tasks for absent applications. **[Official: Turborepo configuration]**
- **Cargo:** A virtual root manifest with `[workspace]`, resolver version, and an explicit empty `members = []` is structurally valid for metadata inspection. It establishes the boundary without a fabricated crate. `cargo metadata --no-deps --format-version 1` is the appropriate non-mutating structural proof. **[Official: Cargo workspaces]**

**Planning implication:** Validate the three roots independently: pnpm workspace discovery/filtered root command, `turbo` configuration inspection or a real root task, and `cargo metadata`. Do not create `apps/`, `packages/`, or `crates/` just to make commands appear productive.

### 2. Toolchain policy needs an explicit validator, not package-manager magic

- `package.json` supports `engines` for Node and package-manager expectations, but package-manager fields are not a portable replacement for a human-readable minimum-version policy and actionable diagnostics. A versioned Node validator can read the native manifest and reliably compare semantic versions before any other quality command. **[Official: npm package.json]**
- `rust-toolchain.toml` is an override/selection mechanism for Rustup. A `channel` that names a numbered release selects that toolchain; it does **not** independently express a general `>=` range. **[Official: rustup overrides]**
- Therefore the planner must resolve one narrow representation issue: preserve `rust-toolchain.toml` as the native source required by D-03, but make the Node validator derive a minimum in a documented, deterministic way from its stable channel value. It must not use `rustup` to install the channel. A stable channel such as `stable` alone cannot prove a minimum.
- Validate `node --version`, `pnpm --version`, `rustc --version`, and `cargo --version`; parse only stable SemVer releases; reject prerelease identifiers. Compare `rustc` and Cargo against the same minimum and fail if their reported release versions differ, showing both values.

**Planning implication:** Put all comparison and diagnostic behavior in `scripts/check-toolchains.mjs` (or equivalent Node ESM). It should use `spawnSync`/`execFileSync` with argument arrays, never shell interpolation, and exit non-zero on missing executable, unparsable/pre-release version, below minimum, or Rust/Cargo mismatch. Unit tests are not required unless the validator's parser is explicitly made testable; its negative paths can be smoke-verified with controlled command-path injection only if that remains cross-platform.

### 3. Quality tools must inspect configuration that exists now

| Concern | Real Phase 2 validation | Avoid |
|---|---|---|
| TypeScript | Root `tsconfig` with `tsc --noEmit` over tooling/config source that exists now. | A typecheck script filtered to a nonexistent app. |
| ESLint | Flat config and a root lint target limited to committed JS/TS/config/tooling files; `--max-warnings 0`. | Linting a nonexistent `src/` or relying on default warning tolerance. |
| Prettier | `prettier --check` on an explicit root file set/config. Add a separate explicit write command only if desired; `check` never writes. | `--write` inside `pnpm check`. |
| rustfmt | `cargo fmt --all -- --check`; this is non-mutating and validates the workspace formatting contract. | A write-mode formatter in the aggregate command. |
| Clippy | `cargo clippy --workspace --all-targets -- -D warnings` only after confirming its behavior for an empty virtual workspace in the target toolchain. | A script that catches/ignores a no-package failure. |
| cargo-nextest | Check `cargo nextest --version` plus `cargo metadata` as an availability + workspace-integration smoke proof; no domain crate is needed. | A fake crate or an unconditional successful `nextest run` with no packages. |
| Vitest | A dedicated tooling/config smoke test, e.g. a test that imports/validates the versioned configuration contract, executed by `vitest run` against an explicit test file. | `--passWithNoTests`, which would violate the no-false-success rule. |

**Planning implication:** Test tool behavior against the selected versions during implementation before finalizing atomic scripts. In particular, Cargo may differ on whether `clippy --workspace` does useful work for an empty virtual workspace. If it emits an unavoidable empty-workspace diagnostic or succeeds without inspecting anything, replace it with a real config/workspace smoke validator rather than suppressing failure or adding a dummy crate. The final script must either perform meaningful validation or not be declared in Phase 2.

### 4. Orchestration and caching

- `pnpm check` should call a Node orchestration script or sequence of atomic root scripts in a fixed order: toolchains first, then JavaScript checks, then Rust checks, then smoke. The orchestrator must propagate the first child exit status and print the atomic reproduction command.
- Turborepo is useful as a valid configured workspace boundary, but it should not be used to disguise an empty task graph. Any Phase 2 Turbo task must run a real root quality command and declare no build outputs. `.turbo/` is a local cache and must be ignored.
- `pnpm install --frozen-lockfile` is suitable for documented clean-checkout dependency installation once a committed lockfile exists. It is not a toolchain installer and must be kept outside `check`.
- Ignore `node_modules/`, `.turbo/`, `target/`, Playwright output only if/when Playwright is actually configured, and ordinary coverage/report artifacts. Do not ignore source/config globs broadly enough to hide accidental files.

## Candidate file ownership

| File/location | Phase 2 responsibility |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json` | Root JavaScript workspace and only real root scripts/tasks. |
| `rust-toolchain.toml`, `Cargo.toml` | Root Rust selection and virtual workspace boundary. |
| `scripts/check-toolchains.mjs` and optional `scripts/*.mjs` | Cross-platform validation/orchestration; no domain behavior. |
| `eslint.config.*`, `.prettierrc*`, `tsconfig*.json`, `vitest.config.*` | Root quality configuration. |
| tooling-only test location | One explicit Vitest infrastructure smoke test; no product tests. |
| `.gitignore`, `README.md`, `docs/operations/local-development.md` | Cache exclusions and reproducible clean-checkout instructions. |

Do not create application/package/crate directories in Phase 2. Phase 3 owns real Rust crates and API-contract tooling; Phase 4 owns desktop/API applications, persistence, containers, and CI.

## Recommended verification matrix

1. Run the toolchain validator with supported installed versions; verify no writes.
2. Exercise each required negative class in a controlled smoke test or validator unit test: missing command, below minimum, prerelease, and mismatched Rust/Cargo; assert non-zero and all required diagnostic fields.
3. Validate pnpm workspace/root package, `turbo.json`, and Cargo metadata with no package members.
4. Run each declared atomic root command, then `pnpm check`; ensure the aggregate fails fast and every failure maps to an atomic command.
5. Run format check, lint, typecheck, Rust checks, Vitest smoke, and nextest availability/metadata twice from a clean tree; `git status --porcelain` must remain empty.
6. Confirm script inventory contains no app/crate/API/Tauri/database/Docker/CI placeholders and documentation lists only commands that exist.

## Risks and conflicts to resolve during planning

1. **Rust minimum representation — material:** D-03 requires `rust-toolchain.toml` as the native source, while D-04 requires an accepted `>=` stable minimum. Rustup's channel field selects a channel/toolchain rather than a SemVer range. The plan must state exactly how the stable channel encodes the minimum and how the validator reads it; do not quietly treat `stable` as a minimum.
2. **Empty Cargo Clippy semantics — material:** With no member crates, the selected Cargo/Clippy version may reject, warn, or trivially accept `--workspace`. Verify empirically before implementing. A no-op success is prohibited, but so is creating a fake crate.
3. **Playwright scope — traceability conflict:** The original Gate 1 request and current ROADMAP Phase 2 success criterion mention Playwright preparation; the later locked `02-SPEC.md` and `02-CONTEXT.md` enumerate Vitest but not Playwright. The SPEC is the more specific current phase contract, so do not add Playwright unless the product owner amends the specification or the planner records an explicit resolution.
4. **`packageManager` exactness — minor:** Corepack-oriented `packageManager` commonly names an exact pnpm release, whereas D-04 accepts compatible minimum versions. Avoid using an exact field as an enforcement mechanism that rejects otherwise supported pnpm versions; the validator should be the policy authority.

## Sources

- **[Official: pnpm Workspace]** https://pnpm.io/workspaces — workspace root and package-location configuration.
- **[Official: Turborepo configuration]** https://turborepo.com/docs/reference/configuration — root `turbo.json` task configuration and cache behavior.
- **[Official: Cargo workspaces]** https://doc.rust-lang.org/cargo/reference/workspaces.html — virtual manifests, members, and workspace metadata.
- **[Official: rustup overrides]** https://rust-lang.github.io/rustup/overrides.html — `rust-toolchain.toml` override/selection semantics.
- **[Official: npm package.json]** https://docs.npmjs.com/cli/v11/configuring-npm/package-json — `engines` and package manifest policy fields.
- **[Official: Prettier CLI]** https://prettier.io/docs/cli — `--check` is non-mutating and `--write` mutates files.
- **[Official: TypeScript compiler options]** https://www.typescriptlang.org/tsconfig/noEmit.html — `noEmit` type-check behavior.
- **[Official: ESLint CLI]** https://eslint.org/docs/latest/use/command-line-interface — warning threshold controls.
- **[Official: Vitest CLI]** https://vitest.dev/guide/cli — runner behavior and explicit test execution.
- **[Official: cargo-nextest]** https://nexte.st/docs/installation/ — installation and `cargo nextest` command availability.

## Research conclusion

Phase 2 can produce a real, verifiable configuration-only foundation without crossing into Phase 3 or 4. The plan should create only root manifests, quality configuration, cross-platform Node validators/orchestrators, one tooling-only Vitest smoke test, cache ignores, and documentation. It must explicitly resolve Rust minimum encoding and empirically prove empty-workspace Clippy behavior before declaring the quality suite complete.

## RESEARCH COMPLETE

Research supports a small root-only plan and identifies two implementation-sensitive checks (Rust minimum encoding and empty-workspace Clippy semantics), plus one scope discrepancy (Playwright) that must remain deferred unless the SPEC is amended.
