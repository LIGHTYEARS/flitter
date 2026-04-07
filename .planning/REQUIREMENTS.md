# Requirements: flitter-cli v0.4.0 — Close All Gaps

**Defined:** 2026-04-06
**Core Value:** Achieve pixel-level AMP fidelity by closing all 38 feature gaps and 42 Visual Fidelity issues documented in MISSING-FEATURES.md.
**Source:** MISSING-FEATURES.md (sections I-XI), AMP reverse-engineered source, tmux-capture golden files.

## v0.4.0 Requirements

### InputArea Rich Border (BORDER)

- [x] **BORDER-01**: InputArea top-left border embeds context window percentage text using borderOverlayText mechanism
- [x] **BORDER-02**: InputArea top-right border embeds skill count badge (e.g. "77 skills") that triggers Skills modal on click
- [x] **BORDER-03**: InputArea bottom-left border embeds current model name and agent mode label
- [x] **BORDER-04**: InputArea bottom-right border embeds current working directory and git branch name
- [x] **BORDER-05**: InputArea border supports agentModePulse animation (lerpColor between mode color and default border color on mode change)
- [x] **BORDER-06**: Standalone HeaderBar and StatusBar rows are removed; all metadata lives on InputArea border lines
- [x] **BORDER-07**: Streaming state displays token count, cost, elapsed time, and "Esc to cancel" on InputArea border
- [ ] **BORDER-08**: Resizable bottom grid with bottomGridUserHeight global state and drag-resize handle for split-view between chat area and InputArea
- [x] **BORDER-09**: InputArea initial height respects minLines: 3 configuration, matching AMP's default 3-line editing area

### Welcome Screen (WELC)

- [ ] **WELC-01**: Welcome screen displays large ASCII Art Logo with per-character Perlin noise gradient animation
- [ ] **WELC-02**: Welcome screen displays "Use Tab/Shift+Tab to navigate to previous messages" hint text

### Thread Management (THRD)

- [ ] **THRD-01**: ThreadPool architecture with threadHandleMap (Map<ThreadID, ThreadHandle>), activeThreadContextID pointer, and threadBackStack
- [ ] **THRD-02**: User can create new threads that preserve existing thread state (not just clear items)
- [ ] **THRD-03**: User can switch between threads by changing activeThreadContextID pointer
- [ ] **THRD-04**: User can delete threads from the thread map
- [ ] **THRD-05**: Thread back/forward navigation using browser-style history stacks
- [ ] **THRD-06**: Thread title auto-generation from conversation content
- [ ] **THRD-07**: Thread visibility modes (switchThreadVisibility)
- [ ] **THRD-08**: ThreadList widget (currently dead code) is wired and rendered
- [ ] **THRD-09**: Thread preview split-view with independent scroll controller for previewing thread content before switching
- [ ] **THRD-10**: Thread worker pool (threadWorkerMap, workersByThreadID) with per-thread independent worker state machines for concurrent thread execution

### Handoff Mode (HAND)

- [ ] **HAND-01**: Handoff state machine with enterHandoffMode/exitHandoffMode/submitHandoff/abortHandoffConfirmation
- [ ] **HAND-02**: Handoff countdown timer with "Auto-submitting in N..." UI and cancel capability
- [ ] **HAND-03**: Cross-thread handoff with sourceThreadID/targetThreadID tracking

### Queue Mode (QUEUE)

- [ ] **QUEUE-01**: Message queue system with queuedMessages array, isInQueueMode state, enterQueueMode/exitQueueMode/submitQueue/interruptQueue/clearQueue
- [ ] **QUEUE-02**: Auto-dequeue on turn completion (when stop_reason = "end_turn" or "tool_use" and queuedMessages.length > 0)

### Compaction (COMP)

- [ ] **COMP-01**: Context compaction system with compactionThresholdPercent (80%), compactionState tracking, cutMessageId, and compaction_started/compaction_complete events

### Shortcuts and Input (KEYS)

- [ ] **KEYS-01**: Ctrl+V paste images shortcut registered and functional (image attachment flow)
- [ ] **KEYS-02**: Shift+Enter (non-tmux) / Alt+Enter (tmux) inserts newline in input area
- [ ] **KEYS-03**: Tab/Shift+Tab navigates between conversation messages
- [ ] **KEYS-04**: Up arrow edits previous user message in-place (editingMessageOrdinal, client_edit_message protocol)
- [ ] **KEYS-05**: @@ trigger opens thread picker for thread mentions (in addition to existing @ file mentions)

### Shortcut Help (SHELP)

- [ ] **SHELP-01**: Shortcut help renders inside InputArea (not as separate modal card), using dual-column layout (two shortcuts per row)
- [ ] **SHELP-02**: Shortcut help displays exactly 12 AMP shortcuts in 6 rows matching AMP data structure
- [ ] **SHELP-03**: Shortcut help detects tmux environment and shows extended-keys hint with link

### Skills Modal (SKILL)

