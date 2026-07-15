# Phase 5: Design Tokens, Icon Policy and UI Primitives - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish Rivallo's first executable visual-system foundation: one semantic OKLCH token source, the approved generic-icon and football-SVG policy, accessible desktop primitives, and an internal UI Lab that proves those foundations before any production screen is built.

This phase does not implement a dashboard, squad screen, tactical screen, real persistence, or any football-management feature.

</domain>

<decisions>
## Implementation Decisions

### Visual foundation and colour system

- **D-01:** Preserve the DESIGN FOUNDATION V0 dark-first direction: blue-green/green-blue graphite surfaces, never pure black; depth comes from tonal separation and restrained borders, not glass or decorative shadow.
- **D-02:** The working visual route is **"Arquitetura tática" with minimal heráldica in the brand**: precise, geometric, calm and institutional. The product must feel strong through hierarchy, information craft, iconography and composition—not neon, saturated decoration, or a literal mascot.
- **D-03:** Use a cold, high-contrast near-white as the operational text and data colour; pure white is available for exceptional emphasis. Do not introduce warm cream, beige, or low-contrast grey text in the name of elegance.
- **D-04:** Treat the provisional palette as "Noite de Comando": dark graphite dominates; aged gold is restricted to mark/achievement/premium moments; emerald is primary action and confirmed-positive state; cyan is informational/focus; amber and red are strictly semantic. Exact OKLCH values remain provisional until contrast evidence is recorded in the UI Lab.
- **D-05:** No status, condition, warning, nation, club affiliation, or selection state may be communicated by colour alone. Club colours remain contextual only.

### Icon policy and brand direction

- **D-06:** Adopt Lucide as the generic icon family for the phase, with one consistent set only. Use 16px, 20px, and 24px icon grids and approximately 1.75px visual stroke weight.
- **D-07:** Football-specific concepts use versioned, original SVGs with a geometric/minimal style and the same optical weight as generic icons. Do not use emoji, mixed icon families, or a symbol when no unambiguous icon exists—use text until one is approved.
- **D-08:** Icon plus visible label is the default. Isolated icons are allowed only in stable, familiar positions and require a tooltip and accessible name. Table rows expose one visible primary action; secondary actions go in keyboard-accessible overflow/menu controls.
- **D-09:** Icons are static. Motion is allowed only for an actual loading/progress condition and must respect reduced-motion preferences.
- **D-10:** Do not create a literal animal mascot in this phase. The future mark should first prove itself as a compact abstract tactical symbol; any mascot extension remains reversible and needs separate research/approval.

### Accessible primitives and dense-table foundation

- **D-11:** Implement a robust shared primitive set: Button, IconButton, TextField, Select, Tabs, Tooltip/Popover, Status, Skeleton, Empty State, Error State, DenseTable, Checkbox, RadioGroup, Switch, Menu, Dialog/AlertDialog, Toast, Pagination, and ScrollArea.
- **D-12:** Every applicable primitive must prove default, hover, focus-visible, active, selected, disabled, loading, and error states. Inputs and selectors are compact 32px controls with a visible label above and helper/error text below.
- **D-13:** Buttons are compact with a 6px radius; text is clear and an optional icon sits to the left. Emerald is reserved for the primary action. Prefer menu/popover for contextual work; reserve modal dialogs for destructive confirmation or a genuine interruption. Toasts are brief only—important state remains persistent and contextual.
- **D-14:** DenseTable is a first-class primitive: sticky-header capability, semantic headers/cells, keyboard selection, sorting affordance, column priority/visibility, row actions, and loading/empty/error states. Its UI Lab fixture offers local density and column-visibility controls only; storage, reordering persistence, and per-user preferences belong to later dashboard/data phases.
- **D-15:** Nationality presentation, when a fixture needs it, is a small flag plus country code, with full country name in a tooltip/detail. It never relies only on a flag or colour.

### UI Lab proof and desktop structure

- **D-16:** UI Lab is an internal development-only route outside production navigation. It uses local deterministic fixtures and requires no running API or service.
- **D-17:** Organize UI Lab by proof category: semantic tokens, typography, icons, primitive components, and DenseTable. It must expose real state toggles and viewport presets for 1366x768, 1920x1080, and 2560x1080.
- **D-18:** The Lab must make keyboard/focus behavior, contrast, long text, reduced motion, and non-colour communication visible and testable. Token displays show semantic name, OKLCH value, contrast evidence, and a real usage example.
- **D-19:** Prove both expanded and icon-only collapsed AppShell navigation modes in the Lab. The user explicitly collapses navigation; persistence of that choice is deferred to AppShell/shell implementation.
- **D-20:** The visual concept is a direction reference only: a high-density dark command-centre screen with a dense squad table and a functional-looking tactical pitch. It is not a production screen contract and must not be copied from FootSim or the generated concept image.

