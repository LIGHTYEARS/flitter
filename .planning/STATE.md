---
gsd_state_version: 1.0
milestone: v0.1.0
milestone_name: — Visual Prototype
status: completed
last_updated: "2026-04-03T12:37:54.397Z"
last_activity: 2026-04-03
progress:
  total_phases: 17
  completed_phases: 10
  total_plans: 22
  completed_plans: 29
  percent: 64
---

# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Phase 17 — overlay-and-command-surfaces (Plan 05 complete)

## Current Milestone

**v0.3.0** — flitter-cli Full Parity

## Current Position

Phase: 17
Plan: 17-05 complete — ShortcutHelpOverlay widget with registry-derived groups
Status: Phase 17 Plan 05 complete
Last activity: 2026-04-03

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
| 14 | Conversation and Turn Model | Complete | 14-01/02 done |
| 15 | Chat View, Scroll, and Resize | In Progress | 15-01/02 done, 15-03 next |
| 16 | Input, Focus, and Editing Experience | In Progress | 16-01/02 done, 16-03 next |
| 17 | Overlay and Command Surfaces | In Progress | 17-01/02/03/05 done, 17-04 in progress |

Progress: ██████░░░░ 64% (7/11 plans)

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete
- 2026-03-28: v0.2.0 milestone complete
- 2026-04-03: Product direction reset from `flitter-amp` ACP client to native `flitter-cli`
- 2026-04-03: Phase 12 complete — `packages/flitter-cli` scaffold, config namespace, logger, and bootstrap shell
- 2026-04-03: Phase 13 Plan 01 complete — native type system, session state machine, provider interface, Anthropic SSE
- 2026-04-03: Phase 13 Plan 02 complete — PromptController, AppState composition, CLI entry wiring with provider init
- 2026-04-03: Phase 13 Plan 03 complete — 64 tests locking lifecycle contract (36 AppState unit + 28 integration)
- 2026-04-03: Phase 13 complete — 115 total tests across flitter-cli test suite
- 2026-04-03: Phase 14 Plan 01 complete — turn model types (UserTurn, AssistantTurn, TurnStatus) and ConversationState with cached turn grouping (28 tests)
- 2026-04-03: Phase 14 Plan 02 complete — ScreenState derivation (6 variants) and AppState integration of ConversationState + screenState (35 new tests, 178 total)
- 2026-04-03: Phase 15 planning complete — 3 plans: ChatView widget tree + screen dispatch, scroll/follow/scrollbar/resize, tests (~58 new)
- 2026-04-03: Phase 15 Plan 02 complete — ScrollController + SingleChildScrollView + Scrollbar wired into AppShell, conditional Center bypass for non-conversation screens (178 tests still pass)
- 2026-04-03: Phase 16 Plan 01 complete — InputArea StatefulWidget with multi-line editing, shell mode detection, auto-expand, drag-resize, mode badge, Autocomplete stub
- 2026-04-03: Phase 16 Plan 02 complete — full global shortcut matrix (Ctrl+C/L/O/G/R, Alt+T, Esc, ?), TextEditingController sharing, AppState listener lifecycle, InputArea wired into AppShell layout (238 tests pass)
- 2026-04-03: Phase 17 Plan 05 complete — ShortcutHelpOverlay widget reading from ShortcutRegistry, modal overlay with key absorption, toggle via ? key, wired into AppShell (305 tests pass)

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
| 2026-04-03 | Turn types use 'kind' discriminant separate from ConversationItem 'type' | Avoids collision between turn-level and item-level discriminants |
| 2026-04-03 | ConversationState wraps SessionState (composition) | Same pattern as AppState from Phase 13 |
| 2026-04-03 | groupItemsIntoTurns exported standalone | Direct unit testability without SessionState wiring |
| 2026-04-03 | ScreenState uses 'kind' discriminant matching Turn model | Consistent pattern across Phase 14 data layer |
| 2026-04-03 | deriveScreenState is a pure function taking primitives | Testable without state machine or class instances |
| 2026-04-03 | AppState.screenState derived (not cached) | Always reflects current session + conversation state |
| 2026-04-03 | turnCount from metadata drives welcome vs empty | Persists across newThread while items are cleared |
| 2026-04-03 | Reuse flitter-core ScrollView/Scrollbar/StickyHeader — no core gaps | All CHAT-01-04 requirements met by existing primitives; no phase 15.1 needed |
| 2026-04-03 | ChatView owns AppState listener (not parent) | Widget self-manages reactivity; dispose() cleans up |
| 2026-04-03 | Welcome/empty/loading/error bypass ScrollView, use Center | ScrollView unbounded height breaks vertical centering (Amp BUG-1 pattern) |
| 2026-04-03 | Placeholder renderers for tools/markdown/thinking/plans in Phase 15 | Layout correctness now; specialized renderers drop in at Phases 18-19 |
| 2026-04-03 | ScrollController owned by AppShellState, shared between ScrollView and Scrollbar | Single instance ensures scroll position sync; AppShellState owns lifecycle |
| 2026-04-03 | ? empty-input shortcut deferred to Phase 17 | TextField consumes all printable chars; requires modifying TextField key handling or adding pre-dispatch interceptor |
| 2026-04-03 | Ctrl+G external editor is a stub (INPT-06) | Full implementation requires terminal suspend/restore lifecycle not yet available |
| 2026-04-03 | AppShellState owns TextEditingController shared with InputArea | Enables shortcut handlers (Ctrl+G) to read/write input text via controller |
| 2026-04-03 | AppShellState registers AppState listener for InputArea reactivity | build() reads isProcessing, currentMode, screenState — without listener, InputArea renders stale props |
| 2026-04-03 | ShortcutHelpOverlay uses registry as sole source of truth (no fallback list) | Eliminates drift between actual bindings and help display |
| 2026-04-03 | No internal Stack/mask in ShortcutHelpOverlay — OverlayManager handles it | modal:true delegates background mask to OverlayManager |
| 2026-04-03 | Static Input section for widget-level behaviors (Enter, @, $, $$) | Cannot be registered as global shortcuts; maintained as constant |

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
- Phase 14 Plan 01 established turn model types (turn-types.ts) and ConversationState (conversation.ts) with version-cached turn grouping over SessionState.items — 28 additional tests (143 total across flitter-cli)
- Phase 14 Plan 02 established ScreenState derivation (screen-state.ts) with 6 first-class screen variants, and integrated ConversationState + screenState into AppState — 35 new tests (178 total across flitter-cli)
- Phase 14 is complete — the full conversation and turn data model is locked for downstream rendering phases
- Phase 15 planning identified zero flitter-core gaps — SingleChildScrollView (position:'bottom'), ScrollController (followMode), Scrollbar, StickyHeader, and resize via constraint propagation all exist and are sufficient
- Phase 15 uses the Amp BUG-1 pattern: welcome/empty/loading/error screens bypass ScrollView and use Center for vertical centering
- Phase 15 Plan 02 wired the full scroll stack: ScrollController in AppShellState, SingleChildScrollView (position='bottom', keyboard+mouse), Scrollbar (brightBlack thumb, interactive), conditional Center bypass — follow mode, streaming growth, resize all handled by flitter-core primitives with zero additional code
- Phase 16 Plan 01 created InputArea StatefulWidget with multi-line editing, shell mode detection ($->shell, $$->background), auto-expanding height, drag-resize, mode badge, Autocomplete stub, and BorderOverlayText export
- Phase 16 Plan 02 expanded AppShell's key handler to 8-shortcut matrix (Ctrl+C/L/O/G/R, Alt+T, Esc, ?), added TextEditingController shared with InputArea, AppState listener lifecycle (initState/dispose), and wired InputArea into the Column layout — 238 tests pass
- Phase 17 Plan 05 created ShortcutHelpOverlay widget reading from ShortcutRegistry (single source of truth, no fallback list), modal overlay with FocusScope key absorption, toggle via ? key, static Input section for widget-level behaviors — 305 tests pass

---
*Last updated: 2026-04-03 after Phase 17 Plan 05 completion*