- [ ] **SKILL-01**: Skills modal displays complete skill list with title "Skills (N)" and operation buttons (o)wner's manual (a)dd
- [ ] **SKILL-02**: Skills are grouped by Local (.agents/skills/) and Global (~/.agents/skills/) with relative path headers
- [ ] **SKILL-03**: Selecting a skill expands detail panel (list 2/5 width, detail 3/5 width) showing SKILL.md content, frontmatter metadata, file list
- [ ] **SKILL-04**: Skills modal supports keyboard navigation: Escape (close/back), i (invoke), a (add), o (owner's manual)
- [ ] **SKILL-05**: Skills modal displays errors and warnings sections when skill loading fails
- [ ] **SKILL-06**: Skills modal shows "Create your own:" section with example prompt suggestions
- [ ] **SKILL-07**: Skills modal has scrollbar with independent listScrollController and detailScrollController
- [ ] **SKILL-08**: OVERLAY_IDS includes SKILLS_MODAL entry; InputArea skill count badge triggers it
- [ ] **SKILL-09**: Skill service (centralized skill management with loading, caching, querying via skillService)
- [ ] **SKILL-10**: Pending skills injection (addPendingSkill/removePendingSkill) that auto-injects skills as info messages into thread context

### Command Palette (CPAL)

- [x] **CPAL-01**: Command Palette uses single-line box border, vertically centered, with ">" search prefix
- [x] **CPAL-02**: Command Palette displays commands in category+label dual-column format with right-aligned shortcut hints
- [x] **CPAL-03**: Command Palette includes 15+ commands covering amp/mode/thread/prompt/context/news categories
- [x] **CPAL-04**: Commands include: help, use rush, use large, use deep, mode set, mode toggle, thread switch, thread new, thread map, thread set visibility, prompt open in editor, paste image from clipboard, context analyze, news open in browser

### HITL Confirmation (HITL)

- [x] **HITL-01**: HITL confirmation dialog displays command content preview (tool call parameters) above option buttons
- [x] **HITL-02**: HITL dialog width matches InputArea width (full-width border alignment)
- [x] **HITL-03**: HITL options use inverted-color block style with [y]/[n]/[a] keyboard shortcut labels
- [x] **HITL-04**: HITL title format is "Allow [tool_name]?" with bold styling
- [x] **HITL-05**: HITL supports "Provide feedback" mode for inline text input within the dialog

### Activity Group and Subagent (ACTV)

- [ ] **ACTV-01**: Activity Group uses collapsible G1R component with expand/collapse animation
- [ ] **ACTV-02**: Collapsed Activity Group displays summary aggregation (checkmark/x count)
- [ ] **ACTV-03**: Subagent nesting uses tree-line characters (branch/leaf/vertical) for visual hierarchy
- [ ] **ACTV-04**: Streaming shows inline subagent messages with name label and progress
- [ ] **ACTV-05**: Subagent tool card uses "Task" label prefix matching AMP

### Deep Reasoning and Agent Modes (MODE)

- [ ] **MODE-01**: Deep reasoning supports tri-state enum (medium/high/xhigh) instead of boolean toggle
- [ ] **MODE-02**: Agent mode switching (cycleMode) has real behavior: each mode defines primaryModel, includeTools, reasoningEffort, uiHints
- [ ] **MODE-03**: Provider-specific speed settings (anthropicSpeed, openAISpeed) with "+fast(6x$)" cost suffix

### Provider and Model System (PROV)

- [ ] **PROV-01**: Provider system includes 8 missing providers: xai, cerebras, fireworks, groq, moonshot, openrouter, vertex, baseten
- [ ] **PROV-02**: Model catalog with full metadata per model: contextWindow, maxOutputTokens, pricing, capabilities, reasoningEffort, uiHints
- [ ] **PROV-03**: Provider config service with hierarchical configuration, Zod schema validation, and per-provider settings

### UI Overlays and Notifications (OVLY)

- [ ] **OVLY-01**: Toast notification system with toastController, showToast(), auto-dismiss timer
- [ ] **OVLY-02**: Confirmation overlay (generic yes/no dialog) for exit, clear input, cancel processing
- [ ] **OVLY-03**: Context detail overlay showing token breakdown when clicking context percentage
- [ ] **OVLY-04**: Context analyze modal with contextAnalyzeDeps dependency analysis
- [ ] **OVLY-05**: File changes overlay showing all files modified in current session

### Visual Polish (VPOL)

- [ ] **VPOL-01**: Streaming cursor uses block character with 500ms blink animation (not scanning bar)
- [ ] **VPOL-02**: Tool call file paths use OSC8 terminal hyperlink protocol for clickable editor links
- [ ] **VPOL-03**: Edit file tool card displays inline diff preview with green/red line highlighting
- [ ] **VPOL-04**: Prompt symbol in idle state shows only ">" (no extra text)
- [ ] **VPOL-05**: Spinner color follows agent mode color (not static)

### Image Support (IMG)

- [ ] **IMG-01**: Paste handler (Ctrl+V) for image attachments with isUploadingImageAttachments spinner
- [ ] **IMG-02**: popImage() (Backspace) removes last attached image
- [ ] **IMG-03**: Kitty graphics protocol support for native terminal image rendering
- [ ] **IMG-04**: Full-screen image preview overlay with save dialog

### Shell Mode (SHELL)

- [ ] **SHELL-01**: Shell mode with $ (foreground) and $$ (background) prefix detection, bashInvocations array, and shell mode status bar indicator
- [ ] **SHELL-02**: Bash invocation display widget (BashInvocationsWidget) showing running commands with show/hide timer and pendingBashInvocations map

## v0.5.0+ Requirements

### Post-Fidelity

- **POST-01**: Telemetry system (eventTracker, sentry integration)
- **POST-02**: JetBrains installer integration
- **POST-03**: IDE picker (/ide command)
- **POST-04**: Auto-copy on selection with timer
- **POST-05**: Shimmer/falling overlay animations
- **POST-06**: Deep mode effort hint controller

## Out of Scope

| Feature | Reason |
|---------|--------|
| WebSocket event stream migration | Use state machine patterns over HTTP instead |
| IDE integrations (JetBrains, /ide) | Post-fidelity scope |
| Telemetry/Sentry | Post-fidelity scope |
| Shimmer/falling overlay animations | Cosmetic, post-fidelity |
| Auto-copy on selection | Minor UX, post-fidelity |
| Deep mode effort hint controller | Minor UX, post-fidelity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BORDER-01 | 23 | Complete |
| BORDER-02 | 23 | Complete |
| BORDER-03 | 23 | Complete |
| BORDER-04 | 23 | Complete |
| BORDER-05 | 23 | Complete |
| BORDER-06 | 23 | Complete |
| BORDER-07 | 23 | Complete |
| BORDER-08 | 23 | Partial |
| BORDER-09 | 23 | Complete |
| WELC-01 | 24 | Pending |
| WELC-02 | 24 | Pending |
| THRD-01 | 27 | Pending |
| THRD-02 | 27 | Pending |
| THRD-03 | 27 | Pending |
| THRD-04 | 27 | Pending |
| THRD-05 | 27 | Pending |
| THRD-06 | 27 | Pending |
| THRD-07 | 27 | Pending |
| THRD-08 | 27 | Pending |
| THRD-09 | 27 | Pending |
| THRD-10 | 27 | Pending |
| HAND-01 | 29 | Pending |
| HAND-02 | 29 | Pending |
| HAND-03 | 29 | Pending |
| QUEUE-01 | 28 | Pending |
| QUEUE-02 | 28 | Pending |
| COMP-01 | 28 | Pending |
| KEYS-01 | 32 | Pending |
| KEYS-02 | 32 | Pending |
| KEYS-03 | 32 | Pending |
| KEYS-04 | 32 | Pending |
| KEYS-05 | 32 | Pending |
| SHELP-01 | 32 | Pending |
| SHELP-02 | 32 | Pending |
| SHELP-03 | 32 | Pending |
| SKILL-01 | 30 | Pending |
| SKILL-02 | 30 | Pending |
| SKILL-03 | 30 | Pending |
| SKILL-04 | 30 | Pending |
| SKILL-05 | 30 | Pending |
| SKILL-06 | 30 | Pending |
| SKILL-07 | 30 | Pending |
| SKILL-08 | 30 | Pending |
| SKILL-09 | 30 | Pending |
| SKILL-10 | 30 | Pending |
| CPAL-01 | 31 | Done |
| CPAL-02 | 31 | Done |
| CPAL-03 | 31 | Done |
| CPAL-04 | 31 | Done |
| HITL-01 | 33 | Complete |
| HITL-02 | 33 | Complete |
| HITL-03 | 33 | Complete |
| HITL-04 | 33 | Complete |
| HITL-05 | 33 | Complete |
| ACTV-01 | 34 | Pending |
| ACTV-02 | 34 | Pending |
| ACTV-03 | 34 | Pending |
| ACTV-04 | 34 | Pending |
| ACTV-05 | 34 | Pending |
| MODE-01 | 26 | Pending |
| MODE-02 | 26 | Pending |
| MODE-03 | 26 | Pending |
| PROV-01 | 25 | Pending |
| PROV-02 | 25 | Pending |
| PROV-03 | 25 | Pending |
| OVLY-01 | 35 | Pending |
| OVLY-02 | 35 | Pending |
| OVLY-03 | 35 | Pending |
| OVLY-04 | 35 | Pending |
| OVLY-05 | 35 | Pending |
| VPOL-01 | 36 | Pending |
| VPOL-02 | 36 | Pending |
| VPOL-03 | 36 | Pending |
| VPOL-04 | 36 | Pending |
| VPOL-05 | 36 | Pending |
| IMG-01 | 35 | Pending |
| IMG-02 | 35 | Pending |
| IMG-03 | 35 | Pending |
| IMG-04 | 35 | Pending |
| SHELL-01 | 32 | Pending |
| SHELL-02 | 32 | Pending |

**Coverage:**
- v0.4.0 requirements: 81 total
- Mapped to phases: 81/81 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-06 | Roadmap mapped: 2026-04-06*
