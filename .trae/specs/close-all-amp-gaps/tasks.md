# Tasks -- Close All AMP Gaps

Implementation is organized into 6 waves. Tasks within a wave are parallelizable unless noted.

Test commands: `cd packages/flitter-core && bun test` / `cd packages/flitter-amp && bun test`
Type-check: `cd packages/flitter-core && bun run typecheck` / `cd packages/flitter-amp && bun run typecheck`

---

## Wave 1: P0 Blockers (3 tasks, sequential start then parallel)

### Critical prerequisite: renderer.ts is truncated on disk at line 285. Must be fixed FIRST.

- [x] Task W1-1: Complete Renderer class in `packages/flitter-core/src/terminal/renderer.ts`
  - [x] W1-1.1: Complete the truncated `CursorState` interface (shape, position, visible)
  - [x] W1-1.2: Implement `Renderer` class with `render(diff: RowPatch[], cursor: CursorState): string` method
  - [x] W1-1.3: Add `setCapabilities(caps: TerminalCapabilities)` and `resetState()` methods
  - [x] W1-1.4: Ensure `renderer.test.ts`, `renderer-cursor-opt.test.ts`, `renderer-fallback.test.ts` all PASS (86/86)
  - [x] W1-1.5: Run full `bun test` in flitter-core -- 3640/3640 pass, no regressions

- [x] Task W1-2: ACP Reconnection + LiveHandle wiring in `packages/flitter-amp/src/index.ts` (GAP-SUM-001, GAP-SUM-002)
  - [x] W1-2.1: Import `ReconnectionManager`, `HeartbeatMonitor`, `ActivityTracker`, `LiveHandle` in index.ts
  - [x] W1-2.2: After `connectToAgent()` succeeds, wrap `handle` in `new LiveHandle(handle)` -- all closures read from `liveHandle.current`
  - [x] W1-2.3: Create `ReconnectionManager` with `connectFn`
  - [x] W1-2.4: Wire `handle.agent.onExit` to auto-reconnect via `attachExitMonitor()`
  - [x] W1-2.5: Create `HeartbeatMonitor` with `pingAgent()` function, on health change update `appState.healthStatus`
  - [x] W1-2.6: Wire `ActivityTracker` to track user input timestamps
  - [x] W1-2.7: `acp-reconnection-integration.test.ts` PASSES
  - [x] W1-2.8: Run full `bun test` in flitter-amp -- 835/835 pass, no regressions

- [x] Task W1-3: Renderer cursor optimization verification (GAP-SUM-003)
  - [x] W1-3.1: `renderer-cursor-opt.test.ts` passes (sequential cells skip CUP) -- verified as part of W1-1
  - [x] W1-3.2: No fixes needed -- all cursor tracking tests pass

## Wave 2: P1 Rendering Pipeline + Input System (4 tasks, parallel)

- [x] Task W2-1: Remove present() redundant back buffer clear (GAP-SUM-013)
  - [x] In `packages/flitter-core/src/terminal/screen-buffer.ts`, remove `this.backBuffer.clear()` call inside `present()` method (after buffer swap, back buffer should retain old front for next diff)

- [x] Task W2-2: Control character filtering in Renderer (GAP-SUM-014)
  - [x] Verify W1-1 included control char filtering. If not, add `isControlChar(code: number): boolean` check in render loop -- skip chars with codepoint < 0x20 (except 0x09 tab)

- [x] Task W2-3: Kitty CSI u keyboard protocol parsing (GAP-SUM-012)
  - [x] In `packages/flitter-core/src/input/input-parser.ts`, add CSI u terminator branch in `_resolveCSI()` method
  - [x] Parse format: `CSI unicode-key-code:shifted-key;modifiers:event-type u`
  - [x] Map to existing KeyEvent structure
  - [x] Add tests in `input-parser.test.ts` for Kitty protocol sequences

- [x] Task W2-4: RepaintBoundary Phase 2/3 -- selective dirty region rendering (GAP-SUM-016)
  - [x] In `screen-buffer.ts`, modify `getDiff()` to track dirty regions per RepaintBoundary
  - [x] Only clear and diff cells within dirty regions, not full screen
  - [x] In `rendering/render-repaint-boundary.ts`, propagate dirty state to PipelineOwner
  - [x] Test: ensure partial screen updates only repaint changed regions

