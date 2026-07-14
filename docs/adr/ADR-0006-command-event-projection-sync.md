# ADR-0006 Commands, events, and projections

**Status:** Accepted · **Date:** 2026-07-13

**Context:** whole-database sync and last-write-wins corrupt competition. **Decision:** versioned idempotent commands, optimistic concurrency, events, projections, outbox/inbox. **Alternatives:** DB replication; LWW. **Consequences:** reliable auditability. **Risks:** operational complexity. **Review:** measured sync overhead.
