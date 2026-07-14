# ADR-0012 Schema, API, command and save versioning

**Status:** Accepted · **Date:** 2026-07-13

**Context:** clients, data, commands and saves evolve independently. **Decision:** version migrations, `/api/v1`, command payloads, and save formats explicitly. **Alternatives:** implicit compatibility. **Consequences:** migration tests and compatibility policy. **Risks:** support burden. **Review:** first breaking evolution.
