---
phase: 04-desktop-shell-local-persistence
verified: 2026-07-14T16:52:12Z
status: human_needed
score: 14/19 must-haves verified
behavior_unverified: 5
overrides_applied: 0
deferred:
  - truth: "FOUND-02's full visual, end-to-end, accessibility, migration, and release CI evidence"
    addressed_in: "Phase 10"
    evidence: "Phase 10 success criteria require frontend, Rust, integration, contract, migration, visual, and desktop-build checks; Phases 5-6 first establish the UI Lab and visual QA inputs."
behavior_unverified_items:
  - truth: "The Tauri host manages only children it created and reuses only an exactly compatible service."
    test: "Launch once with no responder, then launch a second desktop against the compatible responder and exit both in turn."
    expected: "The first host owns its child; the second reports reused; exiting the second never contacts or terminates the first host's service."
    why_human: "Source wiring is ownership-safe, but the Rust test named shutdown_contacts_only_the_owned_child contains no real CommandChild and does not exercise the process-ordering invariant."
  - truth: "The desktop waits for readiness for a bounded interval and timeout/failure remains recoverable through retry."
    test: "Exercise delayed readiness, timeout, conflict, and retry in the built Tauri application."
    expected: "Initializing is bounded, each failure becomes typed recoverable UI, and retry probes again before spawning."
    why_human: "The existing retry test checks only decide_initial_probe; it does not drive LifecycleManager::begin through timeout and retry with a real sidecar."
  - truth: "After Ready, an owned child exit or readiness loss becomes a typed recoverable lifecycle status."
    test: "After owned Ready, interrupt the child and separately make readiness incompatible/unavailable."
    expected: "The shell leaves Ready and reports owned_child_exited or owned_readiness_lost without contacting a reused responder."
    why_human: "The current tests call mark_failure directly; they do not exercise the event receiver or readiness-monitor transition."
  - truth: "Docker PostgreSQL starts healthy without Neon and ordinary shutdown preserves the named volume."
    test: "Run docker compose up -d postgres, wait for healthy, run docker compose down, start again, inspect the volume, then separately review the destructive command."
    expected: "Only postgres starts on loopback, pg_isready becomes healthy, the named volume survives ordinary down, and only down --volumes deletes it."
    why_human: "Docker is not installed on this verification host; static YAML parsing cannot prove engine/image/volume runtime behavior."
  - truth: "Hosted GitHub Actions runs the three scoped minimum jobs successfully."
    test: "Push the workflow to the default branch or open a PR and inspect one complete CI run."
    expected: "javascript-typescript, rust-contracts, and desktop-linux are green independently and publish no artifacts."
    why_human: "GitHub returned 404 for ci.yml because the workflow is not present on the remote default branch, so hosted execution is unavailable."
human_verification:
  - test: "Desktop lifecycle and ownership flow"
    expected: "Owned/reused startup, bounded retry, owned-only shutdown, and post-Ready loss all produce the documented typed states."
    why_human: "Five local source/unit seams pass, but the real Tauri-to-sidecar process ordering is not covered end to end."
  - test: "Lifecycle shell keyboard and visual check"
    expected: "Initializing, Ready, and failure states are legible; Retry and development diagnostics are keyboard reachable with visible focus; reduced motion is respected."
    why_human: "Production build and semantic source checks cannot establish rendered desktop appearance or interaction feel."
  - test: "Docker PostgreSQL runtime"
    expected: "The single loopback PostgreSQL service becomes healthy and its named volume survives ordinary shutdown."
    why_human: "Docker/Compose is absent on this host."
  - test: "Hosted CI run"
    expected: "All three Linux jobs run and pass on push/PR with no artifact publication."
    why_human: "The local workflow is not yet available on GitHub's default branch."
---

# Phase 4: Desktop Shell, Local Persistence Boundary, Containers and CI Skeleton Verification Report

