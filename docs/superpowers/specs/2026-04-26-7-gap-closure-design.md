# 7-Gap Closure: flitter-cli vs amp-cli Alignment

**Date:** 2026-04-26
**Status:** Design approved, pending implementation

## Overview

This spec closes 7 gaps identified in the flitter-cli vs amp-cli comparison. These gaps span the selection/interaction pipeline, text editing, image rendering, developer tooling, and config caching.

### Gaps Addressed

| # | Gap | Impact |
|---|-----|--------|
| 1 | Mouse text selection not wired to widget tree | High — core UX |
| 2 | Markdown content not selectable | High — core UX |
| 3 | Text editing undo/redo missing | High — core UX |
| 5 | Inline span click (onTap) not dispatched | High — core UX |
| 8 | Kitty image preview not wired + no JPEG/GIF transcoding | Medium — specific workflow |
| 11 | Hidden commands (keyboard-tester only) | Low — developer tooling |
| 15 | Config TTL cache not wired | Low — performance |

### Gaps Explicitly Excluded

- **Gap 4 (painter tool):** Skipped — depends on Gemini infrastructure that may not be available
- **Gap 11 partial:** `dtw-curl`, `live-sync`, `thread-pool-harness` are hard-gated to amp employees — not portable

## Implementation Order

Dependencies require a specific ordering for the selection pipeline (5 → 1 → 2). All other gaps are independent.

```
Phase A (sequential): 5 → 1 → 2  (selection pipeline)
Phase B (parallel):   3, 8, 11, 15 (independent gaps)
```

Phase A and B can overlap — Phase B gaps have zero dependency on Phase A.

---

## Gap 5: Inline Span Click (onTap)

### Amp Reference

In amp, `RenderParagraph` (class `t1T`) registers as a mouse target, performs sub-span hit-testing on click, and dispatches `glyph.span.onTap()`. The `TextSpan` class carries `onTap?: () => void`.

### Current State in Flitter

- `TextSpan` already declares `onTap?: () => void` and stores it correctly
- `RenderParagraph` stores `_lines` with per-glyph `span` references (`LayoutGlyph.span`)
- BUT: `RenderParagraph` never overrides `hitTest()`, never registers with `MouseManager`, and has no click handler

### Changes

**File: `packages/tui/src/widgets/rich-text.ts`**

1. Override `hitTest()`: call `result.addMouseTarget(this, position)` when any span has `onTap` OR when `selectable` is true
2. Add `handleClick(localPosition: {x: number, y: number})`: index into `_lines` to find the glyph at `(x, y)`, call `glyph.span.onTap?.()`
3. Register with `MouseManager` using the same pattern as `RenderMouseRegion` (`packages/tui/src/widgets/mouse-region.ts`)

### Acceptance Criteria

- Clicking on a `TextSpan` with `onTap` fires the callback
- Clicking on a `TextSpan` without `onTap` is a no-op
- Hit-test correctly maps pixel position to the right glyph/span

---

## Gap 1: SelectionArea Widget Wiring

### Amp Reference

Amp wires `SelectionArea` at three layers:
1. `SelectionAreaState` widget (StatefulWidget) — creates controller, wraps child in `MouseRegion` with drag/click handlers
2. `InheritedSelectionArea` (class `Yb`) — InheritedWidget publishing controller down the tree
3. Auto-registration — selectable render objects call `Yb.of(context).register(this)` in `setContext()`

### Current State in Flitter

- `SelectionArea` class exists in `packages/tui/src/selection/selection-area.ts` — fully implemented standalone state manager
- Missing: the widget wrapper, the InheritedWidget, and the auto-registration hook

### Changes

**New file: `packages/tui/src/selection/selection-area-widget.ts`**

