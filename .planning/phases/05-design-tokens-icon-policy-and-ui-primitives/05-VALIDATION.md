---
phase: 5
slug: design-tokens-icon-policy-and-ui-primitives
status: implemented-awaiting-human-review
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-15
updated: 2026-07-15
---

# Phase 5 — Validation Strategy

> Concrete feedback contract for the visual foundation. Automation proves structure, behavior, boundaries, drift and reproducibility; optical quality and non-imitation remain human-only judgments.

## Test Infrastructure

| Property                    | Implemented value                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Unit/static/component       | Vitest 3 with separate Node and jsdom projects in `vitest.config.mjs`                                                               |
| Browser                     | Playwright 1.61.1, Chromium only, configured by `playwright.config.ts`                                                              |
| Browser presets             | `desktop-1366x768`, `desktop-1920x1080`, `desktop-2560x1080`                                                                        |
| Full non-mutating command   | `pnpm quality`                                                                                                                      |
| Repeated clean-status proof | `pnpm quality:clean`                                                                                                                |
| Hosted responsibility       | Existing `javascript-typescript` job installs approved Chromium and runs token/component/Lab evidence                               |
| Ephemeral evidence          | `test-results/`, `playwright-report/`, `blob-report/` and repository-local browser cache are narrowly ignored; CI publishes nothing |

## Sampling Rate

- After a behavior task: its focused non-watch Vitest or Playwright command.
- After a plan: `pnpm quality` plus the affected production build.
- Before human visual approval: `pnpm quality:clean`; the aggregate and desktop build run twice and exact porcelain status must remain unchanged.
- Maximum focused feedback latency remains below 60 seconds on the current workstation.

## Per-Task Verification Map

