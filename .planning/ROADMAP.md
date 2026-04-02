# Roadmap: flitter-cli

**Created:** 2026-04-03
**Granularity:** Coarse
**Core Value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging

## Milestone 1: v0.1.0 — Visual Prototype (COMPLETED)

Phases 1-6 built the initial Amp-like TUI shell on `flitter-core`.

---

## Milestone 2: v0.2.0 — Make It Actually Work (COMPLETED)

Phases 7-11 fixed the ACP-client implementation so the legacy `flitter-amp` package became functionally usable.

---

## Milestone 3: v0.3.0 — flitter-cli Full Parity

### Phase 12: Native Bootstrap and Runtime Shell

**Goal:** Establish `flitter-cli` as a first-class package with native bootstrap, config, logging, and terminal lifecycle behavior.

**Requirements:** BOOT-01, BOOT-02, BOOT-03, BOOT-04

**Key Changes:**
1. Create `packages/flitter-cli` package metadata, bin target, scripts, and entrypoint
2. Implement native CLI argument parsing, config loading, editor/cwd resolution, and logging bootstrap
3. Define top-level error handling and clean shutdown behavior
4. Remove coco/ACP bridge assumptions from the runtime boundary

**Success Criteria:**
1. `flitter-cli` starts from its own package entrypoint
2. Runtime config and logs live under the new namespace
3. Fatal errors and exits restore terminal state
4. No core boot path depends on coco bridge commands

**Status:** Pending

---

### Phase 13: Session Lifecycle and App State

**Goal:** Rebuild native session startup, prompt processing, cancellation, error propagation, and app-state transitions to match Amp.

**Requirements:** SESS-01, SESS-02, SESS-03, SESS-04

**Key Changes:**
1. Define native session startup and processing lifecycle
2. Implement prompt submit, cancel, completion, and failure transitions
3. Wire runtime failures into visible app state
4. Capture session metadata required for later persistence and status UI

**Success Criteria:**
1. New session startup follows deterministic lifecycle ordering
2. Submit/cancel/complete flows match Amp behavior
3. Failure states surface visibly without corrupting the TUI
4. Session metadata is complete enough for later phases

**Status:** Pending

---

### Phase 14: Conversation and Turn Model

**Goal:** Define the native `flitter-cli` turn model and assistant grouping semantics used by the chat surface.

**Requirements:** TURN-01, TURN-02, TURN-03, TURN-04

**Key Changes:**
1. Implement native conversation item types for user, assistant, thinking, tool, and plan
2. Recreate assistant-turn grouping semantics from the reverse-engineered Amp behavior
3. Support streaming, completion, and interruption state on turn items
4. Define welcome, empty, loading, and error screen/turn states

**Success Criteria:**
1. Turn items are explicit native domain objects
2. Assistant grouping matches Amp thread semantics
3. Streaming and interruption behavior is preserved
4. Non-happy-path states are first-class

**Status:** Pending

---

### Phase 15: Chat View, Scroll, and Resize Semantics

**Goal:** Achieve parity in chat rendering, sticky sections, scroll behavior, follow mode, scrollbar, and resize handling.

**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04

**Key Changes:**
1. Port chat view layout and sticky grouping to the native turn model
2. Recreate bottom anchoring, follow mode, keyboard/mouse scroll, and scrollbar semantics
3. Preserve stable streaming growth behavior during manual review
4. Handle terminal resize and responsive layout correctly

**Success Criteria:**
1. Chat view feels identical in scroll and grouping behavior
2. Follow mode behaves correctly under streaming and manual override
3. Scrollbar and keyboard/mouse interactions are correct
4. Resize preserves usability and layout integrity

**Status:** Pending

---

### Phase 16: Input, Focus, and Editing Experience

**Goal:** Recreate Amp's input ergonomics, multi-line editing, shell mode, focus routing, and trigger-based input behavior.

**Requirements:** INPT-01, INPT-02, INPT-03, INPT-04

**Key Changes:**
1. Port input area composition and multi-line editing behavior
2. Restore border overlays, mode badges, and contextual labels
3. Recreate focus routing and key bubbling rules
4. Implement autocomplete and file-trigger integration in the native flow

**Success Criteria:**
1. Multi-line editing and submit behavior match Amp
2. Focus transitions feel correct with overlays and input
3. Overlay text and mode hints render correctly
4. Trigger-based completions invoke the right UI surfaces

**Status:** Pending

---

### Phase 17: Overlay and Command Surfaces

**Goal:** Complete parity for permission, command palette, file-picker, autocomplete, and shortcut-discovery overlays.

**Requirements:** OVLY-01, OVLY-02, OVLY-03, OVLY-04

**Key Changes:**
1. Implement modal permission flow with dimming and focus capture
2. Restore command palette actions and global invocation
3. Complete file-picker and inline autocomplete overlay behavior
4. Add shortcut help/discovery surface promised by the Amp-style UI

**Success Criteria:**
1. Permission dialog is a true modal with correct dismissal rules
2. Command palette is functional and searchable
3. File/autocomplete overlays integrate cleanly with input
4. Shortcut hints have a real discovery surface behind them

**Status:** Pending

---

### Phase 18: Full Tool Workflow Parity

**Goal:** Recreate the complete Amp tool-call rendering and workflow system, including specialized tools and fallback behavior.

**Requirements:** TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05, TOOL-06

**Key Changes:**
1. Implement full tool dispatch and normalization layer
2. Restore ToolHeader statuses, spinners, and expand/collapse model
3. Support specialized renderers for shell, grep, read, edit, create-file, web-search, todo, handoff, and task flows
4. Implement robust payload/result extraction and generic fallback rendering

