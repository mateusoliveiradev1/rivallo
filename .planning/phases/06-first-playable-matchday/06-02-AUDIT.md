# Phase 6 Product-Review Audit — Sports Management Stabilization

**Audit date:** 2026-07-15  
**Preserved baseline:** `38c2bff` (`feat(desktop): deliver squad and tactics workspaces`)  
**Scope:** evidence for Plan 06-02 / SM-1 only  
**Status:** diagnostic; this file is not implementation or completion evidence

## Audit boundary

This audit compares the committed product surface with the attached product-review evidence. It does not reinterpret the UI Lab as the product, rewrite closed phase history, or authorize a redesign. All file and line references below point to commit `38c2bff`; uncommitted work from the current execution is deliberately excluded.

The preservation boundary is the current Rivallo identity, AppShell, sidebar/topbar structure, Elenco and Táticas workspaces, Tauri commands, Rust matchday rules, routes/entry behavior, design tokens, icon package, keyboard paths, local-career persistence and public module contracts. SM-1 may repair those paths, not replace them wholesale.

## Executive finding

The current application is not merely a static mock: the committed first-playable loop loads a domain-owned squad, saves an XI and tactical approach, simulates a deterministic match and restores career state. Elenco and Táticas are real interactive product surfaces. The stabilization defects come from integration seams introduced after the UI foundation: the real squad table bypasses the shared DenseTable and disclosure primitives, product controls rely largely on native `title`, nationality support exists only inside the UI Lab table fixture, and several tactical concepts are calculated or persisted directly in React.

The safe next step is therefore a narrow remediation, not a redesign or an early implementation of the six-stage sports-management vision.

## Inventory and objective classification

| Area                    | Classification                                            | Baseline evidence                                                                                                                                    | Finding                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop window          | Works                                                     | `apps/desktop/src-tauri/tauri.conf.json:17-24`                                                                                                       | The Tauri window is frameless and configured with `fullscreen: true`; SM-1 must not rework window architecture.                                                                    |
| Product entry           | Works, coupled                                            | `apps/desktop/src/main.tsx:13-30`                                                                                                                    | The normal app and development-only `/__ui-lab` are selected at bootstrap. There is no product router at this baseline.                                                            |
| Sidebar navigation      | Partly works, simulated                                   | `apps/desktop/src/matchday/MatchdayScreen.tsx:106-130, 419-445`                                                                                      | Elenco and Táticas switch by local state. The remaining destinations are disabled “em breve” controls, not routes or implemented modules.                                          |
| First playable          | Works                                                     | `crates/domain/src/matchday.rs:646-850`; `apps/desktop/src/matchday/MatchdayScreen.tsx:305-338`                                                      | XI validation, deterministic simulation and post-match mutation are domain-owned; React calls the application boundary.                                                            |
| Elenco table            | Works, duplicated                                         | `apps/desktop/src/matchday/SquadWorkspace.tsx:370-493`; `apps/desktop/src/ui/DenseTable/DenseTable.tsx:151-330`                                      | Filtering, sorting, row focus, lineup action and columns work, but the product table is a second handwritten table rather than the shared DenseTable.                              |
| Density                 | Partly works, defect at disclosure seam                   | `SquadWorkspace.tsx:343-368`; `matchday.css:812-861, 1042-1054`                                                                                      | Density changes the table row height and persists, but it does not own or close adjacent disclosure state.                                                                         |
| Column chooser          | Works incompletely, transient open state                  | `SquadWorkspace.tsx:369-392`; `matchday.css:865-950`                                                                                                 | It is an uncontrolled native `<details>` with an absolutely positioned menu. Its open state is absent from React and has no explicit outside-click/focus-return contract.          |
| Table preferences       | Locally persistent, contract-incomplete                   | `MatchdayScreen.tsx:52-102, 175-183`; `matchday-ui.ts:18-29`                                                                                         | Density and visible columns survive reload through one `localStorage` record. There is no user/table/view identity, schema migration chain, widths, order, pinning or saved views. |
| Filters and sort        | Works, not persistent                                     | `MatchdayScreen.tsx:159-165, 251-282`; `SquadWorkspace.tsx:244-340`                                                                                  | Query, filters and sorting are component state and reset on remount/reload. That is acceptable for SM-1 and must not be silently expanded into SM-2.                               |
| Player inspector        | Works, screen-coupled                                     | `SquadWorkspace.tsx:512-590`                                                                                                                         | A contextual dossier remains beside the table and offers lineup/save actions. No player-profile route exists.                                                                      |
| Tactics field           | Partly works, fixed model                                 | `TacticsWorkspace.tsx:248-289, 386-512`; `tactics-model.ts:40-111`                                                                                   | HTML5 drag/drop, click/keyboard swapping and reserve-to-XI replacement exist, but only across eleven preset slots for three fixed formations.                                      |
| Formation layout        | Locally persistent, split authority                       | `MatchdayScreen.tsx:53-54, 134-145, 184-219`                                                                                                         | Selected player IDs/formation/approach are saved through the backend; visual slot order is separately stored in `localStorage`.                                                    |
| Familiarity/readiness   | Simulated domain behavior in React                        | `tactics-model.ts:176-187`; `TacticsWorkspace.tsx:184-193`                                                                                           | Fixed scores `100/76/42` and the `45% fit + 55% condition` readiness formula are presentation-layer projections, not approved domain rules.                                        |
| Team instructions       | Locally persistent simulation                             | `TacticsWorkspace.tsx:55-121, 164, 194-201, 628-655`                                                                                                 | Toggle values persist in `localStorage` but do not affect the Rust match model.                                                                                                    |
| Opposition              | Simulated                                                 | `TacticsWorkspace.tsx:657-694`                                                                                                                       | The panel presents review copy but no opponent instruction model, command or simulation effect.                                                                                    |
| Ratings/potential       | Hardcoded fixture data with a small real match effect     | `crates/domain/src/matchday.rs:61-92, 188-235, 697-704`                                                                                              | Current rating and condition contribute to deterministic strength; potential is stored/displayed but has no approved dynamic-development model.                                    |
| Coach/training/dynamics | Future domain                                             | `MatchdayScreen.tsx:115, 122`; repository search has no coach/training aggregate                                                                     | Navigation labels/icons exist, but no coach profile, training calendar or squad-dynamics model is implemented.                                                                     |
| Nationality flags       | Fixture-only, duplicated                                  | `ui/DenseTable/DenseTable.tsx:67-99`; `ui/DenseTable/fixtures.ts:36-84`; `SquadWorkspace.tsx:89-91, 520-522`                                         | The Lab component accepts a caller-provided image and uses neutral/missing fixtures. The real squad and dossier render the raw three-letter string only.                           |
| Tooltips                | Primitive works in isolation, product integration missing | `ui/primitives/disclosure.tsx:7-28`; `ui/primitives/composites.test.tsx:12-42`; `MatchdayScreen.tsx:438-514`; `SquadWorkspace.tsx:226-235, 452, 505` | Radix tooltip behavior is tested, but the real product mostly uses native `title`. There is no product-root provider or consistent tooltip adoption.                               |
| Console quality         | Test gap                                                  | `browser-tests/matchday.spec.ts:252-280` and no `page.on('console'/'pageerror')` guard                                                               | Browser behavior is tested, but relevant console errors are not a failing acceptance gate. The audit does not claim which runtime errors exist until reproduction captures them.   |

