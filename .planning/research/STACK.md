# Research: Stack for v0.3.0 flitter-cli

**Date:** 2026-04-03
**Milestone:** v0.3.0 — flitter-cli

## Existing Stack We Keep

- `packages/flitter-core` as the only rendering and input framework
- Bun and TypeScript as the runtime and implementation language
- pnpm monorepo structure for package isolation and shared development

## Required Stack Direction

- New package: `packages/flitter-cli`
- Native CLI runtime inside `flitter-cli` for command parsing, session bootstrap, state transitions, and tool orchestration
- Migration layer to port reusable UI/state pieces from `flitter-amp` without keeping ACP as the architectural center
- Local persistence for sessions, history, and runtime metadata under the new package namespace

## What Not To Add

- No coco-dependent bridge layer as a core runtime dependency
- No second rendering abstraction outside `flitter-core`
- No plugin system or extra transport protocol before baseline parity is complete

## Integration Notes

- `flitter-core` already covers layout, painting, scrolling, dialogs, markdown, sticky sections, and diagnostics
- `flitter-amp` widgets can be mined selectively, but package boundaries and state flow must be re-authored around native CLI concepts
- Package scripts, config files, and data directories should move from `flitter-amp` naming to `flitter-cli`

## Recommendation

Treat `flitter-cli` as a new application package with deliberate ports from `flitter-amp`, not as a rename-only exercise.