## Wave 3: P1 Text/ACP/Visual (11 tasks, parallel except T1-9 depends on Wave 1)

- [x] Task W3-1: GFM table column alignment (GAP-SUM-025)
  - [x] In `packages/flitter-core/src/widgets/markdown.ts`, parse alignment markers in separator row (`:---`, `:---:`, `---:`)
  - [x] Apply `padEnd` (left), center padding (center), `padStart` (right) to cell content

- [x] Task W3-2: Code block fallback background color fix (GAP-SUM-024)
  - [x] In `packages/flitter-core/src/widgets/markdown.ts`, remove `background: bgColor` from the fallback code block rendering path

- [x] Task W3-3: Syntax highlight RGB theme bridging verification (GAP-SUM-026)
  - [x] Verify that syntax-highlight.ts correctly maps RGB theme colors to Cell styles
  - [x] If not, add `Color.rgb()` conversion bridge from theme tokens to terminal Cell fg/bg

- [x] Task W3-4: `as unknown as` type cast cleanup (GAP-SUM-035)
  - [x] Search for all `as unknown as` patterns in flitter-amp
  - [x] Replace with runtime type guards (e.g., `isToolCallItem(x)`) or proper generic typing
  - [x] Run typecheck to confirm no regressions

- [x] Task W3-5: Reconnection session separator (GAP-SUM-036) -- depends on W1-2
  - [x] After successful reconnection in index.ts, push a system message item to conversation state: `{ type: 'system', text: '--- Reconnected ---' }`
  - [x] In `chat-view.ts`, render system messages with dim styling + horizontal rule

- [x] Task W3-6: Health status UI indicator (GAP-SUM-037) -- depends on W1-2
  - [x] In `packages/flitter-amp/src/widgets/bottom-grid.ts`, read `appState.healthStatus` (healthy/degraded/unhealthy)
  - [x] Display indicator in top-right area: green dot (healthy), yellow dot (degraded), red dot (unhealthy)

- [x] Task W3-7: FilePicker with Overlay and fuzzy search (GAP-SUM-031)
  - [x] Convert `file-picker.ts` from StatelessWidget to StatefulWidget
  - [x] Add TextField for fuzzy search input at top
  - [x] Use `fuzzy-match.ts` utility for scoring/filtering
  - [x] Register with OverlayManager for proper z-ordering
  - [x] Connect to InputArea's `@` trigger

- [x] Task W3-8: Perlin noise dynamic mode color pulse (GAP-SUM-033)
  - [x] In `packages/flitter-amp/src/themes/amp-theme-data.ts`, add `agentModeColor` computation using Perlin noise
  - [x] Apply to DensityOrbWidget and status indicators based on current agent mode

- [x] Task W3-9: Copy highlight auto-dismiss (GAP-SUM-034)
  - [x] In relevant copy handler, after setting highlight state, schedule `setTimeout(300, clearHighlight)`

- [x] Task W3-10: RenderPadding/DecoratedBox use deflate() (GAP-SUM-020)
  - [x] In `packages/flitter-core/src/layout/render-padded.ts`, replace manual `Math.max(0, constraints.minWidth - h)` with `constraints.deflate(EdgeInsets)`
  - [x] In `packages/flitter-core/src/layout/render-decorated.ts`, same change
  - [x] Verify existing tests pass

- [x] Task W3-11: RenderFlex overflow test coverage completion (GAP-SUM-021)
  - [x] In `render-flex-safety.test.ts`, add tests for all 4 overflow scenarios:
    1. Children exceed main axis (Row overflow)
    2. Children exceed cross axis (Column overflow)
    3. Flexible children with min constraints exceed space
    4. Nested Flex overflow propagation

## Wave 4: P1 New Features (6 tasks, T1-25 depends on T1-24)

- [x] Task W4-1: Tab/Shift+Tab user message navigation (NEW-001)
  - [x] In `packages/flitter-amp/src/state/app-state.ts`, add `selectedMessageIndex: number | null` state with `selectNextMessage()` / `selectPrevMessage()` methods
  - [x] In `packages/flitter-amp/src/app.ts`, add key handler: Tab = `selectPrevMessage()`, Shift+Tab = `selectNextMessage()`, Escape = clear selection
  - [x] In `packages/flitter-amp/src/widgets/chat-view.ts`, render selected user message with highlighted border (e.g. bright cyan border left side)

