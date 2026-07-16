# Roadmap: Rivallo

## Overview

Delivery is sequential. A gate may advance only after the named approval and its verifiable success criteria are satisfied.

## Phase 1: Gate 0 Foundation

**Status:** Complete — Gate 0 approved  
**Gate:** 0  
**Directory:** `.planning/phases/01-gate-0-foundation/`

**Objective:** Establish the product, architecture, authority, data, test, design, infrastructure, and ADR foundation without production implementation.

**Requirements:** Gate 0 documentation baseline; architecture and product decisions supporting FOUND-01 through FOUND-03.

**Dependencies:** None.

**Success criteria:**

- Product, architecture, data, testing, design, operations, and the 12 required ADRs are documented.
- DESIGN FOUNDATION V0 is approved as provisional and `PRODUCT.md` remains preserved.
- No scaffold, production code, dependency installation, or infrastructure provisioning occurs.

## Phase 2: Workspace, Toolchains and Quality Scripts

**Status:** Complete — ready for Phase 3  
**Gate:** 1  
**Directory:** `.planning/phases/02-workspace-toolchains-quality-scripts/`

**Objective:** Create the smallest reproducible workspace and quality-tool baseline for a Tauri/React/Rust modular monolith.

**Requirements:** FOUND-01; the quality-script portion of FOUND-02.

**Dependencies:** Phase 1.

**Success criteria:**

- pnpm workspace, Turborepo, Cargo workspace, TypeScript, ESLint, Prettier, rustfmt, Clippy, cargo-nextest, and Vitest are reproducibly configured.
- No dashboard, squad, authentication, simulation, multiplayer, editor, mod, or production infrastructure feature is implemented.
- Local-development documentation explains the installed toolchain and quality commands.

## Phase 3: Rust Modular Monolith and API Contract Pipeline

**Status:** Planned
**Gate:** 1  
**Directory slug:** `03-rust-modular-monolith-api-contracts`

**Objective:** Establish only the Rust crate boundaries with real responsibilities and the backend-owned API contract pipeline.

**Requirements:** FOUND-03; DATA-02 contract foundation.

**Dependencies:** Phase 2.

**Plans:** 9/9 plans complete

Plans:

- [x] 03-09-PLAN.md

**Wave 1**

- [x] 03-01-PLAN.md — Establish D-01 crate topology with application → domain only.

**Wave 2** _(blocked on Wave 1 completion)_

- [x] 03-02-PLAN.md — Enforce resolved Cargo metadata dependency policy.
- [x] 03-03-PLAN.md — Record human approval for the pinned TypeScript generator.

**Wave 3** _(blocked on Wave 2 completion)_

- [x] 03-04-PLAN.md — Implement canonical Rust contracts and the schema-only platform exporter.

**Wave 4** _(blocked on Wave 3 completion)_

- [x] 03-05-PLAN.md — Materialize committed OpenAPI and prove deterministic non-mutating verification.

**Wave 5** _(blocked on Wave 4 completion)_

- [x] 03-06-PLAN.md — Generate and verify the TypeScript contract client.

**Wave 6** _(blocked on Wave 5 completion)_

- [x] 03-07-PLAN.md — Integrate quality checks, proof, scope fences, and documentation.

**Wave 7** _(blocked on Wave 6 completion)_

- [x] 03-08-PLAN.md — Close generated-client public export and enforce the approved bounded D-10 bundled-core exception.

**Success criteria:**

- Domain/application boundaries compile without React, Tauri, axum, SQLite, or PostgreSQL dependencies.
- Schema-only Rust contracts/exporter and generated OpenAPI/client drift workflow are established without runtime API endpoints.
- No competitive domain rule is placed in TypeScript.

## Phase 4: Desktop Shell, Local Persistence Boundary, Containers and CI Skeleton

**Status:** Planned
**Gate:** 1  
**Directory slug:** `04-desktop-shell-local-persistence`

**Objective:** Produce the minimal executable desktop/API shell, local persistence boundary, Docker PostgreSQL, and CI skeleton.

**Requirements:** FOUND-01; remaining FOUND-02; SQLite preparation; local PostgreSQL compatibility preparation.

**Dependencies:** Phase 3.

**Success criteria:**

- Minimal Tauri desktop build and local axum service start successfully.
- Health/readiness check responds locally; Docker PostgreSQL starts without Neon.
- SQLite is reached only through a prepared adapter boundary; CI jobs run their scoped minimum checks.

