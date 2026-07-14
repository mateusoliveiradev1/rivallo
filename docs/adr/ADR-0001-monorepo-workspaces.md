# ADR-0001 Monorepo and workspaces

**Status:** Accepted · **Date:** 2026-07-13

**Context:** Desktop, backend, shared TypeScript packages and Rust crates evolve together. **Decision:** pnpm workspaces/Turborepo plus Cargo workspace. **Alternatives:** separate repositories; single-language repository. **Consequences:** shared contracts and coordinated CI; toolchain complexity. **Risks:** workspace coupling. **Review:** if independent release cadence dominates.
