# Rivallo

## What This Is

A premium desktop-first football-management simulator for a complete season (MVP1) and a sustainable multi-season career (MVP2), built around explicit authority, progressive disclosure, editable data and long-save safety.

## Core Value

Make consequential football-management decisions deep, dependable and explainable: the player always knows what changed, why, what caused it, what follows and how to react.

## Current stable baseline

- Checkpoint: `b813f0a5523f0d473ca33bac36369dda43b2015e`.
- Completed history remains completed: Phases 1–6 and 06.1.
- Current executable product: deterministic fictional matchday plus durable table views.
- Next phase: 06.2, **planned and not started by this documentation checkpoint**.

## Requirements

- Complete-season MVP1 across every principal career route.
- Sustainable multi-season MVP2 with safe content/save evolution.
- Explicit domain authority, explainability, accessibility and long-save integrity.
- Detailed traceability lives in `REQUIREMENTS.md` and the canonical contracts listed below.

## Active planning horizon

- MVP1: Blocks 06, 07 and 08, ending at 08.6.
- MVP2: Block 09, ending at 09.8.
- Multiplayer: preserved as post-MVP2 backlog; not part of these gates.

## Constraints

- Tauri 2, React/TypeScript/Vite and Rust modular-monolith boundaries remain intact.
- Rust owns competitive rules; React owns interaction and explanation.
- Calendar/competition, match simulation and the other sporting domains are separate modules.
- Saves pin database/mod versions and hashes; change requires explicit migration with backup and impact report.
- Public content is fictional by default. Private real-world development data remains isolated and unpublished.
- Every main career route has real utility, authoritative data, persistence and honest empty/error states by MVP1.

## Canonical documents

`ROADMAP.md` owns sequence; `MVP-1-DEFINITION.md` and `MVP-2-DEFINITION.md` own outcome scope; `ROUTE-READINESS-MATRIX.md` owns route responsibility; `PHASE-DEPENDENCY-GRAPH.md` owns dependencies; specialised contracts own navigation, lifecycle, data/mods, coach creation, calendar, match boundaries, Home, Inbox and gates.

---

Last updated: 2026-07-16 for the planning-only MVP1/MVP2 checkpoint.
