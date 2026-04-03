# Phase 16: Input, Focus, and Editing Experience - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Recreate Amp's input ergonomics, multi-line editing, shell mode, focus routing, and trigger-based input behavior for flitter-cli. This phase builds the input area that the chat view (Phase 15) currently lacks, completing the basic interactive loop.

</domain>

<decisions>
## Implementation Decisions

### Input Area
- Port TextField with multi-line editing (Shift+Enter for newline, Enter for submit)
- Input area renders below the chat view in the AppShell Column layout
- Border overlays, mode badges, and contextual labels
- Input area has default focus in the app

### Focus Routing
- Input area has default focus; overlays capture focus when active
- Key events bubble from input through AppShell to global handlers
- Focus returns to input after overlay dismissal

### Shortcut Matrix
- Ctrl+C: cancel in-flight prompt or exit application
- Ctrl+O: open external editor for long input
- Ctrl+L: clear conversation display
- Alt+T: toggle dense/theme view
- Ctrl+G: git branch info (stub for Phase 17)
- Ctrl+R: history search (stub for Phase 21)
- Esc: close overlay or exit if no overlay
- ?: show shortcuts help when input is empty

### Shell Mode
- Shell mode toggle for direct command execution
- Visual indicator in input area border/badge

### Stubs
- Autocomplete and file-trigger integration deferred to Phase 17
- History search UI deferred to Phase 21

### Claude's Discretion
- Input widget composition details
- Border decoration styling
- Mode badge rendering approach
- Key event handling implementation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-core/src/widgets/text-field.ts` — existing TextField widget
- `flitter-amp/src/widgets/input-area.ts` — reference for input area composition
- `flitter-cli/src/widgets/app-shell.ts` — currently has placeholder for InputArea (Phase 16 slot)
- `flitter-cli/src/state/app-state.ts` — AppState with cancelPrompt, isProcessing, lifecycle

### Integration Points
- AppShell Column children: [Expanded(ChatView), InputArea, StatusBar(Phase 20)]
- AppState.submitPrompt() for prompt submission
- PromptController for send/cancel lifecycle

</code_context>

<deferred>
## Deferred Ideas

- Autocomplete overlay belongs to Phase 17
- History search UI belongs to Phase 21
- Status bar belongs to Phase 20
- Full tool UI belongs to Phase 18

</deferred>