| Task ID  | Plan | Requirement | Threat       | Verification type                         | Concrete non-watch command or human-only rationale                                                                                                 | Evidence file                                        | Status    |
| -------- | ---- | ----------- | ------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------- |
| 05-01-01 | 01   | UI-01       | T-05-01-SC   | static/provenance                         | `pnpm exec vitest run tooling-tests/phase-5-package-approval.test.mjs`                                                                             | `tooling-tests/phase-5-package-approval.test.mjs`    | ✅ green  |
| 05-01-02 | 01   | UI-01       | T-05-01-SP   | checkpoint/static                         | `node scripts/verify-phase-5-package-approval.mjs --record <review>`                                                                               | `05-01-PACKAGE-REVIEW.md`                            | ✅ green  |
| 05-02-01 | 02   | UI-01       | T-05-02-SC   | install/static/type                       | `pnpm exec vitest run tooling-tests/phase-5-package-approval.test.mjs && pnpm typecheck`                                                           | `pnpm-lock.yaml`                                     | ✅ green  |
| 05-02-02 | 02   | UI-01       | T-05-02-SC   | DOM infrastructure                        | `pnpm exec vitest run apps/desktop/src/test/dom-environment.test.tsx`                                                                              | `apps/desktop/src/test/dom-environment.test.tsx`     | ✅ green  |
| 05-03-01 | 03   | UI-01       | T-05-03-SP   | token unit/contrast                       | `pnpm exec vitest run tooling-tests/design-tokens.test.mjs`                                                                                        | `tooling-tests/design-tokens.test.mjs`               | ✅ green  |
| 05-03-02 | 03   | UI-01       | T-05-03-TM   | deterministic generation                  | `pnpm exec vitest run tooling-tests/design-tokens.test.mjs`                                                                                        | `scripts/generate-design-tokens.mjs`                 | ✅ green  |
| 05-03-03 | 03   | UI-01       | T-05-03-TM   | drift                                     | `pnpm tokens:check`                                                                                                                                | `scripts/verify-design-token-drift.mjs`              | ✅ green  |
| 05-04-01 | 04   | UI-01       | T-05-04-XSS  | icon DOM/type                             | `pnpm exec vitest run packages/icons/src/Icon.test.tsx && pnpm typecheck`                                                                          | `packages/icons/src/Icon.test.tsx`                   | ✅ green  |
| 05-04-02 | 04   | UI-01       | T-05-04-XSS  | SVG static/human                          | `pnpm exec vitest run packages/icons/src/Icon.test.tsx`; originality and optical balance are human-only                                            | `packages/icons/src/football-icons.tsx`              | ✅ green  |
| 05-05-01 | 05   | UI-01       | T-05-05-SP   | primitive DOM                             | `pnpm exec vitest run apps/desktop/src/ui/primitives/primitives.test.tsx`                                                                          | `apps/desktop/src/ui/primitives/primitives.test.tsx` | ✅ green  |
| 05-05-02 | 05   | UI-01       | T-05-05-SP   | feedback/layout DOM                       | `pnpm exec vitest run apps/desktop/src/ui/primitives/primitives.test.tsx && pnpm tokens:check`                                                     | `apps/desktop/src/ui/primitives/feedback.tsx`        | ✅ green  |
| 05-05-03 | 05   | UI-01       | T-05-05-EP   | shell regression/build                    | `pnpm exec vitest run tooling-tests/phase-4-desktop.test.mjs && pnpm --filter @rivallo/desktop build`                                              | `apps/desktop/src/App.tsx`                           | ✅ green  |
| 05-06-01 | 06   | UI-01       | T-05-06-XSS  | overlay interaction                       | `pnpm exec vitest run apps/desktop/src/ui/primitives/composites.test.tsx`                                                                          | `apps/desktop/src/ui/primitives/composites.test.tsx` | ✅ green  |
| 05-06-02 | 06   | UI-01       | T-05-06-DoS  | selection/keyboard                        | `pnpm exec vitest run apps/desktop/src/ui/primitives/composites.test.tsx && pnpm typecheck`                                                        | `apps/desktop/src/ui/primitives/selection.tsx`       | ✅ green  |
| 05-06-03 | 06   | UI-01       | T-05-06-DoS  | focus/live region                         | `pnpm exec vitest run apps/desktop/src/ui/primitives/composites.test.tsx && pnpm lint`                                                             | `apps/desktop/src/ui/primitives/dialogs.tsx`         | ✅ green  |
| 05-07-01 | 07   | UI-01       | T-05-07-SP   | table DOM                                 | `pnpm exec vitest run apps/desktop/src/ui/DenseTable/DenseTable.test.tsx`                                                                          | `apps/desktop/src/ui/DenseTable/DenseTable.test.tsx` | ✅ green  |
| 05-07-02 | 07   | UI-01       | T-05-07-TM   | table interaction                         | `pnpm exec vitest run apps/desktop/src/ui/DenseTable/DenseTable.test.tsx && pnpm typecheck`                                                        | `apps/desktop/src/ui/DenseTable/DenseTable.tsx`      | ✅ green  |
| 05-07-03 | 07   | UI-01       | T-05-07-ID   | fixture boundary                          | `pnpm exec vitest run apps/desktop/src/ui/DenseTable/DenseTable.test.tsx && pnpm lint`                                                             | `apps/desktop/src/ui/DenseTable/fixtures.ts`         | ✅ green  |
| 05-08-01 | 08   | UI-01       | T-05-08-ID   | Lab boundary/build                        | `pnpm exec vitest run apps/desktop/src/ui-lab/UiLab.test.tsx && pnpm --filter @rivallo/desktop build`                                              | `apps/desktop/src/main.tsx`                          | ✅ green  |
| 05-08-02 | 08   | UI-01       | T-05-08-SSRF | inventory DOM                             | `pnpm exec vitest run apps/desktop/src/ui-lab/UiLab.test.tsx && pnpm tokens:check`                                                                 | `apps/desktop/src/ui-lab/specimens.tsx`              | ✅ green  |
| 05-08-03 | 08   | UI-01       | T-05-08-DoS  | viewport/focus DOM                        | `pnpm exec vitest run apps/desktop/src/ui-lab/UiLab.test.tsx && pnpm typecheck`                                                                    | `apps/desktop/src/ui-lab/UiLab.test.tsx`             | ✅ green  |
| 05-09-01 | 09   | UI-01       | T-05-09-ID   | real browser                              | `pnpm ui-lab:test`                                                                                                                                 | `browser-tests/ui-lab.spec.ts`                       | ✅ green  |
| 05-09-02 | 09   | UI-01       | T-05-09-TM   | quality/idempotency                       | `pnpm exec vitest run tooling-tests/phase-5-quality.test.mjs && pnpm quality`                                                                      | `scripts/verify-clean-worktree.mjs`                  | ✅ green  |
| 05-09-03 | 09   | UI-01       | T-05-09-SC   | CI/full                                   | `pnpm quality:clean`                                                                                                                               | `.github/workflows/ci.yml`                           | ✅ green  |
| 05-10-01 | 10   | UI-01       | T-05-10-SP   | human-only optical review + record syntax | Visual hierarchy, icon originality, non-imitation and polish require human-only judgment; Plan 10 adds a strict record parser beside the review    | `05-10-PLAN.md`                                      | 🟦 mapped |
| 05-10-02 | 10   | UI-01       | T-05-10-RP   | human-only terminal decision              | APPROVED/REJECTED authority remains human-only; deterministic digest/checklist syntax is verified by the task-local parser specified in Plan 10    | `05-10-PLAN.md`                                      | 🟦 mapped |
| 05-11-01 | 11   | UI-01       | T-05-11-SVG  | icon contract/DOM/type/lint               | `pnpm test -- packages/icons/src/Icon.test.tsx && pnpm typecheck && pnpm lint`                                                                     | `packages/icons/src/Icon.test.tsx`                   | ✅ green  |
| 05-11-02 | 11   | UI-01       | T-05-11-RP   | Lab DOM/browser/build                     | `pnpm test -- apps/desktop/src/ui-lab/UiLab.test.tsx packages/icons/src/Icon.test.tsx && pnpm ui-lab:test && pnpm --filter @rivallo/desktop build` | `browser-tests/ui-lab.spec.ts`                       | ✅ green  |

