# Phase 14: Conversation and Turn Model - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the native `flitter-cli` turn model and assistant grouping semantics used by the chat surface. This phase creates the data layer that Phase 15 (Chat View) will render. Turn grouping semantics defined here become the contract for all downstream rendering phases.

</domain>

<decisions>
## Implementation Decisions

### Turn Grouping Model
- Group thinking + text + tool calls into a single AssistantTurn (matches Amp's visual grouping)
- 1 user message + 1 assistant turn = 1 conversation exchange pair
- ConversationState from Phase 13 gains turn-level accessors for grouped iteration
- Screen states are first-class: welcome, empty, loading, processing, error
- Turn model is pure data with no rendering dependencies

### Streaming and Interruption
- Interruption marks the user message as `interrupted` and truncates the assistant turn
- Turn-level `isStreaming` is derived from any streaming child item (thinking, text, or tool)
- Completed turns are immutable; only the active (latest) turn mutates during streaming
- Port Amp's exact streaming-text buffering approach from Phase 13's SessionState

### Claude's Discretion
- Exact AssistantTurn type shape and grouping algorithm
- Whether turns are computed views or stored data
- ScreenState implementation (enum, discriminated union, etc.)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-cli/src/state/types.ts` — ConversationItem union, all item types already defined
- `flitter-cli/src/state/session.ts` — SessionState with items array, streaming buffers, observer pattern
- `flitter-amp/src/state/conversation.ts` — reference for turn grouping logic and snapshot pattern

### Established Patterns
- Immutable snapshots with version counter (from Phase 13)
- Observer pattern for state -> widget reactivity
- Discriminated union types for variant handling

### Integration Points
- `SessionState.items` — raw conversation items that need to be grouped into turns
- `AppState` — will expose turn-level accessors to the UI layer
- Phase 15 (Chat View) will consume turns for rendering

</code_context>

<specifics>
## Specific Ideas

- AssistantTurn should aggregate: thinking items, assistant message, tool calls, plan items
- Turn-level computed properties: isStreaming, isComplete, hasToolCalls, hasThinking
- ScreenState should capture enough context for the UI to render the right placeholder (welcome message, loading spinner, error with recovery)

</specifics>

<deferred>
## Deferred Ideas

- Actual rendering of turns belongs to Phase 15 (Chat View)
- Tool call expansion/collapse UI belongs to Phase 18
- Thinking block visual hierarchy belongs to Phase 19

</deferred>