## Concrete causes of the SM-1 defects

### 1. Density/disclosure failure

The visible defect is not caused by the density token itself. Density is a controlled preference and CSS changes only row height. The unstable seam is the neighboring column chooser:

1. `SquadWorkspace.tsx:353-365` changes density without any disclosure close command.
2. `SquadWorkspace.tsx:369-392` uses native `<details>` and leaves `open` uncontrolled.
3. `matchday.css:898-913` absolutely positions the menu above the table with a high popover layer.
4. Re-rendering after density changes preserves the native `<details open>` state, so the menu can remain covering the table exactly as shown in the review capture.
5. The product path therefore bypasses the tested Radix Popover focus/Escape/outside-click behavior in `ui/primitives/disclosure.tsx`.

The regression fix should reproduce this sequence first, give the disclosure an explicit close path, and verify repeated open/apply/close cycles, outside click, Escape, focus return, no stale portal/overlay and no scroll lock. It must not migrate the entire table engine.

### 2. Tooltips “disappeared” from the product

The shared Tooltip itself has isolated keyboard/hover/Escape tests. The problem is adoption and provider ownership:

- baseline `main.tsx` mounts `<Surface />` directly, with no shared tooltip provider;
- baseline `Tooltip` creates a Provider per instance rather than one product boundary;
- product controls use `title` attributes extensively while the actual Tooltip is used mainly by the UI Lab/DenseTable path;
- disabled controls cannot be relied on as pointer/focus tooltip triggers.

SM-1 should establish one provider boundary and migrate only icon/abbreviation/rating/nationality controls that need supplemental meaning. Explicit text must remain plain text; a tooltip must not become a substitute for a label.

### 3. Missing nationality flags

The domain currently serializes nationality as an unconstrained `String` and validates only length three (`crates/domain/src/matchday.rs:70, 879`). The product displays that raw value. The only flag-capable component requires `flagSrc` from its caller and its fixtures reuse a neutral image, so it is not a country catalog.

SM-1 may add a local, deterministic ISO display catalog and accessible unknown fallback without changing match rules. Changing the public player contract or modeling dual nationality belongs to a later domain-contract slice.

### 4. Relevant console errors are not governed

Existing component/browser tests do not fail on uncaught `pageerror` or relevant `console.error` messages. SM-1 must capture the exact errors during reproduction, fix their causes, and add a browser guard with an explicit allowlist only for proven third-party noise. “No errors observed manually” is not acceptance evidence.