## Phase 5: Design Tokens, Icon Policy and UI Primitives

**Status:** Complete — provisional technical foundation  
**Gate:** 2  
**Directory slug:** `05-design-tokens-icon-policy-and-ui-primitives`

**Objective:** Implement the approved token source, icon policy, accessible primitives, and UI Lab foundation.

**Requirements:** UI-01.

**Dependencies:** Phase 4; approved DESIGN FOUNDATION V0.

**Plans:** 13/13 plans executed

Plans:

**Wave 1**

- [x] 05-01-PLAN.md — Establish the mandatory human supply-chain approval gate.

**Wave 2** _(blocked on Wave 1 completion)_

- [x] 05-02-PLAN.md — Apply the approved dependency transaction and real DOM test environment.

**Wave 3** _(blocked on Wave 2 completion)_

- [x] 05-03-PLAN.md — Implement deterministic semantic tokens and contrast evidence.

**Wave 4** _(blocked on Wave 3 completion)_

- [x] 05-04-PLAN.md — Implement the constrained generic-icon and original football-SVG boundaries.

**Wave 5** _(blocked on Wave 4 completion)_

- [x] 05-05-PLAN.md — Build native-first primitives and migrate the lifecycle shell.

**Wave 6** _(blocked on Wave 5 completion)_

- [x] 05-06-PLAN.md — Complete accessible composite primitives and keyboard/focus behavior.

**Wave 7** _(blocked on Wave 6 completion)_

- [x] 05-07-PLAN.md — Implement and prove the semantic DenseTable foundation.

**Wave 8** _(blocked on Wave 7 completion)_

- [x] 05-08-PLAN.md — Assemble the development-only UI Lab.

**Wave 9** _(blocked on Wave 8 completion)_

- [x] 05-09-PLAN.md — Integrate Playwright, quality, CI, and clean-worktree evidence.

**Wave 10** _(blocked on Wave 9 completion)_

- [x] 05-11-PLAN.md — Close the diagnosed premium icon-foundation gap with enforced grammar and optical evidence.

**Wave 11** _(blocked on Wave 10 completion)_

- [x] 05-10-PLAN.md — Close with evidence-backed human visual and interaction review.

**Wave 12** _(blocked on Wave 11 completion)_

- [x] 05-12-PLAN.md — Repair DenseTable/ScrollArea width ownership and prove finite, reachable geometry in all target viewports.

**Wave 13** _(blocked on Wave 12 completion)_

- [x] 05-13-PLAN.md — Specify and structurally verify the complete cross-phase Table View Engine contract without implementing it.

**Superseded gap plans:** 05-14 through 05-16 are retired. Visual approval moves to a real product surface in Phase 6 instead of another UI Lab review cycle.

**Success criteria:**

- UI Lab exposes tokens, typography, icons, primitive states, dense table examples, and target viewports.
- Generic icon-family choice and football SVG policy are implemented consistently.
- DenseTable remains finite and intentionally scrollable at 1366×768, 1920×1080, and 2560×1080.
- Football icon refinement is evaluated only inside a real product context.
- The complete Table View Engine is specified once for Phase 06.1 implementation and Phase 9 career-data/cache/offline integration, without engine code in Phase 5.
- The foundation remains provisional until Mateus reviews the real first-playable surface.

**Human review result:** The UI Lab was rejected as a proxy for the product experience. Its technical primitives remain available, but the visual direction is not approved and must be proven in Phase 6 through the real application.

## Phase 6: First Playable Matchday

**Status:** Complete — first playable and SM-1 automated stabilization delivered; human product review deferred
**Gate:** First Playable  
**Directory slug:** `06-first-playable-matchday`

**Goal:** As a football manager, I want to complete one matchday, so that I can test Rivallo's core gameplay loop.
**Mode:** mvp

**Requirements:** GAME-01; UI-02 first-playable portion; DATA-03.

**Dependencies:** Phase 5 technical assets. UI Lab visual approval is not a dependency.

**Plans:** 2/2 complete

- [x] 06-01-PLAN.md — Ship the persisted XI → tactics → deterministic match → result loop.
- [x] 06-02-PLAN.md — Stabilize density/disclosure, product tooltips, nationality flags and console regressions without redesigning or advancing SM-2 through SM-6.

The additional 06-02 plan records product-review remediation against baseline `38c2bff`. Automated gates passed on 2026-07-16; Mateus's fullscreen product review remains explicitly deferred and is not represented as visual approval.

**Success criteria:**