**Phase Goal:** Produce the minimal executable desktop/API shell, local persistence boundary, Docker PostgreSQL, and CI skeleton.
**Verified:** 2026-07-14T16:52:12Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Every reviewed SUS desktop npm package was approved before installation. | VERIFIED | `04-01-PACKAGE-REVIEW.md` records Mateus's exact four-version approval; manifests use those exact pins. |
| 2 | The Vite/React/Tauri desktop workspace is reproducible and builds with a named sidecar. | VERIFIED | Independent `pnpm desktop:build` produced the Vite assets and `target/release/rivallo-desktop.exe`; `build-desktop.mjs` derives the host triple and uses `--no-bundle`. |
| 3 | The local Axum binary starts on fixed loopback and serves distinct health/readiness responses. | VERIFIED | Named Rust router and binary-runtime tests passed; `/health`, `/ready`, fixed `127.0.0.1:47831`, and only two routes are implemented. |
| 4 | Malformed, unhealthy, extra-field, or incompatible readiness cannot be reused. | VERIFIED | Strict three-field validator plus named Rust readiness test passed. |
| 5 | Only the private stdin shutdown message drives the graceful server cancellation token. | VERIFIED | Named shared-token and binary-runtime Rust tests passed; `/shutdown` is proven absent. |
| 6 | The host manages only owned children and compatible reuse. | PRESENT_BEHAVIOR_UNVERIFIED | Spawned handles are the only handles stored and reused responders have none, but no test exercises real CommandChild ownership ordering. |
| 7 | Bounded readiness timeout/failure is recoverable through retry. | PRESENT_BEHAVIOR_UNVERIFIED | Five-second constants, typed states, retry command, and wiring exist; the test checks only the initial decision helper. |
| 8 | Post-Ready owned child/readiness loss becomes recoverable status. | PRESENT_BEHAVIOR_UNVERIFIED | Event receiver and monitor are wired, but tests directly inject failure instead of driving those transitions. |
| 9 | The shell presents initializing, ready, and recoverable failure without ordinary raw logs. | VERIFIED | `App.tsx` renders typed live regions/alert/retry; diagnostics are guarded by `import.meta.env.DEV`; production build passed. |
| 10 | Application owns the persistence port and stable Unavailable/InvalidData taxonomy. | VERIFIED | `crates/application/src/persistence.rs` is substantive; architecture and Rust tests passed; no storage-engine dependency exists. |
| 11 | Platform resolves only an injected absolute per-user location, with no repository path or file creation. | VERIFIED | `SqlitePersistenceAdapter` stores an injected resolver, construction is inert, and missing/relative location tests passed. |
| 12 | The SQLite boundary creates no connection, schema, migration, seed, or product persistence. | VERIFIED | Independent source/manifests scan plus focused persistence test and architecture gate passed. |
| 13 | Compose uses a named volume and documents destructive removal separately. | VERIFIED | YAML parses to one service/one named volume; docs separate `down` from `down --volumes`; static infrastructure test passed. |
| 14 | Compose defaults are non-secret, overrideable, and no `.env` is committed. | VERIFIED | Variable expansion is present for DB/user/password/port; `git ls-files .env .env.*` returned empty. |
| 15 | Compose defines only loopback PostgreSQL plus healthcheck, without Neon/init/schema behavior. | VERIFIED | Independent YAML/source inspection and static test passed. |
| 16 | Docker PostgreSQL starts healthy without Neon and preserves data across ordinary stop. | PRESENT_BEHAVIOR_UNVERIFIED | Configuration is present and valid YAML, but Docker is unavailable. |
| 17 | CI defines separate JavaScript/TypeScript, Rust/contracts, and desktop-build jobs over real checks. | VERIFIED | Exactly three `ubuntu-latest` jobs call frozen install and the intended atomic commands. |
| 18 | Desktop CI is Linux-only, performs no packaging matrix, and CI publishes no artifacts. | VERIFIED | Workflow has no matrix, Windows/macOS runner, upload/download artifact, publish, release, deploy, or bundle step. |
| 19 | Hosted CI runs its scoped minimum jobs successfully. | PRESENT_BEHAVIOR_UNVERIFIED | Static workflow and equivalent local gates pass, but GitHub reports the workflow absent from the default branch. |

