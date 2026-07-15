---
phase: 05-design-tokens-icon-policy-and-ui-primitives
plan: '13'
subsystem: ui-planning
tags: [dense-table, saved-views, accessibility, persistence-contract, query-boundary]

requires:
  - phase: 05-07
    provides: Semantic DenseTable primitive and bounded local customization proof
  - phase: 05-12
    provides: Finite DenseTable/ScrollArea geometry and three-viewport browser evidence
provides:
  - Complete language-neutral controlled Table View Engine planning contract
  - Failure-oriented structural verification for capabilities, scope, ownership, Roadmap phase order, and Gate 2
  - Explicit Phase 6 screen-contract and Phase 9 implementation traceability
  - Executed Nyquist evidence for validation rows 05-13-01 and 05-13-02
affects: [phase-6-screen-contracts, phase-9-dashboard-squad, saved-views, table-accessibility]

tech-stack:
  added: []
  patterns:
    - Durable normalized view state remains separate from transient commands, events, queries, focus, and React rendering
    - Stable IDs, finite bounds, capability negotiation, sequential migrations, and safe recovery guard every saved view

key-files:
  created:
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-TABLE-VIEW-ENGINE-CONTRACT.md
    - tooling-tests/phase-5-table-view-contract.test.mjs
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-13-SUMMARY.md
  modified:
    - .planning/ROADMAP.md
    - .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-VALIDATION.md

key-decisions:
  - 'Represent every configurable table through one language-neutral controlled state while keeping commands, events, persistence, queries, and React authority separate.'
  - 'Preserve system-default, user-owned, and shared-read-only provenance without promising network sharing in Phase 9.'
  - 'Express Mostrar somente gols as an ordinary saved view whose exact column/filter meaning is resolved by the owning Phase 6 screen contract.'
  - 'Assign screen-specific contracts and acceptance fixtures to Phase 6, and real engine/data/persistence/query integration to Phase 9.'

patterns-established:
  - 'Normalized dirty state: compare semantic durable intent to a resolved baseline, never object identity or transient UI state.'
  - 'Failure-oriented contract evidence: every required capability, ownership boundary, Roadmap phase, and gate state has an actionable structural assertion.'

requirements-completed: []

duration: 10 min
completed: 2026-07-15
status: complete
---

# Phase 5 Plan 13: Table View Engine Cross-Phase Contract Summary

**A complete manager-grade table-view contract now defines controlled customization, saved-view resilience, keyboard access, data-window boundaries, and future ownership without implementing the engine in Phase 5.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-15T21:16:30Z
- **Completed:** 2026-07-15T21:26:32Z
- **Tasks:** 2
- **Files modified:** 4 implementation artifacts plus this summary

## Accomplishments

- Defined stable controlled state for column order, visibility, finite width, pinning, typed filters, multi-sort, grouping, density, saved views, and data windows.
- Specified normalized dirty/reset behavior, provenance, versioned envelopes, sequential migrations, quarantine, safe fallback, and a strict boundary outside React.
- Made keyboard equivalents, bounded tab stops, focus retention, live announcements, non-colour cues, stable rows/selection, capability negotiation, cancellation, and stale-result protection first-class.
- Captured `Mostrar somente gols` as a normal saved view and explicitly prohibited a `goalsOnly` flag or one-off renderer/query path.
- Bound Phase 6 to per-screen contracts/fixtures and Phase 9 to real adapters, repositories, persistence, migrations, data scale, query modes, cache, and recovery evidence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the complete controlled Table View Engine contract** — `195e576` (docs)
2. **Task 2: Bind Phase 6 and Phase 9 to the contract** — `3f1bf78` (docs)

## Files Created/Modified