- The normal Tauri application opens a real AppShell and matchday workspace rather than the UI Lab.
- A fixed fictional club exposes an adapter-fed squad; the user can select a valid XI, formation, and tactical approach.
- A deterministic Rust domain simulation produces match events and a result from the saved lineup.
- The selected lineup, match result, round, and season record survive a desktop restart.
- The full path is keyboard-operable, tested, buildable from a clean checkout, and visually reviewable at 1366×768 and 1920×1080.

The sports-management evolution is detailed below as a bounded future sequence. The current execution authorization ends with SM-1 / Plan 06-02; Phases 06.1 through 06.5 require fresh explicit authorization before discussion, planning or implementation. Each inserted phase must preserve the executable baseline, use the established adapters and design system, and keep competitive rules in Rust.

### Phase 06.1: SM-2 Table View Engine and Durable Views (INSERTED)

**Status:** Planned
**Directory slug:** `06.1-sm-2-table-view-engine-and-durable-views`

**Goal:** Turn table personalization into one controlled cross-product capability and prove it in Elenco with durable, versioned views instead of screen-specific state.
**Requirements:** SM-02; DATA-01 preference-boundary portion; UI-02 dense-table portion.
**Depends on:** Phase 6 and the canonical Phase 5 Table View Engine contract.
**Plans:** 3/8 plans executed

Plans:
**Wave 1**

- [x] 06.1-01-PLAN.md — Pure controlled Table View Engine and `squad.primary` schema.
- [x] 06.1-02-PLAN.md — Rust application repository port and lifecycle service.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06.1-03-PLAN.md — Durable file repository, migrations, quarantine and crash recovery.

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 06.1-04-PLAN.md — Typed Tauri/client boundary and lossless legacy import.

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 06.1-05-PLAN.md — Controlled React controller and preference-boundary migration.

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 06.1-06-PLAN.md — Complete accessible saved-view lifecycle UI.

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 06.1-07-PLAN.md — Accessible customizer and controlled Elenco table integration.

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 06.1-08-PLAN.md — Browser/restart/responsive evidence and full regression gate.

**Success Criteria**:

1. Elenco declares a stable table ID, schema version, stable column IDs, required columns, supported capabilities and default views without duplicating the canonical contract.
2. Visibility, order, finite width, pinning, density, sorting and supported filters are controlled through engine commands; unsupported controls are not rendered.
3. System, user and read-only view provenance plus create, duplicate, rename, delete, default, reset, save and dirty behavior are complete and keyboard accessible.
4. A repository outside React persists `local-fixed` owner/table/schema/view envelopes across navigation and desktop restart, declares the future identity migration seam, and uses sequential migrations plus quarantine/recovery for the current preference v4, removed/added columns, corrupt payloads and incompatible future schemas.
5. The working squad table, inspector, tactics, XI, match simulation, AppShell, routes, tokens and existing preference migration continue to pass component, browser, Rust and desktop-build regression gates.

### Phase 06.2: SM-3 Free Tactical Field and Unified Bench Interaction (INSERTED)

**Status:** Planned
**Directory slug:** `06.2-sm-3-free-tactical-field-and-unified-bench-interaction`

**Goal:** Evolve the fixed visual slots into a Rust-authoritative normalized tactical layout and one working interaction model for starters and reserves, while preserving presets as useful starting points.
**Requirements:** SM-03; GAME-01 non-regression.
**Depends on:** Phase 06.1.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 06.2 to break down)

**Success Criteria**:

1. The tactic aggregate uses stable player/slot IDs, normalized coordinates, zones, nominal position, role, side and line; custom shapes are not reduced to the nearest preset.
2. Field-to-field, reserve-to-field and field-to-reserve moves/swaps use one typed Rust command path with duplicate, XI-count, goalkeeper-bound, overlap and exclusivity validation.
3. Pointer drag has a stable preview, valid/invalid feedback, snap/revert behavior and no pitch reflow; essential moves also work through keyboard or a contextual menu.
4. Accepted changes persist through restart and migrate the existing saved XI/formation without losing slot identity or ordering; cancelled/rejected moves never mutate persisted state.
5. Domain, component and browser tests prove valid custom formations, starter/reserve exchange, invalid feedback and zero player duplication at target desktop viewports and reduced motion.

### Phase 06.3: SM-4 Tactical Analysis Strategy Instructions Opposition and Familiarity (INSERTED)

**Status:** Planned
**Directory slug:** `06.3-sm-4-tactical-model-familiarity`

