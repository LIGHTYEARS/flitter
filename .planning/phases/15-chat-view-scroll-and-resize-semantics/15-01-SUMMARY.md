---
phase: 15-chat-view-scroll-and-resize-semantics
plan: "01"
subsystem: ui
tags: [stateful-widget, chat-view, turn-rendering, screen-dispatch, app-shell, focus-scope]

requires:
  - phase: 14-conversation-and-turn-model
    provides: Turn model types (UserTurn, AssistantTurn, TurnStatus), ConversationState, ScreenState derivation, AppState integration
provides:
  - ChatView StatefulWidget with screen state dispatch and turn rendering
  - AppShell root widget with FocusScope and layout structure
  - UserTurnWidget with Amp-style left-border rendering
  - AssistantTurnWidget with StickyHeader and placeholder renderers
  - Screen placeholders (welcome, empty, loading, error)
  - startAppShell() entry point replacing startBootstrapShell()
affects: [15-02-scroll-follow-scrollbar, 15-03-tests, 16-input-area, 18-tool-rendering, 19-markdown, 20-status-themes-motion]

tech-stack:
  added: []
  patterns:
    - "ChatView owns AppState listener (initState/dispose lifecycle)"
    - "Screen state dispatch at top-level build() via switch on screenState.kind"
    - "Welcome/empty/loading/error bypass ScrollView using Center (Amp BUG-1 pattern)"
    - "Placeholder strategy for deferred rendering phases (tools, markdown, thinking, plans)"
    - "AppShell as root StatefulWidget with FocusScope for global key handling"

key-files:
  created:
    - packages/flitter-cli/src/widgets/chat-view.ts
    - packages/flitter-cli/src/widgets/app-shell.ts
  modified:
    - packages/flitter-cli/src/index.ts
    - packages/flitter-cli/src/bootstrap-shell.ts

key-decisions:
  - "ChatView is a StatefulWidget (not StatelessWidget) — owns AppState listener lifecycle"
  - "Processing and ready both render conversation view — streaming difference is in AssistantTurn.isStreaming"
  - "Turn rendering as module-level functions (not separate widget classes) — simpler, no unnecessary element overhead"
  - "Placeholder renderers for tools/markdown/thinking/plans — specialized renderers drop in at Phases 18-19"
  - "AppShell wraps Column > Expanded > Padding > ChatView — Plan 02 inserts ScrollView between Expanded and ChatView"
  - "BootstrapShell marked @deprecated, not deleted (behavioral constraint: no unsolicited deletion)"

patterns-established:
  - "ChatView screen state dispatch pattern: switch on screenState.kind with typed branch per variant"
  - "User turn border color convention: green=normal, yellow=interrupted, brightCyan=selected"
  - "Assistant turn StickyHeader wrapping with shrink header (empty) and body Column"
  - "System message rendering: horizontal rule + dim italic text + horizontal rule"

requirements-completed: [CHAT-01]

duration: 12min
completed: 2026-04-03
---

# Phase 15 Plan 01: ChatView Widget Tree and Screen State Dispatch Summary

**ChatView StatefulWidget with screen state dispatch, turn rendering (user/assistant), AppShell root widget, and screen placeholders for all 6 ScreenState variants**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-03T03:44:00Z
- **Completed:** 2026-04-03T03:56:00Z
- **Tasks:** 5
- **Files modified:** 4

## Accomplishments
- ChatView StatefulWidget that dispatches to 6 screen state builders (welcome, empty, loading, processing, error, ready)
- UserTurnWidget with Amp-style colored left border (green/yellow/brightCyan) and italic text
- AssistantTurnWidget with StickyHeader wrapper and placeholder renderers for thinking, tools, plans, system messages
- AppShell root widget with FocusScope (Ctrl+C cancel/exit, Esc exit) and Column > Expanded > Padding > ChatView layout
- CLI entry (index.ts) wired to startAppShell(), BootstrapShell marked @deprecated

## Task Commits

Each task was committed atomically:

1. **Task 1-3: ChatView with turn rendering and screen placeholders** - `d1f5ad4` (feat)
2. **Task 4: AppShell root widget** - `3920094` (feat)
3. **Task 5: Wire AppShell into CLI entry** - `c2fd934` (feat)

## Files Created/Modified
- `packages/flitter-cli/src/widgets/chat-view.ts` - ChatView StatefulWidget, turn renderers, screen placeholders
- `packages/flitter-cli/src/widgets/app-shell.ts` - AppShell root widget with FocusScope and layout
- `packages/flitter-cli/src/index.ts` - Wired startAppShell() replacing startBootstrapShell()
- `packages/flitter-cli/src/bootstrap-shell.ts` - Marked @deprecated (BootstrapShell class and startBootstrapShell function)

## Decisions Made
- ChatView owns its AppState listener lifecycle (initState registers, dispose removes) — not delegated to parent
- Turn rendering implemented as module-level functions rather than separate widget classes — avoids unnecessary element overhead for simple structural builders
- Processing and ready screen states both render the conversation view — the visual difference is entirely in AssistantTurn.isStreaming which is already encoded in the turn model
- Placeholder strategy for tool calls, markdown, thinking blocks, and plan items — dim text placeholders that specialized renderers (Phases 18-19) will replace without changing the layout contract
- Unused Turn type import removed after TypeScript strict check caught it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused Turn type import**
- **Found during:** Type-check verification after all tasks
- **Issue:** `Turn` type was imported but only `UserTurn` and `AssistantTurn` were used (TypeScript error TS6196)
- **Fix:** Removed `Turn` from the import statement
- **Files modified:** packages/flitter-cli/src/widgets/chat-view.ts
- **Verification:** `tsc --noEmit` passes cleanly
- **Committed in:** c2fd934 (amended into Task 5 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial unused import fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ChatView widget tree is renderable and ready for Plan 02 to wrap in SingleChildScrollView + Scrollbar
- AppShell layout has Expanded slot ready for scroll infrastructure insertion
- All 178 existing tests pass, type-check is clean
- Ready for 15-02 (scroll, follow, scrollbar, resize)

---
*Phase: 15-chat-view-scroll-and-resize-semantics*
*Completed: 2026-04-03*
