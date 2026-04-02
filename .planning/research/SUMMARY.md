# Research Summary: v0.3.0 flitter-cli

**Date:** 2026-04-03
**Milestone:** v0.3.0 — flitter-cli

## Stack Additions

- New `packages/flitter-cli` application package
- Native CLI runtime and session model owned by `flitter-cli`
- `flitter-cli` persistence/config namespace replacing `flitter-amp`

## Feature Table Stakes

- Native runtime bootstrap and command flow
- Amp-like conversation, tool, status, and streaming behavior
- Session persistence, history, and resume/export workflows
- Explicit migration away from `flitter-amp` and coco/ACP bridge assumptions

## Watch Out For

- A rename-only migration that keeps ACP assumptions intact
- UI-parity-only implementation without runtime parity
- Leaving both `flitter-amp` and `flitter-cli` active and conflicting
- Broad cleanup in a dirty worktree that damages unrelated work
