# Phase 4 Validation Matrix

**Nyquist status:** enabled. Every planned task has an automated proof below; environment-dependent Docker and hosted CI checks supplement rather than replace the static tests.

| Plan / task | Automated verification | Manual / environment verification | Requirement |
|---|---|---|---|
| 04-01 package approval | Review artifact gate defined in 04-01 | Confirm explicit approval records every exact SUS package before any install | FOUND-01 |
| 04-02 runtime protocol and shutdown control | `pnpm test -- tooling-tests/phase-4-runtime.test.mjs && pnpm rust:test && pnpm rust:clippy && pnpm rust:architecture` | Start the sidecar, send its private stdin shutdown control, and observe graceful cancellation after loopback health/ready | FOUND-01 |
| 04-03 workspace | `pnpm install --frozen-lockfile && pnpm --filter @rivallo/desktop typecheck && pnpm format:check && pnpm lint` | Inspect package approval provenance | FOUND-01 |
| 04-03 Tauri packaging | `pnpm exec tauri build --config apps/desktop/src-tauri/tauri.conf.json --bundles none` | Confirm named sidecar is included by configuration | FOUND-01 |
| 04-04 lifecycle host | `pnpm test -- tooling-tests/phase-4-desktop.test.mjs && pnpm rust:architecture` | Exercise compatible reuse, conflict, timeout/retry, owned shutdown, and post-Ready owned-child/readiness loss recovery | FOUND-01 |
| 04-04 lifecycle shell | `pnpm test -- tooling-tests/phase-4-desktop.test.mjs && pnpm typecheck && pnpm check && git diff --check` | Keyboard-check states and development-only diagnostic disclosure | FOUND-01 |
| 04-05 persistence port | `pnpm rust:test && pnpm rust:clippy && pnpm rust:architecture` | Inspect that no database/file side effect exists | FOUND-01 |
| 04-05 platform adapter | `pnpm test -- tooling-tests/phase-4-persistence.test.mjs && pnpm rust:test && pnpm rust:architecture && pnpm check` | Confirm resolver is per-user abstraction only | FOUND-01 |
| 04-06 Compose | `pnpm test -- tooling-tests/phase-4-infrastructure.test.mjs && docker compose -f docker-compose.yml config` | With Docker available: start, healthcheck, ordinary stop, then inspect preserved volume | FOUND-01 |
| 04-06 CI | `pnpm test -- tooling-tests/phase-4-infrastructure.test.mjs && pnpm check && git diff --check` | Require green PR/primary-branch run of all three jobs | FOUND-01, FOUND-02 |

## Phase gate

Run `pnpm check` after each merged wave. Before Gate 1 verification, run all focused suites above, validate Compose health where Docker is installed, and collect a green GitHub Actions run for the Linux desktop-build job.
