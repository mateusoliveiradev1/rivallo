# Table View Engine — Cross-Phase Contract

**Status:** planning contract for Phase 6 screen contracts and Phase 9 product integration. This document does not implement the engine.

## Canonical Visual Authority

[`DESIGN.md`](../../../DESIGN.md) remains the canonical source of truth for density, typography, colour, component states, accessibility, spacing, radius, elevation, and motion. The [Phase 5 UI contract](./05-UI-SPEC.md#densetable-contract) adds DenseTable-specific evidence. This document defines table-view behavior and ownership only; it deliberately does not duplicate visual tokens, scales, or the component-state matrix.

Every implementation and screen contract must apply those canonical visual rules, including visible focus, WCAG 2.2 AA, reduced motion, explicit loading/empty/error/offline states, and the policy that no meaning is conveyed only by colour.

## Contract Invariants

1. One controlled view model describes every configurable Rivallo table. A screen supplies schema and data capabilities; the engine does not infer football domain rules.
2. Persisted state contains durable user intent. Commands and events describe transitions and are not persisted as state.
3. Every identifier is stable across sessions. Every width is finite and validated. Every collection has an owning-screen bound.
4. React renders state and emits commands; it is not persistence, query, repository, or migration authority and never accesses SQLite or `localStorage` directly.
5. A configured result such as **Mostrar somente gols** is a normal saved view. No screen or component may add a one-off branch for it.
6. Phase 5 owns this contract and the bounded DenseTable primitive only. Phase 6 owns screen-specific contracts. Phase 9 owns the real engine, data, persistence, and query integration.

## Vocabulary and Stable Identity

- `tableId`: stable identifier for one screen-owned table contract, independent of route labels or translated copy.
- `schemaVersion`: positive contract version for the table schema understood by the owning screen.
- `viewId`: stable identifier for one saved view.
- `baselineViewId`: stable identifier of the normalized view used for dirty comparison and reset.
- `columnId`: stable semantic column identifier; display labels are localizable metadata, never identity.
- `rowId`: stable data-source identity for a row across sorting, filtering, pagination, virtualization, refresh, and reconnect.
- `provenance`: origin and mutability of a view: `system-default`, `user-owned`, or `shared-read-only`.

IDs must not be array indexes, translated labels, positions, or values derived from current ordering. Renaming a view changes its label, never its `viewId`.

## Language-Neutral Controlled State

`TableViewState` is a language-neutral record, not a production TypeScript or Rust type:

| Field            | Contract                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `tableId`        | Stable owning-screen table identifier.                                                                        |
| `schemaVersion`  | Positive table-schema version accepted by the owning screen.                                                  |
| `viewId`         | Stable active saved-view identifier.                                                                          |
| `baselineViewId` | Stable normalized baseline used by reset and dirty computation.                                               |
| `density`        | One screen-approved density identifier; allowed values come from the screen contract.                         |
| `columns[]`      | Ordered entries with `columnId`, `visible`, finite `width`, and `pinning`.                                    |
| `sort[]`         | Ordered multi-sort clauses with `columnId`, `direction`, and explicit null ordering where supported.          |
| `filter`         | Typed filter tree made from clauses and bounded groups.                                                       |
| `grouping[]`     | Ordered grouping clauses with `columnId` and screen-approved grouping mode.                                   |
| `dataWindow`     | Data-window/query descriptor selecting exactly one negotiated mode and its bounded cursor/page/window inputs. |

Each ordered `columns[]` entry contains:

- `columnId`;
- `visible` as an explicit boolean;
- `width` as a finite, positive logical pixel value clamped to the screen-owned minimum and maximum;
- `pinning.side` as `none`, `start`, or `end`;
- `pinning.order` as a bounded integer within its pinned side.

The state rejects duplicate or unknown column IDs, non-finite widths, invalid pin orders, unsupported density, excessive clauses/groups, and state that hides every required identity or action column. Column order is the array order; pinned order is explicit and cannot be inferred from render position.

### Typed filters and groups

A filter clause contains stable `filterId`, `columnId`, a screen-approved typed operator, a typed value payload, and explicit enabled state. A filter group contains `groupId`, `and`/`or` logic, and bounded child clauses or groups. The owning screen declares operators and value shapes per column, maximum depth, and maximum clause count. Unknown operators or incompatible values fail validation; they are not coerced silently.

Grouping clauses are ordered and operate only on columns that declare grouping capability. Sorting inside a group remains represented by `sort[]`, not by an implicit renderer rule.

### Controlled boundary

The owner provides the current `TableViewState`, schema/capability declaration, active rows/window result, stable row IDs, selection state, and busy/error/offline status. The engine emits commands and accessible feedback events. It does not mutate an external object, call storage, issue an HTTP request, select a repository, or invent a domain filter.

## Commands and Events Are Not Persisted State

Commands describe intent and are validated against the active schema/capability declaration before producing a proposed next state:

- search and group the column chooser;
- reorder, resize, pin, unpin, hide, and show a column;
- add, edit, remove, enable, disable, and clear filter clauses/groups;
- add, reorder, change, and remove multi-sort clauses;
- add, reorder, change, and remove grouping clauses;
- change density;
- create, save, duplicate, rename, delete, reset, and set-default a saved view;
- switch the active view and discard or save current changes;
- request a data window, retry, cancel, and refresh;
- select/deselect a row, select a supported window, or clear selection.

Events report accepted state transitions, validation rejection, migration/recovery outcome, persistence request/result, query request/result/cancellation, selection invalidation, focus destination, and live-announcement copy. Commands and events may carry correlation IDs for tracing, but command history, transient focus, hover, open menus, in-progress pointer drag, announcements, query results, and errors are never serialized into `TableViewState`.

## Column Customization

The column chooser supports search by localized label and screen-defined groups. It exposes required columns as visible but not hideable and explains why. Reorder, resize, and pin/unpin always have keyboard and pointer paths. Resizing snaps/clamps to finite screen-owned bounds and never creates intrinsic unbounded width.

Hiding a column does not delete its width, sort, filter, or grouping intent unless the screen contract declares that combination invalid. When an operation would make state invalid, the command is rejected with a concrete reason and no partial mutation.

## Saved Views, Provenance, Dirty State, and Reset

### Provenance and mutability

| Provenance         | Ownership and permitted operations                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `system-default`   | Supplied by the owning screen, immutable, can be activated, duplicated, or set as the user's default reference.               |
| `user-owned`       | Created for the current local product scope; can be saved, duplicated, renamed, deleted, reset, or set as default.            |
| `shared-read-only` | Carries stable source/owner metadata, can be activated or duplicated, but cannot be renamed, overwritten, or deleted locally. |

The envelope preserves provenance, immutable source identity, owner/scope metadata, and mutability. This does **not** promise network sharing in Phase 9. Later multiplayer phases may add transport and synchronization without changing table semantics or treating shared content as user-owned.

### Lifecycle

- **Create:** start from an owning-screen default or an explicit valid state and allocate a new stable `viewId`.
- **Duplicate:** copy normalized configuration into a new `user-owned` view with a new ID and label; provenance lineage may be retained as metadata.
- **Rename:** change only the user-visible label of a `user-owned` view after validation.
- **Delete:** remove only a `user-owned` view; if active/default, the owner selects a safe fallback before deletion commits.
- **Set default:** store a stable view reference for the owning product scope, not an array position.
- **Reset:** replace editable configuration with the current valid normalized baseline named by `baselineViewId`; it is not an undo of unrelated data operations.
- **Save:** validate and normalize the proposed state before persistence. Failed persistence retains the dirty state and exposes recovery.

### Canonical normalization and dirty computation

Dirty state is computed by canonical normalized comparison between the editable durable state and the resolved baseline. Normalization:

1. retains semantically ordered arrays (`columns[]`, `sort[]`, `grouping[]`);
2. canonicalizes unordered filter-group representation and typed values;
3. removes transient UI/query-result fields and default-equivalent omissions;
4. normalizes finite widths and pin ordering according to schema bounds;
5. compares semantic IDs and values, never object identity or serialized key order.

The UI shows a textual dirty indicator in addition to any visual marker. Switching views, resetting, deleting the active view, or leaving the screen while dirty requires a screen-defined save/discard/cancel path. Reset and successful save clear dirty state only after the owner accepts the resulting baseline.

## Versioned Persistence, Migration, and Recovery

`TableViewEnvelope` persists one validated view with:

- `envelopeVersion` for the storage envelope;
- stable `tableId`, `schemaVersion`, `viewId`, and `baselineViewId`;
- provenance, owner/scope metadata, mutability, label, and default flag/reference;
- normalized durable `TableViewState`;
- created/updated metadata suitable for deterministic conflict and recovery evidence.

Persistence accepts only finite, bounded, schema-valid state. Loading proceeds through this deterministic sequence:

1. parse without executing content;
2. validate envelope identity and bounds;
3. apply every sequential migration, one version at a time, without skipping versions;
4. validate the migrated result against the current owning-screen schema and capabilities;
5. normalize and expose it only if valid.

Unknown future versions, missing migration steps, invalid provenance, malformed typed values, duplicate IDs, unknown required columns, or non-finite widths are quarantined rather than partially applied. Recovery records the reason, preserves the invalid payload for diagnostic/export policy where safe, and falls back to the owning screen's valid system default. The user receives an explicit non-colour error/recovery message and may reset or retry import where the owning screen permits it.

Phase 9 owns the adapter, repository, persistence location, schema/migration implementation, quarantine policy, and evidence. React and the Table View component never access SQLite, `localStorage`, files, or network storage directly.

## Keyboard, Focus, and Announcements

Every pointer operation has a documented keyboard equivalent in the Phase 6 owning-screen contract:

| Operation       | Required keyboard/focus behavior                                                                                              | Live announcement example                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Reorder column  | Enter move mode from the chooser/header, move by arrow keys, confirm or Escape; focus remains on the moved column.            | Column name and new position of total.                    |
| Resize column   | Enter resize mode, adjust in bounded steps, confirm or Escape; focus remains on the resize control.                           | Column name and finite resulting width.                   |
| Pin/unpin       | Operable from a labelled menu/command; focus returns to the invoking column.                                                  | Column pinned to start/end or unpinned.                   |
| Sort/multi-sort | Header and sort editor expose order and direction; removal preserves a predictable focus target.                              | Column, direction, and priority in the multi-sort.        |
| Filter/group    | Labelled editor with bounded tab stops; apply/remove returns focus to the invoking control.                                   | Applied/removed condition and resulting count when known. |
| View lifecycle  | Activate, duplicate, rename, delete, set-default, reset, save, and discard are labelled controls with safe focus restoration. | View name, operation result, dirty/saved/error state.     |

Large grids use bounded tab stops: users tab into a region or row action group and use the documented internal keys rather than traversing every cell. Focus remains visible, is never clipped by sticky/pinned regions, survives accepted reorder/resize/pinning, and moves predictably if the focused row/column disappears. Pointer drag is never the only reorder or resize mechanism.

Announcements are concise, deduplicated, and use polite/assertive priority appropriate to impact. Busy, dirty, error, invalid-state, migration-recovery, offline, selection, sort, filter, grouping, and view-default meaning uses text/ARIA plus structure or icon where useful; no state depends only on colour. Reduced motion never removes feedback.

## Data Windows, Queries, and Selection

The owning screen negotiates exactly one active data mode from its declared capabilities:

| Mode                    | Contract boundary                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client-virtualization` | A bounded client result set is available; the adapter supplies total/range metadata and the renderer windows rows without changing row identity.                       |
| `client-pagination`     | A bounded client result set is sliced locally; page size/options are screen-owned and sorting/filtering scope is explicit.                                             |
| `server-pagination`     | The query descriptor carries page/cursor, page size, sort/filter/group clauses, and stable query identity; the server result carries window and total/cursor metadata. |
| `server-query`          | The repository translates the normalized descriptor into supported backend operations; unsupported clauses are rejected before dispatch.                               |

Capability negotiation declares supported modes, column operations, typed filters, sort/group limits, maximum pinned columns, maximum view/filter sizes, selection scope, and whether total counts are authoritative. A saved view can be opened only when required capabilities are available; otherwise the owner offers a recoverable degraded/reset path and never silently changes its meaning.

Query serialization is deterministic from normalized durable view state plus the active window request. It excludes display labels, transient UI state, announcements, and cached rows. Every request has stable query identity and a monotonically advancing request/correlation value. A newer request cancels the older request when possible; otherwise stale results are ignored and cannot overwrite the current view. Cancellation, retry, offline cache use, and revalidation are explicit events.

Row selection is keyed only by stable `rowId`, never row index. The screen contract declares whether selection is current-window, current-query, or explicitly global. Selection surviving a window change remains visibly summarized; selection invalidated by refreshed data is reconciled and announced. “Select all” must name its scope and cannot imply rows the adapter cannot enumerate safely.

Virtualization and pagination must preserve semantic table relationships, keyboard reachability, focused-row recovery, loading/empty/error/offline states, finite width, and truthful row/position metadata. Phase 9 selects and proves the real mode from data scale; Phase 5 creates no virtualization or query implementation.

## Configured View Example: Mostrar somente gols

`Mostrar somente gols` is a normal `user-owned` saved view under the same envelope and command model:

| Field                      | Example configuration                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tableId`                  | The stable squad/player table ID declared by its Phase 6 screen contract.                                                                    |
| `viewId`                   | A newly allocated stable user-view ID.                                                                                                       |
| `baselineViewId`           | The owning screen's applicable system/default baseline.                                                                                      |
| `columns[]`                | Required player identity columns plus the screen's goals column are visible; other optional columns are hidden, not deleted from the schema. |
| `sort[]`                   | Goals descending, with a stable owning-screen tie-breaker if required.                                                                       |
| `filter`                   | Optional typed `goals > 0` only when the owning screen defines “somente gols” as scorers; otherwise no row filter.                           |
| `grouping[]`               | Empty unless the owning screen explicitly offers a competition/position grouping.                                                            |
| `density` and `dataWindow` | Normal screen-approved values, identical in semantics to every other saved view.                                                             |

The owning Phase 6 screen contract decides whether the phrase means “show only identity and goals columns” or also “filter to players with goals.” That decision is represented by ordinary columns/filter/sort clauses. There is no `goalsOnly` flag, special component, route condition, hardcoded renderer, or one-off query branch.

## Cross-Phase Responsibility and Acceptance Matrix

| Contract area                    | Phase 5 — contract owner                                                                                                        | Phase 6 — screen-contract owner                                                                           | Phase 9 — implementation owner                                                                                                                 | Required verification evidence                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Visual/primitive boundary        | Link to `DESIGN.md`/`05-UI-SPEC.md`; keep DenseTable finite and semantic.                                                       | Apply canonical rules to every screen/table brief and fixture.                                            | Preserve rules in real surfaces and data states.                                                                                               | Phase 5 structural/browser evidence; Phase 6 visual/a11y briefs; Phase 9 component/browser evidence. |
| Table/schema identity            | Define stable IDs, state grammar, validation, and bounds.                                                                       | Assign per-screen `tableId`, schema version, stable columns, required identity/actions, and capabilities. | Implement production state/contracts without semantic drift.                                                                                   | Screen fixture manifests plus schema/drift tests.                                                    |
| Columns, filters, sort, grouping | Define generic controlled operations.                                                                                           | Declare allowed columns/operators/defaults/limits and all default/system views.                           | Implement real operations with adapters/repositories.                                                                                          | Phase 6 acceptance fixtures; Phase 9 behavior and integration tests.                                 |
| Saved views and provenance       | Define lifecycle, provenance, normalization, dirty/reset semantics.                                                             | Specify labels, scope, keyboard paths, announcements, and read-only/default behavior per screen.          | Implement repositories, versioned persistence, migrations, quarantine, and recovery.                                                           | Phase 6 interaction contracts; Phase 9 migration/recovery evidence.                                  |
| Accessibility and states         | Define keyboard equivalence, bounded tab stops, focus retention, live announcements, and non-colour cues.                       | Specify every screen path plus loading, empty, error, offline, stale, and viewport behavior.              | Implement and verify the paths against real data/cache states.                                                                                 | Keyboard, screen-reader naming, focus, contrast, reduced-motion, offline evidence.                   |
| Data windows and queries         | Define four explicit modes, capability negotiation, stable rows/selection, serialization, cancellation, and stale-result rules. | Select acceptable modes/threshold assumptions in each screen contract.                                    | Choose the proven mode by real data scale; implement query, pagination/virtualization, cache/offline, cancellation, and selection integration. | Phase 9 adapter/repository/query tests and scale evidence.                                           |
| `Mostrar somente gols`           | Define it as a general configured saved-view example.                                                                           | Resolve its exact columns/filter/tie-breaker in the owning screen contract.                               | Execute the normal view/query pipeline with no special branch.                                                                                 | Phase 6 saved-view fixture; Phase 9 general-engine integration test.                                 |

### Reverse traceability

- **Phase 5 evidence:** this contract, `tooling-tests/phase-5-table-view-contract.test.mjs`, the Phase 5 validation rows `05-13-01`/`05-13-02`, and the bounded DenseTable evidence from Plan 05-12.
- **Phase 6 owner:** [Roadmap Phase 6](../../ROADMAP.md#phase-6-approved-v01-screen-contracts-and-visual-qa) must produce per-screen table IDs, capability/default-view contracts, interaction/state/viewport fixtures, and explicit acceptance evidence before human approval.
- **Phase 9 owner:** [Roadmap Phase 9](../../ROADMAP.md#phase-9-dashboard-squad-cache-and-offline-states) must produce the real engine, adapters/repositories, persistence/migrations, data/query/window/cache/offline integration, and drift/recovery evidence.
- **Gate authority:** Gate 2 remains pending explicit human approval. Passing structural checks cannot approve visual quality or close Phase 5/6.

## Phase 5 Exclusions

This phase creates no Table View Engine production code or production types; no React state manager; no storage schema; no adapter or repository; no SQLite, `localStorage`, or file access; no endpoint; no database migration; no dashboard, squad, scouting, training, tactics, or other product screen; no real football data; no fake interaction; no virtualization/pagination/query implementation; and no dependency installation.

Phase 5 may ship only this planning contract, its structural verifier, Roadmap traceability, and validation evidence. The existing DenseTable remains a bounded visual/semantic primitive, not a hidden partial engine.
