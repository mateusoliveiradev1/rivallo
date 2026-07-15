---
status: diagnosed
phase: 05-design-tokens-icon-policy-and-ui-primitives
source: [05-10-VISUAL-REVIEW.md]
started: 2026-07-15T14:57:59.8343372-03:00
updated: 2026-07-15T16:38:01.780-03:00
decision: REJECTED
reviewed_by: Mateus
---

## Current Test

Mateus rejected the current Phase 5 visual foundation after reviewing the UI Lab and the dual-agent browser critique. The dark, sober, premium and highly legible direction remains locked; the rejection is limited to concrete table and icon gaps plus the need to contract the future customization system before product screens depend on it.

## Tests

### 1. DenseTable has a bounded, usable width at every target viewport

expected: Headers, cells and actions remain visible or intentionally reachable through bounded horizontal scrolling at 1366×768, 1920×1080 and 2560×1080.
result: fail
evidence: Chromium reported `clientWidth`/`scrollWidth` of 1.000.000px at 1366 and 1920, leaving table content outside the visible surface.

### 2. Football icons are strong and understandable in product context

expected: The Lab shows where Lucide and Rivallo football SVGs belong, and ball/goal remain optically clear and semantically unambiguous at 16px.
result: fail
evidence: The cone is clear, but the ball becomes dense/generic and the goal can resemble a grid/window. The Lab still presents icons mainly as assets under test rather than instruments inside bounded football workflows.

### 3. Complete customizable Table View Engine is contracted before product integration

expected: Phase 5 records the required state and ownership boundary so Phase 6 can shape screen contracts and Phase 9 can implement real product integration without one-off table behavior.
result: fail
evidence: Current DenseTable supports semantic structure, density, selection, single sorting, hiding and priority reduction, but no controlled state, reorder/resize/pinning, filters, multi-sort, saved/reset views, persistence ownership or schema migration contract.

### 4. Visual direction remains strong, sober, premium and highly legible

expected: Corrections preserve the approved graphite-first restraint and avoid generic SaaS, neon esports, betting/casino or decorative excess.
result: pass
evidence: Mateus selected the recommended strong/sober/premium direction, and the dual-agent critique confirmed that the surface avoids the listed anti-references and maintains trustworthy graphite restraint.

## Summary

total: 4
passed: 1
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

### Gap 1: Phase 5 implementation — DenseTable width and overflow

- status: failed
- test: 1
- severity: high
- expected: A bounded table whose visible cells and intentional horizontal scrolling remain usable at all three target viewports.
- actual: The current table can expand to 1.000.000px and move headers/cells outside the reachable visual surface.
- user_feedback: Tables must be robust, legible and eventually completely customizable; the current broken width cannot be approved.
- fix_scope: Correct only the DenseTable/ScrollArea width and overflow contract now, then add browser regression evidence for sane scroll width and visible/reachable cells at 1366, 1920 and 2560. Do not implement the complete Table View Engine in this gap.

### Gap 2: Phase 5 visual — contextual icon usage and 16px optical clarity

- status: failed
- test: 2
- severity: high
- expected: Strong Rivallo football icons whose family role and meaning are obvious in bounded UI contexts at 16/20/24px.
- actual: Ball and goal remain weak at 16px, and the Lab does not clearly show where universal versus football-domain icons appear in real workflows.
- user_feedback: Icons must feel strong and premium, and their destination in the game must be understandable.
- fix_scope: Add limited contextual specimens for AppShell navigation, command actions, table/state use and football module entry; create optical 16px treatments and clarify the goal symbol meaning. Preserve Lucide as the sole generic family and do not add a speculative icon inventory, production menu, logo or mascot.

### Gap 3: Cross-phase specification — complete Table View Engine

- status: failed
- test: 3
- severity: high
- expected: One explicit versioned contract for fully configurable table views before dashboard and squad implementation.
- actual: The future capability boundary is not yet specified, so “mostrar somente gols” could otherwise become one-off UI behavior.
- user_feedback: Tables must be completely configurable, including focused views such as showing only player goals.
- fix_scope: Specify controlled `TableViewState`, column order/visibility/width/pinning, multi-sort, filters, grouping, density, saved/default/shared views, dirty/reset behavior, keyboard announcements, persistence ownership, schema versioning/migration and virtualization/server-query boundaries. Phase 6 owns screen contracts; Phase 9 owns real product data/table integration. Do not implement the full engine in Phase 5.

## Preserved Direction

- Dark graphite-first, never pure black.
- Strong, sober, premium and highly legible football-management product UI.
- High information density with disciplined hierarchy and restrained semantic colour.
- No generic SaaS, copied manager composition, neon esports, betting/casino language or decorative excess.
- DESIGN FOUNDATION V0, Rivallo name, logo and mascot remain provisional.
