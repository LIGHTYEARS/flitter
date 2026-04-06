# Phase 23: InputArea Rich Border - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the standalone HeaderBar and StatusBar with AMP's borderOverlayText mechanism. All metadata (context window %, skill count, model/mode, cwd/branch, streaming stats) is embedded directly into InputArea's four border lines. HeaderBar and StatusBar rows are removed from the app-shell layout. InputArea defaults to 3-line editing area with resizable bottom grid.

</domain>

<decisions>
## Implementation Decisions

### Border text rendering mechanism
- **D-01:** Implement a true `borderOverlayText` rendering primitive in flitter-core that replaces border characters with text at specified positions (top-left, top-right, bottom-left, bottom-right), matching AMP's `buildBorderTransparentTextWidget` mechanism. Do NOT use the current `Stack` + `Positioned` overlay approach — text must genuinely replace border line characters so the visual result is `╭─11% of 300k───...──smart──!─77─skills─╮` where text is part of the border line, not layered on top.
- **D-02:** The rendering primitive must accept an array of `{ position, child: Widget }` overlay specs and integrate with `drawBorderSides` (or a new border paint path) so that the border line drawing leaves gaps where overlay text is placed, then renders the text widgets in those gaps.
- **D-03:** Each position (top-left, top-right, bottom-left, bottom-right) connects its text to the border line with `─` separator characters. AMP format: `╭─{top-left-text}───...───{top-right-text}─╮` — text flows seamlessly into the border.

### Border content: four positions
- **D-04:** Top-left: context window usage percentage when conversation active (e.g., `11% of 300k`), with threshold coloring: <50% default dim, 50-80% warning (yellow), >80% destructive (red). During streaming also shows cost and elapsed: `11% of 300k · $0.41 · 3s`. Idle with no conversation: empty (pure border line).
- **D-05:** Top-right: agent mode label (e.g., `smart`) in mode color + skill warning indicator `!` (when skillWarningCount > 0) + skill count + `skills` label (e.g., `smart──!─77─skills`). Skill count section is clickable — opens Skills modal. `!` and count use warning color; mode label uses mode-specific color (smartModeColor for smart mode).
- **D-06:** Bottom-left: context-dependent status messages. Streaming: `Esc to cancel` (Esc in keybind blue, rest dim). Waiting for approval: `Waiting for approval...` (dim). Running tools: `Running tools...` (dim). Idle: empty (no "? for shortcuts" — that does not exist in AMP).
- **D-07:** Bottom-right: shortened cwd + git branch (e.g., `~/.oh-my-coco/studio/flitter (master)`), dim foreground. Path shortened via `toHomeRelative()` + `shorten()`.

### HeaderBar and StatusBar removal
- **D-08:** Remove `HeaderBar` widget from app-shell Column layout. Migrate all its rendering logic (WaveSpinner, token usage formatting, cost/elapsed formatting, threshold coloring) into the border builder functions.
- **D-09:** Remove `StatusBar` widget from app-shell Column layout. Migrate all its rendering logic (footer text states, cwd/branch display, context warning, copy highlight) into the border builder functions and app-shell state.
- **D-10:** After removal, app-shell Column becomes: `[Expanded(ChatView), InputArea]` — only two children. InputArea is the bottom-most element, its `╯` is the last rendered line.

### InputArea height: minLines 3
- **D-11:** InputArea defaults to `minLines: 3` (3 content lines + 2 border lines = 5 total lines), matching AMP golden files where InputArea is always 5 lines tall (L58-L62). Current `MIN_HEIGHT = 3` (1 content + 2 border) must change to `MIN_HEIGHT = 5` (3 content + 2 border).

### Bottom grid resize
- **D-12:** Implement `bottomGridUserHeight` global state that persists the user-adjusted InputArea height. User can drag the top edge of InputArea (via a MouseRegion on the top border line) to resize the split between chat area and InputArea.
- **D-13:** Drag handle is the top border line itself — MouseRegion on `top:0, left:0, right:0` (already exists in input-area.ts L447-460). Dragging up increases InputArea height, dragging down decreases it. Minimum is minLines (3 content lines).

### agentModePulse animation
- **D-14:** Implement AMP's `wTT` shimmer animation on InputArea top border when agent mode changes. Animation direction: right-to-left, trail length: 5 characters, using lerpColor between mode color and default border color. Requires a timer/animation tick mechanism — if flitter-core lacks one, add it.
- **D-15:** Animation triggers on agent mode transition (e.g., idle → smart, smart → shell). Runs for a finite duration then stops. The shimmer affects only the top border line characters.

