---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "06"
subsystem: contracts
tags: [openapi, typescript, generated-client, drift-verification, hey-api]
requires:
  - phase: 03-05
    provides: Committed deterministic Rust-derived contracts/openapi.json
provides:
  - Generated-only TypeScript contract package with schema types and Fetch client
  - Explicit client writer and isolated complete-tree drift verifier
  - Focused provenance, repeatability, non-mutation, and scope-fence tests
affects: [03-07, contract-pipeline, quality-checks]
tech-stack:
  added: ["@hey-api/openapi-ts@0.97.3"]
  patterns: [exactly pinned local OpenAPI generator, temporary complete-tree byte comparison]
key-files:
  created: [packages/contracts-client/openapi-ts.config.ts, packages/contracts-client/src/generated/index.ts, scripts/generate-contract-client.mjs, scripts/verify-contract-client-drift.mjs, tooling-tests/contracts-client-generation.test.mjs]
  modified: [package.json, pnpm-workspace.yaml, pnpm-lock.yaml, tsconfig.json, tooling-tests/workspace-config.test.mjs]
key-decisions:
  - "The generated package accepts only committed contracts/openapi.json and exports the generator-owned output through a minimal package entrypoint."
  - "Client drift verification invokes the writer with a temporary output override and byte-compares the entire generated tree without touching tracked files."
patterns-established:
  - "Generated contract checks use a unique temporary output directory and print pnpm contracts:client:generate when drift is detected."
  - "Generated TypeScript models remain confined to packages/contracts-client/src/generated; the non-generated entrypoint only re-exports them."
requirements-completed: [DATA-02]
metrics:
  duration: 20min
  completed: 2026-07-14
status: complete
---

# Phase 3 Plan 06: Generated Contracts Client Summary

**A pinned local OpenAPI generator now produces the independent Fetch contract client and schema types, with deterministic complete-tree drift verification.**

## Accomplishments

- Added the approved exact `@hey-api/openapi-ts@0.97.3` pin and workspace package at `packages/contracts-client`.
- Generated types, contract-version schema metadata, and the minimum Fetch client exclusively from committed `contracts/openapi.json`.
- Added explicit writer/check commands; the checker generates into a unique temporary directory, compares every generated file byte-for-byte, and prints the repair command on drift.
- Added five focused tests covering local OpenAPI provenance, repeatability, non-mutation, controlled drift, generated-only source ownership, and no configured auth/retry/application coupling.

## Verification

- `pnpm contracts:client:generate` run twice produced an unchanged generated tree.
- `pnpm contracts:client:check` passed without modifying the tracked client.
- `pnpm exec vitest run tooling-tests/contracts-client-generation.test.mjs` passed (5 tests).
- `git diff --check` passed.
- `pnpm typecheck` remains blocked only by 18 pre-existing errors in `scripts/verify-cargo-architecture.mjs` and `tooling-tests/verify-cargo-architecture.test.mjs`; the new plan files introduce none.
- The literal plan command `pnpm test -- tooling-tests/contracts-client-generation.test.mjs` invokes the full existing Vitest suite and remains blocked by unavailable `cargo.exe` for pre-existing OpenAPI/architecture tests; the focused direct Vitest invocation above passed.

## Task Commits

1. **Task 1: Configure the generated contracts-client package and writer** - `2a1410a` (feat)
2. **Task 2: Verify deterministic generated-client drift** - `2f930ba` (test)

## Files Created/Modified

- `packages/contracts-client/openapi-ts.config.ts` - pinned generator configuration with the committed OpenAPI input and Fetch plugins.
- `packages/contracts-client/src/generated/` - generator-owned schema types and minimum client output.
- `packages/contracts-client/src/index.ts` - package re-export only, with no hand-authored contract model.
- `scripts/generate-contract-client.mjs` - portable explicit writer, including the verifier-only temporary output override.
- `scripts/verify-contract-client-drift.mjs` - isolated complete-tree byte comparator.
- `tooling-tests/contracts-client-generation.test.mjs` - focused generated-client pipeline proof.

## Decisions Made

- Used only the exact human-approved generator version and a repository-local input file; no remote OpenAPI input, auth configuration, retry configuration, or application import is configured.
- The generic Fetch generator emits internal authentication utility code, but no OpenAPI security scheme or client authentication configuration is generated or added by this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Use the generator's v0.97.3 `--file` CLI option**
- **Found during:** Task 1
- **Issue:** The initially assumed `--config` option is not supported by the approved generator version.
- **Fix:** Switched the portable writer to the documented `--file` option.
- **Files modified:** `scripts/generate-contract-client.mjs`
- **Verification:** Two writer runs generated byte-identical output.
- **Committed in:** `2a1410a`

**2. [Rule 2 - Missing Critical] Expose writer output override for isolated verification**
- **Found during:** Task 2
- **Issue:** The verifier could not invoke the existing writer against a temporary destination without risking tracked generated output.
- **Fix:** Added a `CONTRACT_CLIENT_OUTPUT` override consumed only by the writer so the verifier can use the same generation interface safely.
- **Files modified:** `scripts/generate-contract-client.mjs`, `scripts/verify-contract-client-drift.mjs`
- **Verification:** The non-mutating and controlled-drift tests pass.
- **Committed in:** `2f930ba`

**3. [Rule 1 - Bug] Update the existing workspace marker assertion**
- **Found during:** Task 2 verification
- **Issue:** The Phase 2 assertion still required an empty pnpm workspace after this plan correctly added the dedicated package.
- **Fix:** Updated the assertion to require the planned `packages/*` workspace member pattern.
- **Files modified:** `tooling-tests/workspace-config.test.mjs`
- **Verification:** The workspace configuration test passes in the aggregate run.
- **Committed in:** `2f930ba`

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical capability).
**Impact on plan:** All deviations were necessary for the exact approved generator and a genuinely non-mutating verifier; no product, transport, authentication, retry, or application scope was added.

## Issues Encountered

- The environment does not expose `cargo.exe`; this pre-existing toolchain condition blocks unrelated full-suite OpenAPI and architecture checks.
- Pre-existing JSDoc type errors in the architecture verifier remain outside this plan's generated-client scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-07 can add the client check to the aggregate quality flow and extend full-pipeline scope fences.
- Regenerate intentionally with `pnpm contracts:client:generate`; verify drift without writes using `pnpm contracts:client:check`.

## Self-Check: PASSED

- Generated client entrypoint, writer, verifier, and focused test exist.
- Task commits `2a1410a` and `2f930ba` are present.
- No known stubs or unplanned security-relevant surface were introduced.

---
*Phase: 03-rust-modular-monolith-and-api-contract-pipeline*
*Completed: 2026-07-14*
