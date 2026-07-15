# Phase 5 — UI-01 Visual Review

**Scope:** DESIGN FOUNDATION V0 only. This record does not approve a dashboard, squad screen, tactical pitch, mascot, final logo, final name or production identity.

## Automated Evidence

| ID   | Result | Concrete evidence / note                                                                                                                       |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | PASS   | `pnpm quality:clean` completed two full aggregate and desktop-build runs in 98.1s with unchanged exact porcelain status.                       |
| A-02 | PASS   | Vitest completed 165 of 165 tests across 20 files, including tokens, icons, primitives, DenseTable, UI Lab and architectural boundaries.       |
| A-03 | PASS   | Token generation tests and `tokens:check` proved byte-identical output, authored/resolved contrast evidence and non-mutating drift detection.  |
| A-04 | PASS   | Playwright executed 13 Chromium checks across 1366×768, 1920×1080 and 2560×1080; two redundant production checks were intentionally skipped.   |
| A-05 | PASS   | Production Vite build and browser boundary exposed neither the UI Lab heading nor its category navigation at `/__ui-lab`.                      |
| A-06 | PASS   | Browser screenshots, traces and reports stayed under narrowly ignored local paths; CI contains no artifact-upload step.                        |
| A-07 | PASS   | Static CI policy proved exactly three jobs, explicit approved Chromium installation, real token/component/Lab execution and no writer command. |

## Manual Review Checklist

Replace every PENDING result with PASS or FAIL and replace the dash with a concrete observation. A FAIL note must identify where, at which preset/state, and what must change.

| ID   | Result  | Concrete evidence / note |
| ---- | ------- | ------------------------ |
| M-01 | PENDING | —                        |
| M-02 | PENDING | —                        |
| M-03 | PENDING | —                        |
| M-04 | PENDING | —                        |
| M-05 | PENDING | —                        |
| M-06 | PENDING | —                        |
| M-07 | PENDING | —                        |
| M-08 | PENDING | —                        |
| M-09 | PENDING | —                        |
| M-10 | PENDING | —                        |
| M-11 | PENDING | —                        |
| M-12 | PENDING | —                        |
| M-13 | PENDING | —                        |
| M-14 | PENDING | —                        |

### Meaning of each manual ID

1. **M-01 — Creative North Star:** the complete Lab feels like “Sala de comando sob os refletores”: premium, analytical, immersive, calm under pressure and not generic SaaS.
2. **M-02 — Colour discipline:** graphite is never pure black; emerald, gold, red, amber, cyan and club context stay within their semantic limits and never dominate.
3. **M-03 — Typography and density:** Inter remains operational, Space Grotesk remains restricted, numerals are tabular, the type budget is disciplined and dense content stays legible.
4. **M-04 — Icon quality:** inspect every generic and original football icon at 16/20/24px; confirm authorship/provenance, optical harmony, coherent stroke and no imitation of external managers.
5. **M-05 — Primitive states:** inspect default, hover, focus-visible, active, selected, disabled, loading and error where applicable, including real unchecked/checked/indeterminate Checkbox and IconButton Tooltip.
6. **M-06 — DenseTable craft:** verify compact/comfortable rhythm, headings, alignment, sorting, selection, configuration, nationality, long values, actions, sticky header and loading/empty/error states.
7. **M-07 — Keyboard and focus:** traverse categories, controls, table, menus, Tooltip, Popover and Dialog; confirm visible focus, containment, Escape dismissal and return to invoker.
8. **M-08 — Reduced motion:** with reduced motion enabled, confirm feedback is instant/static and no information or workflow depends on animation.
9. **M-09 — Long text and 200%:** confirm Portuguese expansion, long names, text spacing and effective constrained width wrap or scroll without overlap or unreachable actions.
10. **M-10 — No colour-only meaning:** inspect statuses, errors, warnings, selection, nationality and table states for accompanying text, icon, geometry or control state.
11. **M-11 — Shell proof:** verify 232px/56px modes use the same icons, correct labels/tooltips, stable content order, expanded workspace and retained toggle focus.
12. **M-12 — Target viewports:** review the seven categories at 1366×768, 1920×1080 and 2560×1080; reject text shrinking, useless stretching, hidden labels or inaccessible overflow.
13. **M-13 — Anti-references:** reject default shadcn, nested cards, decorative glass, purple-blue gradients, neon esports, casino cues, giant shadows/corners, mobile enlargement and copied manager composition.
14. **M-14 — Deferred scope and provisional identity:** confirm there is no dashboard, squad, tactics, pitch, scouting, mascot, final mark or final-name claim and that DESIGN FOUNDATION V0 remains reversible.

## Conflicts and Provisional Points

- No implementation conflict is currently recorded between `DESIGN.md`, `05-UI-SPEC.md` and the automated evidence.
- Rivallo remains a working name; the final mark, mascot, imagery, generic icon future, and title-face finalization remain provisional.
- Gate 2 is not complete after this review; Phase 6 and its own human screen approval are still required.

## Terminal Human Record

Decision: PENDING
Reviewed by: —
Reviewed at: —
Evidence digest: sha256:dba6bbb9be7c1a0dedcfce18010ab7fa0a3a056c83ceda5b532420954be5d74b
