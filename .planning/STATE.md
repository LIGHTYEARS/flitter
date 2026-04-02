---
gsd_state_version: 1.0
milestone: v0.3.0
milestone_name: — flitter-cli Full Parity
status: executing
last_updated: "2026-04-03T18:45:00Z"
last_activity: 2026-04-03 -- Phase 13 complete (all 3 plans done)
progress:
  total_phases: 11
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 36
---

# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Phase 13 — session-lifecycle-and-app-state (COMPLETE)

## Current Milestone

**v0.3.0** — flitter-cli Full Parity

## Current Position

Phase: 13 (session-lifecycle-and-app-state) — COMPLETE
Plan: 3 of 3 (all complete)
Status: Phase 13 complete, all 3 plans done
Last activity: 2026-04-03 -- Phase 13 Plan 03 complete (lifecycle integration tests)

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1-6 | v0.1.0 Visual Prototype | Complete | — |
| 7 | Protocol Correctness | Complete | 07-PLAN-01 |
| 8 | Scroll Infrastructure | Complete | 08-PLAN-01 |
| 9 | Streaming Experience | Complete | 09-PLAN-01 |
| 10 | Tool Compatibility | Complete | 10-PLAN-01 |
| 11 | UX Polish | Complete | 11-PLAN-01 |
| 12 | Native Bootstrap and Runtime Shell | Complete | 12-PLAN-01 |
| 13 | Session Lifecycle and App State | Complete | 13-01/02/03 done |

Progress: ███▓░░░░░░ 36% (4/11 plans)

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete
- 2026-03-28: v0.2.0 milestone complete
- 2026-04-03: Product direction reset from `flitter-amp` ACP client to native `flitter-cli`
- 2026-04-03: Phase 12 complete — `packages/flitter-cli` scaffold, config namespace, logger, and bootstrap shell
- 2026-04-03: Phase 13 Plan 01 complete — native type system, session state machine, provider interface, Anthropic SSE
- 2026-04-03: Phase 13 Plan 02 complete — PromptController, AppState composition, CLI entry wiring with provider init
- 2026-04-03: Phase 13 Plan 03 complete — 64 tests locking lifecycle contract (36 AppState unit + 28 integration)
- 2026-04-03: Phase 13 complete — 115 total tests across flitter-cli test suite

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-03 | `flitter-amp` no longer defines the target product | ACP bridge and coco dependency are not acceptable long-term architecture |
| 2026-04-03 | Build `flitter-cli` as a new subpackage | Native CLI boundary is cleaner than mutating the legacy package in place |
| 2026-04-03 | Self-contained type system with zero flitter-amp/ACP imports | Clean package boundary for flitter-cli |
| 2026-04-03 | Provider uses AsyncIterable<StreamEvent> for streaming | Composable with for-await-of, no callback coupling |
| 2026-04-03 | AnthropicProvider uses native fetch, no HTTP library | Bun provides fetch; minimizes dependencies |
| 2026-04-03 | PromptController uses _isSubmitting flag for double-submit prevention | More reliable than lifecycle checks alone since lifecycle changes are async |
| 2026-04-03 | AppState composes SessionState (not extends) | Clean separation of session concerns vs UI concerns |
| 2026-04-03 | AppState.create() factory breaks circular init | PromptController needs session, AppState needs controller — factory wires both |

## Known Issues

- `init milestone-op` currently misreads the active milestone as complete while `roadmap analyze` correctly shows phases 12-22 pending; use roadmap analysis as source of truth
- Legacy code and docs still reference `flitter-amp`; implementation phases must retire those paths carefully
- The source tree contains substantial unrelated in-progress edits; migration work must isolate changes carefully

## Accumulated Context

- `flitter-core` already supports the rendering primitives needed for chat, tool cards, markdown, scroll, overlays, and status surfaces
- `flitter-amp` contains reusable implementation ideas but encodes the wrong top-level architecture
- Phase 12 established the new workspace package, config namespace, logging namespace, and a minimal native runtime shell without ACP/coco in the boot path
- Phase 13 Plan 01 established the type system (types.ts), session state machine (session.ts with 37 tests), and provider contract (provider.ts + anthropic.ts)
- Phase 13 Plan 02 wired the prompt lifecycle pipeline: PromptController dispatches stream events to SessionState, AppState composes both for TUI, CLI entry initializes provider with API key resolution
- Phase 13 Plan 03 locked the lifecycle behavioral contract with 64 tests: AppState unit tests (36) and lifecycle integration tests (28) covering happy path, cancellation, errors, recovery, metadata, listeners
- 115 tests pass across the flitter-cli test suite (37 session + 13 prompt-controller + 36 app-state + 28 lifecycle-integration + 1 config)

---
*Last updated: 2026-04-03 after Phase 13 Plan 03 completion (phase complete)*
