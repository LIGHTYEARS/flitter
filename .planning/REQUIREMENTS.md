# Requirements: flitter-cli v0.3.0

**Defined:** 2026-04-03
**Core Value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.

## v0.3.0 Requirements

### Runtime and Bootstrap

- [ ] **BOOT-01**: Developer can launch `flitter-cli` from a dedicated `packages/flitter-cli` entrypoint, bin target, and package script
- [ ] **BOOT-02**: `flitter-cli` parses CLI flags, loads user config, resolves editor and cwd, and applies runtime defaults through its own namespace
- [ ] **BOOT-03**: `flitter-cli` initializes logging before entering the TUI and preserves terminal integrity during runtime
- [ ] **BOOT-04**: `flitter-cli` restores terminal state cleanly on normal exit, cancellation, and fatal error

### Session Lifecycle

- [x] **SESS-01**: User can start a new session with a deterministic startup sequence that matches Amp lifecycle ordering
- [x] **SESS-02**: Prompt submission, in-flight processing state, completion, and cancellation follow Amp turn semantics exactly
- [x] **SESS-03**: Connection/runtime failures surface through the application state and visible UI states without corrupting the terminal
- [x] **SESS-04**: Session state tracks enough metadata to drive status widgets, persistence, resume, and cleanup

### Conversation and Turn Model

- [ ] **TURN-01**: User, assistant, thinking, tool call, and plan items are represented as explicit native `flitter-cli` conversation items
- [ ] **TURN-02**: Assistant turns group thinking, messages, and tool calls into the same visual turn structure as Amp
- [ ] **TURN-03**: Streaming message and thinking updates preserve cursor, completion, and interruption semantics
- [ ] **TURN-04**: Empty, welcome, loading, processing, and error states are all defined as first-class turn or screen states

### Chat View and Scroll Semantics

- [ ] **CHAT-01**: Chat view uses sticky grouping and bottom-anchored layout behavior matching Amp
- [ ] **CHAT-02**: Follow mode, user scroll override, keyboard scroll, mouse scroll, and scrollbar behavior match Amp semantics exactly
- [ ] **CHAT-03**: New content growth during streaming preserves stable auto-scroll behavior without fighting manual review
- [ ] **CHAT-04**: Responsive layout and resize handling preserve chat usability across terminal sizes

### Input and Interaction

- [ ] **INPT-01**: Input area supports Amp-style multi-line editing, submit behavior, cursor handling, and shell-mode detection
- [ ] **INPT-02**: Input border overlays display mode, hints, badges, and contextual metadata in the same interaction model as Amp
- [ ] **INPT-03**: Focus routing, keyboard bubbling, and overlay focus transfer match Amp interaction semantics
- [ ] **INPT-04**: Autocomplete trigger handling and `@file`-style picker invocation work as native `flitter-cli` input flows
- [ ] **INPT-05**: Global shortcut behavior matches Amp exactly for `Ctrl+O`, `Ctrl+C`, `Ctrl+L`, `Alt+T`, `Ctrl+G`, `Ctrl+R`, `Esc`, and `?`
- [ ] **INPT-06**: External editor workflow triggered from `Ctrl+G` preserves prompt content and terminal lifecycle semantics at Amp parity

### Overlays and Commands

- [x] **OVLY-01**: Permission dialog behaves as a true modal with dimmed background, focus capture, approval options, and escape dismissal
- [ ] **OVLY-02**: Command palette opens from global shortcut, renders searchable commands, and dispatches actions correctly
- [ ] **OVLY-03**: File picker and inline autocomplete overlays integrate with input and dismissal semantics correctly
- [ ] **OVLY-04**: Shortcut help/discovery surface exists for the hints exposed in the status and input regions
- [ ] **OVLY-05**: Command palette command inventory and descriptions match the Amp shortcut-discovery and action surface

### Tool Rendering and Workflow

- [ ] **TOOL-01**: Tool call dispatch covers the complete Amp capability matrix of specialized and fallback tool renderers
- [ ] **TOOL-02**: Tool headers render status icons, spinners, details, and expand/collapse behavior exactly as Amp does
- [ ] **TOOL-03**: Specialized tool renderers support shell/bash, grep/search, read, edit, create-file, web-search, todo-list, handoff, and task/sub-agent flows
- [ ] **TOOL-04**: Generic fallback rendering handles unknown tools without losing key output, payload, or status information
- [ ] **TOOL-05**: Tool payload extraction tolerates the variant input/output shapes seen in the reverse-engineered Amp tool surface
- [ ] **TOOL-06**: Permission, progress, completion, interruption, and failure states remain visible and actionable for every tool flow
- [ ] **TOOL-07**: Handoff flows preserve thread-link visibility, waiting-state semantics, and handoff result display at Amp parity
- [ ] **TOOL-08**: Task and sub-agent flows preserve nested delegation visibility and recursive tool-tree fidelity at Amp parity

### Content Rendering

- [ ] **REND-01**: Markdown rendering covers headings, paragraphs, inline formatting, code fences, tables, and mixed content blocks at Amp parity
- [ ] **REND-02**: Syntax highlighting works for supported code blocks and tool outputs with Amp-style token coloring
- [ ] **REND-03**: Unified diff and inline token diff rendering behave at Amp parity for file-edit surfaces
- [ ] **REND-04**: Thinking and plan blocks render their statuses, truncation rules, and visual hierarchy at Amp parity

