---
status: partial
phase: 04-desktop-shell-local-persistence
source: [04-VERIFICATION.md]
started: 2026-07-14T16:53:52.653Z
updated: 2026-07-15T00:08:59.091Z
---

## Current Test

[testing paused — 2 items blocked by the current environment]

## Tests

### 1. Desktop lifecycle and ownership flow

expected: Launch the built desktop with no responder, launch another instance against the compatible responder, exercise timeout/retry, stop the owned child, and simulate post-Ready loss. The owner manages only its own child; reused services are never contacted or terminated; failures become typed recoverable states.
result: pass

### 2. Lifecycle shell keyboard and visual check

expected: Initializing, Ready, and failure states are legible; Retry and development diagnostics are keyboard reachable with visible focus; ordinary UI does not expose raw logs; reduced-motion preference is respected.
result: pass

### 3. Docker PostgreSQL runtime

expected: `docker compose up -d postgres` starts one loopback PostgreSQL service that becomes healthy; ordinary `docker compose down` preserves the named volume; restart reuses it; only the separately documented `down --volumes` path is destructive.
result: blocked
blocked_by: third-party
reason: Docker Compose is not installed on the current verification host.

### 4. Hosted CI run

expected: After pushing or opening a pull request, `javascript-typescript`, `rust-contracts`, and `desktop-linux` pass independently on Linux and publish no installers, screenshots, or application artifacts.
result: blocked
blocked_by: third-party
reason: The workflow has not been pushed to GitHub, so no hosted Actions run exists yet.

## Summary

total: 4
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 2

## Gaps

None recorded yet.
