# Deferred Items

- The aggregate Vitest run can race `tooling-tests/phase-3-scope.test.mjs` against the contract-client generation suite, causing a transient contract-client drift report. Plan 04-04's aggregate reached 40/41 passing tests with its six desktop tests green; `pnpm contracts:client:check` passed immediately in isolation. The Phase 3 test-concurrency repair is outside Plan 04-04's desktop lifecycle scope.

Resolved by Plan 04-04 commit `192b0de`: the workspace assertion now accepts both declared workspace globs regardless of order, and Cargo metadata checks use a 64 MiB output buffer.
