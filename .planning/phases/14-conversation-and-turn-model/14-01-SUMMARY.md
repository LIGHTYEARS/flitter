---
phase: 14-conversation-and-turn-model
plan: 01
subsystem: state
tags: [turn-model, conversation, grouping, caching, typescript]

requires:
  - phase: 13-session-lifecycle-and-app-state
    provides: SessionState with items array, version counter, streaming buffers, observer pattern
provides:
  - Turn model types (UserTurn, AssistantTurn, Turn, TurnStatus)
  - ConversationState with cached turn-level grouped accessors over SessionState
  - groupItemsIntoTurns standalone function for direct testability
affects: [15-chat-view, 18-tool-rendering, 19-thinking-blocks]

tech-stack:
  added: []
  patterns: [turn-grouping-algorithm, version-based-cache-invalidation, builder-pattern-for-turn-construction]

key-files:
  created:
    - packages/flitter-cli/src/state/turn-types.ts
    - packages/flitter-cli/src/state/conversation.ts
    - packages/flitter-cli/src/__tests__/conversation.test.ts
  modified: []

key-decisions:
  - "Turn types use 'kind' discriminant (user/assistant) separate from ConversationItem 'type' discriminant to avoid confusion"
  - "ConversationState uses composition (wraps SessionState) not inheritance, consistent with AppState pattern"
  - "groupItemsIntoTurns exported as standalone function for direct unit testability"
  - "AssistantTurn computed properties (isStreaming, isComplete, status) derived at grouping time, not lazily"
  - "Empty AssistantTurn created after every UserTurn (even adjacent user messages) for uniform iteration"

patterns-established:
  - "Builder pattern: AssistantTurnBuilder accumulates items, finalizeAssistantTurn computes derived properties"
  - "Version-gated caching: ConversationState recomputes turns only when SessionState.version changes"
  - "Turn status priority: streaming > interrupted > error (all tools failed) > complete"

requirements-completed: [TURN-01, TURN-02, TURN-03]

duration: 5min
completed: 2026-04-03
---

# Phase 14 Plan 01: Turn Model Types and ConversationState Summary

**Turn model domain types (UserTurn, AssistantTurn, TurnStatus) and ConversationState with cached turn grouping over SessionState.items**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T02:24:10Z
- **Completed:** 2026-04-03T02:29:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Defined explicit turn model types (UserTurn, AssistantTurn, Turn, TurnStatus) as native domain objects
- Implemented groupItemsIntoTurns algorithm that groups flat ConversationItem arrays into alternating UserTurn/AssistantTurn sequences
- Built ConversationState wrapper with version-based caching — recomputes only when SessionState.version changes
- Turn-level computed properties (isStreaming, isComplete, isInterrupted, hasToolCalls, hasThinking, status) derived from children states
- 28 tests covering all turn grouping behaviors, edge cases, caching, and ConversationState accessors

## Task Commits

Each task was committed atomically:

1. **Task 1: Define turn model types** - `982287a` (feat)
2. **Task 2: Implement ConversationState with turn grouping** - TDD cycle:
   - RED: `239e1f2` (test: add failing tests for ConversationState turn grouping)
   - GREEN: `cacb35e` (feat: implement ConversationState with turn grouping and caching)
   - REFACTOR: `8df1cd2` (refactor: remove dead endIndex tracking from AssistantTurnBuilder)

## Files Created/Modified
- `packages/flitter-cli/src/state/turn-types.ts` - Turn model domain types (TurnStatus, UserTurn, AssistantTurn, Turn)
- `packages/flitter-cli/src/state/conversation.ts` - ConversationState with groupItemsIntoTurns algorithm and version-cached accessors
- `packages/flitter-cli/src/__tests__/conversation.test.ts` - 28 tests (18 grouping + 10 ConversationState wrapper) with 113 assertions

## Decisions Made
- Used `kind` discriminant ('user' | 'assistant') on turns to avoid collision with ConversationItem `type` discriminant
- ConversationState wraps SessionState via composition (same pattern as AppState from Phase 13)
- Exported groupItemsIntoTurns as a standalone named export for direct unit testing without SessionState
- AssistantTurn computed properties are eagerly derived during grouping (not lazy getters) for simplicity and immutability
- Empty AssistantTurns created after every UserTurn for uniform iteration even when user messages are adjacent

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Turn model data layer is complete and tested
- ConversationState provides the grouped turn view that Phase 15 (Chat View) will render
- No blockers for downstream phases

---
*Phase: 14-conversation-and-turn-model*
*Completed: 2026-04-03*