### the agent's Discretion

- Select exact token values, component composition, and implementation details provided that they uphold the semantic roles, target contrast, typography, motion, state matrix, and anti-references in `DESIGN.md`.
- Refine the abstract tactical-mark exploration only as reversible UI Lab/brand exploration; do not claim a final name, logo, mascot, or imagery system.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and visual foundation
- `PRODUCT.md` — product register, desktop audience, brand personality, anti-references, and accessibility principles.
- `DESIGN.md` — canonical DESIGN FOUNDATION V0; semantic colour policy, typography, density, component states, accessibility, anti-references, and visual governance.
- `docs/design/visual-direction.md` — deepens the approved visual direction and must defer to `DESIGN.md` for canonical rules.
- `docs/design/iconography.md` — iconography-specific guidance that must be reconciled with the approved Lucide/SVG decision above.
- `docs/design/accessibility.md` — accessibility detail supporting WCAG AA evidence in UI Lab.
- `docs/design/motion.md` — motion detail supporting functional motion and `prefers-reduced-motion`.
- `docs/design/game-ui-principles.md` — product-UI density and hierarchy guidance.
- `docs/design/screen-contracts.md` — later screen-contract process; production screens are out of scope here.

### Planning and scope
- `.planning/ROADMAP.md` §Phase 5 — objective, UI-01 requirement, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` §Design quality — `UI-01` is the requirement this phase satisfies.
- `.planning/PROJECT.md` — product constraints and provisional identity policy.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/desktop/src/styles.css` — the current minimal operational shell already uses a dark green-blue graphite base, Inter, explicit focus styling, semantic lifecycle states, and reduced-motion handling; Phase 5 should replace ad-hoc values with the canonical token source rather than discard those accessibility intentions.
- `apps/desktop/src/App.tsx` — current desktop entry surface is only a lifecycle shell; it is a safe host for routing/isolating the future development-only UI Lab, not a product-screen implementation.

### Established Patterns
- The desktop is React/TypeScript/Vite within the Tauri shell; no domain rule belongs in React.
- Current UI has explicit loading, ready, and recoverable-failure host lifecycle states. New status primitives must preserve this explicit-state approach.
- `prefers-reduced-motion` is already present in the existing stylesheet and must remain mandatory as tokens/primitives replace the bootstrap styles.

### Integration Points
- Phase 5 must build only within the desktop frontend/tooling boundaries established in Phases 2–4.
- Future dashboard, squad, scouting, tactical, training, and sync screens consume the primitives and UI Lab evidence but are not implemented here.

</code_context>

<specifics>
## Specific Ideas

- Creative North Star: "Sala de comando sob os refletores."
- The founder expects a genuinely polished football manager with exceptional configurable tables, not a generic dashboard.
- A reviewed directional reference was FootSim (`https://www.footsim.com.br/` and supplied videos): retain only the ambition for dense management flows, navigation, tables, and a functional tactical field. Do not copy its layouts, branding, wording, icons, assets, or visual treatment.
- The future tactical pitch is a functional analysis surface, not decoration: deep restrained green, precise markings, readable player/zone data, and club colour only as context. Its actual screen/interaction contract belongs to a future tactics phase.

</specifics>

<deferred>
## Deferred Ideas

- Literal mascot selection, final mark, legal/name research, and final imagery treatment — brand work after separate research and approval.
- Real tactical pitch interaction, formation editing, roles, team instructions, and formation-familiarity visualization — future tactics/lineup phase.
- Persistent table personalization, column order, saved views, and dashboard-level filtering — future data/dashboard/preferences phase.
- Discovery/fog-of-war: players and clubs have incomplete initial information; scouts observe, assess, and return reports with coverage, confidence, and freshness.
- Tactical familiarity: players and teams adapt to formation/approach through collective and individual training plus match experience; switching systems must have real consequences, not a decorative number.
- Nations apply to players, coaches, clubs, and future world data. Their data model and gameplay implications need a dedicated domain phase before implementation.

</deferred>

---

*Phase: 5-Design Tokens, Icon Policy and UI Primitives*
*Context gathered: 2026-07-15*
