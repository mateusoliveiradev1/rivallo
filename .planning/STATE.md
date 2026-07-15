---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_phase_name: First Playable Matchday
current_plan: 1
status: awaiting_user_validation
stopped_at: First playable matchday built, verified, and ready to run
last_updated: '2026-07-15T22:38:00.000Z'
last_activity: 2026-07-15
progress:
  total_phases: 13
  completed_phases: 4
  total_plans: 35
  completed_plans: 33
  percent: 31
---

# State

## Project Reference

See `.planning/PROJECT.md` (updated 2026-07-13).

**Core value:** dependable deep management in local and shared online competition.
**Current phase:** 06
**Current phase name:** First Playable Matchday
**Current gate:** First Playable.
**Gate 0:** APPROVED by Mateus.
**Next action:** Run the built first playable and collect Mateus's product feedback before expanding the season.

## Current Position

Current Phase: 6
Current Phase Name: First Playable Matchday
Current Plan: 1
Total Plans in Phase: 1
Status: Awaiting user validation
Progress: First playable implementation and automated verification complete
Last activity: 2026-07-15

## Gate History

- Gate 0 was approved after review of documentation, architecture, product, data, testing, design, and ADRs.
- Phase 2 is complete: reproducible pnpm/Turborepo/Cargo roots, toolchain validation, real JavaScript and Rust quality commands, Vitest infrastructure smoke coverage, narrow cache ignores, and clean-checkout documentation are in place.
- Every Rust/Cargo child process uses a Node adapter with `RUSTUP_AUTO_INSTALL=0`. The zero-member workspace explicitly validates components and metadata; Phase 3 must switch to source-level `rustfmt` checks and warnings-denied Clippy once it adds real members.

## Session

**Last session:** 2026-07-15T22:38:00.000Z
**Stopped at:** First playable matchday built and verified
**Resume file:** None

## Accumulated Context

### Pending Todos

- 1 pending — [Design initial menu and football icon system](todos/pending/2026-07-15-design-initial-menu-and-football-icon-system.md)

## Performance Metrics

| Phase        | Plan   | Duration | Notes    |
| ------------ | ------ | -------- | -------- |
| Phase 03 P01 | 15min  | 1 tasks  | 10 files |
| Phase 03 P02 | 10min  | 1 tasks  | 3 files  |
| Phase 03 P04 | 12min  | 2 tasks  | 6 files  |
| Phase 03 P05 | 10min  | 2 tasks  | 5 files  |
| Phase 03 P06 | 20min  | 2 tasks  | 25 files |
| Phase 03 P08 | 10min  | 2 tasks  | 4 files  |
| Phase 03 P09 | 28min  | 3 tasks  | 15 files |
| Phase 04 P01 | 2min   | 2 tasks  | 2 files  |
| Phase 04 P02 | 8min   | 2 tasks  | 7 files  |
| Phase 04 P03 | 18min  | 2 tasks  | 71 files |
| Phase 04 P05 | 10min  | 2 tasks  | 7 files  |
| Phase 04 P04 | 17min  | 2 tasks  | 15 files |
| Phase 04 P06 | 10min  | 2 tasks  | 7 files  |
| Phase 05 P01 | 1h 4m  | 2 tasks  | 3 files  |
| Phase 05 P02 | 9 min  | 2 tasks  | 10 files |
| Phase 05 P03 | 11 min | 3 tasks  | 8 files  |
| Phase 05 P04 | 10 min | 2 tasks  | 10 files |
| Phase 05 P05 | 16 min | 3 tasks  | 10 files |
| Phase 05 P06 | 9 min  | 3 tasks  | 8 files  |
| Phase 05 P07 | 12 min | 3 tasks  | 5 files  |
| Phase 05 P08 | 17 min | 3 tasks  | 6 files  |
| Phase 05 P09 | 13 min | 3 tasks  | 11 files |
| Phase 05 P11 | 20 min | 2 tasks  | 11 files |
| Phase 05 P10 | 12 min | 2 tasks  | 6 files  |
| Phase 05 P12 | 15 min | 2 tasks  | 4 files  |
| Phase 05 P13 | 10min  | 2 tasks  | 4 files  |
| Phase 06 P01 | 35min  | 5 tasks  | 26 files |

