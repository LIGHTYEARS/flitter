# Phase 13: Session Lifecycle and App State - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild native session startup, prompt processing, cancellation, error propagation, and app-state transitions for `flitter-cli` to match Amp's session lifecycle exactly. This phase defines the state machine and backend integration contracts that all downstream UI phases depend on.

Guardrail: session lifecycle semantics defined here become the contract for later phases. UI phases cannot reinterpret state transitions or invent new lifecycle states.

</domain>

<decisions>
## Implementation Decisions

### Backend Integration Model
- Direct API calls (HTTP/SSE) to LLM backends — no subprocess or protocol middleware
- Abstract provider interface from day one — define a backend provider contract with Claude/Anthropic as the first implementation
- Authentication via API key from config/env (`ANTHROPIC_API_KEY` env var with config.json fallback)
- Streaming via SSE (Server-Sent Events) for real-time chunk delivery matching Amp's streaming behavior

### Session State Machine
- Lifecycle states: idle → processing → streaming → complete/error/cancelled — mirrors Amp's observable states
- Cancellation via AbortController for HTTP requests plus explicit cancel signal to backend if supported
- Observer pattern with addListener/notifyListeners for reactivity — proven to work with flitter-core widget rebuilds (from flitter-amp)
- Connection failures surface as explicit error state in the session model with message, retry option, and visual representation

### Session Metadata and Portability
- Session tracks: sessionId, startTime, cwd, model, tokenUsage, turnCount, title — minimum for status UI, persistence, and resume
- AppState delegates to ConversationState — port flitter-amp's proven separation of concerns
- Module structure: `src/state/` directory with `app-state.ts`, `session.ts`, `conversation.ts`
- Session state machine is fully testable without TUI — pure state layer with no rendering dependencies

### Claude's Discretion
- Exact provider interface shape and method signatures
- Internal state transition implementation (switch/case, discriminated union, etc.)
- Whether to port flitter-amp state code directly or rewrite from scratch
- Error classification granularity beyond the core error state

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-amp/src/state/app-state.ts` — full AppState with observer pattern, session metadata, conversation delegation
- `flitter-amp/src/state/conversation.ts` — immutable ConversationState with streaming buffer and structural sharing
- `flitter-amp/src/state/connection-state.ts` — connection phase/status types
- `flitter-amp/src/state/immutable-types.ts` — deep-readonly type wrappers for conversation items
- `flitter-amp/src/acp/types.ts` — conversation item type definitions (UserMessage, AssistantMessage, ToolCallItem, etc.)
- `flitter-cli/src/state/config.ts` — existing config/args parsing from Phase 12
- `flitter-cli/src/utils/logger.ts` — existing file-based logger from Phase 12

### Established Patterns
- Observer pattern (addListener/notifyListeners) for state → widget reactivity
- Immutable snapshots with version counter for efficient change detection
- Streaming text buffer with coalesced flush scheduling
- O(1) tool call lookup via Map<toolCallId, index>
- Atomic file writes for crash-safe persistence

### Integration Points
- `flitter-cli/src/bootstrap-shell.ts` — current TUI entry point, will be replaced by session-aware app shell
- `flitter-cli/src/index.ts` — CLI entry point that initializes config/logging before TUI
- `flitter-core` runApp/WidgetsBinding — rendering entry point

</code_context>

<specifics>
## Specific Ideas

- Provider interface should be minimal: `sendPrompt(messages, options) → AsyncIterable<StreamEvent>`, `cancelRequest() → void`
- Session state machine should be a pure function: `(currentState, event) → nextState` for testability
- Port flitter-amp's ConversationState immutable snapshot pattern — it's proven and matches flitter-core's rebuild model
- Error states should capture enough context for the UI to show actionable recovery (retry, reconfigure, etc.)

</specifics>

<deferred>
## Deferred Ideas

- Actual UI rendering of session states belongs to Phase 15 (Chat View)
- Prompt history and persistence belong to Phase 21
- Overlay/permission flows belong to Phase 17
- Tool call dispatch and rendering belong to Phase 18
- Reconnection and heartbeat logic may not apply to direct API model — evaluate during implementation

</deferred>
