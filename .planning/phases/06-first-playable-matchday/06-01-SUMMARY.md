---
phase: 06-first-playable-matchday
plan: '01'
subsystem: first-playable
tags: [matchday, tactics, deterministic-simulation, tauri, persistence, product-ui]

requires:
  - phase: 05
    provides: Semantic tokens, icons, accessible primitives, and desktop shell
provides:
  - Real default Tauri matchday workspace for Aurora Futebol Clube
  - Validated XI, formation, and tactical approach selection
  - Deterministic Rust match simulation with events, result, record, and round progression
  - Restart-safe local first-playable state under the Tauri application-data directory
  - Component and three-viewport browser regression coverage for the playable path
affects: [phase-7-career-start, phase-8-season-depth, gameplay, desktop-ui]

tech-stack:
  added: [serde]
  patterns:
    - Domain owns lineup validation, simulation, and progression
    - Application owns use cases through a repository port
    - Platform owns JSON persistence and Tauri coordination
    - React renders adapter-fed state and sends typed manager intent

key-files:
  created:
    - crates/domain/src/matchday.rs
    - crates/application/src/matchday.rs
    - crates/platform/src/matchday.rs
    - apps/desktop/src/matchday/MatchdayScreen.tsx
    - apps/desktop/src/matchday/matchday.css
    - browser-tests/matchday.spec.ts
  modified:
    - apps/desktop/src-tauri/src/main.rs
    - apps/desktop/src/App.tsx
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - 'Open the real matchday after lifecycle readiness and retain the UI Lab only at the development-only route.'
  - 'Use one fixed fictional club and opponent to validate the manager loop before expanding career breadth.'
  - 'Persist the complete first-playable state through a file repository while retaining the application repository boundary.'
  - 'Use a native dialog for the result so Escape, focus containment, and focus return are browser-owned.'

requirements-completed: [GAME-01]

duration: 35 min
completed: 2026-07-15
status: complete
---

# Phase 6 Plan 01: First Playable Matchday Summary

**Rivallo now opens as an actual football-management game surface: choose the XI, formation and approach, play a deterministic match, inspect the event feed, and resume the saved round.**

## Accomplishments

- Added an 18-player fictional Aurora squad with exact-XI and single-goalkeeper validation.
- Added three formations and three tactical approaches that affect a deterministic Rust simulation.
- Added match events, score, possession, shots, season record, points, and next-round progression.
- Added a repository-backed application service and local JSON adapter under Tauri's application-data directory.
- Added real Tauri commands for load, save lineup, and play next match.
- Replaced the ready placeholder with a restrained dark command-centre workspace, tactical pitch, dense squad table, strategy controls, and native result dialog.
- Added responsive formation layouts, keyboard-native controls, Escape/focus restoration, and three-viewport browser evidence.
- Added the real matchday browser path to local quality and CI instead of validating only the UI Lab.

## Task Commits

1. **Tasks 1–5: Ship the end-to-end first playable** — `b4c117a` (feature)
2. **Quality hardening: Gate the real browser flow in the aggregate and CI** — `0fd3f5c` (test)

## Verification

- `pnpm quality` — PASS: 182 Vitest tests and 25 executed Playwright checks passed; 2 intentional production-route skips.
- `cargo test` — PASS: 22 Rust tests passed.
- `pnpm desktop:build` — PASS: release executable built at `target/release/rivallo-desktop.exe`.
- Visual inspection — PASS at 1366×768 and 1920×1080; the compact strategy layout was corrected before close-out.
- `git diff --check` — PASS.

## Deviations from Plan

- **[Rule 2 - Missing critical quality] Real product browser coverage was absent from the aggregate.** Added `browser:test`, normal-route matchday evidence, modal focus-return checks, and CI wiring.
- **[Rule 1 - Bug] Historical scope/roadmap tests encoded the superseded infrastructure-only phase assumptions.** Updated them to preserve architecture and Phase 5 evidence while allowing the approved Phase 6 product domain.

**Total deviations:** 2 auto-fixed. **Impact:** both changes strengthen the playable slice without expanding its product scope.

## Honest Boundaries

- One fixed club, one fixed opponent, and one match at a time.
- The engine is intentionally small and deterministic; there is no live match clock, substitutions, injuries, training, transfers, standings, or full season yet.
- Persistence is local JSON for this slice; the later career persistence model and SQLite migration remain future work.
- This is the first permanent product surface, not a claim that the final visual language or full game is complete.

## Self-Check: PASSED

- Production commits exist and all declared key files are present.
- GAME-01 is executable through the normal Tauri route.
- Quality, Rust, browser, desktop build, formatting, lint, typecheck, and architecture checks pass.

---

_Phase: 06-first-playable-matchday_  
_Completed: 2026-07-15_
