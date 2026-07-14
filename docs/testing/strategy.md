# Test Strategy

## Phase 3 coverage

The current foundation is verified with Prettier, ESLint, TypeScript, Vitest, Rust formatting, warnings-denied Clippy, cargo-nextest, and resolved Cargo metadata architecture checks. The architecture audit enforces inward crate dependencies and a small framework-free domain dependency allowlist.

Contract verification is deliberately split from writers. `pnpm contracts:openapi:check` regenerates into a temporary location and byte-compares it with `contracts/openapi.json`; `pnpm contracts:client:check` generates a temporary client tree and compares every file with `packages/contracts-client/src/generated/`. Pipeline and scope tests prove the Rust contract version/schema reaches the committed OpenAPI and generated TypeScript output while the schema-only document has no runtime paths.

Use `pnpm check` for the repeatable aggregate; it is non-mutating and starts with toolchain validation. Use `pnpm contracts:openapi:generate` and `pnpm contracts:client:generate` only for intentional, serialized regeneration after source changes.

## Boundaries

Phase 3 does not test or provide executable API routes, health/readiness, desktop integration, persistence, containers, CI, authentication, infrastructure, multiplayer, or football product behavior. Those concerns belong to later phases. No runtime coverage should be inferred from the schema export or generated client.
