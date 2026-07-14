# ADR-0004 SQLite local and Neon PostgreSQL online

**Status:** Accepted · **Date:** 2026-07-13

**Context:** local resilience and shared online authority differ. **Decision:** SQLite locally; PostgreSQL compatible with Neon online. **Alternatives:** cloud-only; identical schemas. **Consequences:** separate migrations. **Risks:** projection drift. **Review:** storage requirements change.
