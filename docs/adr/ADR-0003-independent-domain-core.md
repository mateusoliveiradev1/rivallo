# ADR-0003 Independent domain core

**Status:** Accepted · **Date:** 2026-07-13

**Context:** simulation must remain deterministic and testable. **Decision:** framework-independent Rust domain/application/simulation crates. **Alternatives:** rules in React, Tauri, or axum. **Consequences:** adapters depend inward; more explicit ports. **Risks:** abstraction overreach. **Review:** proven unnecessary complexity.