**Success Criteria:**
1. All identified tool surfaces render correctly
2. Tool state transitions are visible and correct
3. Handoff/task/sub-agent flows behave at parity
4. Unknown tools still render losslessly through fallback behavior

**Status:** Pending

---

### Phase 19: Markdown, Diff, Thinking, and Plan Rendering

**Goal:** Reach parity for content rendering primitives used throughout the Amp experience.

**Requirements:** REND-01, REND-02, REND-03, REND-04

**Key Changes:**
1. Complete Markdown block and inline parity
2. Ensure syntax highlighting behaves correctly for code and tool output
3. Restore unified diff and token diff rendering
4. Recreate thinking and plan block rendering semantics

**Success Criteria:**
1. Markdown output matches Amp expectations
2. Code and diff views preserve visual hierarchy and clarity
3. Thinking and plan states are visually correct
4. Content rendering supports all tool and chat surfaces

**Status:** Pending

---

### Phase 20: Status Surfaces, Themes, and Motion

**Goal:** Recreate the status widgets, theme semantics, and visual motion cues that make the product feel like Amp.

**Requirements:** STAT-01, STAT-02, STAT-03, STAT-04

**Key Changes:**
1. Implement bottom and header status surfaces from native app/session state
2. Restore theme token coverage used by all product surfaces
3. Recreate spinner, cursor, handoff blink, and welcome motion cues
4. Verify visual semantics across the entire UI

**Success Criteria:**
1. Status widgets show the right runtime context
2. Theme roles are complete and consistent
3. Motion cues behave at parity without glitches
4. The product looks and feels like Amp, not just structurally similar

**Status:** Pending

---

### Phase 21: History, Resume, Export, and Persistence

**Goal:** Complete parity for prompt history, persisted sessions, thread/session lists, resume flows, and export behavior.

**Requirements:** HIST-01, HIST-02, HIST-03, HIST-04

**Key Changes:**
1. Implement prompt history storage, dedupe, cursoring, and input reinjection
2. Persist sessions under the `flitter-cli` namespace
3. Restore session/thread listing, resume, and export workflows
4. Define retention and cleanup behavior over persisted data

**Success Criteria:**
1. Prompt history behaves like Amp, not a placeholder
2. Sessions can be listed, resumed, exported, and cleaned up
3. Persistence stores enough metadata for all surfaced workflows
4. Session ergonomics reach full parity

**Status:** Pending

---

### Phase 22: Test Matrix, Migration Closure, and flitter-amp Retirement

**Goal:** Lock parity with robust verification and complete the product migration so `flitter-cli` is the sole active path.

**Requirements:** TEST-01, TEST-02, MIG-01, MIG-02, MIG-03

**Key Changes:**
1. Expand automated verification across startup, chat, tools, overlays, history, persistence, and shutdown
2. Use render-tree and terminal/screen assertions, not just state checks
3. Produce migration inventory and retire `flitter-amp` from active product flow
4. Remove stale docs, scripts, configs, and defaults safely

**Success Criteria:**
1. Parity-critical behavior is covered by tests
2. Visual and terminal output is validated directly
3. `flitter-cli` is the only active product path
4. Migration leaves no stale references behind

**Status:** Pending

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 | 12 | Pending |
| BOOT-02 | 12 | Pending |
| BOOT-03 | 12 | Pending |
| BOOT-04 | 12 | Pending |
| SESS-01 | 13 | Pending |
| SESS-02 | 13 | Pending |
| SESS-03 | 13 | Pending |
| SESS-04 | 13 | Pending |
| TURN-01 | 14 | Pending |
| TURN-02 | 14 | Pending |
| TURN-03 | 14 | Pending |
| TURN-04 | 14 | Pending |
| CHAT-01 | 15 | Pending |
| CHAT-02 | 15 | Pending |
| CHAT-03 | 15 | Pending |
| CHAT-04 | 15 | Pending |
| INPT-01 | 16 | Pending |
| INPT-02 | 16 | Pending |
| INPT-03 | 16 | Pending |
| INPT-04 | 16 | Pending |
| OVLY-01 | 17 | Pending |
| OVLY-02 | 17 | Pending |
| OVLY-03 | 17 | Pending |
| OVLY-04 | 17 | Pending |
| TOOL-01 | 18 | Pending |
| TOOL-02 | 18 | Pending |
| TOOL-03 | 18 | Pending |
| TOOL-04 | 18 | Pending |
| TOOL-05 | 18 | Pending |
| TOOL-06 | 18 | Pending |
| REND-01 | 19 | Pending |
| REND-02 | 19 | Pending |
| REND-03 | 19 | Pending |
| REND-04 | 19 | Pending |
| STAT-01 | 20 | Pending |
| STAT-02 | 20 | Pending |
| STAT-03 | 20 | Pending |
| STAT-04 | 20 | Pending |
| HIST-01 | 21 | Pending |
| HIST-02 | 21 | Pending |
| HIST-03 | 21 | Pending |
| HIST-04 | 21 | Pending |
| TEST-01 | 22 | Pending |
| TEST-02 | 22 | Pending |
| MIG-01 | 22 | Pending |
| MIG-02 | 22 | Pending |
| MIG-03 | 22 | Pending |

**v0.3.0 requirements:** 47 total
**Mapped:** 47 (100%)
**Complete:** 0

---
*Roadmap created: 2026-04-03*
*Last updated: 2026-04-03 after parity scope expansion*