**Goal:** Make Analysis, Strategy, Instructions and Opposition progressive views over one persisted tactical model with explicit validation, precedence, familiarity and honest simulation boundaries.
**Requirements:** SM-04; GAME-01 non-regression.
**Depends on:** Phase 06.2.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 06.3 to break down)

**Success Criteria**:

1. Analysis derives lineup, position, sector, corridor, width/depth, condition and bench facts from named Rust rules instead of generic client messages.
2. Strategy persists compatible possession, out-of-possession, transition and match-context choices in the same aggregate, with progressive disclosure and no competing React stores.
3. Collective, unit, role and individual instructions have stable IDs, scope, values, validation, incompatibilities and explicit precedence; conflicts are explained before persistence.
4. Opposition supports typed instructions for the current matchday opponent when real context exists and truthful no-opponent/no-report/partial states otherwise; it does not claim Phase 8 opponent/season breadth or show fabricated scouting/simulator effects.
5. Familiarity is multidimensional, event-driven, deterministic and explainable; saved tactics restore exactly, migrate safely and label any not-yet-consumed simulation effect honestly.

### Phase 06.4: SM-5 Player Coach Profiles and Explainable Ratings (INSERTED)

**Status:** Planned
**Directory slug:** `06.4-sm-5-player-coach-profiles-and-explainable-ratings`

**Goal:** Keep Elenco as the primary workspace while adding an actionable player inspector, stable full player and coach profiles, and deterministic contextual ratings whose origin and uncertainty can be inspected.
**Requirements:** SM-05; UI-02 profile/navigation portion.
**Depends on:** Phase 06.3.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 06.4 to break down)

**Success Criteria**:

1. A single player selection keeps the squad table visible and opens a concise actionable inspector with a clear path to a stable full profile; inspector and page share typed projections rather than business-rule copies.
2. Player and coach profiles expose only fixed-club adapter-fed identity, career, contract, availability, statistics, development and tactical context through hierarchical navigation with truthful partial/unavailable/unknown states and no Phase 9 offline-cache claim.
3. A documented ADR fixes rating scale, composition, context and scouting uncertainty before formulas spread; Rust owns deterministic player, team and coach rating projections and their history.
4. Position, role and tactical system can change a player's contextual evaluation without changing identity, and every visible rating exposes components, provenance, confidence and relevant explanation.
5. No random filler metric is introduced; domain formula tests plus component/browser navigation, keyboard, nationality-fallback and non-regression tests pass.

### Phase 06.5: SM-6 Squad Dynamics Training and Dynamic Potential (INSERTED)

**Status:** Planned
**Directory slug:** `06.5-sm-6-squad-dynamics-training-and-dynamic-potential`

**Goal:** Deliver distinct squad-dynamics and a deterministic training week anchored to the current matchday whose persisted Rust-domain events explain workload, familiarity, development and uncertain dynamic potential without claiming season, travel, cache/offline or multiplayer breadth.
**Requirements:** SM-06; GAME-01 non-regression.
**Depends on:** Phase 06.4.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 06.5 to break down)

**Success Criteria**:

1. Squad Dynamics represents morale, cohesion, hierarchy, groups, promises/conflicts and recent events with clear provenance; it is not mislabeled or reused as Training.
2. Training has its own working navigation and current-matchday week for persisted add, remove, replace, move, copy and template commands across collective, unit/group, recovery and individual plans.
3. Rust validates calendar/match/availability conflicts and owns deterministic workload, eligibility, progression, fatigue/risk and familiarity events; React owns previews and explanations only.
4. Dynamic potential distinguishes base reality, club estimate, range and confidence, records deterministic historical projections and avoids false precision or exact hidden-value leakage.
5. At least one collective session and one individual plan produce real deterministic, explained Rust-domain consequences; options without implemented effects are not exposed as active.
6. Restart, migration, invalid-action and a fixed 52-week determinism test plus component, browser, accessibility and full desktop quality gates pass without regressing the first-playable loop.

## Phase 7: Career Start and Club Selection

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `07-dev-identity-fixtures-minimal-api`

**Objective:** Turn the fixed first-playable club into a selectable fictional career with deterministic identity and shared fixtures.

**Requirements:** DESK-01; DATA-02; DATA-03.

**Dependencies:** Phase 06.5 verification. The fixed-club baseline from Phase 6 remains the migration source.

**Success criteria:**

