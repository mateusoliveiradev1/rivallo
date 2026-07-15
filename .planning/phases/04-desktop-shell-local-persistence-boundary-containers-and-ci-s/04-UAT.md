---
status: partial
phase: 04-desktop-shell-local-persistence
source: [04-VERIFICATION.md]
started: 2026-07-14T16:53:52.653Z
updated: 2026-07-15T01:31:02.000Z
---

## Current Test

[testing paused — the host WSL 2 layer cannot create any Linux distribution]

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
blocked_by: environment
reason: Docker Desktop 4.82.0 and Compose are installed, and WSL, Virtual Machine Platform, Hyper-V, Windows Hypervisor Platform, and `hypervisorlaunchtype=auto` are enabled. After reboots and `wsl --install --no-distribution`, Docker's `docker-desktop` import and a direct `wsl --install --distribution Ubuntu --no-launch` both fail with `Wsl/.../CreateVm/HCS/HCS_E_HYPERV_NOT_INSTALLED`. The Windows host must restore a supported, functioning WSL 2/HCS virtualization layer before this runtime check can proceed.

### 4. Hosted CI run

expected: After pushing or opening a pull request, `javascript-typescript`, `rust-contracts`, and `desktop-linux` pass independently on Linux and publish no installers, screenshots, or application artifacts.
result: pass
evidence: GitHub Actions run https://github.com/mateusoliveiradev1/rivallo/actions/runs/29380208069 completed successfully for commit `b0cf7c6`; `javascript-typescript`, `rust-contracts`, and `desktop-linux` all passed independently, and the workflow contains no artifact publishing step.

## Summary

total: 4
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

None recorded yet.
