# ADR-0005 Authority by mode

**Status:** Accepted · **Date:** 2026-07-13

**Context:** offline and shared competition require distinct truth sources. **Decision:** local core/SQLite are authoritative only for local career; server/PostgreSQL for online league. **Alternatives:** client authority; cloud-only. **Consequences:** explicit UX states. **Risks:** reconciliation complexity. **Review:** new game modes.
