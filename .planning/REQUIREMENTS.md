# Requirements: flitter-amp

**Defined:** 2026-03-26
**Core Value:** The chat TUI must strictly replicate Amp CLI's visual effects and interaction patterns

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### ACP Connection

- [x] **ACP-01**: Client spawns ACP agent subprocess with configurable command
- [x] **ACP-02**: Client performs ACP initialize handshake and creates session
- [x] **ACP-03**: Client handles session/update notifications (text chunks, tool calls, plans, usage)
- [x] **ACP-04**: Client implements readTextFile/writeTextFile callbacks for agent filesystem access
- [x] **ACP-05**: Client implements createTerminal callback for agent command execution

### TUI Shell

- [x] **TUI-01**: Full-screen alt-screen rendering with header, chat area, scrollbar, and input field
- [x] **TUI-02**: Bordered input area with mode indicator overlay (matches Amp layout)
- [x] **TUI-03**: Header bar displays agent name, mode, processing state, and token usage/cost
- [x] **TUI-04**: Scrollable chat view with bottom-anchored scroll (follow mode)
- [x] **TUI-05**: Scrollbar with sub-character precision rendering

### Streaming

- [x] **STRM-01**: User prompt submission sends text to agent via ACP
- [x] **STRM-02**: Agent text responses stream word-by-word into chat view
- [x] **STRM-03**: Tool call events render inline as they arrive
- [x] **STRM-04**: Plan updates flow from agent to plan view widget
- [x] **STRM-05**: Usage/cost updates display in header bar in real-time

### Tool Display

- [x] **TOOL-01**: Tool calls render as collapsible blocks with chevron toggle
- [x] **TOOL-02**: Status icons indicate tool state (in-progress, complete, failed)
- [x] **TOOL-03**: File diffs render inline with unified diff format (green adds, red removes)
- [x] **TOOL-04**: Thinking/reasoning blocks render as collapsible sections
- [x] **TOOL-05**: Plan view renders as checklist with status icons

### Permissions

- [ ] **PERM-01**: Agent permission requests show as modal dialog overlay
- [ ] **PERM-02**: Permission dialog uses SelectionList with allow/skip/always-allow options
- [ ] **PERM-03**: Permission dialog navigation matches Amp (j/k/arrows/Enter/Escape)
- [ ] **PERM-04**: Permission response resolves to agent, unblocking execution

### Command Palette

- [ ] **CMD-01**: Ctrl+O opens searchable command palette overlay
- [ ] **CMD-02**: Command palette lists available actions (switch mode, clear, toggle blocks, settings)
- [ ] **CMD-03**: Command palette navigation matches Amp (j/k/arrows/Enter/Escape)

### Keyboard Shortcuts

- [x] **KEY-01**: Enter inserts newline (multi-line default)
- [x] **KEY-02**: Ctrl+Enter submits prompt
- [x] **KEY-03**: Ctrl+C cancels current operation or exits
- [x] **KEY-04**: PageUp/PageDown scrolls chat
- [ ] **KEY-05**: Ctrl+L clears display
- [ ] **KEY-06**: Escape dismisses overlays (dialogs, palette)
- [ ] **KEY-07**: Alt+T toggles all tool call blocks expanded/collapsed

### Polish

- [ ] **POL-01**: Ctrl+G opens prompt in $EDITOR (suspend TUI, resume after)
- [ ] **POL-02**: Ctrl+R navigates prompt history
- [ ] **POL-03**: @file mention triggers fuzzy file search for context
- [ ] **POL-04**: Mouse click positions cursor, mouse wheel scrolls
- [ ] **POL-05**: Error boundaries display errors gracefully in TUI (no crashes)
- [ ] **POL-06**: Configuration file (~/.flitter-amp/config.json) for persistent settings

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Session Management

- **SESS-01**: User can save and name conversation threads
- **SESS-02**: User can resume previous threads
- **SESS-03**: User can list and switch between threads

### Advanced Input

- **INP-01**: $/$$ shell command input with inline result display
- **INP-02**: Ctrl+V image paste support
- **INP-03**: Ctrl+S switch agent mode

### Agent Features

- **AGT-01**: MCP server configuration passthrough to agent
- **AGT-02**: Multi-agent session support (switch between agents)

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM API integration | ACP agent handles all LLM communication |
| Agent implementation | Client-side only; agents are external |
| Web/mobile UI | Terminal-only application |
| Plugin/extension system | Direct implementation for v1 simplicity |
| Kitty graphics protocol | Text-only rendering for v1 |
| Syntax highlighting in diffs | Use flitter-core DiffView as-is |
| Custom themes | Default Amp-matching theme only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACP-01 | Phase 1 | Complete |
| ACP-02 | Phase 1 | Complete |
| ACP-03 | Phase 1 | Complete |
| ACP-04 | Phase 1 | Complete |
| ACP-05 | Phase 1 | Complete |
| TUI-01 | Phase 2 | Complete |
| TUI-02 | Phase 2 | Complete |
| TUI-03 | Phase 2 | Complete |
| TUI-04 | Phase 2 | Complete |
| TUI-05 | Phase 2 | Complete |
| STRM-01 | Phase 3 | Complete |
| STRM-02 | Phase 3 | Complete |
| STRM-03 | Phase 3 | Complete |
| STRM-04 | Phase 3 | Complete |
| STRM-05 | Phase 3 | Complete |
| TOOL-01 | Phase 4 | Complete |
| TOOL-02 | Phase 4 | Complete |
| TOOL-03 | Phase 4 | Complete |
| TOOL-04 | Phase 4 | Complete |
| TOOL-05 | Phase 4 | Complete |
| PERM-01 | Phase 5 | Pending |
| PERM-02 | Phase 5 | Pending |
| PERM-03 | Phase 5 | Pending |
| PERM-04 | Phase 5 | Pending |
| CMD-01 | Phase 5 | Pending |
| CMD-02 | Phase 5 | Pending |
| CMD-03 | Phase 5 | Pending |
| KEY-05 | Phase 5 | Pending |
| KEY-06 | Phase 5 | Pending |
| KEY-07 | Phase 5 | Pending |
| POL-01 | Phase 6 | Pending |
| POL-02 | Phase 6 | Pending |
| POL-03 | Phase 6 | Pending |
| POL-04 | Phase 6 | Pending |
| POL-05 | Phase 6 | Pending |
| POL-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after initial definition*