- [x] Task W4-2: Selected message edit / restore (NEW-002) -- depends on W4-1
  - [x] In app.ts key handler, when `selectedMessageIndex !== null`:
    - `e` key: get selected message text, clear selection, set InputArea controller text, focus InputArea
    - `r` key: remove all conversation items after selected message index, clear selection
  - [x] Add methods to AppState/Conversation: `getMessageAt(index)`, `truncateAfter(index)`

- [x] Task W4-3: CommandPalette complete command set (NEW-006)
  - [x] In `packages/flitter-amp/src/widgets/command-palette.ts`, expand default commands array:
    - "Clear conversation" (existing)
    - "Toggle tool calls" (existing)
    - "Toggle thinking" (existing)
    - "New thread" -- `appState.newThread()`
    - "Switch model" -- open model selection sub-menu
    - "Copy last response" -- copy last assistant message to clipboard
    - "Toggle dense view" -- `appState.toggleDenseView()`
    - "View usage" -- show token/cost summary
    - "Show shortcuts help" -- open shortcut overlay
  - [x] Add corresponding AppState methods for new commands

- [x] Task W4-4: Token usage + cost + elapsed time display (NEW-008)
  - [x] In `packages/flitter-amp/src/state/app-state.ts`, add token tracking: `inputTokens`, `outputTokens`, `contextWindowSize`, `costUsd`, `elapsedMs`, `deepReasoningActive`
  - [x] In `packages/flitter-amp/src/widgets/bottom-grid.ts` top-left area, display: `{percent}% of {formatted}k . ${cost} . {elapsed}`
  - [x] Implement `formatTokenCount(n)` -- auto-scale to k/M with 1 decimal
  - [x] Threshold coloring: <50% blue (dim), 50-80% yellow, >80% red
  - [x] Update from ACP protocol messages (content_block_delta token counting, usage summaries)

- [x] Task W4-5: Animation framework migration -- ScrollController (GAP-SUM-038 part 1)
  - [x] In `packages/flitter-core/src/widgets/scroll-controller.ts`, replace `setInterval`-based `animateTo()` with `AnimationController` + `Ticker`
  - [x] Use `Curves.easeOutCubic` for default scroll animation
  - [x] Maintain backward-compatible API

- [x] Task W4-6: Animation framework migration -- Spinners (GAP-SUM-038 part 2)
  - [x] In `packages/flitter-core/src/utilities/braille-spinner.ts`, add optional Ticker-based mode
  - [x] In `packages/flitter-core/src/widgets/wave-spinner.ts`, migrate from `setInterval` to `AnimationController` with Ticker
  - [x] Maintain backward-compatible fallback for non-Ticker usage

## Wave 5: P2 Type Safety + Framework Cleanup (4 tasks, parallel)

- [x] Task W5-1: Systematic `any` removal (GAP-SUM-027)
  - [x] Search all `any` usage across flitter-core and flitter-amp
  - [x] Replace with proper types: `unknown`, generics, or concrete types
  - [x] Target: reduce from ~58 to <5 justified `any` uses
  - [x] Run typecheck to confirm

- [x] Task W5-2: setState() build-phase guard (GAP-SUM-069)
  - [x] In `packages/flitter-core/src/framework/element.ts`, add `_debugBuildPhase` flag
  - [x] In `setState()`, throw error if called during build phase (with clear diagnostic message)
  - [x] Guard behind `debugMode` check for zero production cost

- [x] Task W5-3: BuildOwner.buildScope() priority queue (GAP-SUM-070)
  - [x] In `packages/flitter-core/src/framework/build-owner.ts`, replace `elements.sort()` in `buildScope()` with a min-heap priority queue keyed by element depth
  - [x] This avoids O(n log n) sort per frame for dirty elements

- [x] Task W5-4: InheritedModel adoption in core widgets (GAP-SUM-071)
  - [x] Identify core InheritedWidget subclasses that could benefit from aspect-based dependency (e.g., Theme, MediaQuery)
  - [x] Migrate Theme to use InheritedModel with aspects for `colorScheme`, `textTheme`, etc.
  - [x] This enables fine-grained rebuilds (only rebuild when specific theme aspect changes)

