# Rivallo (working title)

## What This Is

A premium, desktop-first football management platform for local careers and small private online leagues. It combines a fast, accessible React/Tauri interface with a Rust domain core and explicit authority boundaries.

## Core Value

Make consequential football-management decisions feel deep and dependable, including when friends share the same online competition.

## Requirements

### Validated

- Phase 2 — workspace pnpm/Turborepo/Cargo, validação de toolchains e scripts de qualidade reproduzíveis, sem componentes de produto.
- Phase 3 — monólito modular Rust com fronteiras auditadas, contratos Rust → OpenAPI → TypeScript determinísticos e checks de drift não mutáveis, sem runtime de produto.

### Active

- [ ] Build the Gate 0–3 foundation and V0.1 vertical slice.
- [ ] Preserve local-first usability without making the desktop authoritative online.
- [ ] Prepare a server-authoritative V0.2 private multiplayer proof.

### Out of Scope

- Real clubs, likenesses, and official datasets — rights have not been cleared.
- Full simulation, transfer market, academies, and public mods — deferred beyond the initial slices.
- Public launch, payments, chat, or public uploads — private alpha is invitation-only and 18+.

## Constraints

- **Stack**: Tauri 2, React/TypeScript/Vite, Rust/axum/SQLx, SQLite and PostgreSQL/Neon.
- **Authority**: online server and PostgreSQL are canonical; local mode and SQLite are canonical only for a local career.
- **Process**: sequential, fine-grained GSD roadmap; every gate requires Mateus’s approval.
- **Identity**: Rivallo is provisional; naming cannot be made irreversible.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Modular monolith | Keep boundaries strong without premature distributed systems | — Pending |
| Commands/events/projections sync | Prevent client-led competitive conflicts | — Pending |
| Dev identity in V0.1 | Defer provider selection while preserving AuthPort | — Pending |

---
*Last updated: 2026-07-14 after Phase 3 completion*
