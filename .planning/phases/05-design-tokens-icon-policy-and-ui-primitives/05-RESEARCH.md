# Phase 5 Research — Design Tokens, Icon Policy and UI Primitives

**Phase:** 5 — Design Tokens, Icon Policy and UI Primitives  
**Researched:** 2026-07-15  
**Confidence:** High for the local codebase and accessibility baseline; medium for package-level implementation details pending lockfile resolution in execution.

## User Constraints (locked)

Copied from [`05-CONTEXT.md`](./05-CONTEXT.md); the plan must implement these decisions, not reopen them.

- Preserve DESIGN FOUNDATION V0: dark-first blue/green graphite, never pure black; tonal separation and restrained borders instead of glass or decorative shadow. [VERIFIED — `05-CONTEXT.md` D-01]
- The working visual route is **Arquitetura tática**, with minimal heráldica only in the brand. It must be strong through hierarchy, data craft, iconography, and composition rather than neon, saturated decoration, or a literal mascot. [VERIFIED — D-02]
- Use cold, high-contrast near-white for operational text/data; pure white is exceptional emphasis. The provisional palette is **Noite de Comando**: aged gold only for mark/achievement, emerald for primary/positive, cyan for information/focus, and amber/red strictly semantic. [VERIFIED — D-03–D-05]
- Adopt Lucide as the sole generic icon family. Football concepts are original versioned SVGs, on 16/20/24 grids at approximately 1.75px optical stroke. Icon-plus-label is the default; icon-only controls require stable placement, tooltip, and accessible name. [VERIFIED — D-06–D-09]
- Do not create a literal mascot, final mark, or irreversible identity in this phase. [VERIFIED — D-10]
- Implement the complete approved primitive set: Button, IconButton, TextField, Select, Tabs, Tooltip/Popover, Status, Skeleton, Empty State, Error State, DenseTable, Checkbox, RadioGroup, Switch, Menu, Dialog/AlertDialog, Toast, Pagination, and ScrollArea. Each applicable primitive proves its state matrix. [VERIFIED — D-11–D-15]
- Inputs/selects are 32px, visibly labelled, with helper/error below; buttons are compact, 6px radius, with optional leading icon. Menus/popovers precede modals; toasts are brief only. [VERIFIED — D-12–D-13]
- DenseTable must prove semantic cells/headers, sticky-header capability, keyboard selection, sort affordance, column priority/visibility, row actions, and loading/empty/error. Lab-only controls may adjust density and visible columns locally; no persistence, preference storage, or production dashboard. [VERIFIED — D-14]
- UI Lab is an internal development-only route, uses deterministic local fixtures, needs no running API/service, and groups proof around tokens, typography, icons, primitives, and DenseTable. It proves real state toggles, keyboard/focus, contrast, long text, reduced motion, non-colour communication, and 1366×768 / 1920×1080 / 2560×1080 presets. [VERIFIED — D-16–D-19]
- AppShell expanded and icon-only collapsed navigation are Lab demonstrations only. A production dashboard, squad screen, pitch interaction, persistence, scouting, tactics, training, and a final brand are out of scope. [VERIFIED — D-19–D-20 and deferred scope]

## Current Environment and Boundaries

- The executable desktop is React 19.2.7 + TypeScript + Vite 8.1.4 inside Tauri; `apps/desktop/src/App.tsx` is only a lifecycle shell and must remain free of domain rules. [VERIFIED — `apps/desktop/package.json`, `App.tsx`]
- Existing `styles.css` already establishes Inter, graphite `#091315`, near-white text, focus outline, status state colours, and `prefers-reduced-motion`. Phase 5 should migrate these intentions to semantic tokens instead of deleting accessibility behavior. [VERIFIED — `apps/desktop/src/styles.css`]
- `vitest.config.mjs` currently includes only `tooling-tests/**/*.test.mjs`; no DOM test environment or component test library is installed/configured. [VERIFIED — `vitest.config.mjs`, root `package.json`]
- Root formatting explicitly lists current source files. New Phase 5 source, tests, and generated-free assets must be added to formatting coverage rather than escaping it. [VERIFIED — root `package.json`]
- `tsconfig.json` is strict, targets ES2024, and includes `.ts`/`.tsx` under `apps`; the Phase 5 source should compile without a parallel TypeScript configuration. [VERIFIED — `tsconfig.json`]
- Node modules, Vite output, coverage, and Impeccable local evidence are already ignored. New test output must stay within existing ignored paths or receive a narrow ignore rule; no screenshots/cache/session material belongs in Git. [VERIFIED — `.gitignore`]

