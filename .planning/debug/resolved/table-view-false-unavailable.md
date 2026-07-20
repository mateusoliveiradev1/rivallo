---
status: resolved
trigger: 'Visualizações personalizadas aparecem como indisponíveis no executável real.'
created: 2026-07-17
updated: 2026-07-17
---

## Symptoms

- Expected: the saved Elenco table view loads and remains writable.
- Actual: the UI falls back to Padrão and offers Reconectar.
- Reproduction: open Elenco in the real desktop executable with an existing table-views.json.

## Current Focus

- hypothesis: confirmed and fixed.
- test: completed.
- expecting: legacy 64px rating columns load as 88px/136px and the response decodes as Loaded.
- next_action: none; manual approval in the real executable was confirmed on 2026-07-17.

## Evidence

- timestamp: 2026-07-17T20:00:00-03:00
  observation: TableViewCoordinator loaded the real revision-6 repository successfully.
- timestamp: 2026-07-17T20:01:00-03:00
  observation: saved rating and potentialRating widths were both 64px.
- timestamp: 2026-07-17T20:02:00-03:00
  observation: frontend minima were 80px and 128px, while Rust still defaulted and validated both at 56-80px.
- timestamp: 2026-07-17T20:12:00-03:00
  observation: the real executable atomically persisted storage envelope v4, revision 6, with 88px and 136px widths in both saved views.

## Eliminated

- hypothesis: the table-view repository file is unavailable or corrupt.
  reason: the real coordinator returned Loaded with the complete repository state.
- hypothesis: the stale local API sidecar directly controls table-view persistence.
  reason: table views use a direct Tauri command and the real repository loads independently.

## Resolution

- root_cause: frontend and Rust width policies diverged after rating labels expanded; the frontend decoder rejected valid legacy storage and the controller mislabeled that exception as a connection failure.
- fix: aligned Rust width policy, added atomic storage migration v3-to-v4, preserved saved intent with relative width offsets, and classified decoder incompatibility as invalid rather than unavailable.
- verification: focused application/platform/controller regressions passed; the final matrix completed with 65 Playwright tests passed and 28 conditional skips; quality passed; desktop build succeeded; real app-data migrated without revision or view loss; manual validation approved.
- files_changed: crates/application/src/table_view.rs, crates/platform/src/table_view.rs, apps/desktop/src/matchday/use-squad-table-view.ts, apps/desktop/src/matchday/use-squad-table-view.test.tsx, tooling-tests/phase-6-1-table-view-boundaries.test.mjs