## Duplication and coupling map

| Concern           | Current copies/owner                                                        | Safe decision                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Dense table       | `SquadWorkspace` product table and `ui/DenseTable` foundation               | Repair the product table in place for SM-1. Do not force a risky migration; SM-2 remains governed by the existing Table View Engine contract. |
| Disclosure        | Native `<details>`, native `<dialog>`, Radix Popover/Dialog/Menu            | Use the stable shared primitive only where it directly removes the reproduced bug. Do not replace every dialog.                               |
| Tooltip           | native `title`, `Tooltip`, `IconButton` wrapper                             | Add one provider and migrate the affected controls incrementally.                                                                             |
| Nationality       | raw string in product, caller-supplied flag in Lab                          | Create one shared display/catalog boundary and reuse it in the squad and dossier only.                                                        |
| State/persistence | MatchdayScreen local state, browser `localStorage`, Rust persisted matchday | Preserve existing working behavior. Do not install a state library or move competitive rules during SM-1.                                     |
| Styling           | one large `matchday.css` for shell, squad and tactics                       | Add narrowly scoped styles/tests; stylesheet decomposition is a separate reversible cleanup.                                                  |

`MatchdayScreen.tsx` currently owns application loading, screen switching, filtering, sorting, focused player, preferences, tactical slots, dialogs and save/play commands. `TacticsWorkspace.tsx` additionally owns drag state, instructions, readiness and familiarity calculations. These are explicit future seams; SM-1 must not turn their cleanup into a broad architecture rewrite.

## Domain authority audit

| Concept                             | Current authority                 | Required future authority                                              | SM-1 disposition                                 |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| XI validity and deterministic match | Rust domain                       | Rust domain                                                            | Preserve and rerun Rust tests.                   |
| UI density, open disclosure, focus  | React transient UI                | React/shared UI primitive                                              | May fix now.                                     |
| Table preferences                   | Direct `localStorage` in React    | Table View repository/adapter under `05-TABLE-VIEW-ENGINE-CONTRACT.md` | Preserve current persistence; do not build SM-2. |
| Country display name/asset          | None in product                   | Shared presentation catalog fed by stable contract code                | Add bounded display adapter/fallback only.       |
| Tactical slot geometry              | Fixed TypeScript preset           | Domain-owned or explicit Rust-facing tactic contract                   | Audit only.                                      |
| Familiarity/readiness               | TypeScript formula                | Deterministic Rust domain                                              | Label as provisional; no formula expansion.      |
| Instructions/opposition             | React/localStorage                | Domain commands, validation and persistence                            | Do not connect or invent effects.                |
| Ratings/potential/training/dynamics | Partial matchday fields or absent | Dedicated Rust aggregates/services with typed contracts                | Future only.                                     |

The relevant architectural authorities remain `docs/adr/ADR-0002-tauri-react-rust.md`, `ADR-0003-independent-domain-core.md`, `ADR-0004-sqlite-neon-postgres.md`, `ADR-0005-authority-by-mode.md`, `ADR-0006-command-event-projection-sync.md`, `ADR-0009-impeccable-design-system.md`, `DESIGN.md`, and `05-TABLE-VIEW-ENGINE-CONTRACT.md`.

## Current dependency reality

`apps/desktop/package.json` at the baseline includes React, Radix, Tauri and Rivallo workspace packages. It does not yet install TanStack Router, TanStack Query, Zustand or Zod. The user-requested architecture is a preserved target decision, not evidence that those libraries are already integrated. SM-1 must not add them opportunistically. Any adoption needs an owning phase, compatibility review and tests.

## Regression evidence required by Plan 06-02

- A component test reproduces the open column/density sequence before the fix.
- Disclosure tests prove close button, Escape, outside pointer, focus restoration and repeated open/close.
- Product tests prove all three density values update row geometry and persist across remount/reload.
- Tooltip tests prove one provider boundary, hover/focus/Escape behavior and disabled-control wrapper behavior where used.
- Nationality tests cover supported ISO mappings, unknown/malformed input, asset failure, accessible full name and current three-letter player values.
- Browser tests fail on uncaught page errors and relevant console errors.
- Existing Elenco/Táticas navigation, filters, sorting, XI changes, save, reserve swap, result dialog, keyboard paths and local persistence remain green.
- `pnpm quality` and `pnpm desktop:build` pass; Rust domain behavior remains unchanged.

## Explicit exclusions

This audit does not authorize Table View Engine implementation, column reorder/resize/pinning, saved views, profile routes, free-form formations, a new drag library, tactical strategy expansion, ratings formulas, coach entities, dynamics, training, potential progression, route/state/query library installation, global navigation changes, token changes, brand changes or a redesign. Those items are detailed prospectively in `SPORTS-MANAGEMENT-EVOLUTION.md` and remain unimplemented.