- Development identity is provided through AuthPort-compatible boundaries.
- Fictional fixtures are shared appropriately by adapters and tests.
- `/health`, `/ready`, `/api/v1/session`, `/api/v1/clubs`, and `/api/v1/me/context` meet their contract.

## Phase 8: Season Calendar and Matchday Depth

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `08-club-selection-local-restore`

**Objective:** Expand the single matchday into a short season calendar with multiple opponents, standings, availability, and richer tactical consequences.

**Requirements:** DESK-02; DESK-03; DATA-01 local-career portion.

**Dependencies:** Phase 7.

**Success criteria:**

- A user can advance through a short fictional season and see standings and availability change.
- Matchday outcomes remain domain-owned and reproducible; React never becomes simulation authority.
- The season consumes the bounded tactic, familiarity, training and availability contracts from Phases 06.2–06.5 without reimplementing their rules.

## Phase 9: Dashboard, Squad, Cache and Offline Hardening

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `09-dashboard-squad-cache-offline-states`

**Objective:** Implement the approved V0.1 dashboard and squad surfaces plus explicit cache/offline states.

**Requirements:** DESK-02; DESK-04; DATA-01 cache/projection portion.

**Dependencies:** Phase 8.

**Success criteria:**

- Dashboard and squad render from adapters/repositories, not component-local mocks.
- The Phase 06.1 Table View Engine is migrated from `local-fixed` ownership to career identity and integrated with actual dashboard/squad data, SQLite/cache/offline boundaries and measured query modes without reimplementing table semantics.
- Each real table selects client virtualization, client pagination, server pagination, or server query from measured data scale and records query/cancellation, cache/offline, drift, migration, and recovery evidence.
- Offline, stale, queued, synchronising, and reconnected states are explicit and usable from cache.

## Phase 10: V0.1 Verification and Release Evidence

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `10-v0-1-verification-release-evidence`

**Objective:** Produce end-to-end, accessibility, visual, migration, contract, and release evidence for V0.1.

**Requirements:** FOUND-02; UI-02; SM-02 through SM-06; all V0.1 requirements not already verified.

**Dependencies:** Phase 9.

**Success criteria:**

- Required frontend, Rust, integration, contract, migration, visual, and desktop-build checks pass.
- SM-02 through SM-06 retain explicit end-to-end, deterministic-domain, migration, accessibility and visual evidence after career/data hardening.
- The V0.1 flow is manually reproducible online/offline with recorded evidence.

## Phase 11: Private League Creation and Invitations

**Status:** Planned — V0.2  
**Gate:** V0.2  
**Directory slug:** `11-private-league-creation-invitations`

**Objective:** Select minimal real authentication and create/join private leagues with unique club selection.

**Requirements:** MULTI-01.

**Dependencies:** Phase 10; approved authentication-provider ADR revision.

**Success criteria:**

- Invited users create or join a private league and cannot select the same club.
- Desktop authentication uses the approved provider and PKCE-capable flow.

## Phase 12: Authoritative Round and Realtime Updates

**Status:** Planned — V0.2  
**Gate:** V0.2  
**Directory slug:** `12-authoritative-round-realtime-updates`

**Objective:** Prove server-authoritative readiness, a fictitious round advance, and state delivery to both clients.

**Requirements:** MULTI-02.

**Dependencies:** Phase 11.

**Success criteria:**

- Server validates readiness and the round transition with audit/version evidence.
- Two desktops receive the resulting league state without client authority.

## Phase 13: Reconnection, Neon Persistence and Two-Desktop Proof

**Status:** Planned — V0.2  
**Gate:** V0.2  
**Directory slug:** `13-reconnection-neon-two-desktop-proof`

**Objective:** Demonstrate reconnection and authoritative hosted persistence in a private two-desktop league.

**Requirements:** MULTI-03.

**Dependencies:** Phase 12; explicit credentials and infrastructure approval.

**Success criteria:**

- League state persists in Neon and reconnects correctly after a client interruption.
- The two-desktop private multiplayer proof is repeatable and documented.

## Approval Record

| Gate   | Status   | Approved by | Result                                                                                               |
| ------ | -------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Gate 0 | APPROVED | Mateus      | Documentation, architecture, product, data, tests, design, and ADRs approved to proceed to scaffold. |
| Gate 1 | Pending  | —           | Requires Phases 2–4 success criteria and explicit approval.                                          |
| Gate 2 | Pending  | —           | Requires Phases 5–6 success criteria and explicit approval.                                          |
| Gate 3 | Pending  | —           | Requires Phases 7–10 success criteria and explicit approval.                                         |