## Decisions

- [Phase 06]: Make the normal Tauri ready state open the real matchday workspace; keep the UI Lab development-only at `/__ui-lab`. — Product validation now happens on a playable surface rather than a component inventory.
- [Phase 06]: Keep lineup validation, deterministic simulation, record progression, and match events in Rust domain code. — React selects intent and renders outcomes but never owns competitive rules.
- [Phase 06]: Persist the complete first-playable state as adapter-owned JSON under the Tauri application-data directory. — The smallest restart-safe loop ships without prematurely introducing the later SQLite career schema.
- [Phase 06]: Gate the real matchday in component tests and three deterministic browser viewports, including native modal focus return. — Visual and keyboard regressions now cover the product surface in the normal quality aggregate.

- [Phase 05]: Run Chromium against independent development and production Vite servers. — UI Lab evidence remains independent of Tauri, sidecar, API and Docker state while production exclusion is tested in a real browser.
- [Phase 05]: Keep `pnpm quality` writer-free and make `pnpm quality:clean` run the aggregate plus desktop build twice against exact porcelain. — Checks are repeatable, fail-fast and preserve both clean and pre-existing dirty baselines.
- [Phase 05]: Install the approved Playwright Chromium binary explicitly in CI and never inside test commands. — Environment setup is visible and actionable without hidden downloads during verification.
- [Phase 05]: Keep hierarchy, originality, non-imitation and terminal visual approval human-owned. — Automation proves structure and behavior but does not pretend to replace design judgment.
- [Phase 05]: Keep `/__ui-lab` behind an exact compile-time DEV predicate and select App/UI Lab through dynamic imports. — Production retains the operational shell without exposing inspection behavior, navigation or bundle copy.
- [Phase 05]: Treat 1366×768, 1920×1080 and 2560×1080 as labelled deterministic layout frames, not device emulation. — The Lab makes bounds inspectable without overstating browser-level evidence.
- [Phase 05]: Keep viewport, DenseTable and shell configuration local to each mount. — Persistence, preferences, lifecycle, API, network and Tauri authority remain outside the Lab.
- [Phase 05]: Apply shell width changes instantly while limiting optional feedback to label opacity. — Preserves focus and workspace expansion without animating a layout property.
- [Phase 05]: Keep DenseTable on native table, input and button semantics; React state only supplies deterministic local enhancement. — Preserves document relationships and browser keyboard behavior without a div-grid or table framework.
- [Phase 05]: Reduce columns through explicit priority and a local hidden set applied to headers, cells, loading geometry and state-row spans. — Prevents structural drift while deferring persistence, saved views and reordering.
- [Phase 05]: Communicate selected rows through native control state, visible marker, announcement copy and full-row geometry in addition to colour. — Meets the no-colour-only policy in dense data.
- [Phase 05]: Treat flag imagery as optional context while country code remains visible and full country name stays keyboard-discoverable. — Nationality meaning survives image failure and never depends on colour.
- [Phase 05]: Require stable positioning and an independent accessible name before an icon-only action may expose a tooltip. — Tooltip text supplements the control label and never becomes the sole source of meaning.
- [Phase 05]: Keep radio controls native while adding deterministic cyclic arrow navigation that skips disabled options. — Preserves browser semantics without introducing another selection implementation.
- [Phase 05]: Use approved Radix packages only for difficult keyboard, focus and overlay behavior. — Rivallo continues to own every visual class, token and state treatment.
- [Phase 05]: Restrict Toast to brief neutral or positive feedback; persistent danger, offline and error conditions remain Status content. — Ephemeral announcements must not hide durable product state.
- [Phase 05]: Keep action, form, choice, pagination, and overflow behavior native while Rivallo owns typed APIs and token-based appearance. — Preserves standard keyboard and disabled semantics without custom-control reinvention.
- [Phase 05]: Let Status own polite/assertive live semantics and optionally render its label as a real heading. — Host lifecycle structure remains semantic without nested or duplicated live regions.
- [Phase 05]: Export generated.css explicitly from @rivallo/design-tokens and retain Tauri invoke/poll/retry authority outside primitives. — Makes the visual boundary consumable without moving process authority into UI components.
- [Phase 05]: Mateus approved exactly 16 reviewed direct packages under digest `sha256:56d9bfb036d3b3d42acc09faa968911cfc5aa760def3c991288dfe2e8fcf8b7f`. — No dependency transaction may exceed the reviewed names, versions, scopes, or integrity records.
- [Phase 05]: Use `lucide-react@1.24.0` as the sole generic icon family and seven narrow Radix packages only for accessible behavior. — Rivallo owns all appearance; native HTML remains preferred where suitable.
- [Phase 05]: Use `colorjs.io@0.6.1` for deterministic OKLCH, gamut mapping, and contrast calculations. — Avoids an unreviewed local color-science implementation and the less-observed 0.7.0 release.
- [Phase 05]: Use `jsdom@27.0.1` for component-test infrastructure. — Preserves the project-wide Node 22.0.0+ minimum that later jsdom releases would raise.

