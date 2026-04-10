# Roadmap: flitter-cli v0.4.0 — Close All Gaps

## Milestones

- ✅ **v0.1.0 MVP** - Phases 1-5 (shipped 2026-03-26)
- ✅ **v0.2.0 Rendering Overhaul** - Phases 6-11 (shipped 2026-03-28)
- ✅ **v0.3.0 flitter-cli Full Parity** - Phases 12-22 (shipped 2026-04-03)
- ✅ **v0.4.0 Close All Gaps: Full AMP Fidelity** - Phases 23-38 (shipped 2026-04-09)

## Phases

<details>
<summary>v0.1.0 MVP (Phases 1-5) - SHIPPED 2026-03-26</summary>

Phases 1-5 completed: foundation, widget system, layout engine, input system, TUI rendering.

</details>

<details>
<summary>v0.2.0 Rendering Overhaul (Phases 6-11) - SHIPPED 2026-03-28</summary>

Phases 6-11 completed: rendering pipeline, scrolling, flex layout, text rendering, overlay system, diagnostics.

</details>

<details>
<summary>v0.3.0 flitter-cli Full Parity (Phases 12-22) - SHIPPED 2026-04-03</summary>

Phases 12-22 completed: bootstrap, session lifecycle, conversation model, chat view, input, overlays, tool rendering, content rendering, status/theme, history/persistence, migration closure. 55 requirements, 305+ tests.

</details>

### ✅ v0.4.0 Close All Gaps (Shipped 2026-04-09)

**Milestone Goal:** Close all 81 audit-identified gaps to achieve pixel-level AMP fidelity.

- [x] **Phase 23: InputArea Rich Border** - Replace HeaderBar/StatusBar with borderOverlayText on all four border sides (completed 2026-04-06)
- [x] **Phase 24: Welcome Screen** - ASCII Art Logo with Perlin gradient + hint text (completed 2026-04-07)
- [x] **Phase 25: Provider and Model System** - 8 missing providers, model catalog, config service (completed 2026-04-07)
- [x] **Phase 26: Agent Modes and Deep Reasoning** - Tri-state reasoning, real mode switching, speed settings (completed 2026-04-07)
- [x] **Phase 27: ThreadPool Architecture** - Multi-thread state management with create/switch/delete/navigate (completed 2026-04-07)
- [x] **Phase 28: Queue Mode and Compaction** - Message queue system and context compaction (completed 2026-04-07)
- [x] **Phase 29: Handoff State Machine** - Enter/exit/submit/abort handoff with cross-thread tracking (completed 2026-04-07)
- [x] **Phase 30: Skills Modal** - Complete skill browsing UI with grouping, detail panel, keyboard navigation (completed 2026-04-07)
- [x] **Phase 31: Command Palette Overhaul** - Category+label format, 15+ commands, centered layout (completed 2026-04-07)
- [x] **Phase 32: Shortcut Help, Missing Shortcuts, and Shell Mode** - InputArea-embedded dual-column help, register Ctrl+V/Shift+Enter/Tab, shell mode with bash invocations (completed 2026-04-07)
- [x] **Phase 33: HITL Confirmation Overhaul** - Content preview, inverted-color options, feedback input mode (completed 2026-04-07)
- [x] **Phase 34: Activity Group and Subagent Tree** - Collapsible groups, tree-line characters, summary aggregation (completed 2026-04-07)
- [x] **Phase 35: Image Support and Overlays** - Image paste/preview, toast notifications, context/file overlays (completed 2026-04-07)
- [x] **Phase 36: Visual Polish** - Block cursor, OSC8 hyperlinks, diff preview, spinner colors, prompt symbol (completed 2026-04-07)

## Phase Details

### Phase 23: InputArea Rich Border
**Goal**: Replace the standalone HeaderBar and StatusBar with AMP's borderOverlayText mechanism -- all metadata (context %, skill count, model/mode, cwd/branch, streaming stats) embedded directly into InputArea's four border lines.
**Depends on**: Phase 22 (v0.3.0 complete)
**Requirements**: BORDER-01, BORDER-02, BORDER-03, BORDER-04, BORDER-05, BORDER-06, BORDER-07, BORDER-08, BORDER-09
**Success Criteria** (what must be TRUE):
  1. InputArea top-left border shows context window percentage
  2. InputArea top-right border shows skill count that opens Skills modal
  3. InputArea bottom-left border shows model name and agent mode
  4. InputArea bottom-right border shows cwd and git branch
  5. HeaderBar and StatusBar components are removed from app-shell layout
  6. Border color pulses on agent mode change
  7. Streaming state shows token/cost/time and "Esc to cancel" on border
  8. Resizable bottom grid with bottomGridUserHeight global state and drag-resize handle
  9. InputArea defaults to minLines: 3 editing area
