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

**Status:** In Progress  
**Gate:** 2  
**Directory slug:** `05-design-tokens-icon-policy-and-ui-primitives`

**Objective:** Implement the approved token source, icon policy, accessible primitives, and UI Lab foundation.

**Requirements:** UI-01.

**Dependencies:** Phase 4; approved DESIGN FOUNDATION V0.

**Plans:** 12/16 plans executed

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

- [ ] 05-13-PLAN.md — Specify and structurally verify the complete cross-phase Table View Engine contract without implementing it.

**Wave 14** _(blocked on Wave 13 completion)_

- [ ] 05-14-PLAN.md — Refine 16px ball/goal optics and prove bounded Lucide-versus-Rivallo contextual use.

**Wave 15** _(blocked on Wave 14 completion)_

- [ ] 05-15-PLAN.md — Assemble fresh automated evidence and a pending, scope-bounded human review package.

**Wave 16** _(blocked on Wave 15 completion)_

- [ ] 05-16-PLAN.md — Obtain Mateus's explicit terminal decision on the corrected DESIGN FOUNDATION V0.

**Success criteria:**

- UI Lab exposes tokens, typography, icons, primitive states, dense table examples, and target viewports.
- Generic icon-family choice and football SVG policy are implemented consistently.
- DenseTable remains finite and intentionally scrollable at 1366×768, 1920×1080, and 2560×1080.
- Ball and physical goal-frame are clear at 16px in bounded product-context specimens.
- The complete Table View Engine is specified once for Phase 6 screen contracts and Phase 9 implementation, without engine code in Phase 5.
- Mateus records an explicit APPROVED or REJECTED terminal review after inspecting the corrected browser surface.

**Human review result:** REJECTED by Mateus. Phase 5 remains In Progress until the diagnosed DenseTable width/overflow and contextual 16px icon gaps are corrected and reviewed again. The complete Table View Engine must be specified across the responsible phases; Gate 2 remains pending.

## Phase 6: Approved V0.1 Screen Contracts and Visual QA

**Status:** Planned  
**Gate:** 2  
**Directory slug:** `06-v0-1-screen-contracts-visual-qa`

**Objective:** Shape and validate bootstrap, club-selection, dashboard, and squad screen contracts before their implementation.

**Requirements:** UI-02 design-contract portion.

**Dependencies:** Phase 5; human approval of each screen brief.

**Success criteria:**

- Every listed screen has an approved brief with state, keyboard, data, offline, and viewport criteria.
- Visual, contrast, reduced-motion, and accessibility QA evidence meets Gate 2 requirements.

## Phase 7: Dev Identity, Fixtures and Minimal API

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `07-dev-identity-fixtures-minimal-api`

**Objective:** Provide deterministic identity, fictional fixtures, and the minimal health/session/clubs/context API.

**Requirements:** DESK-01; DATA-02; DATA-03.

**Dependencies:** Phase 6.

**Success criteria:**

- Development identity is provided through AuthPort-compatible boundaries.
- Fictional fixtures are shared appropriately by adapters and tests.
- `/health`, `/ready`, `/api/v1/session`, `/api/v1/clubs`, and `/api/v1/me/context` meet their contract.

## Phase 8: Club Selection and Local Restore

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `08-club-selection-local-restore`

**Objective:** Implement fictional club selection and SQLite-backed restoration through application ports.

**Requirements:** DESK-02; DESK-03; DATA-01 local-career portion.

**Dependencies:** Phase 7.

**Success criteria:**

- A user can select one fictional club and restore that selection after restart.
- UI does not directly access SQLite; fixtures are not embedded in React components.

## Phase 9: Dashboard, Squad, Cache and Offline States

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `09-dashboard-squad-cache-offline-states`

**Objective:** Implement the approved V0.1 dashboard and squad surfaces plus explicit cache/offline states.

**Requirements:** DESK-02; DESK-04; DATA-01 cache/projection portion.

**Dependencies:** Phase 8.

**Success criteria:**

- Dashboard and squad render from adapters/repositories, not component-local mocks.
- Offline, stale, queued, synchronising, and reconnected states are explicit and usable from cache.

## Phase 10: V0.1 Verification and Release Evidence

**Status:** Planned  
**Gate:** 3  
**Directory slug:** `10-v0-1-verification-release-evidence`

**Objective:** Produce end-to-end, accessibility, visual, migration, contract, and release evidence for V0.1.

**Requirements:** FOUND-02; UI-02; all V0.1 requirements not already verified.

**Dependencies:** Phase 9.

**Success criteria:**

- Required frontend, Rust, integration, contract, migration, visual, and desktop-build checks pass.
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
