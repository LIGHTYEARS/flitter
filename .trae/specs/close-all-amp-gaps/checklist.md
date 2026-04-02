# Checklist -- Close All AMP Gaps

## Wave 1: P0 Blockers
- [ ] `renderer.ts` is no longer truncated -- file compiles without syntax errors
- [ ] `Renderer` class exists and exports correctly
- [ ] `bun test packages/flitter-core/src/terminal/__tests__/renderer.test.ts` passes
- [ ] `bun test packages/flitter-core/src/terminal/__tests__/renderer-cursor-opt.test.ts` passes
- [ ] `bun test packages/flitter-core/src/terminal/__tests__/renderer-fallback.test.ts` passes
- [ ] Sequential cells on same row skip CUP sequences (cursor optimization)
- [ ] Control characters (U+0000-U+001F except tab) are filtered from cell content
- [ ] ReconnectionManager/HeartbeatMonitor/LiveHandle are imported in `index.ts`
- [ ] `handleSubmit`/`handleCancel` closures use `liveHandle.current` (not bare `handle`)
- [ ] `bun test packages/flitter-amp` passes without regressions

## Wave 2: P1 Rendering + Input
- [ ] `present()` in screen-buffer.ts no longer calls `backBuffer.clear()`
- [ ] Kitty CSI u sequences parsed correctly by input-parser
- [ ] RepaintBoundary dirty region tracking works (partial screen updates)

## Wave 3: P1 Text/ACP/Visual
- [ ] GFM tables render with correct column alignment (left/center/right)
- [ ] Code block fallback does not apply spurious background color
- [ ] No `as unknown as` double casts remain in flitter-amp production code
- [ ] Reconnection event inserts visible session separator in chat
- [ ] Health status indicator visible in bottom grid
- [ ] FilePicker has fuzzy search and overlay integration
- [ ] RenderPadding and RenderDecoratedBox use `constraints.deflate()`

## Wave 4: P1 New Features
- [ ] Tab/Shift+Tab navigates between user messages in chat
- [ ] Selected message supports `e` (edit) and `r` (restore/delete) operations
- [ ] CommandPalette shows 9+ commands (was 3)
- [ ] Token usage, cost, and elapsed time display in bottom grid with threshold coloring
- [ ] ScrollController.animateTo uses AnimationController (not setInterval)
- [ ] WaveSpinner/BrailleSpinner use Ticker-based animation

## Wave 5: P2 Type Safety
- [ ] `any` count reduced from ~58 to <5
- [ ] `setState()` during build phase throws diagnostic error (in debug mode)
- [ ] `buildScope()` uses priority queue instead of sort

## Wave 6: P2 All Remaining
- [ ] Buffer.resize() avoids redundant copy
- [ ] getDiff() uses EMPTY_CELL identity fast path
- [ ] InputArea auto-expands with content
- [ ] TextField selection color comes from theme
- [ ] TextField cursor blinks
- [ ] ThinkingBlock renders content as Markdown
- [ ] ToolHeader supports cancelled/queued/blocked states
- [ ] StatusBar shows context-aware messages (12 conditions)
- [ ] SessionStore uses atomic writes
- [ ] Scrollbar shows hover feedback
- [ ] ListView.builder only builds visible items
- [ ] Ctrl+S cycles agent modes
- [ ] Alt+D toggles deep reasoning
- [ ] Dense view mode collapses tool calls to single lines
- [ ] Prompt history overlay (Ctrl+R) shows visual picker
- [ ] Modal overlays dim background content
- [ ] Focus restored to previous node when overlay closes
- [ ] Debug Inspector serves tree state on localhost:9876
- [ ] Emoji width mode 2027 sent on terminal startup

## Final Validation
- [ ] `cd packages/flitter-core && bun test` -- all tests pass
- [ ] `cd packages/flitter-core && bun run typecheck` -- no type errors
- [ ] `cd packages/flitter-amp && bun test` -- all tests pass
- [ ] `cd packages/flitter-amp && bun run typecheck` -- no type errors