### Claude's Discretion
- Exact animation FPS and duration for agentModePulse (AMP uses configurable fps/speed)
- Whether `bottomGridUserHeight` persists across sessions or is session-only
- Internal architecture of border builder functions (how many functions, naming)
- How to handle truncation when border content exceeds available width

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AMP reverse-engineered source
- `tmux-capture/amp-source/25_input_area_full.js` — AMP InputArea implementation: `buildBorderTransparentTextWidget`, `overlayTexts` array, `IhR` custom RenderObject, `wTT` shimmer animation, `bottomGridUserHeight`
- `tmux-capture/amp-source/07a_footer_status_yB.js` — AMP footer status logic: `yB()` state machine (streaming/tools/approval/idle), wave animation symbols

### AMP golden screenshots
- `tmux-capture/screens/welcome/plain-63x244.golden` L58-L62 — InputArea with rich border (5 lines, top-right mode+skills, bottom-right cwd/branch)
- `tmux-capture/screens/conversation-reply/plain-63x244.golden` L58-L62 — InputArea with top-left context usage `╭─11% of 300k───`
- `tmux-capture/screens/streaming-with-subagent/plain-63x244.golden` L58-L63 — Streaming state borders
- `tmux-capture/screens/hitl-confirmation/plain-63x244.golden` L58-L63 — Approval state borders

### Fidelity audit
- `MISSING-FEATURES.md` — 38 feature gaps + 42 VF issues; Issues 5-10, 15-16, 22, 25, 28 are directly Phase 23 scope

### flitter-core rendering primitives
- `packages/flitter-core/src/layout/render-decorated.ts` — `RenderDecoratedBox`, `BoxDecoration`, `Border`, `BorderSide`
- `packages/flitter-core/src/scheduler/paint-context.ts` L263-398 — `drawBorder()`, `drawBorderSides()`
- `packages/flitter-core/src/painting/border-painter.ts` — `BOX_DRAWING` constants, `drawHorizontalDivider`, `drawVerticalDivider`

### Current implementation (to be modified)
- `packages/flitter-cli/src/widgets/input-area.ts` — Current InputArea: `BorderOverlayText` interface (L48-51), Positioned overlay (L431-444), border via Container+BoxDecoration (L360-395)
- `packages/flitter-cli/src/widgets/header-bar.ts` — To be removed; migrate formatting helpers (`formatTokenCount`, `formatElapsed`, `thresholdColor`)
- `packages/flitter-cli/src/widgets/status-bar.ts` — To be removed; migrate footer state logic (`getFooterText`, `buildLeft`, `buildRight`)
- `packages/flitter-cli/src/widgets/app-shell.ts` L776-823 — Layout Column composition (HeaderBar + InputArea + StatusBar → InputArea only)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HeaderBar.formatTokenCount()` / `formatElapsed()` / `thresholdColor()` — formatting helpers to migrate into border builders
- `StatusBar.getFooterText()` / `buildLeft()` / `buildRight()` — footer state machine to migrate into border builders
- `BorderOverlayText` interface in input-area.ts — already defines the `{ position, child }` contract, can be reused
- `BOX_DRAWING` constants in border-painter.ts — character lookup for all border styles (rounded/solid/dashed/double)
- `MouseRegion` drag handle already exists on InputArea top border (L447-460)

### Established Patterns
- Widget composition: `Stack` + `Positioned` for overlay positioning (current approach — will be replaced by core primitive)
- Border rendering: `Container` → `BoxDecoration` → `RenderDecoratedBox._paintDecoration()` → `ctx.drawBorderSides()`
- State management: AppShell passes data down via constructor props (no global state bus)
- Color theming: `CliThemeProvider` wraps entire app; colors accessed via `Color.*` static instances

### Integration Points
- `app-shell.ts` build() method — where HeaderBar/StatusBar are composed into Column layout
- `RenderDecoratedBox._paintDecoration()` — where border painting happens; needs extension for overlay text
- `input-area.ts` build() — where border overlays are assembled; needs new builder functions for 4 positions
- `AppShellState` — holds all the state data (isProcessing, tokenUsage, cwd, gitBranch, etc.) that feeds into border content

</code_context>

<specifics>
## Specific Ideas

- AMP golden files are the pixel-level reference: `╭─11% of 300k───...───smart──!─77─skills─╮` is the exact target format
- "If flitter-core's capabilities are insufficient, prioritize modifying flitter-core first" — user explicitly authorized core framework changes
- The `buildBorderTransparentTextWidget` mechanism in AMP creates a widget where the text background is transparent against the border line, so the text appears embedded in the border — not floating on top
- AMP's `IhR` is a custom RenderObject that manages the entire bottom grid (InputArea + panels + overlays + resize). flitter-cli should implement equivalent functionality, potentially as a custom RenderObject or a carefully composed widget tree

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-inputarea-rich-border*
*Context gathered: 2026-04-06*
