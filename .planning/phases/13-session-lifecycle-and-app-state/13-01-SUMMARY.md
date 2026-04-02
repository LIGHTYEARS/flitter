---
phase: 13-session-lifecycle-and-app-state
plan: 01
subsystem: state
tags: [session, lifecycle, state-machine, observer, provider, anthropic, sse, streaming, types]

requires:
  - phase: 12-native-bootstrap-and-runtime-shell
    provides: "flitter-cli scaffold, config namespace, logger"
provides:
  - "Complete native conversation item type system (UserMessage, AssistantMessage, ToolCallItem, ThinkingItem, PlanItem, SystemMessage, UsageInfo)"
  - "Deterministic session lifecycle state machine (idle/processing/streaming/complete/error/cancelled)"
  - "SessionMetadata tracking (sessionId, turnCount, tokenUsage, cwd, model, title, gitBranch)"
  - "Observer pattern (addListener/removeListener/notifyListeners) for state reactivity"
  - "Streaming text/thinking buffer with coalesced flush"
  - "O(1) tool call lookup via Map"
  - "Abstract Provider interface for backend-agnostic LLM integration"
  - "AnthropicProvider with SSE streaming, native fetch, cooperative cancellation"
  - "StreamEvent discriminated union for provider output"
affects: [14-app-state-and-conversation, 15-chat-view, 18-tool-rendering, 21-session-persistence]

tech-stack:
  added: [native-fetch, sse-streaming]
  patterns: [observer-pattern, immutable-snapshots, state-machine, discriminated-unions, async-iterable-streaming]

key-files:
  created:
    - packages/flitter-cli/src/state/types.ts
    - packages/flitter-cli/src/state/session.ts
    - packages/flitter-cli/src/__tests__/session.test.ts
    - packages/flitter-cli/src/provider/provider.ts
    - packages/flitter-cli/src/provider/anthropic.ts
  modified: []

key-decisions:
  - "Self-contained type system with zero external dependencies — no imports from flitter-amp or ACP SDK"
  - "SessionState embeds conversation items directly (not delegating to a separate ConversationState class) for simpler single-class ownership"
  - "Provider interface uses AsyncIterable<StreamEvent> for streaming — composable with for-await-of"
  - "AnthropicProvider uses native fetch() with no HTTP library dependency"
  - "HTTP 429 and 5xx errors marked retryable; 401/400 marked non-retryable"

patterns-established:
  - "StateListener observer pattern: addListener(fn)/removeListener(fn)/notifyListeners() for widget rebuild reactivity"
  - "Streaming buffer pattern: appendChunk accumulates in buffer, flushStreamingText merges into snapshot"
  - "Lifecycle guard pattern: invalid transitions are logged warnings and no-ops, never throws"
  - "Version counter: monotonic bump on every mutation for O(1) dirty-check"

requirements-completed: [SESS-01, SESS-04]

duration: 12min
completed: 2026-04-03
---

# Phase 13 Plan 01: Session Lifecycle Foundation Summary

**Native type system, deterministic session state machine with observer pattern, and abstract Anthropic SSE provider for flitter-cli**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-03T18:18:00Z
- **Completed:** 2026-04-03T18:30:00Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- Complete conversation item type system ported from flitter-amp without any ACP/coco coupling
- Pure session state machine with 6 lifecycle states and deterministic guarded transitions
- 37 tests covering all lifecycle transitions, observer pattern, metadata tracking, conversation items, tool calls, and newThread
- Abstract Provider interface enabling backend-agnostic LLM integration
- Anthropic SSE streaming implementation with proper error handling and cooperative cancellation

## Task Commits

Each task was committed atomically:

1. **Task 1: Define native conversation and session type system** - `9141fc7` (feat)
2. **Task 2: Implement pure session state machine with observer pattern** - `f152178` (test: failing), `bdff100` (feat: implementation)
3. **Task 3: Define abstract provider interface and Anthropic implementation** - `bf450f1` (feat)

## Files Created/Modified
- `packages/flitter-cli/src/state/types.ts` - All conversation item types, session lifecycle, metadata, error, and stream event types
- `packages/flitter-cli/src/state/session.ts` - Pure session state machine with observer pattern, streaming buffers, tool call management
- `packages/flitter-cli/src/__tests__/session.test.ts` - 37 tests covering lifecycle transitions, listeners, metadata, items, tool calls, plan/usage, newThread
- `packages/flitter-cli/src/provider/provider.ts` - Abstract Provider interface and PromptOptions
- `packages/flitter-cli/src/provider/anthropic.ts` - Anthropic Messages API SSE streaming implementation

## Decisions Made
- Kept type system self-contained with zero external dependencies for clean package boundary
- Embedded conversation items directly in SessionState rather than delegating to a separate ConversationState class (simpler ownership, can refactor later if needed)
- Used AsyncIterable<StreamEvent> for the provider interface — composable with for-await-of loops
- Used native fetch() for Anthropic API calls — no HTTP library needed (Bun provides this)
- HTTP 429 and 5xx marked retryable; 401/400 marked non-retryable for UI recovery flow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Session lifecycle foundation complete — types, state machine, and provider contract are ready
- Ready for Plan 13-02 (AppState integration and conversation delegation)
- All exports are stable and can be consumed by downstream phases

---
*Phase: 13-session-lifecycle-and-app-state*
*Completed: 2026-04-03*
