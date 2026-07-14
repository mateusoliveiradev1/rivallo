---
status: testing
phase: 04-desktop-shell-local-persistence
source: [04-VERIFICATION.md]
started: 2026-07-14T16:53:52.653Z
updated: 2026-07-14T16:53:52.653Z
---

## Current Test

number: 1
name: Desktop lifecycle and ownership flow
expected: |
  Owned and reused startup, bounded retry, owned-only shutdown, and post-Ready
  loss produce the documented typed states without contacting or terminating a
  non-owned process.
awaiting: user response

## Tests

### 1. Desktop lifecycle and ownership flow

expected: Launch the built desktop with no responder, launch another instance against the compatible responder, exercise timeout/retry, stop the owned child, and simulate post-Ready loss. The owner manages only its own child; reused services are never contacted or terminated; failures become typed recoverable states.
result: pending

### 2. Lifecycle shell keyboard and visual check

expected: Initializing, Ready, and failure states are legible; Retry and development diagnostics are keyboard reachable with visible focus; ordinary UI does not expose raw logs; reduced-motion preference is respected.
result: pending

### 3. Docker PostgreSQL runtime

expected: `docker compose up -d postgres` starts one loopback PostgreSQL service that becomes healthy; ordinary `docker compose down` preserves the named volume; restart reuses it; only the separately documented `down --volumes` path is destructive.
result: pending

### 4. Hosted CI run

expected: After pushing or opening a pull request, `javascript-typescript`, `rust-contracts`, and `desktop-linux` pass independently on Linux and publish no installers, screenshots, or application artifacts.
result: pending

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

None recorded yet.