- `.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-TABLE-VIEW-ENGINE-CONTRACT.md` — canonical cross-phase behavior, resilience, accessibility, data-window, and responsibility contract.
- `tooling-tests/phase-5-table-view-contract.test.mjs` — focused parser with actionable failures for missing capabilities, scope fences, ownership, phase order, or pending Gate 2.
- `.planning/ROADMAP.md` — scoped Phase 6 and Phase 9 success-criteria links; all 13 phases and gate structure preserved.
- `.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-VALIDATION.md` — exact green results for pre-assigned rows 05-13-01 and 05-13-02 while retaining 36 task rows.
- `.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-13-SUMMARY.md` — execution record and handoff.

## Verification

- `pnpm exec vitest run tooling-tests/phase-5-table-view-contract.test.mjs` — 7/7 focused tests passed.
- `pnpm exec prettier --check .planning/ROADMAP.md .planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-TABLE-VIEW-ENGINE-CONTRACT.md tooling-tests/phase-5-table-view-contract.test.mjs` — all files formatted correctly.
- `git diff --check` — passed with no whitespace errors.
- Validation-map integrity — exactly 36 task IDs remain; only 05-13-01 and 05-13-02 changed from planned to observed green results in this plan.
- Roadmap scope inspection — only the Phase 6 and Phase 9 success criteria were extended; the 13-phase sequence and Gate 2 `Pending` state remain intact.

## Decisions Made

- The state model is language-neutral and implementation-ready, but it is not a production TypeScript/Rust type and creates no runtime authority.
- Saved-view provenance supports immutable system defaults, editable user views, and read-only shared origins while deferring all transport/synchronization promises.
- Invalid or future persisted state must be migrated sequentially, validated, quarantined when unsafe, and replaced with an owning-screen default rather than partially applied.
- Phase 6 decides the exact screen meaning of “Mostrar somente gols”; Phase 9 executes it through the same general saved-view and query pipeline as every other view.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Two initial verifier expressions were more literal than their Markdown sources (`falls back` and bold `not`). They were corrected before task acceptance so the assertions verify the intended contract without weakening coverage.
- No unresolved issue remains.

## Known Stubs

None. The only executable artifact is a structural planning-contract verifier. No product component, mock data source, placeholder interaction, engine type, persistence implementation, or future-script success stub was added.

## Threat Surface Scan

- **T-05-13-TM:** versioned envelopes, bounded validation, sequential migrations, quarantine, and valid-default recovery are mandatory contract behavior.
- **T-05-13-SP:** stable provenance, owner/source metadata, and mutability distinguish system, user, and shared-read-only views.
- **T-05-13-DoS:** finite widths, bounded collections, capability validation, and explicit window/query modes prevent unbounded state or dataset assumptions.
- **T-05-13-RP:** the responsibility matrix, Roadmap links, validation rows, and structural test name owner, deliverable, and evidence.
- No endpoint, authentication path, file access, storage schema, database migration, dependency, network behavior, or production runtime surface was introduced.

## User Setup Required

None — no dependency, tool, credential, or external service was added.

## Next Phase Readiness

- Plan 05-14 can refine the bounded 16px ball/goal optics and contextual icon evidence without expanding the Table View Engine scope.
- Phase 6 has an unambiguous contract for screen-owned table IDs, capabilities, views, keyboard paths, announcements, states, viewports, and fixtures.
- Phase 9 has explicit future ownership of real engine behavior, adapters/repositories, persistence/migrations, data-window modes, cache/offline behavior, and evidence.
- UI-01, Phase 5, and Gate 2 remain open pending Plans 05-14 through 05-16 and Mateus's explicit terminal visual decision.

## Self-Check: PASSED

- Contract, verifier, and summary exist at their canonical paths.
- Task commits `195e576` and `3f1bf78` exist in Git history.
- Focused verification passes 7/7, formatting and whitespace checks pass, and the validation map retains exactly 36 task IDs.
- Stub scan found no TODO, FIXME, placeholder, coming-soon, or unavailable implementation marker in the created/modified contract surface.
- No product code, dependency, endpoint, persistence implementation, or production screen was created.

---

_Phase: 05-design-tokens-icon-policy-and-ui-primitives_
_Completed: 2026-07-15_