### Status, Theme, and Visual Semantics

- [ ] **STAT-01**: Bottom status surfaces display hints, mode labels, processing state, and contextual metadata at Amp parity
- [ ] **STAT-02**: Header/status widgets expose session and runtime state needed during active work
- [ ] **STAT-03**: Theme token system covers the visual roles used by chat, tools, warnings, keybinds, links, handoff, and overlays
- [ ] **STAT-04**: Animation surfaces including spinners, streaming cursor, handoff blink, and welcome-screen motion behave at Amp parity
- [ ] **STAT-05**: Status-area behavior explicitly covers command hints, processing/cancel hints, mode badges, cwd/git/session context, and command-discovery cues at Amp parity
- [ ] **STAT-06**: Built-in theme registry and selectable theme surface reach Amp parity, not just underlying token completeness

### History, Sessions, and Persistence

- [ ] **HIST-01**: Prompt history preserves ordering, deduplication, cursor navigation, and input reinjection semantics
- [ ] **HIST-02**: Thread/session list surfaces expose persisted sessions in the native `flitter-cli` namespace
- [ ] **HIST-03**: Resume and export workflows operate on persisted session data through `flitter-cli`
- [ ] **HIST-04**: Persistence format stores enough data for restoration, inspection, retention, and cleanup policies

### Testing and Migration Closure

- [ ] **TEST-01**: Automated tests cover startup, shutdown, turn rendering, tool rendering, scroll behavior, overlays, history, and persistence
- [ ] **TEST-02**: Visual and terminal-level assertions verify render tree output, not just state objects
- [ ] **MIG-01**: The codebase clearly identifies which `flitter-amp` modules are migrated, adapted, or dropped for `flitter-cli`
- [ ] **MIG-02**: `flitter-amp` is removed from the active product path so new development and usage center on `flitter-cli`
- [ ] **MIG-03**: Migration and retirement paths remove stale references, scripts, configs, and package defaults safely

## v0.4.0+ Requirements

### Post-Parity Enhancements

- **POST-01**: Add performance tuning and scaling work that is not required for baseline parity
- **POST-02**: Add new features beyond the confirmed Amp capability matrix only after parity is complete

## Out of Scope

| Feature | Reason |
|---------|--------|
| Keeping ACP bridge architecture as the final runtime | Directly conflicts with the milestone goal |
| Running `flitter-amp` and `flitter-cli` as equal long-term products | Creates split product direction and duplicated maintenance |
| Web or desktop GUI surface | Terminal-first product remains the focus |
| Plugin architecture before parity | Adds abstraction before the baseline product exists |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 | Phase 12 | Complete |
| BOOT-02 | Phase 12 | Complete |
| BOOT-03 | Phase 12 | Complete |
| BOOT-04 | Phase 12 | Complete |
| SESS-01 | Phase 13 | Complete |
| SESS-02 | Phase 13 | Complete |
| SESS-03 | Phase 13 | Complete |
| SESS-04 | Phase 13 | Complete |
| TURN-01 | Phase 14 | Pending |
| TURN-02 | Phase 14 | Pending |
| TURN-03 | Phase 14 | Pending |
| TURN-04 | Phase 14 | Pending |
| CHAT-01 | Phase 15 | Pending |
| CHAT-02 | Phase 15 | Pending |
| CHAT-03 | Phase 15 | Pending |
| CHAT-04 | Phase 15 | Pending |
| INPT-01 | Phase 16 | Pending |
| INPT-02 | Phase 16 | Pending |
| INPT-03 | Phase 16 | Pending |
| INPT-04 | Phase 16 | Pending |
| INPT-05 | Phase 16 | Pending |
| INPT-06 | Phase 16 | Pending |
| OVLY-01 | Phase 17 | Complete |
| OVLY-02 | Phase 17 | Pending |
| OVLY-03 | Phase 17 | Pending |
| OVLY-04 | Phase 17 | Pending |
| OVLY-05 | Phase 17 | Pending |
| TOOL-01 | Phase 18 | Pending |
| TOOL-02 | Phase 18 | Pending |
| TOOL-03 | Phase 18 | Pending |
| TOOL-04 | Phase 18 | Pending |
| TOOL-05 | Phase 18 | Pending |
| TOOL-06 | Phase 18 | Pending |
| TOOL-07 | Phase 18 | Pending |
| TOOL-08 | Phase 18 | Pending |
| REND-01 | Phase 19 | Pending |
| REND-02 | Phase 19 | Pending |
| REND-03 | Phase 19 | Pending |
| REND-04 | Phase 19 | Pending |
| STAT-01 | Phase 20 | Pending |
| STAT-02 | Phase 20 | Pending |
| STAT-03 | Phase 20 | Pending |
| STAT-04 | Phase 20 | Pending |
| STAT-05 | Phase 20 | Pending |
| STAT-06 | Phase 20 | Pending |
| HIST-01 | Phase 21 | Pending |
| HIST-02 | Phase 21 | Pending |
| HIST-03 | Phase 21 | Pending |
| HIST-04 | Phase 21 | Pending |
| TEST-01 | Phase 22 | Pending |
| TEST-02 | Phase 22 | Pending |
| MIG-01 | Phase 22 | Pending |
| MIG-02 | Phase 22 | Pending |
| MIG-03 | Phase 22 | Pending |

**Coverage:**
- v0.3.0 requirements: 55 total
- Mapped to phases: 55
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after parity guardrail hardening*