1. `InheritedSelectionArea` — InheritedWidget that holds a `SelectionArea` controller. Static `of(context)` lookup method.
2. `SelectionAreaWidget` — StatefulWidget:
   - `initState()`: creates `SelectionArea` instance
   - `build()`: wraps child in `MouseRegion` with handlers:
     - `onDragStart` → `selectionArea.beginDrag(pos)`
     - `onDragUpdate` → `selectionArea.updateDrag(pos)`
     - `onDragEnd` → `selectionArea.endDrag()`
     - `onClick` → click-count branching: single=char cursor, double=`selectWordAt`, triple=`selectLineAt`
   - Wraps in `InheritedSelectionArea` to publish controller
   - `dispose()`: calls `selectionArea.dispose()`

**File: `packages/tui/src/widgets/rich-text.ts`** (additional changes on top of Gap 5)

3. In `setContext()`: if `selectable`, call `InheritedSelectionArea.of(context)?.register(this)`
4. In `detach()`: call `selectionArea?.unregister(this)`
5. Implement the `Selectable` interface required by `SelectionArea` (methods for getting text ranges, character positions, bounds)

### Acceptance Criteria

- Drag-selecting across text in the TUI highlights characters
- Double-click selects a word, triple-click selects a line
- `Ctrl+C` (when selection is active) copies selected text to clipboard via existing `SelectionArea.copyToClipboard()`
- Selectables auto-register on mount and auto-unregister on unmount

---

## Gap 2: Markdown Text Selectability

### Amp Reference

In amp's markdown renderer (`processAstNode`), every rendered node is constructed with `selectable: !0`:
```js
new xT({ key: n, text: o, selectable: !0 })
```
This applies to paragraphs, headings, code blocks, list items, blank-line separators, and fallback text.

### Current State in Flitter

- `RichText` / `RichTextArgs` has no `selectable` prop
- `guidance-file-display.ts` (line 188) explicitly notes: "selectable: true is not yet supported"
- `repl-tool-widget.ts` (line 304) has the same placeholder comment

### Changes

**File: `packages/tui/src/widgets/rich-text.ts`**

1. Add `selectable?: boolean` to `RichTextArgs`
2. Propagate to `RenderParagraph` — used by `hitTest()` (Gap 5) and `setContext()` (Gap 1) auto-registration

**File: `packages/tui/src/markdown/markdown-renderer.ts`**

3. Pass `selectable: true` on every `RichText` node produced by the renderer

**Files: `guidance-file-display.ts`, `repl-tool-widget.ts`, `toolbox-tool-widget.ts`, `librarian-tool-widget.ts`**

4. Remove "selectable not yet supported" placeholder comments
5. Add `selectable: true` where the comments indicated it should go

### Acceptance Criteria

- All markdown content in conversation view is selectable via drag
- Code blocks, headings, paragraphs, list items — all selectable
- No regressions in markdown rendering or layout

---

## Gap 3: Text Editing Undo/Redo

### Amp Reference

Amp implements an `UndoStack` per controller: `Array<{text, cursorPosition}>` snapshots. `Ctrl+Z` pops and restores. `Ctrl+Y` or `Ctrl+Shift+Z` redoes. Referenced in `actions_intents.js:1008-1150`.

### Current State in Flitter

- `TextEditingController` has rich editing (insert, delete, selection, kill buffer) but zero undo/redo
- `InputField` has no `Ctrl+Z` handler
- `Ctrl+Z` is globally intercepted in `widgets-binding.ts` as SIGTSTP (terminal suspend)

### Changes

**File: `packages/tui/src/editing/text-editing-controller.ts`**

1. Add fields:
   ```typescript
   private _undoStack: Array<{text: string, cursorPosition: number}> = [];
   private _redoStack: Array<{text: string, cursorPosition: number}> = [];
   ```
2. Add private `_pushUndo()`: snapshot `{_text, _cursorPosition}` before mutation. Clear `_redoStack`. Cap at 100 entries.
3. Call `_pushUndo()` at the top of every text-mutating method: `insertText`, `deleteText`, `deleteForward`, `deleteSelectedText`, `deleteToLineStart`, `deleteToLineEnd`, `deleteWordLeft`, `deleteWordRight`, `deleteCurrentLine`
4. Add public `undo()`: if `_undoStack` non-empty, push current state to `_redoStack`, pop and restore from `_undoStack`
5. Add public `redo()`: if `_redoStack` non-empty, push current state to `_undoStack`, pop and restore from `_redoStack`

