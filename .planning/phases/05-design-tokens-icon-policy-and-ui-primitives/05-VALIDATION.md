---
phase: 5
slug: design-tokens-icon-policy-and-ui-primitives
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing), browser-like component environment and Playwright UI Lab evidence to be added in Wave 0 |
| **Config file** | `vitest.config.mjs`; Playwright configuration to be created in this phase |
| **Quick run command** | The exact focused command mapped to the current task below |
| **Full suite command** | `pnpm quality && pnpm desktop:build` after Plan 05-09 wires the browser suite into quality |
| **Estimated runtime** | ~60 seconds after the browser environment is installed |

---

## Sampling Rate

- **After every task commit:** Run the relevant non-watch Vitest test or deterministic token/drift check.
- **After every plan wave:** Run the full affected frontend quality sequence, including typecheck and lint.
- **Before `$gsd-verify-work`:** Full quality suite and UI Lab browser evidence must be green.
- **Max feedback latency:** 60 seconds for a focused test; browser evidence runs at wave/phase boundaries.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | UI-01 | T-05-01-SC | Canonical exact inventory/digest is evidenced and strict parser rejects every ambiguous/negative/divergent approval form without dependency changes | static/provenance | `pnpm test -- tooling-tests/phase-5-package-approval.test.mjs` + dependency-file `git diff --exit-code` | ❌ Wave 0 | ⬜ pending |
| 05-01-02 | 01 | 1 | UI-01 | T-05-01-SP | No dependency transaction precedes structured APPROVED/Mateus/ISO/digest record | checkpoint/static | `node scripts/verify-phase-5-package-approval.mjs --record <review>` | ❌ Wave 0 | ⬜ pending |
| 05-02-01 | 02 | 2 | UI-01 | T-05-02-SC | HEAD direct-dependency baseline is preserved; registry delta exactly equals approved rows; only two named workspace links are allowed; lockfile integrities match | install/static/type | strict parser `--installed` + `pnpm test -- tooling-tests/phase-5-package-approval.test.mjs` + frozen install/typecheck | ❌ Wave 0 | ⬜ pending |
| 05-02-02 | 02 | 2 | UI-01 | T-05-02-SC | Node/DOM environments are non-watch; exact real React infrastructure test proves interaction, cleanup and surfaced thrown errors | DOM infrastructure/type | `pnpm test -- apps/desktop/src/test/dom-environment.test.tsx && pnpm test && pnpm typecheck` | ❌ Wave 0 | ⬜ pending |
| 05-03-01 | 03 | 3 | UI-01 | T-05-03-SP | Token inventory, pure-black fence and rendered contrast pairs are correct | unit | `pnpm test -- tooling-tests/design-tokens.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 05-03-02 | 03 | 3 | UI-01 | T-05-03-TM | Repeated token generation is byte-identical | generation/unit | `pnpm tokens:generate && pnpm test -- tooling-tests/design-tokens.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 05-03-03 | 03 | 3 | UI-01 | T-05-03-TM | Drift check fails actionably without mutating tracked CSS | drift/unit | `pnpm tokens:check && pnpm test -- tooling-tests/design-tokens.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 05-04-01 | 04 | 4 | UI-01 | T-05-04-XSS | Curated Lucide wrapper enforces size/stroke/accessibility boundary | DOM/type | `pnpm test -- packages/icons/src/Icon.test.tsx && pnpm typecheck` | ❌ Wave 0 | ⬜ pending |
| 05-04-02 | 04 | 4 | UI-01 | T-05-04-XSS | SVG registry has fixed safe local geometry plus consistent version/source/authorship metadata; originality/optical judgment remains human-only | DOM/static/type/lint | icon test + AUTHORSHIP metadata check + typecheck + lint | ❌ Wave 0 | ⬜ pending |
| 05-05-01 | 05 | 5 | UI-01 | T-05-05-SP | Native action/form roles, labels, states, focus, busy/errors and actual Checkbox indeterminate DOM/non-colour/group semantics work | DOM/interaction | `pnpm test -- apps/desktop/src/ui/primitives/primitives.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-05-02 | 05 | 5 | UI-01 | T-05-05-SP | Feedback/layout states are persistent, semantic and non-colour | DOM/interaction | primitive test + token check from Plan 05-05 | ❌ Wave 0 | ⬜ pending |
| 05-05-03 | 05 | 5 | UI-01 | T-05-05-EP | Lifecycle host semantics survive token/primitive migration | regression/build | primitive test + desktop web build + token check | ❌ Wave 0 | ⬜ pending |
| 05-06-01 | 06 | 6 | UI-01 | T-05-06-XSS | IconButton name is Tooltip-independent; stable Tooltip hover/focus/Escape/non-interactive plus Popover/Menu keyboard/focus work | DOM/interaction | `pnpm test -- apps/desktop/src/ui/primitives/composites.test.tsx apps/desktop/src/ui/primitives/primitives.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-06-02 | 06 | 6 | UI-01 | T-05-06-DoS | Tabs/Radio/Switch selection and keyboard semantics work | DOM/interaction | composite test + typecheck + token check | ❌ Wave 0 | ⬜ pending |
| 05-06-03 | 06 | 6 | UI-01 | T-05-06-DoS | Modal focus containment/return and Toast boundaries work | DOM/interaction | composite test + typecheck + lint | ❌ Wave 0 | ⬜ pending |
| 05-07-01 | 07 | 7 | UI-01 | T-05-07-SP | DenseTable native semantics, geometry and content states hold | DOM/component | `pnpm test -- apps/desktop/src/ui/DenseTable/DenseTable.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 05-07-02 | 07 | 7 | UI-01 | T-05-07-TM | Sort, selection, visibility and row actions are keyboard-operable/local | DOM/interaction | DenseTable test + typecheck + token check | ❌ Wave 0 | ⬜ pending |
| 05-07-03 | 07 | 7 | UI-01 | T-05-07-ID | Fictional fixtures/nationality fallback remain deterministic and non-domain | DOM/static | DenseTable test + typecheck + lint | ❌ Wave 0 | ⬜ pending |
| 05-08-01 | 08 | 8 | UI-01 | T-05-08-ID | UI Lab is DEV-only, production-absent and service-independent | boundary/build | `pnpm test -- apps/desktop/src/ui-lab/UiLab.test.tsx && pnpm --filter @rivallo/desktop build` | ❌ Wave 0 | ⬜ pending |
| 05-08-02 | 08 | 8 | UI-01 | T-05-08-SSRF | Exact seven categories render real token/icon/primitive/table evidence including Checkbox unchecked/checked/DOM-indeterminate states | DOM/component | UI Lab test + typecheck + token check | ❌ Wave 0 | ⬜ pending |
| 05-08-03 | 08 | 8 | UI-01 | T-05-08-DoS | Presets, accessibility fixtures and shell collapse preserve focus/reachability | DOM/build | UI Lab test + typecheck + desktop web build | ❌ Wave 0 | ⬜ pending |
| 05-09-01 | 09 | 9 | UI-01 | T-05-09-ID | Browser evidence covers viewports, keyboard, focus, motion and non-colour | browser | `pnpm exec playwright test browser-tests/ui-lab.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 05-09-02 | 09 | 9 | UI-01 | T-05-09-TM | Root commands are real/non-mutating and clean-worktree wrapper compares exact porcelain baseline after two aggregate runs | static/quality | phase-5 quality test + format/lint/typecheck/token check | ❌ Wave 0 | ⬜ pending |
| 05-09-03 | 09 | 9 | UI-01 | T-05-09-SC | Hosted browser proof, complete Nyquist map and repeated clean quality/build are enforced | CI/full | `pnpm quality:clean` | ❌ Wave 0 | ⬜ pending |
| 05-10-01 | 10 | 10 | UI-01 | T-05-10-SP | Full automated/manual review template includes human icon originality/non-imitation/optical review; parser rejects invalid APPROVED and invalid non-concrete REJECTED records | full/manual record | `pnpm quality:clean && pnpm test -- tooling-tests/phase-5-visual-review.test.mjs` | ❌ Wave 0 | ⬜ pending |
| 05-10-02 | 10 | 10 | UI-01 | T-05-10-RP | APPROVED requires all PASS; REJECTED requires concrete non-empty FAIL; reviewer/date/digest/checklist are internally valid without automated visual inference | checkpoint/static | `node scripts/verify-phase-5-visual-review.mjs <review>` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Plan 05-01: add strict canonical dependency-approval parser/tests before the human gate.
- [ ] Plan 05-02: create owner manifests/workspace links, install only strict-record-matching dependencies, and add the approved browser-like Vitest environment while preserving Node tooling tests.
- [ ] Plan 05-03: add deterministic token integrity/contrast and generated-token drift tests.
- [ ] Plans 05-04–05-08: add real DOM/interaction suites with the component they validate.
- [ ] Plan 05-09: add Playwright at all three presets, repeated porcelain-delta proof, and include every source/test in format, lint, typecheck, quality, and CI.
- [ ] Plan 05-10: add strict completed-checklist/terminal-decision/evidence-digest parser tests without automating visual judgment.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Optical balance of original football SVGs at 16/20/24px | UI-01 | Automated tests can verify dimensions/labels but not visual harmony | Inspect every approved SVG in the UI Lab on dark graphite at all sizes. |
| Premium visual hierarchy and no imitation of external managers | UI-01 | Requires design judgment, not DOM assertion | Review UI Lab at 1366×768, 1920×1080 and 2560×1080 against `DESIGN.md` and the approved direction. |

---

## Validation Sign-Off

- [ ] All implementation tasks have a non-watch automated verify or an explicit Wave 0 dependency.
- [ ] Sampling continuity: no three consecutive implementation tasks without automated verification.
- [ ] Wave 0 covers all missing test-environment and browser-evidence references.
- [ ] No watch-mode flags are used in CI-quality verification.
- [ ] Focused feedback latency remains under 60 seconds.
- [ ] `nyquist_compliant: true` set in frontmatter after plans/tests are finalized.

**Approval:** pending
