---
created: 2026-07-15T17:42:41.848Z
title: Design initial menu and football icon system
area: ui
files:
  - DESIGN.md:68
  - DESIGN.md:93
  - .planning/ROADMAP.md:175
  - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-UI-SPEC.md:161
  - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-UI-SPEC.md:239
  - packages/icons/src
  - apps/desktop/src/ui-lab/specimens.tsx
---

## Problem

The founder expects two clearly different navigation surfaces: an initial menu before entering a career or online context, and the in-game AppShell with a collapsible 232px/56px navigation rail. Phase 5 currently proves only the shell behavior, the curated Lucide boundary and three original football SVGs. That is insufficient as the final visual vocabulary for a management game with navigation, training, tactics, scouting, medical, positional and contextual concepts.

The current icons are foundation evidence, not a finished Rivallo library. The product also needs a reserved location for a working mark, while the final logo, mascot, name and identity remain provisional until separately reviewed and approved.

## Solution

During Phase 6 screen-contract work, explicitly shape the initial menu and the in-game collapsible navigation as separate experiences. Decide the initial menu's exact destinations, keyboard path, states and responsive composition with Mateus before implementation.

Retain one curated generic family for universal actions and define a coherent Rivallo-owned football icon grammar for domain concepts. Refine the three Phase 5 proof icons to establish the quality bar, then expand the custom set only as owning screens require it. Every icon must use the approved 16/20/24px grids, coherent optical weight, semantic naming, accessible labels and keyboard tooltips for collapsed/icon-only navigation. Avoid speculative bulk icon production, mixed libraries, copied manager artwork and icons whose meaning is ambiguous without text.

Reserve brand placement in the screen contracts without treating the current working name, mark or mascot as final identity.
