# Phase 15: Chat View, Scroll, and Resize Semantics - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Achieve parity in chat rendering, sticky sections, scroll behavior, follow mode, scrollbar, and resize handling. This phase builds the visual chat surface on top of Phase 14's turn model and Phase 13's session state.

Guardrail: if flitter-core's ScrollView, layout, or input capabilities cannot meet the requirements, this phase should identify the gaps and a follow-up phase (e.g., 15.1) should close them before continuing.

</domain>

<decisions>
## Implementation Decisions

### Chat Layout
- Reuse flitter-core Column/ScrollView for chat layout with bottom-anchored rendering
- Turns from Phase 14 rendered as widget groups (UserTurnWidget, AssistantTurnWidget)
- Sticky header for current assistant turn during scroll
- ScreenState from Phase 14 drives welcome/loading/error placeholders
- If flitter-core capabilities are insufficient, insert a gap-closure phase to extend the framework first

### Scroll and Resize
- Follow mode auto-scrolls during streaming, breaks on manual scroll-up
- Scrollbar matches flitter-amp's visual style (right-aligned, proportional)
- Resize recalculates layout immediately; preserves scroll position relative to content
- Mouse scroll uses flitter-core's existing mouse event handling

### Claude's Discretion
- Internal widget tree structure for chat view
- Whether to port flitter-amp ChatView directly or rewrite
- Scroll offset persistence strategy
- Performance optimization for large conversation lists

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-core/src/widgets/scroll-view.ts` — SingleChildScrollView with keyboard and mouse scroll
- `flitter-amp/src/widgets/chat-view.ts` — existing ChatView with sticky grouping (reference)
- `flitter-cli/src/state/app-state.ts` — AppState with turns, currentTurn, screenState accessors
- `flitter-cli/src/state/turn-types.ts` — Turn, UserTurn, AssistantTurn types
- `flitter-cli/src/state/screen-state.ts` — ScreenState for placeholder selection

### Established Patterns
- Widget composition via flitter-core's declarative build() pattern
- StatefulWidget + State for interactive widgets
- Observer pattern connecting AppState changes to widget rebuilds

### Integration Points
- `AppState.turns` — provides grouped conversation turns to render
- `AppState.screenState` — determines which placeholder to show
- `flitter-core runApp()` — rendering pipeline entry

</code_context>

<specifics>
## Specific Ideas

- ChatView should be a StatefulWidget that listens to AppState changes
- Each Turn renders via a TurnWidget that dispatches to UserTurnWidget or AssistantTurnWidget
- Scroll position management: track viewport position, auto-scroll on new content if at bottom
- Welcome screen: centered branding/instructions when screenState is 'welcome'

</specifics>

<deferred>
## Deferred Ideas

- Input area belongs to Phase 16
- Tool card rendering belongs to Phase 18
- Markdown rendering belongs to Phase 19
- Status bar belongs to Phase 20

</deferred>
