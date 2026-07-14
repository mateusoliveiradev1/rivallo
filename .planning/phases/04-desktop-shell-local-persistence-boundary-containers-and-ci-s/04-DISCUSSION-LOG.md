# Phase 4: Desktop Shell, Local Persistence Boundary, Containers and CI Skeleton - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14  
**Phase:** 04-desktop-shell-local-persistence-boundary-containers-and-ci-skeleton  
**Areas discussed:** Desktop and local API lifecycle, SQLite local-persistence boundary, local PostgreSQL in Docker, CI skeleton

---

## Desktop and local API lifecycle

| Decision | Selected choice |
|---|---|
| Service ownership | Desktop automatically starts, monitors, and stops the local service. |
| Existing process | Reuse a healthy compatible instance; report invalid conflicts actionably. |
| Readiness | Wait briefly for `/ready`, show initialization, then allow recovery. |
| Failure diagnostics | User-facing recovery plus copyable development-only technical detail. |

**User's choice:** Option 1 for all four decisions.

---

## SQLite local-persistence boundary

| Decision | Selected choice |
|---|---|
| Phase 4 delivery | Port and adapter boundary only; no database, schema, migration, or data. |
| Ownership | Application port with platform adapter; no SQLite knowledge in domain or UI. |
| Future location | Per-user platform-resolved data location, abstracted and not created yet. |
| Failure contract | Typed recoverable distinction between unavailable store and invalid data. |

**User's choice:** Option 1 for all four decisions.

---

## Local PostgreSQL in Docker

| Decision | Selected choice |
|---|---|
| Operation | Documented Docker Compose start, health, and stop commands. |
| Data lifecycle | Named persistent volume; destructive removal is explicit and separate. |
| Local values | Non-secret documented defaults, environment-overridable, no committed `.env`. |
| Database preparation | Infrastructure and healthcheck only; no schema, migration, seed, or tables. |

**User's choice:** Option 1 for all four decisions.

---

## CI skeleton

| Decision | Selected choice |
|---|---|
| Provider and triggers | GitHub Actions on pull requests and primary-branch pushes. |
| Job structure | Separate JavaScript/TypeScript, Rust/contracts, and desktop-build jobs. |
| Desktop coverage | Linux integration build only; no packaging or cross-platform matrix yet. |
| Caches and artifacts | Dependency caches allowed; no installers, screenshots, or app artifacts published. |

**User's choice:** Option 1 for all four decisions.

## the agent's Discretion

- Exact timeouts, names, action versions, healthcheck intervals, and scoped command composition remain for research and planning within the decisions in `04-CONTEXT.md`.

## Deferred Ideas

- CI platform matrix and distributable artifacts.
- SQLite data model, migrations, and restore behavior.
- PostgreSQL product schema, hosted Neon, and multiplayer persistence.
