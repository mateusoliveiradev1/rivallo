# Phase 5: Design Tokens, Icon Policy and UI Primitives - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 5-Design Tokens, Icon Policy and UI Primitives
**Areas discussed:** icon policy, UI Lab, primitive states, dense tables, navigation structure, visual identity, palette, football-management references

---

## Icon Policy

| Option | Description | Selected |
|---|---|---|
| Generic family | One coherent generic icon library for operational UI | ✓ Lucide |
| Football symbols | Original football SVGs | ✓ Geometric/minimal SVGs |
| Isolated icons | Icon-only controls as a default | No — label plus icon is default |

**User's choice:** A curated Lucide family with original football SVGs, 16/20/24 grids, and deliberate accessible icon use.
**Notes:** The founder emphasized that icons need to be excellent. Ambiguous concepts use text until an approved icon exists; no emojis or mixed libraries.

---

## UI Lab and Primitives

| Option | Description | Selected |
|---|---|---|
| Production screens first | Build dashboard/squad while inventing components | No |
| UI Lab first | Prove tokens, states, icons, primitives, density and viewports before screens | ✓ |
| Static examples | Show only default component appearance | No — real state controls required |

**User's choice:** Internal UI Lab, deterministic fixtures, target desktop presets, and an extensive primitive foundation.
**Notes:** The Lab needs keyboard, focus, contrast, long-text, reduced-motion and non-colour evidence. No active API/service is needed.

---

## Dense Tables and Desktop Workspace

| Option | Description | Selected |
|---|---|---|
| Simple list | Fixed, low-information player list | No |
| Dense configurable table | Semantic table with selection, sort, column priority/visibility and row actions | ✓ |
| Saved preferences now | Persist table personalization during primitive phase | Deferred |

**User's choice:** Tables must be exceptionally complete and configurable; local UI Lab controls demonstrate density and visible columns now.
**Notes:** Persisted views and reordering are intentionally deferred. Navigation must demonstrate an expanded and explicit user-collapsed icon-only mode.

---

## Brand Direction and Mascot

| Option | Description | Selected |
|---|---|---|
| Abstract tactical emblem | Strategic, geometric command symbol | ✓ Recommended base |
| Discreet animal guardian | Emotional heraldic character | Deferred |
| Field artifact | Literal football object as brand device | Deferred |
| No literal mascot | Symbol/brand device only | ✓ Current posture |

**User's choice:** Accept the recommended "Arquitetura tática" direction with minimal heraldic influence.
**Notes:** Rivallo remains a working name. Do not fix an animal mascot; first prove an abstract tactical mark that works at table-icon scale.

---

## Palette and Reference Direction

| Option | Description | Selected |
|---|---|---|
| Pure black + ornamental accents | High-drama generic game UI | No |
| Noite de Comando | Graphite blue-green, cold high-contrast white, restrained semantic colour | ✓ |
| FootSim visual copy | Reuse external layouts/assets/treatment | No |

**User's choice:** A sober dark product system that still uses clear white data and text, with a functional restrained-green tactical pitch later.
**Notes:** FootSim was reviewed only as a reference for football-manager density, navigation, tables, and tactical surfaces. Rivallo must be more ownable, polished, accessible and configurable—not a copy.

---

## the agent's Discretion

- Exact OKLCH values, token naming and component composition after contrast validation.
- Reversible tactical-mark exploration only; no final mascot/name/logo commitment.

## Deferred Ideas

- Future scouting/discovery fog-of-war for player and club knowledge.
- Training and match-driven formation/tactical familiarity.
- Functional tactical pitch and lineup editor.
- Persistent user table preferences and dashboard screen behavior.
