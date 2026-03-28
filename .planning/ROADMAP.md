# Roadmap: flitter-amp

**Created:** 2026-03-26
**Granularity:** Coarse
**Core Value:** A truly functional ACP TUI client that correctly communicates with any ACP agent

## Milestone 1: v0.1.0 — Visual Prototype (COMPLETED)

Phases 1-6 built the UI shell. See git history for details.

---

## Milestone 2: v0.2.0 — Make It Actually Work (COMPLETED)

### Phase 7: Protocol Correctness

**Goal:** Fix all ACP protocol-level bugs so the client correctly communicates with any ACP agent.

**Requirements:** PROTO-01, PROTO-02, PROTO-03, PROTO-04, PROTO-05, PROTO-06, PROTO-07

**Key Changes:**
1. Fix 4 sessionUpdate event names: `thinking_chunk`→`agent_thought_chunk`, `usage`→`usage_update`, `current_mode`→`current_mode_update`, `session_info`→`session_info_update`
2. Fix usage_update field mapping: SDK uses `{size, used, cost}`, not `{input_tokens, output_tokens, cost}`
3. Declare clientCapabilities in initialize: `{fs: {readTextFile: true, writeTextFile: true}, terminal: true}`
4. Monitor connection.signal/connection.closed — set error state and exit processing on agent crash
5. Fix terminalOutput: persistent output collection from createTerminal, no listener leak, correct return shape
6. Fix waitForTerminalExit return type to match `{exitCode?, signal?}`
7. Fix handleSubmit catch: call notifyListeners() + finalizeAssistantMessage/finalizeThinking

**Success Criteria:**
1. `agent_thought_chunk` events render ThinkingBlock content
2. `usage_update` events update BottomGrid token display
3. Agent with strict capability checking accepts file/terminal requests
4. Agent crash displays error message and resets processing state
5. `bun test` passes in both packages

**Status:** Complete

---

### Phase 8: Scroll Infrastructure

**Goal:** Fix scroll so it actually works — keyboard, mouse, auto-follow, and user override.

**Requirements:** SCROLL-01, SCROLL-02, SCROLL-03, SCROLL-04

**Key Changes:**
1. `RenderScrollViewport.attach()` — addListener on ScrollController, markNeedsPaint on offset change
2. `ScrollableState._handleKey/_handleScroll` — call disableFollowMode() when scrolling up
3. `app.ts stateListener` — only enableFollowMode() when `scrollController.atBottom` was true before the update
4. Pass `enableKeyboardScroll: true` to chat area SingleChildScrollView

**Success Criteria:**
1. j/k/PgUp/PgDn scroll the chat view
2. Mouse wheel scrolls the chat view
3. New content auto-scrolls to bottom (follow mode)
4. User can scroll up during streaming without being yanked back
5. Scrolling back to bottom re-enables follow mode
6. Existing scroll tests still pass

**Status:** Complete

---

### Phase 9: Streaming Experience

**Goal:** Make streaming responses feel responsive and informative.

**Requirements:** STREAM-01, STREAM-02, STREAM-03, STREAM-04

**Key Changes:**
1. Use `_isStreaming` param in `buildAssistantMessage` — show blinking `▌` cursor at end
2. Add 50ms throttle to setState in stateListener (batch rapid chunks)
3. In `agent_message_chunk` handler, log non-text content and render placeholder
4. Raise ThinkingBlock display limit from 500 to 10000 characters

**Success Criteria:**
1. Streaming assistant message shows visible cursor/indicator
2. Completed message removes the cursor
3. No visible flicker during rapid streaming
4. Non-text content shows "[unsupported content type: image]" placeholder
5. ThinkingBlock can display 5000+ characters when expanded

**Status:** Complete

---

### Phase 10: Tool Compatibility

**Goal:** Make tool call rendering work with any ACP agent, not just Amp.

**Requirements:** TOOL-01, TOOL-02, TOOL-03, TOOL-04

**Key Changes:**
1. Create tool name normalization map: `{read_file: 'Read', execute_command: 'Bash', shell: 'Bash', search: 'Grep', list_files: 'Glob', write_file: 'CreateFile', ...}`
2. Fix ToolCallResult.content extraction: try `c.text` first, then `c.content?.text`
3. All tool components: use `this.toolCall.kind ?? this.toolCall.title` in ToolHeader name prop
4. Each specialized tool: try multiple rawInput field names (e.g., BashTool tries `command`, `cmd`, `shell_command`, `script`, `args`)

**Success Criteria:**
1. Gemini's `read_file` tool renders with ReadTool (not GenericToolCard)
2. Codex's `shell` tool renders with BashTool
3. Tool headers show the actual tool name from the agent
4. ToolCallResult content is correctly extracted regardless of nesting

**Status:** Complete

---

### Phase 11: UX Polish

**Goal:** Clean up remaining UX issues for a production-ready experience.

**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05

**Key Changes:**
1. Permission Dialog: wrap in Stack with full-screen Container(color: semi-transparent black)
2. Remove all `console.error` debug logs (app.ts:112, any remaining in binding.ts)
3. Store `agentInfo` from initializeResponse, display name in BottomGrid
4. Markdown: merge consecutive non-empty lines into single paragraph
5. Markdown: add heading prefix chars (# → ━, ## → ─, ### → ·)

**Success Criteria:**
1. Permission dialog has dark overlay behind it
2. No debug output on stderr during normal operation
3. BottomGrid shows actual agent name (e.g., "Claude Code" not "ACP Agent")
4. Multi-line paragraphs in markdown render as single paragraph
5. Headings are visually distinguishable by level

**Status:** Complete

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROTO-01 | 7 | Complete |
| PROTO-02 | 7 | Complete |
| PROTO-03 | 7 | Complete |
| PROTO-04 | 7 | Complete |
| PROTO-05 | 7 | Complete |
| PROTO-06 | 7 | Complete |
| PROTO-07 | 7 | Complete |
| SCROLL-01 | 8 | Complete |
| SCROLL-02 | 8 | Complete |
| SCROLL-03 | 8 | Complete |
| SCROLL-04 | 8 | Complete |
| STREAM-01 | 9 | Complete |
| STREAM-02 | 9 | Complete |
| STREAM-03 | 9 | Complete |
| STREAM-04 | 9 | Complete |
| TOOL-01 | 10 | Complete |
| TOOL-02 | 10 | Complete |
| TOOL-03 | 10 | Complete |
| TOOL-04 | 10 | Complete |
| UX-01 | 11 | Complete |
| UX-02 | 11 | Complete |
| UX-03 | 11 | Complete |
| UX-04 | 11 | Complete |
| UX-05 | 11 | Complete |

**v0.2.0 requirements:** 25 total
**Mapped:** 25 (100%)
**Complete:** 25

---
*Roadmap created: 2026-03-26*
*Last updated: 2026-03-28 after v0.2.0 milestone completion*
