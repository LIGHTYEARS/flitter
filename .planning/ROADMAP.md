# Roadmap: flitter-amp

**Created:** 2026-03-26
**Granularity:** Coarse
**Core Value:** The chat TUI must strictly replicate Amp CLI's visual effects and interaction patterns

## Milestone 1: v0.1.0 — Full Amp-Faithful ACP Client TUI

### Phase 1: ACP Client Connection ✓

**Goal:** Spawn an ACP agent subprocess, perform initialize handshake, create session, and handle all agent callbacks.

**Requirements:** ACP-01, ACP-02, ACP-03, ACP-04, ACP-05

**Success Criteria:**
1. Agent subprocess spawns with configurable command and args
2. ACP initialize handshake completes and returns agent capabilities
3. Session is created and ready to receive prompts
4. readTextFile/writeTextFile/createTerminal callbacks handle agent requests

**Status:** Complete

---

### Phase 2: Minimal TUI Shell ✓

**Goal:** Full-screen alt-screen TUI with Amp layout: header + scrollable chat + scrollbar + bordered input field.

**Requirements:** TUI-01, TUI-02, TUI-03, TUI-04, TUI-05

**Success Criteria:**
1. TUI renders full-screen with header, chat area, scrollbar, and input
2. Input area has bordered container with mode indicator overlay
3. Header shows agent name, mode, and token usage
4. Chat view scrolls with bottom-anchor (follow mode)
5. Scrollbar renders with sub-character precision

**Status:** Complete

---

### Phase 3: Wire ACP Client to TUI ✓

**Goal:** Connect ACP client to TUI so prompts go to agent and streaming responses render in chat.

**Requirements:** STRM-01, STRM-02, STRM-03, STRM-04, STRM-05

**Success Criteria:**
1. Typing prompt and pressing Ctrl+Enter sends to agent via ACP
2. Agent text responses stream into chat view word-by-word
3. Tool call events render inline in conversation as they arrive
4. Plan updates display in plan view widget
5. Usage/cost updates appear in header bar in real-time

**Status:** Complete

---

### Phase 4: Tool Call and Diff Rendering ✓

**Goal:** Render tool calls, file diffs, thinking blocks, and plans inline in conversation matching Amp's collapsible style.

**Requirements:** TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05

**Success Criteria:**
1. Tool calls render as collapsible blocks with chevron and status icon
2. File diffs render inline with unified format (green/red, line numbers)
3. Thinking blocks render as collapsible sections with streaming indicator
4. Plan view renders as checklist with status icons (pending/active/done)

**Status:** Complete

---

### Phase 5: Permission Dialog and Command Palette ✓

**Goal:** Handle agent permission requests with SelectionList dialog overlay. Implement Ctrl+O command palette and remaining keyboard shortcuts.

**Requirements:** PERM-01, PERM-02, PERM-03, PERM-04, CMD-01, CMD-02, CMD-03, KEY-05, KEY-06, KEY-07

**Success Criteria:**
1. Agent permission request shows modal dialog with allow/skip/always-allow options
2. User selection resolves permission promise and agent continues execution
3. Ctrl+O opens command palette with searchable action list
4. Escape dismisses any open overlay (dialog, palette)
5. Alt+T toggles all tool call blocks expanded/collapsed

**Status:** Complete

---

### Phase 6: Polish and Production Features

**Goal:** Complete the Amp-faithful experience with $EDITOR, history, @mentions, mouse support, config, and error handling.

**Requirements:** POL-01, POL-02, POL-03, POL-04, POL-05, POL-06

**Success Criteria:**
1. Ctrl+G suspends TUI, opens $EDITOR with prompt, resumes TUI with edited text
2. Ctrl+R navigates previous prompts (up/down through history)
3. @file triggers fuzzy file search and attaches file context to prompt
4. Mouse click positions cursor, mouse wheel scrolls chat view
5. Errors display gracefully in TUI without crashing

**Status:** Pending

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACP-01 | 1 | Complete |
| ACP-02 | 1 | Complete |
| ACP-03 | 1 | Complete |
| ACP-04 | 1 | Complete |
| ACP-05 | 1 | Complete |
| TUI-01 | 2 | Complete |
| TUI-02 | 2 | Complete |
| TUI-03 | 2 | Complete |
| TUI-04 | 2 | Complete |
| TUI-05 | 2 | Complete |
| STRM-01 | 3 | Complete |
| STRM-02 | 3 | Complete |
| STRM-03 | 3 | Complete |
| STRM-04 | 3 | Complete |
| STRM-05 | 3 | Complete |
| TOOL-01 | 4 | Complete |
| TOOL-02 | 4 | Complete |
| TOOL-03 | 4 | Complete |
| TOOL-04 | 4 | Complete |
| TOOL-05 | 4 | Complete |
| PERM-01 | 5 | Pending |
| PERM-02 | 5 | Pending |
| PERM-03 | 5 | Pending |
| PERM-04 | 5 | Pending |
| CMD-01 | 5 | Pending |
| CMD-02 | 5 | Pending |
| CMD-03 | 5 | Pending |
| KEY-05 | 5 | Pending |
| KEY-06 | 5 | Pending |
| KEY-07 | 5 | Pending |
| POL-01 | 6 | Pending |
| POL-02 | 6 | Pending |
| POL-03 | 6 | Pending |
| POL-04 | 6 | Pending |
| POL-05 | 6 | Pending |
| POL-06 | 6 | Pending |

**v1 requirements:** 36 total
**Mapped:** 36 (100%)
**Complete:** 20 (Phases 1-4)
**Pending:** 16 (Phases 5-6)

---
*Roadmap created: 2026-03-26*
*Last updated: 2026-03-26 after initialization*