**Plans**: 3 plans

Plans:
- [x] 23-01: Implement borderOverlayText rendering primitive in flitter-core (text embedded in border segments)
- [x] 23-02: Build four border builder functions (top-left, top-right, bottom-left, bottom-right) with dynamic content
- [x] 23-03: Remove HeaderBar/StatusBar, wire border builders to InputArea, add agentModePulse animation

### Phase 24: Welcome Screen
**Goal**: Display the AMP ASCII Art Logo with per-character Perlin noise gradient animation and navigation hints.
**Depends on**: Phase 23 (border context for layout)
**Requirements**: WELC-01, WELC-02
**Success Criteria** (what must be TRUE):
  1. Welcome screen renders multi-line ASCII Art "amp" logo with animated gradient colors
  2. Welcome screen shows Tab/Shift+Tab navigation hint
  3. Logo animation uses Perlin noise for smooth color transitions
**Plans**: 1 plan

Plans:
- [x] 24-01: Build ASCII Art Logo widget with Perlin gradient animation and welcome hint text

### Phase 25: Provider and Model System
**Goal**: Replace hand-rolled AnthropicProvider/OpenAIProvider with @mariozechner/pi-ai unified LLM backend, build ConfigService with Zod validation, and wire all 10+ providers through pi-ai's model catalog.
**Depends on**: Phase 22 (existing provider infrastructure)
**Requirements**: PROV-01, PROV-02, PROV-03
**Success Criteria** (what must be TRUE):
  1. All 10+ providers (anthropic, openai, xai, cerebras, fireworks, groq, moonshot, openrouter, vertex, baseten, gemini) reachable via pi-ai
  2. Each model has contextWindow, maxTokens, pricing, capabilities metadata via pi-ai Model<Api>
  3. Provider config uses hierarchical configuration with Zod schema validation (ConfigService)
**Plans**: 3 plans

Plans:
- [ ] 25-01: Install pi-ai, create PiAiProvider adapter, rewrite factory.ts (Wave 1)
- [x] 25-02: Create ConfigService with Zod schema validation and --setting CLI flag (Wave 1)
- [x] 25-03: Wire bootstrap, update MockProvider/tests, delete old AnthropicProvider/OpenAIProvider (Wave 2)

### Phase 26: Agent Modes and Deep Reasoning
**Goal**: Replace boolean deep reasoning toggle with tri-state enum and implement real agent mode switching with per-mode configuration.
**Depends on**: Phase 25 (model catalog for mode definitions)
**Requirements**: MODE-01, MODE-02, MODE-03
**Success Criteria** (what must be TRUE):
  1. Deep reasoning supports medium/high/xhigh tri-state cycling
  2. cycleMode() rotates through modes with real behavior (primaryModel, includeTools, reasoningEffort, uiHints)
  3. Provider-specific speed settings display "+fast(6x$)" suffix
**Plans**: 1 plan

Plans:
- [x] 26-01: Implement tri-state deep reasoning, real agent mode definitions, and speed settings

### Phase 27: ThreadPool Architecture
**Goal**: Replace single-thread model with AMP's ThreadPool architecture supporting create, switch, delete, and back/forward navigation across multiple concurrent threads.
**Depends on**: Phase 22 (existing session/conversation model)
**Requirements**: THRD-01, THRD-02, THRD-03, THRD-04, THRD-05, THRD-06, THRD-07, THRD-08, THRD-09, THRD-10
**Success Criteria** (what must be TRUE):
  1. ThreadPool manages threadHandleMap with multiple ThreadHandle instances
  2. User can create new thread without losing existing thread state
  3. User can switch between threads via activeThreadContextID
  4. User can delete threads
  5. Back/forward navigation works across thread history
  6. Thread titles auto-generate from conversation content
  7. ThreadList widget renders and allows thread selection
  8. Thread preview split-view shows content before switching
  9. Thread worker pool manages per-thread independent workers
**Plans**: 3 plans

Plans:
- [x] 27-01: Implement ThreadPool state management (threadHandleMap, activeThreadContextID, back/forward stacks)
- [x] 27-02: Build thread lifecycle operations (create, switch, delete, title generation, visibility)
- [x] 27-03: Wire ThreadList widget and thread-related command palette commands

