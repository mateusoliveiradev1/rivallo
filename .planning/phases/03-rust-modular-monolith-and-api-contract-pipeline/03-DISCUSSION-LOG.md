# Phase 3: Rust Modular Monolith and API Contract Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13  
**Phase:** 03-rust-modular-monolith-and-api-contract-pipeline  
**Areas discussed:** crate topology and dependency direction, Rust contract source and exporter, generated TypeScript client, pipeline-only fixture

---

## Crate topology and dependency direction

**User's choices:** strict inward direction; platform composition/export only; application contract-preparation service; neutral domain primitives.

**Notes:** Domain is dependency-free from phase layers and free of football entities. Platform has no HTTP server or persistence responsibility.

---

## Rust contract source and exporter

**User's choices:** contracts owns schemas/metadata; explicit semantic contract version; mature code-first Rust OpenAPI library selected by research; generated document at `contracts/openapi.json`.

**Notes:** Platform composes/exports but does not own the canonical schema source.

---

## Generated TypeScript client

**User's choices:** `packages/contracts-client`; generated types, metadata, and minimum client; generator selected by research under deterministic-output constraints; explicit root generation and drift scripts.

**Notes:** No authentication, retry behavior, or manually maintained request/response types.

---

## Pipeline-only fixture

**User's choices:** schema-first; fixture only if a selected tool requires an operation; test-only module with no runtime registration; neutral introspection only; automated leak-prevention check.

**Notes:** Fixture cannot expose state, football data, authentication, or persistence.

---

## the agent's Discretion

- Exact crate names, generator tools, dependency-policy representation, and test implementation patterns within locked decisions.

## Deferred Ideas

None.
