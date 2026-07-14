---
phase: 03-rust-modular-monolith-and-api-contract-pipeline
plan: "05"
subsystem: contracts
tags: [rust, openapi, deterministic-generation, drift-verification, vitest]
requires:
  - phase: 03-04
    provides: schema-only Rust OpenAPI exporter with an explicit output path
provides:
  - Rust-derived committed OpenAPI document
  - Deterministic explicit writer and isolated byte-based drift verifier
  - Focused proof of schema provenance and no runtime registration
affects: [03-06, contract-pipeline, quality-checks]
tech-stack:
  added: []
  patterns: [Node-mediated Cargo execution, explicit artifact writers, temporary-output byte comparison]
key-files:
  created: [contracts/openapi.json, scripts/generate-openapi.mjs, scripts/verify-openapi-drift.mjs, tooling-tests/openapi-pipeline.test.mjs]
  modified: [package.json]
key-decisions:
  - "The Node writer prepares only the destination directory; the Rust exporter exclusively materializes OpenAPI JSON."
  - "Drift verification exports to a unique temporary path and byte-compares without writing the tracked artifact."
patterns-established:
  - "Generated contract checks use an isolated temporary destination and print their explicit writer command on drift."
requirements-completed: [DATA-02]
metrics:
  duration: 8min
  completed: 2026-07-14
status: complete
---

# Phase 3 Plan 05: Deterministic OpenAPI Materialization Summary

**The schema-only Rust exporter now produces a committed versioned OpenAPI document through an explicit writer, with an isolated, actionable non-mutating drift check.**

## Accomplishments

- Added `pnpm contracts:openapi:generate`, which delegates the canonical artifact write to `export-openapi` with `RUSTUP_AUTO_INSTALL=0`.
- Committed the Rust-derived, schema-only `contracts/openapi.json`, verified byte-identical across repeated generation.
- Added `pnpm contracts:openapi:check`, which exports into a unique system temporary directory and reports `pnpm contracts:openapi:generate` on byte drift.
- Added focused pipeline coverage for determinism, normal and controlled drift behavior, version/schema provenance, and absence of runtime registration.

## Task Commits

1. **Task 1: Materialize the committed OpenAPI artifact through the platform exporter** - `31fcc20` (feat)
2. **Task 2: Verify isolated OpenAPI drift and schema-first pipeline proof** - `487100a` (feat)

## Verification

- `pnpm contracts:openapi:generate && pnpm contracts:openapi:generate && git diff --exit-code -- contracts/openapi.json` passed.
- `pnpm contracts:openapi:check && pnpm test -- tooling-tests/openapi-pipeline.test.mjs && git diff --exit-code -- contracts/openapi.json` passed.
- `git diff --check` passed.

## Files Created/Modified

- `contracts/openapi.json` - canonical Rust-generated versioned schema document.
- `scripts/generate-openapi.mjs` - explicit portable Cargo writer.
- `scripts/verify-openapi-drift.mjs` - temporary-output byte comparator.
- `tooling-tests/openapi-pipeline.test.mjs` - deterministic and schema-only pipeline regression coverage.
- `package.json` - root OpenAPI writer and verifier commands.

## Decisions Made

- The writer creates the missing destination directory but never serializes or edits the document; the platform exporter owns all JSON materialization.
- The verifier defaults to the committed artifact and uses a test-only expected-document override to prove controlled drift without touching tracked files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Create the explicit artifact destination directory**
- **Found during:** Task 1
- **Issue:** The required `contracts/` destination did not yet exist, so the Rust exporter correctly failed its explicit file write.
- **Fix:** The Node writer now creates only the destination directory before invoking the exporter.
- **Files modified:** `scripts/generate-openapi.mjs`
- **Verification:** Two explicit writer runs passed and left the document byte-identical.
- **Committed in:** `31fcc20`

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the explicit writer to materialize its planned artifact; no runtime or product scope added.

## Issues Encountered

- The first drift-verifier test exposed an incorrect Node module import; it was corrected before the task verification and commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-06 can consume the committed OpenAPI document for TypeScript client generation.
- No runtime endpoint, fixture, listener, adapter, or TypeScript generator installation was added.

## Self-Check: PASSED

- All four planned artifact files exist and both task commits (`31fcc20`, `487100a`) are present.
- No known stubs or additional security-relevant surface beyond the plan's explicit exporter and temporary filesystem boundary were introduced.
