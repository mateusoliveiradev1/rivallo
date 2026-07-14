# Phase 2: Workspace, Toolchains and Quality Scripts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13  
**Phase:** 02-workspace-toolchains-quality-scripts  
**Areas discussed:** Platform and command portability, Toolchain policy, Quality-gate behavior, Root scripts

---

## Platform and command portability

| Option | Description | Selected |
|---|---|---|
| Multiplatform | Windows, macOS, and Linux; no shell dependency | ✓ |
| Windows-first | PowerShell supported first | |
| Windows and Linux | PowerShell and POSIX shells | |

**User's choice:** Multiplatform, with Node/Rust validation logic, native version files, and compatible minimum versions.

---

## Toolchain policy

| Option | Description | Selected |
|---|---|---|
| Native sources | `package.json` and `rust-toolchain.toml` | ✓ |
| Single Rivallo manifest | One custom version file | |
| Hybrid | Native plus central version file | |

**User's choice:** Stable minimum-compatible versions; pre-releases rejected; Rust/Cargo mismatch fails; minimum changes update source, validator, and docs together.

---

## Quality-gate behavior

| Option | Description | Selected |
|---|---|---|
| Warnings block | ESLint and Clippy warnings fail checks | ✓ |
| Errors only | Warnings advisory | |
| Hybrid | Different policy per tool | |

**User's choice:** Non-mutating aggregate checks, Vitest and nextest infrastructure smoke tests, no invented product behavior or crates.

---

## Root scripts

| Option | Description | Selected |
|---|---|---|
| `pnpm check` | Aggregate plus explicit atomic commands | ✓ |
| No aggregate | Manual command sequence | |
| Split aggregates | Separate JS/Rust commands only | |

**User's choice:** Fail-fast `pnpm check`; explicit atomic naming; `pnpm install --frozen-lockfile` for declared dependencies only.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
