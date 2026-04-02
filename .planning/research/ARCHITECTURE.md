# Research: Architecture for v0.3.0 flitter-cli

**Date:** 2026-04-03
**Milestone:** v0.3.0 — flitter-cli

## Architectural Direction

The reverse-engineering notes show that the UI architecture already maps well to `flitter-core`: immutable widgets, grouped turns, sticky sections, and a central application state that drives frame updates. The architectural pivot is therefore not a rendering rewrite. It is a runtime rewrite.

## Major Components

### 1. Native CLI Runtime
- Entry point and argument parsing
- Startup and shutdown orchestration
- Working directory and config resolution
- Session bootstrap and resume routing

### 2. Domain State Layer
- Conversation/turn state owned by `flitter-cli`
- Tool execution events and status tracking
- Session metadata, history, prompts, overlays, and runtime status

### 3. TUI Composition Layer
- Reuse proven widgets from `flitter-amp` where the behavior still fits
- Rebind them to native runtime events instead of ACP callbacks
- Keep `flitter-core` as the rendering contract

### 4. Migration and Cleanup Layer
- Inventory which `flitter-amp` modules migrate unchanged, which are adapted, and which are dropped
- Ensure the final package topology points development and users at `flitter-cli`

## Suggested Build Order

1. Scaffold `flitter-cli` package and runtime shell
2. Define native domain state and session lifecycle
3. Port conversation/tool/status surfaces onto the new runtime
4. Implement persistence, history, and CLI workflows
5. Remove or retire `flitter-amp` from the product path

## New vs Modified

- **New**: package boundary, runtime bootstrap, native session model, migration plan
- **Modified**: widget bindings, state wiring, config/persistence namespace, scripts/docs
- **Reused**: `flitter-core`, selected `flitter-amp` widgets, testing harness patterns
