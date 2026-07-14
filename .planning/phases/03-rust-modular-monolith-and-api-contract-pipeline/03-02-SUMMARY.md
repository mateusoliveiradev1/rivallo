---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "02"
subsystem: architecture
tags: [cargo, metadata, dependency-policy, rust, tooling]
requires:
  - phase: 03-01
    provides: four-member Rust crate topology
provides:
  - resolved-Cargo-metadata enforcement of the D-01 edge matrix
  - transitive domain dependency allowlist and denylist audit
affects: [03-04, 03-07, cargo-architecture-policy]
tech-stack:
  added: [Node metadata audit]
  patterns: [resolved-graph traversal, actionable dependency paths, non-mutating cargo check]
key-files:
  created: [scripts/verify-cargo-architecture.mjs, tooling-tests/verify-cargo-architecture.test.mjs]
  modified: [scripts/check-rust-quality.mjs]
key-decisions:
  - "D-01 is checked from Cargo's resolved graph, not Cargo.toml text."
  - "Domain closure accepts only a deliberately small neutral core allowlist and rejects framework, frontend, network, persistence, and database families."
patterns-established:
  - "Cargo architecture tooling uses RUSTUP_AUTO_INSTALL=0 for every Cargo child process."
  - "Controlled metadata fixtures exercise forbidden edges without mutating manifests."
requirements-completed: [FOUND-03]
duration: 10min
completed: 2026-07-14
status: complete
---

# Phase 3 Plan 02: Cargo Architecture Policy Summary

**Resolved Cargo metadata now enforces the D-01 crate-edge matrix and a transitive domain-purity boundary with actionable dependency paths.**

## Performance

- **Duration:** 10 min
- **Tasks:** 1/1
- **Files modified:** 3

## Accomplishments

- Added a read-only Cargo metadata verifier for the exact Phase-3 crate dependency matrix.
- Rejected application-to-contracts, inverted workspace edges, and transitive domain denylist reachability with rendered paths.
- Added a non-mutating `cargo check --workspace` quality mode under the established no-auto-install environment.

## Task Commits

1. **Task 1: Enforce D-01 with a resolved-metadata edge matrix** - `5d8f43a` (feat)

## Files Created/Modified

- `scripts/verify-cargo-architecture.mjs` - resolves Cargo metadata, applies D-01 and domain-closure policy, and reports paths.
- `tooling-tests/verify-cargo-architecture.test.mjs` - validates the live graph plus controlled forbidden-edge fixtures.
- `scripts/check-rust-quality.mjs` - adds `check` mode for the real Rust workspace.

## Decisions Made

- Cargo's `resolve.nodes` is the policy source, so transitive dependencies cannot evade a manifest-text check.
- The domain allowlist is deliberately narrow (`rivallo-domain`, `serde`, `thiserror`); the denylist explicitly covers platform/framework, HTTP/network, frontend, persistence, and database families.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The repository-wide ESLint command reports 286 pre-existing findings under the unrelated `.agents` skill tooling. The changed scripts and focused tests pass; this plan did not modify those files.

## TDD Gate Compliance

- The focused tests were written and observed failing before the verifier existed, then passed after implementation. The task implementation and tests were committed together as `5d8f43a` rather than separate RED/GREEN commits.

## User Setup Required

None - no external service configuration is required.

## Next Phase Readiness

Later Phase 3 contract work can rely on a non-mutating, resolved-graph guard against forbidden architecture dependencies.

## Self-Check: PASSED

- `scripts/verify-cargo-architecture.mjs` and `tooling-tests/verify-cargo-architecture.test.mjs` exist.
- Task commit `5d8f43a` exists and contains no tracked-file deletions.
- No stubs or unplanned security-relevant surface were introduced.

---
*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*
*Completed: 2026-07-14*
