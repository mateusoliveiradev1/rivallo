# Phase 03 Plan 09: Orval Generator Approval

**Approved by:** Mateus  
**Date:** 2026-07-14  
**Exact dependency:** `orval@8.21.0`

Mateus approved this exact replacement for the OpenAPI-to-TypeScript generator after reviewing the official `orval-labs/orval` provenance, its direct Fetch generator, and the package-legitimacy evidence. The legitimacy warning was SUS for release recency only; it was not a malicious-ownership or install-time-execution finding.

The approved package has no `postinstall` lifecycle hook. It is used only as the locally locked build-time generator, with no paired Orval runtime package, mutator, or install hook.

This approval supersedes the dated D-10 bundled-core exception for `@hey-api/openapi-ts@0.97.3`. That generator, its configuration, its generated-core inventory allowance, and the exception itself must no longer be retained as approved inventory. No further human checkpoint is required for this exact approved pin.

## Evidence

- Official repository metadata: `https://github.com/orval-labs/orval`
- npm integrity: `sha512-ot6CnOIsWZfDYjjRTd2DOMC1mutBFm+09RbA7kOgK3Um7z1qLmgjIuB7/AP+n+nn/xXPdBPsrFA3lX9c2fhQSg==`
- Lifecycle inspection: `pnpm view orval@8.21.0 scripts --json` returned no lifecycle scripts.
- The local package-legitimacy shim currently reports this published exact version as nonexistent; npm registry metadata above is the authoritative evidence for the approved transaction.