Legend: ✅ implemented and green · 🟦 mapped to a future task-local check or irreducible human-only judgment.

## Wave 0 Completion

- [x] Strict supply-chain approval parser and installed-inventory verification.
- [x] Real Node/jsdom Vitest environments with serial generated-file safety.
- [x] Deterministic token generation, contrast and non-mutating drift checks.
- [x] DOM/interaction suites for icons, primitives, overlays, DenseTable and UI Lab.
- [x] Playwright Chromium evidence at all three target resolutions plus production exclusion.
- [x] Formatter, ESLint and TypeScript coverage for every Phase 5 authored surface.
- [x] Repeated exact-porcelain quality wrapper and narrow ignored browser evidence.
- [x] Hosted Chromium installation and execution without artifact publication.

Plan 10 needs no missing shared test infrastructure. Its strict review-record parser is deliberately created with that task, while the optical and approval decisions remain human-only.

Plan 11 reuses the implemented Vitest, Playwright, typecheck, lint and desktop-build infrastructure. Its two rows are green with exact package, Lab, three-viewport and production-build evidence.

## Manual-Only Verifications

| Behavior                                         | Requirement | Why human-only                                                                             | Exact review instruction                                                                                                        |
| ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Optical balance and originality of football SVGs | UI-01       | Geometry and labels are automatable; harmony and non-imitation are visual judgments        | Inspect ball, goal and cone at 16/20/24px on graphite, compare stroke rhythm and reject resemblance to external manager assets. |
| Premium hierarchy and anti-reference compliance  | UI-01       | No DOM assertion can decide whether the surface feels authoritative, dense and non-generic | Review all seven Lab categories at 1366×768, 1920×1080 and 2560×1080 against `DESIGN.md` and `05-UI-SPEC.md`.                   |
| Keyboard and focus feel                          | UI-01       | Automation proves focus location, not subjective clarity or comfort                        | Traverse navigation, controls, table, overlays and shell without a pointer; reject any ambiguous or visually lost focus.        |

## Validation Sign-Off

- [x] All 28 task IDs have a concrete non-watch check or explicit human-only rationale; 05-11-01 and 05-11-02 are implemented and green.
- [x] No three consecutive implementation tasks lack automated feedback.
- [x] Shared Wave 0 infrastructure exists and is used by local and hosted checks.
- [x] Writer commands are excluded from `pnpm quality` and `pnpm quality:clean`.
- [x] Browser evidence is deterministic, ignored locally and never uploaded by CI.
- [x] Human optical review remains explicitly manual.

**Automated validation:** green for all executed plans, including Plan 05-11.

**Human visual approval:** pending Plan 05-10.
