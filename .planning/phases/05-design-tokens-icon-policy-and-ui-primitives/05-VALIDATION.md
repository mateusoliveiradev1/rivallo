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
| **Quick run command** | `pnpm test -- --run` (scoped further by the executor when test files exist) |
| **Full suite command** | `pnpm quality` plus the non-watch UI Lab browser suite |
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
| 05-01-01 | 01 | 1 | UI-01 | T-05-01 | Semantic tokens are single-source, no pure-black canvas, and approved foreground/background pairs meet contrast | unit/drift | `pnpm test -- --run <token tests>` and token drift check | ❌ Wave 0 | ⬜ pending |
| 05-02-01 | 02 | 2 | UI-01 | T-05-02 | Icon-only controls have accessible names; composite controls retain keyboard/focus behavior | DOM/component | `pnpm test -- --run <primitive tests>` | ❌ Wave 0 | ⬜ pending |
| 05-03-01 | 03 | 3 | UI-01 | T-05-03 | DenseTable retains semantic table structure and explicit loading/empty/error/non-colour states | DOM/component | `pnpm test -- --run <dense-table tests>` | ❌ Wave 0 | ⬜ pending |
| 05-04-01 | 04 | 4 | UI-01 | T-05-04 | Development-only UI Lab has no API dependency and proves desktop presets, focus, and reduced motion | browser | `pnpm exec playwright test <ui-lab suite>` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add a deterministic token integrity/contrast and generated-token-drift test harness.
- [ ] Add the minimal browser-like Vitest setup required for React primitive interaction tests.
- [ ] Add a real, non-placeholder Playwright configuration and narrow UI Lab test suite at the three desktop presets.
- [ ] Ensure newly created source/test files are included by formatter, lint, typecheck, and non-watch quality commands.

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