### Phase 28: Queue Mode and Compaction
**Goal**: Implement message queue system for batching follow-up prompts and context compaction for automatic context window management.
**Depends on**: Phase 27 (thread architecture for queue per thread)
**Requirements**: QUEUE-01, QUEUE-02, COMP-01
**Success Criteria** (what must be TRUE):
  1. User can enter queue mode and batch multiple messages
  2. Messages auto-dequeue on turn completion
  3. Context compaction triggers at 80% threshold and prunes old messages
**Plans**: 2 plans

Plans:
- [x] 28-01: Implement queue mode state machine (enqueue, dequeue, submitQueue, interruptQueue, clearQueue)
- [x] 28-02: Implement compaction system (threshold detection, compaction state, cutMessageId, events)

### Phase 29: Handoff State Machine
**Goal**: Implement complete handoff mode with enter/exit/submit/abort lifecycle, countdown timer UI, and cross-thread handoff support.
**Depends on**: Phase 27 (thread architecture for cross-thread handoff)
**Requirements**: HAND-01, HAND-02, HAND-03
**Success Criteria** (what must be TRUE):
  1. enterHandoffMode/exitHandoffMode/submitHandoff/abortHandoffConfirmation lifecycle works
  2. "Auto-submitting in N..." countdown displays and can be cancelled
  3. Cross-thread handoff tracks sourceThreadID/targetThreadID
**Plans**: 1 plan

Plans:
- [x] 29-01: Implement handoff state machine with countdown timer and cross-thread tracking

### Phase 30: Skills Modal
**Goal**: Build complete Skills browsing modal with Local/Global grouping, dual-pane detail view, keyboard navigation, error handling, and prompt suggestions.
**Depends on**: Phase 23 (border skill count badge triggers modal)
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06, SKILL-07, SKILL-08, SKILL-09, SKILL-10
**Success Criteria** (what must be TRUE):
  1. Skills modal displays with title "Skills (N)" and (o)/(a) operation buttons
  2. Skills grouped by Local/Global paths
  3. Selecting a skill shows detail panel (2/5 + 3/5 split)
  4. Keyboard navigation works (Escape/i/a/o)
  5. Error and warning sections display when skills fail to load
  6. "Create your own:" section shows example prompts
  7. Both list and detail have independent scroll controllers
  8. OVERLAY_IDS has SKILLS_MODAL; InputArea badge triggers it
  9. Centralized skill service handles loading, caching, and querying
  10. Pending skills injection auto-inserts skills as info messages into thread context
**Plans**: 3 plans

Plans:
- [x] 30-01: Build SkillsModal widget with list view, Local/Global grouping, and scrollbar
- [x] 30-02: Add detail panel (2/5 + 3/5 split), frontmatter display, file list, invoke action
- [x] 30-03: Wire SKILLS_MODAL overlay, keyboard navigation, error/warning sections, "Create your own" area

### Phase 31: Command Palette Overhaul
**Goal**: Redesign Command Palette to match AMP's category+label dual-column format with 15+ commands, centered layout, and ">" search prefix.
**Depends on**: Phase 26 (mode commands), Phase 27 (thread commands)
**Requirements**: CPAL-01, CPAL-02, CPAL-03, CPAL-04
**Success Criteria** (what must be TRUE):
  1. Command Palette uses single-line box border, vertically centered
  2. Search box has ">" prefix
  3. Commands display in category+label format with right-aligned shortcut hints
  4. 15+ commands registered covering amp/mode/thread/prompt/context/news categories
**Plans**: 2 plans

Plans:
- [x] 31-01: Redesign Command Palette layout (centered, box border, ">" prefix, category+label columns)
- [x] 31-02: Register all missing commands (help, mode set/use, thread switch/map/visibility, context analyze, news, paste image)

### Phase 32: Shortcut Help, Missing Shortcuts, and Shell Mode
**Goal**: Rebuild shortcut help as InputArea-embedded dual-column layout matching AMP, register all missing keyboard shortcuts, and implement shell mode with bash invocation display.
**Depends on**: Phase 23 (InputArea embedding), Phase 27 (Tab/Shift+Tab needs message navigation)
**Requirements**: SHELP-01, SHELP-02, SHELP-03, KEYS-01, KEYS-02, KEYS-03, KEYS-04, KEYS-05, SHELL-01, SHELL-02
**Success Criteria** (what must be TRUE):
  1. Shortcut help renders inside InputArea with dual-column layout (2 per row, 6 rows)
  2. Exactly 12 shortcuts displayed matching AMP data
  3. tmux environment detection shows extended-keys hint
  4. Ctrl+V paste images works
  5. Shift+Enter/Alt+Enter inserts newline
  6. Tab/Shift+Tab navigates messages
  7. Up arrow edits previous message
  8. @@ opens thread picker
  9. Shell mode detects $ and $$ prefixes with bash invocation tracking
  10. Bash invocation widget displays running commands with show/hide timer
