# Rivallo Design Foundation V0

**Status:** provisional design foundation. “Rivallo” remains a working name; this document establishes a reversible visual system, not a final brand identity.

## Canonical Scope

This is the canonical source for Rivallo’s visual foundation: semantic roles, typography, spatial scales, component behavior, accessibility, and visual governance. Documents in `docs/design/` deepen specific subjects and must link here rather than duplicate tokens or rules.

## Creative North Star

> “Sala de comando sob os refletores.”

The product should feel like a premium, analytical, immersive command centre used during a decisive match night: strategically calm, precise under pressure, dense without chaos, and visibly trustworthy about online/offline state.

## Visual Direction

Dark-first is the default. Base surfaces use blue-green or green-blue graphite, never pure black. Tonal surface separation, not decorative effects, creates depth. The product is desktop-first: high information density, strong hierarchy, fast familiar controls, and structural responsiveness.

The colour strategy is restrained: rich semantic meaning, limited accent coverage, and no colour used merely as ornament.

## Semantic Colour Strategy

| Role | Meaning and permitted use | Explicit limit |
|---|---|---|
| Gold | Brand, achievements, premium moments | Never dominate a surface or replace the primary action colour. |
| Emerald | Primary action, success, positive condition | Reserved for actionable or confirmed-positive states. |
| Red | Risk, error, defeat, injury, suspension, critical state | Never used for ordinary actions or decorative emphasis. |
| Amber | Attention and caution | Must include text, icon, or other non-colour cue. |
| Blue/cyan | Information and neutral status | Must not compete with primary action. |
| Club colours | Crests, kits, and small contextual details | Never replace global product identity or carry sole state meaning. |

Implement tokens in OKLCH from one source of truth during Gate 2. The planned token vocabulary covers background, surface, elevated surface, overlay, border, text, muted text, accent, semantic states, focus, selection, data visualisation, club context, motion, spacing, radius, elevation, and typography. Exact values remain intentionally unselected until the approved design brief and contrast tests.

## Typography and Data

- **Inter** is the operational family for UI, body copy, data, tables, labels, and forms.
- **Space Grotesk** is provisional and restricted to the working mark, level-one headings, and rare special moments; never use it in table cells, buttons, form labels, or compact controls.
- Use tabular numerals for statistics, financial values, positions, and table data.
- Use a fixed desktop product scale rather than fluid display sizing: 12, 14, 16, 18, 20, 24, 30, and 36px, with an approximately 1.125–1.2 ratio between adjacent operational levels.
- Prefer hierarchy through size, weight, contrast, alignment, and spacing—not oversized decorative metrics.

## Density, Layout, and Responsive Structure

The interface favors high information density with strong grouping and scan paths. Avoid cards within cards; use panels only when they establish a real region or interaction boundary.

The desktop structure consists of AppShell, top navigation, workspace header, command bar, contextual panels, dense data tables, and explicit connection/sync affordances. Responsiveness is structural: navigation can condense, panel grids reflow, and tables provide intentional overflow or column-priority behavior rather than simply shrinking text.

Design and test the initial system at 1366×768, 1920×1080, and 2560×1080. The first two define minimum working density and common desktop use; ultrawide must preserve hierarchy rather than stretch content into empty space.

## Spatial and Layer Scales

| System | Foundation rule |
|---|---|
| Spacing | 4px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Use rhythm, not uniform gaps. |
| Radius | 4px, 6px, 8px, 12px; panels and inputs do not exceed 12px. Pills are reserved for compact status/chips. |
| Elevation | 0 for normal surfaces; 1 for raised controls; 2 for popovers; 3 for dialogs. Prefer tonal separation or a restrained border; do not combine decorative wide shadows with borders. |
| Z-index | base → sticky → dropdown/popover → modal backdrop → modal → toast → tooltip. Values are semantic, never arbitrary. |
| Motion | 100ms feedback, 150ms standard control transitions, 200–250ms layout/state transitions; ease-out, no bounce or page-load choreography. |

## Components and States

Every interactive component must define default, hover, focus-visible, active, selected, disabled, loading, and error states where applicable. This applies to the initial primitives and all future composite controls.

Loading uses layout-preserving skeletons where content shape is known. Empty states explain the next useful action. Error states explain impact and recovery. Offline, stale, synchronising, queued, conflicted, and reconnected states are explicit product states—not silent implementation details. No information may be conveyed solely by colour.

## Icons

Adopt one generic icon family in Gate 2; do not install or select it in this foundation. Football-specific icons will be versioned SVGs with consistent 16/20/24px grids, coherent stroke weight, and accessible labels. Emoji and mixed generic icon families are prohibited in production UI.

## Accessibility Requirements

Target WCAG 2.2 AA from the first implemented screen:

- minimum 4.5:1 contrast for normal text and 3:1 for large text and non-text UI contrast where applicable;
- complete keyboard navigation, visible focus, logical focus order, and controlled dialog focus;
- semantic headings, labelled controls, correctly headed tables, accessible tooltips, and live status messaging when needed;
- state communicated by colour plus text, icon, pattern, or position;
- support for zoom, scaling, long text, and future localisation;
- `prefers-reduced-motion` disables nonessential motion and replaces it with instant or crossfade state changes.

## Anti-references

Do not produce a generic SaaS dashboard, default shadcn theme, nested-card interface, decorative glassmorphism, purple-blue gradient aesthetic, esports neon, casino/betting language, enlarged mobile UI, exaggerated corners, giant shadows, or visual copies of other football managers. Radix and shadcn are accessibility/behavior primitives, not a final visual identity.

## Visual Governance

UI Lab is mandatory before production screens. It must demonstrate tokens, typography, colours, icons, components, component states, dense tables, and the target viewport behavior.

For every important screen: **Shape → human approval → implementation → Critique → Audit → Polish → Harden → Adapt**. No design brief approval means no screen implementation. Visual review records must include keyboard, contrast, reduced-motion, long-text, dark-theme, and target-resolution evidence.

## Provisional Decisions

The working name, final mark, exact OKLCH values, generic icon family, final title-face choice, and any imagery treatment remain provisional. They require explicit approval and, where relevant, naming/legal research before becoming irreversible.
