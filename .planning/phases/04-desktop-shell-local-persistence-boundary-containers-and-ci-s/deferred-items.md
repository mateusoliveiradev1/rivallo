# Deferred Items

- `tooling-tests/workspace-config.test.mjs` still assumes `packages/*` is the first pnpm workspace entry and fails after Plan 04-03 added `apps/*`. This predates Plan 04-05 and does not affect the persistence boundary.
- `scripts/verify-cargo-architecture.mjs` and its live-metadata test use Node's default synchronous output buffer. The resolved desktop dependency graph added by Plan 04-03 exceeds that buffer (`ENOBUFS`). The same audit passes when invoked with a 64 MiB buffer.