**Score:** 14/19 truths verified (5 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `crates/platform/src/runtime.rs` | Loopback service/readiness/shutdown protocol | VERIFIED | Substantive, tested, and exported to both sidecar and host consumers. |
| `crates/platform/src/bin/local_api.rs` | Runnable sidecar | VERIFIED | Calls shared runtime/control reader; named binary-path test passes. |
| `apps/desktop/src-tauri/src/main.rs` | Ownership-aware lifecycle host | VERIFIED (present/wired) | Substantive native manager; real-process transitions remain human-needed. |
| `apps/desktop/src/App.tsx` | Accessible lifecycle shell | VERIFIED (present/wired) | Polls typed native status and invokes argument-free retry. |
| `crates/application/src/persistence.rs` | Application port/errors | VERIFIED | Exported from application and implemented by platform. |
| `crates/platform/src/persistence/sqlite.rs` | Inert adapter/resolver boundary | VERIFIED | No driver or filesystem side effect. |
| `docker-compose.yml` | Local PostgreSQL boundary | VERIFIED (static) | Parses as one service plus one named volume; runtime human-needed. |
| `.github/workflows/ci.yml` | Three scoped CI jobs | VERIFIED (static) | No artifact step; hosted run human-needed. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `local_api.rs` | platform runtime | Rust public exports | WIRED | Calls `run_local_api` and `read_shutdown_control` with one token. |
| Tauri host | platform runtime | `rivallo-platform` Cargo dependency | WIRED | Imports fixed address/timeouts, validator, and shutdown message. |
| React shell | Tauri host | typed `invoke` commands | WIRED | Only `lifecycle_status` and argument-free `retry_lifecycle` are exposed. |
| SQLite adapter | application port | Rust trait implementation | WIRED | Implements `LocalPersistencePort` and returns only application errors. |
| CI workflow | root scripts | explicit `pnpm` commands | WIRED | Every referenced root script exists; no writer command is used. |
| local-development docs | Compose | documented lifecycle | WIRED | Start/health/preserving stop/destructive stop map to the file's service. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full local quality gate | `pnpm check` | 44 Vitest tests plus formatting, lint, typecheck, Rust fmt/Clippy/tests/architecture and both drift checks passed | PASS |
| Tauri integration build | `pnpm desktop:build` | Vite production build and optimized Windows Tauri executable succeeded | PASS |
| Local API route behavior | named `router_serves_only_liveness_and_compatibility_readiness` Rust test | 1 passed | PASS |
| Private graceful shutdown | named shared-token and binary-runtime Rust tests | 2 passed | PASS |
| Ownership decision seams | named retry and reused-shutdown Rust tests | 2 passed, but they do not exercise a real child | PARTIAL / HUMAN |
| Compose static parse | Python `yaml.safe_load` plus infrastructure test | one `postgres` service and one `rivallo-postgres-data` volume | PASS (static) |
| Compose runtime | `docker version`; `docker compose ... config` | executable not found | HUMAN |
| Hosted Actions | `gh run list --workflow ci.yml` | HTTP 404: workflow absent from default branch | HUMAN |

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
| --- | --- | --- | --- |
| FOUND-01 | 04-01 through 04-06 | SATISFIED WITH HUMAN RUNTIME CHECKS | Workspace, Tauri/Axum build, persistence boundary, Compose skeleton, docs, and local gates exist; Docker and full lifecycle flow remain human-needed. |
| FOUND-02 | 04-06 | PHASE-4 SKELETON SATISFIED; FULL REQUIREMENT DEFERRED | Three scoped CI jobs and no-artifact rules are static-verified. Hosted green evidence is human-needed; full visual/end-to-end release evidence is explicitly Phase 10. |

### Architecture and Contract Drift

- `pnpm rust:architecture` passed inside `pnpm check`; domain remains dependency-free and application depends only on domain.
- Axum/Tokio/Tauri/SQLite knowledge remains outside domain/application as required; the SQLite driver is absent entirely.
- Both OpenAPI and generated-client drift checks passed and the worktree remained unchanged.
- The desktop package declares `@rivallo/contracts-client` as its only TypeScript transport-contract dependency; Phase 4 adds no duplicate transport types or product rules.

### Anti-Patterns and Disconfirmation

No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, placeholder, or not-implemented marker was found in the inspected Phase 4 source/tests/scripts. No prohibited Impeccable shell pattern (oversized radii, nested cards, decorative glass/gradient text, wide border-plus-shadow, uncontrolled motion) was found. The UI uses visible focus, semantic live states, restrained radii, and reduced-motion handling.

Disconfirmation found three important limits: lifecycle tests with strong names inject state rather than exercising the real monitor; static Compose tests cannot prove engine/volume behavior; and a local CI file cannot prove hosted execution. These are preserved as human verification rather than silently passed.

### Human Verification Required

1. **Desktop lifecycle and ownership:** exercise owned/reused launch, conflict/timeout/retry, owned shutdown, and post-Ready loss. Expected: typed safe transitions and no contact with non-owned processes.
2. **Desktop shell:** keyboard/visual/reduced-motion check of all three states. Expected: legible AA-oriented rendering and visible focus without ordinary raw diagnostics.
3. **Docker PostgreSQL:** start, healthcheck, ordinary stop/restart, and volume inspection. Expected: healthy single loopback service and preserved named volume.
4. **Hosted CI:** push/open PR and inspect one run. Expected: all three jobs green independently with no artifacts.

### Gaps Summary

No observable implementation gap was found. The phase remains `human_needed` because five runtime/external truths are present and wired but not behaviorally proven on this host. Full FOUND-02 visual/end-to-end release evidence is not a Phase 4 blocker because the roadmap explicitly assigns it to Phases 5-6 and 10.

---

_Verified: 2026-07-14T16:52:12Z_
_Verifier: generic-agent workaround acting as gsd-verifier_