**Plans**: 3 plans

Plans:
- [x] 32-01: Rebuild shortcut help as InputArea-embedded dual-column widget with tmux detection
- [x] 32-02: Register and implement Ctrl+V, Shift+Enter, Tab/Shift+Tab, Up arrow, @@ shortcuts
- [x] 32-03: Implement shell mode state, bashInvocations tracking, and BashInvocationsWidget

### Phase 33: HITL Confirmation Overhaul
**Goal**: Redesign HITL confirmation dialog to match AMP's layout with command content preview, inverted-color option buttons, keyboard shortcut labels, and feedback input mode.
**Depends on**: Phase 23 (border alignment for dialog width)
**Requirements**: HITL-01, HITL-02, HITL-03, HITL-04, HITL-05
**Success Criteria** (what must be TRUE):
  1. HITL dialog shows command content preview (tool parameters) above options
  2. Dialog width matches InputArea width
  3. Options use inverted-color block style with [y]/[n]/[a] labels
  4. Title format is "Allow [tool_name]?" bold
  5. "Provide feedback" mode allows inline text input
**Plans**: 2 plans

Plans:
- [x] 33-01: Redesign HITL dialog layout (content preview, full-width, "Allow [tool]?" title)
- [x] 33-02: Implement inverted-color option buttons with [y]/[n]/[a] labels and feedback input mode

### Phase 34: Activity Group and Subagent Tree
**Goal**: Implement collapsible Activity Group component with tree-line characters, summary aggregation, and proper subagent nesting display.
**Depends on**: Phase 22 (existing tool-call widgets)
**Requirements**: ACTV-01, ACTV-02, ACTV-03, ACTV-04, ACTV-05
**Success Criteria** (what must be TRUE):
  1. Activity Group uses collapsible component with expand/collapse
  2. Collapsed groups show summary (checkmark/x count)
  3. Tree-line characters (branch/leaf/vertical) show nesting hierarchy
  4. Streaming shows inline subagent messages with name and progress
  5. Subagent card uses "Task" label prefix
**Plans**: 2 plans

Plans:
- [x] 34-01: Build collapsible ActivityGroup widget with tree-line characters and summary aggregation
- [x] 34-02: Wire inline subagent messages, "Task" label prefix, and nesting display

### Phase 35: Image Support and Overlays
**Goal**: Implement image paste/preview support and missing UI overlays (toast, confirmation, context detail, file changes).
**Depends on**: Phase 23 (context % on border triggers context detail overlay)
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, OVLY-01, OVLY-02, OVLY-03, OVLY-04, OVLY-05
**Success Criteria** (what must be TRUE):
  1. Ctrl+V pastes images with upload spinner
  2. Backspace removes last attached image
  3. Kitty graphics protocol renders images in terminal
  4. Full-screen image preview with save dialog
  5. Toast notifications auto-dismiss
  6. Generic confirmation overlay works
  7. Context detail shows token breakdown
  8. Context analyze shows dependency analysis
  9. File changes overlay lists modified files
**Plans**: 3 plans

Plans:
- [x] 35-01: Implement image paste handler, popImage, and Kitty graphics protocol renderer
- [ ] 35-02: Build toast notification system and generic confirmation overlay
- [ ] 35-03: Build context detail, context analyze, and file changes overlays

### Phase 36: Visual Polish
**Goal**: Final visual polish to achieve exact AMP appearance: block cursor, OSC8 hyperlinks, diff preview, spinner colors, prompt symbol.
**Depends on**: Phase 23 (border rendering stable)
**Requirements**: VPOL-01, VPOL-02, VPOL-03, VPOL-04, VPOL-05
**Success Criteria** (what must be TRUE):
  1. Streaming cursor uses block character with blink animation
  2. File paths in tool output use OSC8 terminal hyperlinks
  3. Edit file tool card shows inline diff preview
  4. Idle prompt symbol shows only ">"
  5. Spinner color follows current agent mode color
**Plans**: 1 plan

Plans:
- [x] 36-01: Implement block cursor, OSC8 hyperlinks, diff preview, prompt symbol fix, spinner colors

## Progress

