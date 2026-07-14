# ADR-0007 OpenAPI contract

**Status:** Accepted · **Date:** 2026-07-13

**Context:** Rust API and TypeScript client must not drift. **Decision:** backend-generated OpenAPI/client with CI drift checks. **Alternatives:** manual duplicated types; GraphQL. **Consequences:** generated artifact governance. **Risks:** generator limits. **Review:** contract needs exceed OpenAPI.