- [Phase 03]: Platform composes generic application output with contracts metadata without directly depending on domain. — Preserves the locked platform-to-application-and-contracts-only dependency graph.
- [Phase 03]: D-01 is enforced from Cargo resolved metadata with a small domain core allowlist and a full framework, network, frontend, persistence, and database denylist. — Resolved graph traversal prevents direct and transitive manifest bypasses.
- [Phase 03]: Contracts owns ContractManifest, CONTRACT_VERSION, and the ToSchema derivation. — Canonical schemas and semantic version stay outside application and platform composition.
- [Phase 03]: Platform composes only schema metadata and exposes the explicit export-openapi output-path binary. — The exporter remains schema-only without a listener, endpoint, fixture, or runtime registration.
- [Phase 03]: OpenAPI drift verification exports to a unique temporary path and byte-compares it without mutating the tracked contract. — Drift failures retain evidence and print the explicit writer repair command.
- [Phase 03]: Generated TypeScript contract models are isolated in packages/contracts-client and derive only from committed contracts/openapi.json. — The package remains application-independent and generated-only.
- [Phase 03]: Retain the approved bundled generator and expose only selected generated Fetch symbols at the package root. — No runtime dependency, generator version, or generated output change is permitted.
- [Phase 03]: Treat the bundled generator core as an exact private inventory allowance enforced by public-boundary and drift tests. — The D-10 exception permits dormant generator-owned support only when it is not public or configured.
- [Phase 03]: Replace the superseded Hey API exception with exact approved orval@8.21.0 direct Fetch output. — Removes public auth/SSE/retry/backoff reachability while preserving generated-only ownership.
- [Phase 03]: Use one unregistered neutral contract-introspection operation only because Orval Fetch is operation-scoped. — The fixture returns ContractManifest with no parameters, security, runtime registration, or product behavior.
- [Phase 04]: Mateus approved exactly @tauri-apps/cli@2.11.4, @tauri-apps/api@2.11.1, vite@8.1.4, and @vitejs/plugin-react@6.0.3 on 2026-07-14; no other package or version is covered. — Registry provenance, exact-version integrity, trusted-publisher evidence, and absence of consumer install hooks were accepted before any dependency transaction.
- [Phase 04]: The approved Axum/Tokio runtime remains exclusively in the outer platform crate; domain, application, and contracts stay runtime-framework independent.
- [Phase 04]: The sidecar accepts only the fixed private stdin shutdown message and shares its cancellation token with Axum graceful shutdown; no HTTP management route or runtime address argument exists.
- [Phase 04]: Use Tauri --no-bundle for build-only verification instead of --bundles none.
- [Phase 04]: Derive the sidecar target triple from rustc -vV for host-correct packaging.
- [Phase 04]: Track Tauri icon sources while ignoring copied sidecars, generated schemas, and build output.
- [Phase ?]: Expose only Unavailable and InvalidData from the application persistence boundary; adapter-specific causes stay outside the public contract. — Keeps database and OS detail out of UI-facing recovery semantics.
- [Phase ?]: Represent the Phase 4 SQLite boundary as a disconnected adapter with injected per-user location resolution and no driver or filesystem side effects. — Preserves D-05 through D-08 until later storage phases.
- [Phase 04]: Lifecycle status remains a host-owned typed union — React can only read status and request retry, never select process authority.
- [Phase 04]: Copyable lifecycle diagnostics are compiled out of production — Technical detail stays inside a development-only disclosure.
- [Phase 04]: Use postgres:17-alpine with loopback-only publishing, overrideable non-secret local defaults, and a named volume.
- [Phase 04]: Keep CI at exactly three Ubuntu jobs and cache only the pnpm dependency store; publish no artifacts.
- [Phase 04]: Run Vitest files serially because generated-contract writer tests and drift readers share tracked artifacts and must never overlap.
- [Phase 05]: Freeze the pre-transaction direct dependency baseline inside the Phase 5 verifier. — Keeps installed validation authoritative after HEAD advances.
- [Phase 05]: Allow exactly the @rivallo/icons and @rivallo/design-tokens desktop workspace links at workspace:* — Maintains narrow ownership and rejects speculative package wiring.
- [Phase 05]: Run Vitest files serially across the aggregate while separating Node and DOM projects. — Tracked contract writers and drift readers share artifacts and must never race.
- [Phase 05]: Use official React 19 types and retain only CSS and ImportMeta project declarations. — Eliminates the obsolete ambient React shim without weakening type safety.
- [Phase 05]: Raise color-border to oklch(0.52 0.022 190) while retaining a quiet subtle separator. — The provisional control border failed 3:1; the adjusted role passes against raised graphite without brightening ordinary dividers.
- [Phase 05]: Compile the import-free canonical TypeScript token module in memory with the existing compiler. — Preserves Node 22.0 compatibility and avoids an unapproved loader or duplicated token source.
- [Phase 05]: Keep generated CSS authored in OKLCH and export separately resolved sRGB contrast evidence. — Modern WebViews retain the intended palette while WCAG checks measure actual target values.
- [Phase 05]: Expose semantic icon names through one curated Lucide boundary with fixed sizes and 1.75px stroke. — Prevents arbitrary paths, visual props, mixed families, and implementation-name leakage.
- [Phase 05]: Declare React 19.2.7 as one exact pre-existing peer of @rivallo/icons. — A reusable React package must not rely on aliases or hoisting; no new registry package was installed.
- [Phase 05]: Limit the football SVG proof set to ball, goal frame, and training cone. — Proves original versioned icon capability without introducing a pitch, crest, mascot, or product identity.
- [Phase 05]: Bound the Rivallo football grammar to a 24-unit grid, 2-unit optical padding, four geometry elements, and fourteen commands per path. — Keeps current and future football symbols coherent, safe, and reviewable at 16, 20, and 24px.
- [Phase 05]: Require owning screen contracts, unambiguous meaning, and visible-label fallbacks before future domain icon geometry is created. — Proves extension discipline for training, tactics, scouting, and medicine without speculative assets or product screens.
- [Phase 05]: Mateus rejected the current Phase 5 visual foundation. — Phase 5 and Gate 2 remain open while bounded table and icon gaps are corrected.
- [Phase 05]: Preserve the strong, sober, premium and highly legible graphite-first direction. — The rejection targets table usability and icon context/16px quality, not the approved visual direction.
- [Phase 05]: Specify the complete Table View Engine now but implement it only in the responsible product phases. — Phase 5 fixes primitive width and icon evidence; Phase 6 owns screen contracts and Phase 9 owns real data integration.
- [Phase 05]: Keep DenseTable finite through fixed colgroup widths and a non-amplifying percentage fill. — Removes the million-pixel intrinsic chain while preserving semantic table geometry and the operational type floor.
- [Phase 05]: Keep the labelled ScrollArea as the only native overflow owner. — Width, min-width, max-width and border-box constraints prevent parent layout amplification without introducing a second scroll layer.
- [Phase 05]: Keep Table View State language-neutral and controlled while commands, events, persistence, queries, and React rendering remain separate authorities. — Prevents screen-specific engines and direct storage or query authority in React.
- [Phase 05]: Model Mostrar somente gols as an ordinary saved view; Phase 6 resolves screen semantics and Phase 9 executes the general pipeline. — Prevents one-off flags, renderers, and query branches.