## Wave 6: P2 Everything Else (44 tasks, highly parallel)

### Wave 6A: Rendering Pipeline Optimization

- [x] Task W6-1: Buffer.resize() remove redundant copy (GAP-SUM-042)
  - [x] In `screen-buffer.ts`, `resize()` method: avoid copying old buffer contents if the new size is larger in both dimensions (just expand in place)

- [x] Task W6-2: getDiff() EMPTY_CELL fast path (GAP-SUM-044)
  - [x] In `screen-buffer.ts`, `getDiff()` incremental path: use identity check (`cell === EMPTY_CELL`) before deep comparison for empty-to-empty transitions

- [x] Task W6-3: CellLayer blit clipping defense (GAP-SUM-045)
  - [x] In `rendering/cell-layer.ts`, `blit()` method: clamp source coordinates to layer bounds before copying

- [x] Task W6-4: BoxConstraints convenience methods (GAP-SUM-048)
  - [x] Add `tightForFinite()`, `flipped`, `widthConstraints()`, `heightConstraints()` to `box-constraints.ts`
  - [x] Add tests

### Wave 6B: Input System

- [x] Task W6-5: OSC/DCS response handling (GAP-SUM-055)
  - [x] In `input-parser.ts`, detect and consume OSC/DCS response sequences instead of treating them as user input
  - [x] Emit them as a separate `TerminalResponse` event type

- [x] Task W6-6: In-Band Resize (Mode 2048) (GAP-SUM-056)
  - [x] In `terminal-manager.ts`, send `\e[?2048h` to enable in-band resize reporting
  - [x] In `input-parser.ts`, parse resize response sequences and call `handleResize()`

- [x] Task W6-7: MouseManager/EventDispatcher cleanup (GAP-SUM-054)
  - [x] Remove `require()` calls, use static `import`

- [x] Task W6-8: Hit-test free function cleanup (GAP-SUM-053)
  - [x] Move standalone `hitTest()` free functions into `RenderObject` methods
  - [x] Remove unused free functions from `hit-test.ts`

### Wave 6C: TextField / InputArea

- [x] Task W6-9: InputArea auto-expand height (GAP-SUM-073)
  - [x] In `input-area.ts`, calculate required height from text content line count
  - [x] Expand up to a configurable max height (e.g., 10 lines)

- [x] Task W6-10: InputArea drag-resize (GAP-SUM-074)
  - [x] Add mouse drag handler on the InputArea top border for height adjustment
  - [x] Clamp between min (1 line) and max (half screen) heights

- [x] Task W6-11: TextField selection color from theme (GAP-SUM-075)
  - [x] In `text-field.ts`, replace hardcoded `Color.rgb(50, 50, 180)` with `theme.selectionBackground`

- [x] Task W6-12: TextField cursor blink (GAP-SUM-076)
  - [x] Add blink timer (530ms interval) to TextField state
  - [x] Toggle cursor visibility on tick, reset on input

### Wave 6D: Visual Fidelity

- [x] Task W6-13: ThinkingBlock content as Markdown (GAP-SUM-081)
  - [x] In `thinking-block.ts`, replace `new Text(content)` with `new Markdown({ data: content })` for expanded content

- [x] Task W6-14: ToolHeader cancelled/queued/blocked states (GAP-SUM-083)
  - [x] In `tool-header.ts`, add state-dependent icon + color: cancelled=yellow, queued=dim, blocked=red

- [x] Task W6-15: StatusBar context-aware messages (GAP-SUM-086 + NEW-019)
  - [x] In `bottom-grid.ts`, implement `getFooterText()` with 12 condition branches matching Amp's `dy()` function
  - [x] States: executing command, running shell, auto-compacting, handing off, stream interrupted, high context, etc.

- [x] Task W6-16: UserMessage image attachment rendering (GAP-SUM-087)
  - [x] In `chat-view.ts`, detect `images` array in user message data
  - [x] Display image count indicator and filename list

- [x] Task W6-17: Scanning Bar animation (GAP-SUM-088)
  - [x] Create `ScanningBar` widget with horizontal sweep animation during file scanning operations

- [x] Task W6-18: Rainbow easter egg (GAP-SUM-068)
  - [x] Detect "You're absolutely right" in assistant responses
  - [x] Apply rainbow color cycling to the message text (6-color hue rotation)

