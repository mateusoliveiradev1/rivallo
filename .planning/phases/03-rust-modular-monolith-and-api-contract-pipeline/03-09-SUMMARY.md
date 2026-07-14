---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "09"
subsystem: api-contracts
tags: [openapi, orval, fetch, generated-client, drift-verification, vitest]
requires:
  - phase: 03-08
    provides: identified the Hey API public auth/SSE reachability gap
provides:
  - Exact approved Orval Fetch generation from the Rust-owned committed OpenAPI document
  - Generated-only contract types, metadata, and a direct Fetch operation without auth/SSE/retry/backoff surface
  - Whole-tree isolated deterministic drift proof and an unregistered neutral operation fixture
affects: [phase-3-verification, downstream-contract-consumers]
tech-stack:
  added: [orval@8.21.0]
  patterns: [local OpenAPI input, direct generated Fetch operations, temporary-tree byte drift comparison]
key-files:
  created:
    - .planning/phases/03-rust-modular-monolith-and-api-contract-pipeline/03-09-APPROVAL.md
    - packages/contracts-client/orval.config.ts
    - packages/contracts-client/src/generated/contracts.ts
  modified:
    - crates/platform/src/lib.rs
    - contracts/openapi.json
    - scripts/generate-contract-client.mjs
    - tooling-tests/contracts-client-generation.test.mjs
    - tooling-tests/phase-3-scope.test.mjs
key-decisions:
  - "Replace the superseded Hey API exception with exact approved orval@8.21.0 using official client: 'fetch' output."
  - "Use the sole neutral, test-only /_contract/manifest OpenAPI operation because the direct Fetch generator is operation-scoped."
  - "Keep temporary-tree generation byte-stable by applying the repository Prettier configuration in the explicit local writer."
patterns-established:
  - "Contracts-client root is a transparent export of one generator-owned file only."
  - "Generated-client checks compare complete temporary output inventory and bytes without repairing tracked files."
requirements-completed: [DATA-02]
duration: 28min
completed: 2026-07-14
status: complete
---

# Phase 03 Plan 09: Orval Fetch Generator Migration Summary

**Exact Orval 8.21.0 now generates the Rust-owned contract types, metadata, and a direct Fetch operation without a public auth, SSE, retry, or backoff capability.**

## Performance

- **Duration:** 28min
- **Tasks:** 3/3
- **Files modified:** 15

## Accomplishments

- Recorded the approved exact Orval replacement and removed Hey API dependency, configuration, generated tree, and the superseded D-10 inventory exception.
- Added the one permitted neutral contract-introspection OpenAPI operation after the schema-only dry run proved that Fetch output needs an operation.
- Preserved a locally locked writer, complete temporary-tree byte comparison, public capability fence, fixture non-registration proof, and writer-free aggregate check.

## Task Commits

1. **Task 1: Record the approved exact replacement and atomically replace generator ownership** - `15b6630`
2. **Task 2: Add the neutral contract-introspection operation and regenerate the narrow public Fetch surface** - `0ce165d`
3. **Task 3: Preserve whole-tree drift proof and fence the new generated public surface** - `daaac3b`

## Files Created/Modified

- `packages/contracts-client/orval.config.ts` - Local exact Orval Fetch configuration with no mutator or runtime package.
- `packages/contracts-client/src/generated/contracts.ts` - Generator-owned contract types, metadata, and direct Fetch operation.
- `crates/platform/src/lib.rs` - Test-only Utoipa operation declaration with no runtime registration.
- `scripts/generate-contract-client.mjs` - Local Orval invocation and deterministic formatting.
- `scripts/verify-contract-client-drift.mjs` - Complete isolated output-tree comparison retained for Orval output.
- `tooling-tests/contracts-client-generation.test.mjs` - Root-import and forbidden-capability regression coverage.
- `tooling-tests/phase-3-scope.test.mjs` - Fixture non-registration and Phase 3 scope fences.

## Decisions Made

- The exact `orval@8.21.0` approval supersedes the former `@hey-api/openapi-ts@0.97.3` D-10 generated-core exception.
- The only generated transport option is standard `RequestInit`; no mutator, auth, security scheme, SSE, retry, backoff, or runtime package was added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Routed temporary output through the Orval configuration**
- **Found during:** Task 1
- **Issue:** Orval rejects its CLI `--output` flag when a config file is supplied.
- **Fix:** Retained the existing `CONTRACT_CLIENT_OUTPUT` seam by reading it in `orval.config.ts`; the writer applies the repository Prettier configuration so temporary and tracked output are byte-identical.
- **Files modified:** `packages/contracts-client/orval.config.ts`, `scripts/generate-contract-client.mjs`, `scripts/verify-contract-client-drift.mjs`
- **Verification:** `pnpm contracts:client:check` and the complete drift test pass without tracked-file mutation.
- **Committed in:** `0ce165d`

**2. [Rule 1 - Bug] Updated the prior schema-only assertion for the approved fixture**
- **Found during:** Task 3
- **Issue:** The pre-existing OpenAPI pipeline test asserted empty paths, which is no longer correct after the plan-required neutral operation.
- **Fix:** Replaced it with assertions for the sole parameterless, unsecured `ContractManifest` operation and absent runtime registration.
- **Files modified:** `tooling-tests/openapi-pipeline.test.mjs`
- **Verification:** `pnpm check` passes all 28 tests.
- **Committed in:** `daaac3b`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both changes preserve the plan's deterministic, generated-only boundary without expanding runtime scope.

## Issues Encountered

- The local package-legitimacy shim reported the exact published Orval version as nonexistent; npm metadata confirmed official provenance, integrity, and no lifecycle scripts, and the already-recorded user approval governed the exact transaction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DATA-02 now has a direct generated Fetch proof with no reachable forbidden transport capability.
- `pnpm check` remains writer-free and validates the complete pipeline.

## Self-Check: PASSED

- Required approval, Orval configuration, generated output, and regression tests exist.
- Task commits `15b6630`, `0ce165d`, and `daaac3b` exist in Git history.

---
*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*
*Completed: 2026-07-14*