**File: `packages/cli/src/widgets/input-field.ts`**

6. Add `Ctrl+Z` → `controller.undo()` handler
7. Add `Ctrl+Shift+Z` → `controller.redo()` handler (NOT `Ctrl+Y` — that's already bound to `yankText`)
8. Ensure the focused input field's key handler takes priority over the global `Ctrl+Z` → SIGTSTP handler (verify focus system priority order)

### Acceptance Criteria

- Typing text then pressing `Ctrl+Z` restores previous state
- `Ctrl+Shift+Z` after undo redoes the undone change
- Redo stack clears when new text is typed after undo
- Stack capped at 100 entries
- Kill buffer (`Ctrl+Y` yank) still works unchanged

---

## Gap 8: Kitty Image Preview + JPEG/GIF Transcoding

### Amp Reference

Module `2452_WebP_Vd0.js` implements `Vd0(base64, mediaType)`:
- `image/png` → passthrough (Kitty `f=100` means raw PNG)
- `image/jpeg` → decode via **jpeg-js**, re-encode to PNG via **UPNG**
- `image/gif` → decode first frame via **omggif**, re-encode to PNG via **UPNG**
- `image/webp` → `{success: false, reason: "unsupported-format"}` (amp does NOT support WebP)
- All other types → `{success: false, reason: "unsupported-format"}`

Kitty rendering flow: allocate image ID → transcode to PNG → chunk at 4096 bytes → write APC sequences → build Unicode placeholder grid.

### Current State in Flitter

- `render-image.ts` fully implements Kitty primitives: `encodeKittyGraphicsTransmit`, `encodeKittyGraphicsDelete`, `buildPlaceholderGrid`, `wrapForTmux`, `allocateImageId`
- `image-preview-modal.ts` hardcodes `"(Terminal does not support inline images)"` — never calls any Kitty code
- No image format transcoding exists

### Changes

**New file: `packages/tui/src/image/image-transcoder.ts`**

1. Export `transcodeToKittyPng(base64: string, mediaType: string): TranscodeResult`
   ```typescript
   type TranscodeResult =
     | { success: true; png: string }  // base64 PNG
     | { success: false; reason: string };
   ```
2. `image/png` → `{success: true, png: base64}` (passthrough)
3. `image/jpeg` → decode via `jpeg-js`, re-encode to PNG via `upng-js`
4. `image/gif` → decode first frame via `omggif`, re-encode to PNG via `upng-js`
5. All others → `{success: false, reason: "unsupported-format"}`

**File: `packages/cli/src/widgets/image-preview-modal.ts`**

6. Add `supportsKittyGraphics()` check: inspect `TERM_PROGRAM` env for `kitty`, `WezTerm`, `ghostty` (matching amp's env-var approach)
7. When Kitty supported: call `transcodeToKittyPng()`, then `encodeKittyGraphicsTransmit()` + `buildPlaceholderGrid()` from `render-image.ts`
8. When Kitty not supported: keep current fallback text
9. Remove "no Kitty graphics yet" comment and simplification note

**New dependencies** (in `packages/tui/package.json`):

- `jpeg-js` — pure JS JPEG decoder/encoder (no native deps)
- `upng-js` — pure JS PNG encoder/decoder (no native deps)
- `omggif` — pure JS GIF decoder (no native deps)

### Acceptance Criteria

- PNG images display via Kitty graphics in supported terminals
- JPEG images are transcoded to PNG and display correctly
- GIF images (first frame) are transcoded to PNG and display correctly
- WebP/BMP/SVG show fallback text (not crash)
- Non-Kitty terminals show fallback text
- tmux passthrough wrapping works when inside tmux

---

## Gap 11: keyboard-tester Hidden Command

### Amp Reference

Module `0525_unknown_sy0.js` (~200 lines). A pure terminal diagnostics tool:
- Enables full keyboard protocol stack (Kitty keyboard protocol, bracketed paste, focus events, in-band resize, tmux extended keys)
- Streams every parsed input event as JSONL to stdout
- `--raw` flag also logs raw hex bytes before parsing
- Exits cleanly on Ctrl+C with terminal state restored

### Current State in Flitter

No equivalent exists. Flitter's VT input parser (`@flitter/tui`'s `VtInputParser`) and terminal setup code exist but are only used inside the full TUI.

### Changes

**New file: `packages/cli/src/commands/keyboard-tester.ts`**

1. Export `handleKeyboardTester(opts: { raw?: boolean }): Promise<void>`
2. Enable terminal raw mode + full protocol stack (Kitty keyboard, bracketed paste, focus events, in-band resize)
3. Create `VtInputParser` from `@flitter/tui`
4. Read stdin in a loop, feed bytes to parser
5. Output each parsed event as JSONL: `{"type": "key", "key": "a", "modifiers": ["ctrl"], "raw": "\\x01"}`
6. When `--raw`: also log raw hex bytes before parsed output
7. On Ctrl+C: restore terminal state (disable protocols, restore cooked mode), exit cleanly

**File: `packages/cli/src/program.ts`**

8. Register hidden command:
   ```typescript
   program
     .command('keyboard-tester', { hidden: true })
     .option('--raw', 'Also log raw hex bytes')
     .action(handleKeyboardTester);
   ```

### Acceptance Criteria

- `flitter keyboard-tester` streams parsed key events as JSONL
- `flitter keyboard-tester --raw` also shows hex bytes
- All modifier keys, function keys, and special sequences are correctly parsed
- Terminal state is fully restored on exit (no stuck raw mode)
- Command does not appear in `flitter --help`

---

## Gap 15: Config TTL Cache

### Amp Reference

Module `1271_GlobalCachedValue_d5T.js`: generic TTL cache with soft/hard TTL, background recompute, dedup, change events. Used for admin settings with `softTTL: 30000` (30s), `hardTTL: 120000` (120s).

### Current State in Flitter

- `GlobalCachedValue` is already implemented at `packages/util/src/cache/global-cached-value.ts` — faithful port of amp's `d5T`
- It has tests but is **unused in production code**
- `ConfigService.reload()` calls `readAdminSettings()` directly every time a file-watch event fires, with no TTL guard

### Changes

**File: `packages/data/src/config/config-service.ts`**

1. Import `GlobalCachedValue` from `@flitter/util`
2. Create `adminSettingsCache = new GlobalCachedValue({ softTTL: 30_000, hardTTL: 120_000, compute: () => readAdminSettings(), changes: (old, new) => diffAdminSettings(old, new) })`
3. In `reload()`: call `adminSettingsCache.get()` instead of `readAdminSettings()` directly
4. Subscribe to `adminSettingsCache.events` to emit change notifications matching the existing config change pipeline
5. No change to workspace/global config reading — those are local-file event-driven and don't need TTL

### Acceptance Criteria

- Admin settings reads are cached for 30s (soft TTL)
- Stale cache triggers background recompute, returns cached value immediately
- Hard TTL (120s) forces blocking recompute
- File-watch events still trigger reload (but TTL prevents redundant reads within 30s window)
- Change events propagate correctly when admin settings actually change

---

## Testing Strategy

Each gap requires:
1. **Unit tests** for the new/changed code (matching existing test patterns in the codebase)
2. **Integration verification** per CLAUDE.md Rule 2: interactive features must be verified via tmux E2E or real terminal execution

Specific test requirements:
- Gaps 1/2/5 (selection pipeline): tmux E2E test — click, drag-select, verify `capture-pane` shows selection highlight
- Gap 3 (undo/redo): unit tests for stack behavior + tmux E2E for keybinding verification
- Gap 8 (Kitty image): unit tests for transcoding logic; manual verification in Kitty/WezTerm terminal
- Gap 11 (keyboard-tester): unit test for JSONL output format; manual verification of terminal restore
- Gap 15 (config TTL): unit test for cache hit/miss/recompute timing
