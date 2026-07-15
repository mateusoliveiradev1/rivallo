---
phase: 06
title: First Playable Matchday
mode: mvp
status: locked
---

# Phase 6 Context

## Phase Goal

**As a** football manager, **I want to** complete one matchday, **so that** I can test Rivallo's core gameplay loop.

## Locked Decisions

- The first visible deliverable is a real normal-app surface, never another UI Lab specimen.
- Start with one fixed fictional club so club selection cannot delay gameplay.
- The first loop is squad and XI selection → formation and approach → deterministic match → events and result → persisted state.
- Rust owns lineup validation and simulation. React renders state and requests commands.
- Product visuals remain provisional and improve from Mateus's feedback on the real surface.
- No new registry dependency is required for the first playable.

## Scope Fence

Out of scope: multiplayer, authentication provider selection, transfer market, training, scouting, finance, academy, injuries, advanced opponent AI, live animated pitch, commentary generation, full season simulation, and final brand approval.

## Acceptance Evidence

- Normal Tauri route displays the matchday workspace.
- Eighteen fictional players are adapter-fed; exactly eleven form a valid XI.
- A saved formation and tactical approach affect a repeatable Rust simulation.
- Events, score, points, and record render after simulation.
- State reloads from the desktop application data directory.
- Rust tests, component tests, typecheck, lint, architecture checks, and desktop build pass.