## Standard Stack to Plan

### Token source of truth

Use one TypeScript token module as the authored source, exporting semantic groups (colour, typography, spacing, radius, elevation, layer, motion) and deriving CSS custom properties from it through a checked build step. Do not maintain hand-copied TS values and CSS values. [ASSUMED — implementation pattern selected to satisfy D-04 and canonical single-source rule]

Use `oklch(L C H)` syntax at the authored colour boundary. CSS Color 4 defines `oklch()` as a perceptual lightness/chroma/hue colour function, which makes a neutral graphite ramp and semantic ramps easier to reason about than unrelated hexadecimal literals. [CITED — W3C CSS Color 4, https://www.w3.org/TR/css-color-4/#ok-lab]

The generated/runtime CSS vocabulary should remain semantic, for example:

```css
--rv-color-canvas;
--rv-color-surface;
--rv-color-surface-raised;
--rv-color-text;
--rv-color-text-muted;
--rv-color-action-primary;
--rv-color-status-danger;
--rv-color-focus;
--rv-space-3;
--rv-radius-control;
--rv-layer-popover;
--rv-motion-control;
```

This is a naming shape, not final token names or values. Component code consumes roles such as `action-primary`, never raw emerald/gold values. [ASSUMED — preserves DESIGN.md semantic-colour policy]

Plan a deterministic contrast verifier that accepts resolved sRGB render values (after the OKLCH authored value is converted/clipped for the browser target) and records the intended foreground/background pair. It must assert normal text ≥4.5:1, large text ≥3:1, and relevant non-text component indicators/focus boundaries ≥3:1. WCAG 2.2 defines these thresholds in Success Criteria 1.4.3 and 1.4.11. [CITED — https://www.w3.org/TR/WCAG22/#contrast-minimum ; https://www.w3.org/TR/WCAG22/#non-text-contrast]

Do not use automatic foreground inference as the only proof: semantic roles must name their approved pair, because a colour can pass on one graphite surface and fail on another. [ASSUMED — robust validation architecture]

### Accessible behavior primitives

Use one behaviour foundation rather than hand-rolling keyboard/focus mechanics for menus, popovers, dialogs, tabs, radios, switches, and tooltips. The recommended plan is narrowly scoped Radix React primitives for those composite behaviours, styled exclusively with Rivallo components/tokens; native HTML remains preferred for buttons, inputs, selects where its behavior is sufficient. [ASSUMED — aligns with DESIGN.md permission for Radix as behavior primitives, not visual identity]

Why this boundary matters:

- Modal dialogs require focus movement into the dialog, trapped tab sequence, and focus return to the invoker; the WAI-ARIA dialog pattern documents these non-negotiable expectations. [CITED — https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]
- Tooltips are supplemental descriptions and do not substitute for a visible label or an accessible name on icon-only controls. [CITED — https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/]
- Native `<button>`, `<label>`, `<input>`, `<select>`, and semantic `<table>` should not be replaced by div-based lookalikes. This is required to retain expected keyboard and assistive-technology behavior. [CITED — MDN HTML accessibility overview, https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML]

Only install runtime packages needed by the chosen primitive composition plus `lucide-react`. Do not introduce shadcn templates, a theme package, a second icon set, or a table framework merely to render the fixed deterministic fixture. [ASSUMED — scope control and anti-reference enforcement]

### Icons and football SVGs

`lucide-react` is the generic source. Lucide documents React components and standard controls such as `size`, `strokeWidth`, and `aria-hidden`; wrap it with a Rivallo `Icon` boundary so component consumers cannot vary icon family or arbitrary stroke styling. [CITED — https://lucide.dev/guide/packages/lucide-react]

Store original football SVGs in the existing planned `packages/icons` package from `docs/design/iconography.md`, with a typed registry exposing name, viewBox, and accessible title/label metadata. The public component should normalize 16/20/24 sizes and currentColor, and reject decorative unlabeled icon-only use at call sites through the `IconButton` API. [VERIFIED — `docs/design/iconography.md`; ASSUMED — component API]

Do not copy SVG paths/assets from FootSim, Football Manager, EA FC, Brasfoot, or third-party crest libraries. [VERIFIED — PRODUCT.md and phase context]

### UI Lab route and fixtures

Keep the Lab behind a development-only route predicate. Its entry can be selected from `import.meta.env.DEV` plus a dedicated local path/hash, but it must not appear in production navigation and must not require Tauri commands, API reachability, or sidecar state. [VERIFIED — phase context D-16; ASSUMED — Vite implementation mechanism]

Use deterministic fixture data committed as TypeScript objects. Fixtures must include long names, all semantic statuses, null/missing data where appropriate, a country flag/code/name triple, and rows that exercise overflow/priority decisions. They are component evidence only, not a product data model. [ASSUMED — required to prove D-14, D-15, D-18]

Viewport presets should set the Lab's constrained preview frame to the three required desktop widths and retain a visible size label. They are not browser emulation nor a substitute for viewport-level visual tests. [ASSUMED — honest evidence boundary]

## Architecture Patterns

```text
authored semantic tokens (TypeScript + OKLCH)
             │ deterministic generation/check
             ▼
CSS custom properties + typed token exports
             │
             ├── primitive CSS / React composition
             ├── contrast and token integrity tests
             └── UI Lab token evidence

Lucide wrapper + original football SVG registry
             │
             ▼
Rivallo primitives (no product/domain dependency)
             │
             ▼
development-only UI Lab + deterministic fixtures
```

Keep token generation, icon registry, primitives, fixtures, and Lab separated by responsibility. The Lab consumes primitives; primitives consume tokens/icons; neither consumes lifecycle, contracts-client data, Tauri, API, or domain code. [ASSUMED — dependency direction for a reusable visual foundation]

The existing lifecycle shell remains the normal development/production entry. The Lab must not turn the bootstrap lifecycle status into a dashboard or hide its explicit ready/failure state. [VERIFIED — `App.tsx`, phase boundary]

## Dense Table Research

Render the core table as semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, and `<td>`. A scroll wrapper supplies horizontal overflow and sticky-header capability. Do not replace the table with an ARIA grid unless future interaction requirements genuinely require grid keyboard navigation; ARIA grids substantially increase author responsibility for focus and keyboard management. [CITED — WAI-ARIA table/grid guidance, https://www.w3.org/WAI/ARIA/apg/patterns/grid/]

Recommended Phase 5 interaction scope:

- Row selection uses an explicit labelled checkbox or a clearly documented roving-selection control; sorting uses a real button in the header with `aria-sort`/visible direction. [CITED — WAI-ARIA grid/table semantics, https://www.w3.org/WAI/ARIA/apg/practices/reading/]
- Column visibility is a Lab-local menu of labelled checkbox controls. Priority is deterministic metadata used at constrained widths, not stored user preference. [ASSUMED — D-14 scope]
- One action is visible in each row; secondary actions are in a labelled menu trigger. Empty, error, and skeleton/loading states preserve the table's structural region and explain recovery/action in text, not only colour. [VERIFIED — D-08, D-14]
- Compact/comfortable density changes row/control spacing only; it must never shrink operational type below the DESIGN.md fixed 12px floor. [VERIFIED — DESIGN.md typography; ASSUMED — implementation constraint]

Do not add pagination data fetching, virtualization, server sorting, saved views, reordering persistence, or a real squad schema. [VERIFIED — phase context deferred scope]

## Validation Architecture

The plan should create real checks, not a visual-only claim.

1. **Token integrity and contrast test:** imports the source of truth, verifies required semantic keys/scales, forbids pure-black canvas values, validates approved contrast pairs, and fails with the role/pair/ratio needed to correct it. [ASSUMED]
2. **Generated-token drift check:** regenerates CSS into a temporary location or compares deterministic output with its tracked artefact; fails without modifying tracked files and prints the regeneration command. This follows the existing OpenAPI/client drift pattern. [VERIFIED — root scripts `contracts:*:check`; ASSUMED — adapted UI implementation]
3. **Component DOM/interaction tests:** configure a browser-like Vitest environment and React testing support only if needed. Assert accessible names/roles, focus behavior, disabled/loading semantics, label/help/error associations, non-colour text cues, and Lab-local controls. [ASSUMED — tests must validate behavior, not implementation detail]
4. **Browser evidence:** prepare Playwright for deterministic UI Lab screenshots and keyboard/reduced-motion checks at the three required sizes. Existing Phase 4 CI has visual-check responsibility but this repository currently has no Playwright configuration, so adding a minimal real configuration and a narrow Lab suite is necessary rather than a placeholder. [VERIFIED — REQUIREMENTS.md FOUND-02, `vitest.config.mjs`; ASSUMED — Phase 5 implementation]
5. **Existing gates:** wire Phase 5 sources/tests into `format:check`, lint, root typecheck, Vitest, and desktop build. Run the quality sequence from a clean checkout and confirm `git status --porcelain` stays clean. [VERIFIED — root scripts and Phase 2 repeatability contract]

`prefers-reduced-motion` must be testable in CSS and browser evidence. CSS media queries expose the user preference; the reduce branch should remove nonessential animation/transition rather than merely slow it. [CITED — MDN, https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion]

## Pitfalls to Prevent

- **Token drift:** manually editing generated CSS or using raw hex/OKLCH in primitive CSS bypasses the one-source guarantee. Add a source/import boundary and drift check. [ASSUMED]
- **Out-of-gamut colour claims:** OKLCH values may be clipped by an sRGB display. Contrast evidence must be computed against the actual browser-targeted sRGB value, not an idealized value. [CITED — CSS Color 4 gamut mapping discussion, https://www.w3.org/TR/css-color-4/#css-gamut-mapping]
- **Fake accessibility:** an icon SVG title does not give an icon-only button its accessible name; the button must be named. A tooltip is supplemental. [CITED — WAI-ARIA tooltip pattern]
- **Div tables:** visually convincing div rows lose table navigation and header association. Begin with semantic table markup. [CITED — WAI HTML accessibility overview]
- **Modal-first composition:** use inline status and menus/popovers for non-destructive work. Modal dialogs are reserved exactly as D-13 says. [VERIFIED — phase context]
- **Lab leaking into production:** avoid navigation links, production route registration, and API/sidecar fetches. Gate it at build/runtime development mode and cover that boundary in a test. [ASSUMED]
- **Premature football product:** flags, player-like fixtures, and a pitch-like visual may prove primitive capability but must not become a real squad/tactics/dashboard implementation. [VERIFIED — phase scope]
- **Visual imitation:** reference FootSim only for management-depth ambition, never layout, assets, brand, wording, or interaction copying. [VERIFIED — phase context]

## Planning Implications and Ordering

1. Establish token source, deterministic CSS emission/check, and contrast evidence first. Existing lifecycle styles can migrate only after the token contract exists.
2. Add the one chosen behavior/icon dependencies and the shared icon boundary, then create original football SVG registry/assets.
3. Build and test the primitive layer on the token contract, starting with form/action/status primitives and then composite overlays/menus/dialogs.
4. Build DenseTable as its own semantic composition using deterministic fixtures; give it Lab-local visibility/density controls and all required states.
5. Build the development-only Lab around already-tested primitives, including viewport presets and expanded/collapsed navigation demonstration.
6. Add Vitest/Playwright evidence, integrate every new file into formatter/lint/typecheck/build scripts, and run the complete quality suite from a clean tree.

This ordering ensures the UI Lab proves the system rather than becoming a second, hand-styled implementation of it. [ASSUMED]

## Sources

- [CITED] W3C, CSS Color Module Level 4 — OKLCH and gamut mapping: https://www.w3.org/TR/css-color-4/
- [CITED] W3C, WCAG 2.2 — contrast minimum and non-text contrast: https://www.w3.org/TR/WCAG22/
- [CITED] W3C WAI-ARIA APG — modal dialog: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- [CITED] W3C WAI-ARIA APG — tooltip: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
- [CITED] W3C WAI-ARIA APG — grid behavior: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- [CITED] MDN — semantic HTML accessibility: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML
- [CITED] MDN — `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- [CITED] Lucide — React package guide: https://lucide.dev/guide/packages/lucide-react
- [VERIFIED] Local canonical references: `PRODUCT.md`, `DESIGN.md`, `docs/design/*.md`, Phase 5 context, and existing desktop/tooling files listed above.

## Environment Availability

| Capability | Availability | Planning consequence |
|---|---|---|
| React/TypeScript/Vite desktop host | Present | Implement primitives and Lab within `apps/desktop`. |
| Existing lifecycle shell | Present | Preserve as non-product operational surface; do not replace with dashboard. |
| Semantic token source | Absent | Create in this phase with deterministic generated CSS/check. |
| Lucide/Radix dependencies | Not declared | Add only after normal package approval/execution procedure. |
| Component DOM test environment | Absent | Add a real minimal test setup if required by primitive behavior tests. |
| Playwright configuration | Absent | Add a real UI Lab evidence configuration/suite, not a placeholder. |
| API/sidecar required for Lab | Not required | Lab fixtures must remain local and deterministic. |