**Execution Order:**
Phases execute in numeric order: 23 -> 24 -> 25 -> 26 -> 27 -> 28 -> 29 -> 30 -> 31 -> 32 -> 33 -> 34 -> 35 -> 36

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 23. InputArea Rich Border | v0.4.0 | 3/3 | Complete    | 2026-04-06 |
| 24. Welcome Screen | v0.4.0 | 1/1 | Complete    | 2026-04-07 |
| 25. Provider and Model System | v0.4.0 | 3/3 | Complete    | 2026-04-07 |
| 26. Agent Modes and Deep Reasoning | v0.4.0 | 1/1 | Complete    | 2026-04-07 |
| 27. ThreadPool Architecture | v0.4.0 | 3/3 | Complete    | 2026-04-07 |
| 28. Queue Mode and Compaction | v0.4.0 | 2/2 | Complete    | 2026-04-07 |
| 29. Handoff State Machine | v0.4.0 | 1/1 | Complete    | 2026-04-07 |
| 30. Skills Modal | v0.4.0 | 3/3 | Complete    | 2026-04-07 |
| 31. Command Palette Overhaul | v0.4.0 | 2/2 | Complete    | 2026-04-07 |
| 32. Shortcut Help, Shortcuts, Shell Mode | v0.4.0 | 3/3 | Complete    | 2026-04-07 |
| 33. HITL Confirmation Overhaul | v0.4.0 | 2/2 | Complete    | 2026-04-07 |
| 34. Activity Group and Subagent Tree | v0.4.0 | 2/2 | Complete    | 2026-04-07 |
| 35. Image Support and Overlays | v0.4.0 | 3/3 | Complete    | 2026-04-07 |
| 36. Visual Polish | v0.4.0 | 1/1 | Complete    | 2026-04-07 |
| 37. Simplify Factory.ts | v0.4.0 | 1/1 | Complete    | 2026-04-08 |
| 38. Full Observability | v0.4.0 | 4/4 | Complete    | 2026-04-08 |

### Phase 37: Simplify Factory.ts

**Goal:** 消除 factory.ts 中冗余的 adapter-of-adapter 层。删除 PROVIDER_MAP、REVERSE_PROVIDER_MAP、DEFAULT_MODELS、PROVIDER_NAMES、resolveModel()，让 pi-ai 成为 provider/model 元数据的唯一来源。保留 OAuth token-store、baseUrl 覆盖、antigravity User-Agent 注入。
**Requirements**: None (refactoring phase)
**Depends on:** Phase 36
**Plans:** 1/1 plans complete

Plans:
- [x] 37-01: 简化 ProviderId 类型、重写 factory.ts 删除冗余映射、更新 config.ts 和测试 (Wave 1)

### Phase 38: 建设全链路可观测能力

**Goal:** Build end-to-end observability for the local agentic loop, aligned with AMP's tracing architecture. Three pillars: request tracing, rendering pipeline linkage, structured error capture.
**Requirements**: Infrastructure phase (no formal requirement IDs)
**Depends on:** Phase 37
**Plans:** 4/4 plans complete

Plans:
- [x] 38-01: Tracer infrastructure — TraceStore, Span types, logger writeEntry() (Wave 1)
- [x] 38-02: Rendering pipeline bridge — setPipelineLogSink, frame-overrun detection (Wave 1)
- [x] 38-03: Agentic loop instrumentation — agent/inference/tool spans, TTFT, structured errors (Wave 2)
- [x] 38-04: Tests and verification — unit + integration tests for tracer, bridge, span emission (Wave 3)

### Phase 39: Align flitter-cli with AMP 44 gaps

**Goal:** Close P0-CRITICAL and P1-HIGH gaps from the 4-subagent audit (ThreadWorker state machine, compaction pruning, queue auto-dequeue, thread relationships, createThread async, edit previous message, per-thread mode, HandoffService extraction, queue UI, multi-option confirmation, pending skills injection, thread preview, thread merging). P2-MED and P3-LOW deferred to Phase 39b.
**Requirements**: F1, F2, F3, F7, F8, F9, F10, F11, F13, F14, F15, F16, F17, F33, F34, F35
**Depends on:** Phase 38
**Plans:** 7 plans

Plans:
- [ ] 39-01-PLAN.md — ThreadWorker event-driven state machine (F1, F35)
- [ ] 39-02-PLAN.md — Compaction actual pruning (F3)
- [ ] 39-03-PLAN.md — Queue auto-dequeue + edit previous message (F2, F13)
- [ ] 39-04-PLAN.md — Thread relationships + async createThread + title gen enhanced (F7, F9, F16)
- [ ] 39-05-PLAN.md — Agent mode per-thread + HandoffService extraction (F15, F17)
- [ ] 39-06-PLAN.md — Queue UI + confirmation multi-option + pending skills injection (F10, F11, F14)
- [ ] 39-07-PLAN.md — Thread preview split-view + visibility command + thread merging (F8, F33, F34)