- [x] Task W6-19: SelectedUserMessage differentiated rendering (GAP-SUM-093)
  - [x] When message is selected (via Tab navigation), render with highlighted border + selection indicator

- [x] Task W6-20: apply_patch DiffCard stat header (GAP-SUM-094)
  - [x] In `edit-file-tool.ts`, add `+N / -M lines` stat summary above DiffView

- [x] Task W6-21: ThinkingBlock "Thinking" label color alignment (GAP-SUM-080)
  - [x] Ensure dim+foreground color matches Amp's rendering exactly

- [x] Task W6-22: ToolHeader normalizedInput (GAP-SUM-084)
  - [x] Normalize raw input display in tool headers (remove extra whitespace, truncate long paths)

- [x] Task W6-23: ExpandCollapse standalone clickable component (GAP-SUM-085)
  - [x] Extract expand/collapse chevron into a reusable `ExpandCollapse` widget with click handler

- [x] Task W6-24: Table border alpha support (GAP-SUM-090)
  - [x] In `Color`, ensure alpha channel is preserved when rendering table borders

### Wave 6E: ACP Protocol + Persistence

- [x] Task W6-25: SessionStore atomic write (GAP-SUM-091)
  - [x] Write to temp file + atomic rename instead of direct write

- [x] Task W6-26: PromptHistory boundary handling (GAP-SUM-092)
  - [x] Handle empty string, very long strings, special characters gracefully

- [x] Task W6-27: ACP type safety for capabilities/overlay (GAP-SUM-077)
  - [x] Replace `as any` casts in capabilities parsing with proper typed parsing

- [x] Task W6-28: connectToAgentWithResume fallback UI (GAP-SUM-078)
  - [x] Show user-visible notification when resume fails and falls back to new session

- [x] Task W6-29: Dead connection closure cleanup (GAP-SUM-079)
  - [x] On connection close, null out all closure references to prevent memory leaks

### Wave 6F: Scroll + Virtualization

- [x] Task W6-30: Scrollbar hover visual feedback (GAP-SUM-062)
  - [x] In `scrollbar.ts`, change thumb color/opacity on mouse hover

- [x] Task W6-31: SelectionList scrollbar (GAP-SUM-063)
  - [x] Add scrollbar indicator to SelectionList when content exceeds viewport

- [x] Task W6-32: animateTo easing curves (GAP-SUM-059)
  - [x] After W4-5 migrates to AnimationController, verify easing curves work correctly

- [x] Task W6-33: ListView.builder virtualization (GAP-SUM-061)
  - [x] Implement lazy item builder that only builds visible items + buffer zone
  - [x] Recycle off-screen items to reduce memory

### Wave 6G: Misc Cleanup

- [x] Task W6-34: RenderText hyperlink Cell passthrough (GAP-SUM-064)
  - [x] Ensure hyperlink data from TextSpan flows through to Cell rendering

- [x] Task W6-35: _emojiWidthSupported dead code removal (GAP-SUM-065)
  - [x] Remove the unused `_emojiWidthSupported` flag and related code

- [x] Task W6-36: RenderTable intrinsic width 1000 fix (GAP-SUM-051)
  - [x] Replace hardcoded `1000` with actual measured intrinsic width

- [x] Task W6-37: FlexParentData toString() (GAP-SUM-052)
  - [x] Add descriptive `toString()` for debugging

- [x] Task W6-38: RenderDecoratedBox border getters (GAP-SUM-050)
  - [x] Add `borderRight`, `borderBottom` computed getters

- [x] Task W6-39: Skill browser / Dialog buttons (GAP-SUM-096)
  - [x] Implement Dialog button array rendering for confirmation dialogs

- [x] Task W6-40: Mouse wheel step configurability (GAP-SUM-058)
  - [x] Make scroll step count configurable via theme or config

### Wave 6H: New P2 Features

- [x] Task W6-41: Ctrl+S mode switch (NEW-003)
  - [x] In app.ts, add Ctrl+S handler that cycles through agent modes (smart/code/ask)
  - [x] Update mode label in InputArea

- [x] Task W6-42: Alt+D deep reasoning toggle (NEW-004)
  - [x] In app.ts, add Alt+D handler that toggles `appState.deepReasoningActive`
  - [x] Update model display in bottom grid

- [x] Task W6-43: Dense View mode (NEW-005)
  - [x] Add `denseView: boolean` to AppState
  - [x] In chat-view.ts, when dense=true, render tool calls as single-line summaries: `[icon] toolName status`

- [x] Task W6-44: Thread management UI (NEW-007)
  - [x] Add "Open thread list" CommandPalette command
  - [x] Create basic `thread-list.ts` overlay showing available threads
  - [x] Support thread switching via selection

- [x] Task W6-45: Welcome screen categorized suggestions (NEW-011)
  - [x] Expand suggestions array to 30+ items with type tags (command/hint/prompt/quote)
  - [x] Style each type differently

- [x] Task W6-46: Mystery Sequence easter egg (NEW-012)
  - [x] Track sequential key presses: Ctrl+X -> Y -> Z
  - [x] On match, show a mysterious modal message

- [x] Task W6-47: Text Morph animation (NEW-013)
  - [x] Implement character-level text morphing transition (1.5s duration)
  - [x] Use for welcome screen quote transitions

- [x] Task W6-48: Prompt History Overlay (NEW-014)
  - [x] Create `prompt-history-picker.ts` widget as a selectable list overlay
  - [x] Trigger from Ctrl+R reverse-i-search
  - [x] Display matching history items with search term highlighting

- [x] Task W6-49: @@ and @: autocomplete trigger modes (NEW-015)
  - [x] In input-area.ts, detect `@@` for special commands, `@:` for commit mode
  - [x] Route to respective completion sources

- [x] Task W6-50: Image paste detection (NEW-016)
  - [x] In input-parser.ts, detect image data in bracketed paste sequences
  - [x] Emit `ImagePasteEvent` for handling

- [x] Task W6-51: Modal backdrop dim (NEW-017)
  - [x] When Dialog/CommandPalette/FilePicker overlays are active, render full-screen background fill with theme background color to obscure underlying content

- [x] Task W6-52: Focus restoration stack (NEW-018)
  - [x] In `focus.ts`, maintain `_previousFocusNode` stack
  - [x] On overlay close, pop and restore focus to previous node

- [x] Task W6-53: Auto-compacting notification (NEW-020)
  - [x] Monitor context window usage from ACP protocol
  - [x] When approaching limit, show status bar warning and auto-compact message

- [x] Task W6-54: Debug Inspector HTTP server (NEW-021)
  - [x] In `diagnostics/debug-inspector.ts`, implement HTTP server on localhost:9876
  - [x] Expose Widget tree, Element tree, Focus tree as JSON endpoints
  - [x] 1-second periodic tree scanning

- [x] Task W6-55: Terminal capability query parsing (NEW-022)
  - [x] In input-parser.ts, parse DA1/DA2/XTVERSION/color query responses
  - [x] In terminal-manager.ts, use parsed capabilities to auto-detect terminal features

- [x] Task W6-56: Emoji width mode 2027 (NEW-023)
  - [x] In terminal-manager.ts startup, send `\e[?2027h` to enable emoji width mode
  - [x] In cleanup, send `\e[?2027l` to disable

- [x] Task W6-57: Terminal progress bar OSC 9;4 (NEW-024)
  - [x] Implement progress bar protocol for ConEmu/Windows Terminal compatible terminals
  - [x] Show progress during long operations (file scanning, etc.)

---

# Task Dependencies

- W1-3 depends on W1-1 (cursor opt verification requires Renderer to exist)
- W1-2 is independent of W1-1 (can run in parallel)
- W3-5 and W3-6 depend on W1-2 (need reconnection wired)
- W4-2 depends on W4-1 (message edit needs navigation)
- W4-5 should precede W6-32 (easing curves depend on AnimationController migration)
- All Wave 2-6 tasks depend on W1-1 (broken renderer blocks most testing)
- Within each wave, all tasks without explicit dependencies can run in parallel

# Execution Strategy

1. **Wave 1 FIRST** -- W1-1 is the critical path (Renderer class). W1-2 runs in parallel.
2. **Wave 2-4** after Wave 1 completes -- these can overlap significantly.
3. **Wave 5-6** are P2 quality tasks, can run whenever P1 waves are stable.
4. After each wave, run `bun test` + `bun run typecheck` in both packages to catch regressions early.
