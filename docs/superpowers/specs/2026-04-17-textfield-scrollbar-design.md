# TextField + Scrollbar Design Spec

**Date:** 2026-04-17  
**Status:** Draft  
**Scope:** Complete the TextField widget and implement Scrollbar widgets to align with amp's TUI experience.

## Context

Flitter's TUI framework has a complete `TextEditingController` (1095 lines, full Emacs bindings, grapheme-aware cursor/selection) and `TextLayoutEngine` (370 lines, word wrap, offset↔position mapping), but the `TextField` widget's `build()` is a stub that renders only plain text. Meanwhile, amp's conversation UI prominently features scrollbars with sub-character precision (Unicode block elements ▁▂▃▄▅▆▇█) that flitter lacks entirely.

These two widgets are the #1 and #2 blockers for building an interactive app experience.

### amp Reference

- **TextField**: `Gm`/`sP`/`C1T`/`L1T` chain in `amp-cli-reversed/modules/1472_tui_components/actions_intents.js` (lines 697–1731)
- **Scrollbar**: `W1T`/`F1T` and `Oi`/`VRR` in `amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js` (lines 306–907)

---

## Part 1: TextField Widget

### Architecture

Matches amp's 4-layer structure:

```
TextField (StatefulWidget) — exists, expand props
  └── TextFieldState — exists, expand with focus + key dispatch + mouse
        └── TextFieldRenderWidget (RenderObjectWidget) — NEW
              └── RenderTextField (RenderBox) — NEW, painting core
```

### RenderTextField (matching amp's L1T)

#### Layout

- Receives `BoxConstraints` from parent
- Computes size: width = `constraints.maxWidth`, height = number of visual lines clamped to `[minLines, maxLines]`
- Calls `controller.updateWidth(size.width)` to sync the layout engine's word-wrap width
- Intrinsic height: min = `minLines`, max = `maxLines ?? total line count`
- Intrinsic width: min = 1, max = longest line length

#### Paint (3 passes, matching amp's L1T.paint)

**Pass 1 — Background fill:**
Every cell in the bounding box gets a space character with `backgroundColor`. This ensures clean rendering when text doesn't fill the box.

**Pass 2 — Text painting:**
Iterates graphemes per layout line. For each grapheme:
- Check if grapheme index falls within `[selectionStart, selectionEnd)` 
- If selected: apply `selectionColor` as background (default blue), optionally `selectionForegroundColor`
- If not selected: apply normal `textStyle`
- Use `screen.setCell(x, y, char, style, charWidth)` for each grapheme
- Track character positions for hit-testing

Handles scroll offset:
- Multiline: `_vScrollOffset` determines which lines are visible. Only paint lines in `[_vScrollOffset, _vScrollOffset + size.height)`
- Single-line: `_hScrollOffset` determines horizontal window

**Pass 3 — Cursor painting (only when focused + enabled):**
Matching amp's `_paintSoftwareCursor`:
```
char = grapheme at cursorPosition, or ' ' if at end / newline
style = { fg: cursorColor, bg: backgroundColor, reverse: true }
screen.setCell(cursorX, cursorY, char, style, charWidth)
screen.setCursorPositionHint?.(cursorX, cursorY)
```
The cursor is a **reverse-video block**: the character under the cursor is drawn with fg/bg swapped. This is amp's exact approach.

#### Scroll Management

For multiline (`maxLines !== 1`):
- After layout, check if cursor line is within the visible window `[_vScrollOffset, _vScrollOffset + viewportHeight)`
- If cursor is above: `_vScrollOffset = cursorLine`
- If cursor is below: `_vScrollOffset = cursorLine - viewportHeight + 1`

For single-line:
- Track `_hScrollOffset` to keep cursor column within `[_hScrollOffset, _hScrollOffset + size.width)`

### TextFieldState (matching amp's sP)

#### Focus Management

- Creates a `FocusNode` (or uses external one from props)
- Registers key handler via `focusNode.addKeyHandler()`
- On mount: if `autofocus`, call `focusNode.requestFocus()`
- On dispose: remove handler, dispose owned focus node

#### Key Dispatch (matching amp's sP.build r function)

Priority order:

1. **Submit key detection**: Check if pressed key + modifiers match `submitKey` config. Backslash escape: if previous char is `\`, delete it and insert literal newline instead. Otherwise call `onSubmitted(controller.text)`.

2. **Enter in multiline**: Shift+Enter, Alt+Enter, or bare Enter (when not matching submitKey) inserts literal newline.

3. **Backspace**: 
   - At position 0: call `onBackspaceWhenEmpty?.()`
   - Alt+Backspace: `controller.deleteWordBackward()`
   - Normal: `controller.deleteSelectedOrText(1)`

4. **Delete**: `controller.deleteSelectedText()` or `controller.deleteForward(1)`

5. **Ctrl bindings** (Emacs, matching amp exactly):
   - `Ctrl+A` → `moveCursorToLineStart()`
   - `Ctrl+E` → `moveCursorToLineEnd()`
   - `Ctrl+K` → `deleteToLineEnd()`
   - `Ctrl+U` → `deleteToLineStart()`
   - `Ctrl+F` → `moveCursorRight(1)`
   - `Ctrl+B` → `moveCursorLeft(1)`
   - `Ctrl+N` → `moveCursorDown(1)`
   - `Ctrl+P` → `moveCursorUp(1)`
   - `Ctrl+D` → `deleteForward(1)`
   - `Ctrl+H` → `deleteText(1)` (backspace)
   - `Ctrl+W` → `deleteWordBackward()`
   - `Ctrl+Y` → `yankText()`
   - `Ctrl+J` → insert newline (multiline only)

6. **Alt/Meta bindings**:
   - `Alt+Left` / `Alt+B` → `moveCursorWordBoundary('left')`
   - `Alt+Right` / `Alt+F` → `moveCursorWordBoundary('right')`
   - `Alt+Backspace` → `deleteWordBackward()`
   - `Alt+D` → `deleteWordForward()`

7. **Arrow keys**:
   - `Left/Right` → move 1 grapheme (with shift for selection)
   - `Up/Down` → move 1 visual line (with shift for selection)
   - `Home` → line start; `End` → line end

8. **Character insertion**: Any printable, non-control character → `controller.insertText(key)`

#### Mouse Handling

Wraps `RenderTextField` in a `MouseRegion` (using flitter's actual MouseRegion API):
- **onClick** (ClickEvent with `localPosition` and `clickCount`):
  - `clickCount === 1`: Convert `localPosition` to grapheme offset via `RenderTextField.hitTestPosition()`, set cursor position
  - `clickCount === 2`: `controller.selectWordAt(offset)`
  - `clickCount === 3`: `controller.selectLineAt(offset)`
- **onDrag** (DragEvent with `localPosition`): Convert to grapheme offset, call `controller.moveCursorTo(offset, { extend: true })` to extend selection
- **onRelease**: Finalize drag selection (no-op if no active drag)

The `RenderTextField.hitTestPosition(localX, localY)` method converts screen coordinates to a grapheme index by accounting for scroll offset and walking the character positions array built during paint.

#### readOnly Behavior

When `readOnly` is true:
- Key handler ignores all text-mutating keys (character insertion, backspace, delete, Emacs kill commands)
- Cursor movement and selection still work (arrow keys, Shift+arrow, Ctrl+A/E/F/B, click, drag)
- Cursor is still rendered when focused (allows visual position tracking)
- Submit key is ignored

#### Build Method

```typescript
build(context: BuildContext): Widget {
  return new Focus({
    focusNode: this._focusNode,
    autofocus: this.widget.props.autofocus,
    child: new MouseRegion({
      onClick: this._handleClick,
      onDrag: this._handleDrag,
      onRelease: this._handleRelease,
      child: new TextFieldRenderWidget({
        controller: this._controller,
        focused: this._focusNode.hasFocus,
        enabled: this.widget.props.enabled ?? true,
        readOnly: this.widget.props.readOnly ?? false,
        minLines: this.widget.props.minLines ?? 1,
        maxLines: this.widget.props.maxLines,
        textStyle: this.widget.props.textStyle,
        cursorColor: this.widget.props.cursorColor,
        selectionColor: this.widget.props.selectionColor,
        backgroundColor: this.widget.props.backgroundColor,
        placeholder: this.widget.props.placeholder,
      })
    })
  });
}
```

### Props

```typescript
interface TextFieldProps {
  controller?: TextEditingController;
  placeholder?: string;
  readOnly?: boolean;
  enabled?: boolean;               // default true
  autofocus?: boolean;             // default false
  minLines?: number;               // default 1
  maxLines?: number | null;        // null = unlimited, default null
  textStyle?: TextStyle;
  cursorColor?: Color;
  selectionColor?: Color;          // default blue
  backgroundColor?: Color;
  onSubmitted?: (text: string) => void;
  submitKey?: {                    // default { key: 'Enter' }
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
  focusNode?: FocusNode;
  onBackspaceWhenEmpty?: () => void;
}
```

### Testing Strategy

1. **Unit tests**: RenderTextField layout math (line clamping, intrinsic sizes), scroll offset management, hit-test coordinate mapping
2. **Key dispatch tests**: Each keybinding → expected controller state change
3. **tmux E2E test**: Launch a demo app with TextField, type text, verify cursor rendering via `capture-pane`, test submit flow

---

## Part 2: Scrollbar Widget

### Architecture

Single widget serving both vertical and horizontal use:

```
Scrollbar (StatefulWidget)
  └── ScrollbarState — handles mouse hover, drag, click
        └── ScrollbarRenderWidget (RenderObjectWidget)
              └── RenderScrollbar (LeafRenderObject) — painting core
```

### RenderScrollbar

#### Layout

```
width = min(constraints.maxWidth, thickness)    // thickness default 1
height = constraints.maxHeight
```

The scrollbar is a thin fixed-width column that takes the full available height. Intrinsic width returns `thickness`.

#### Metrics Calculation (exact match to amp's _calculateScrollbarMetrics)

Input: `getScrollInfo()` returns `{ totalContentHeight, viewportHeight, scrollOffset }`.

```
if (totalContentHeight <= viewportHeight || trackLength <= 0):
  showScrollbar = false; return

scrollFraction = clamp(scrollOffset / (totalContentHeight - viewportHeight), 0, 1)
thumbRatio = min(1, viewportHeight / totalContentHeight)
thumbSize = max(1, trackLength * thumbRatio)
availableTrack = trackLength - thumbSize
thumbStartFloat = max(0, availableTrack * scrollFraction)
thumbEndFloat = thumbStartFloat + thumbSize
```

#### Paint — Sub-Character Precision (exact match to amp's F1T.paint)

Block elements array: `['▁','▂','▃','▄','▅','▆','▇','█']`

For each cell row `i` from 0 to `trackLength - 1`:

```
char = '█'
reverse = true  // default: track cell

if (i === floor(thumbStart)):
  // Thumb START edge — partial block showing how much thumb is in this cell
  fraction = 1 - (thumbStart - i)
  blockIndex = floor(fraction * 8)
  char = blocks[blockIndex] || '█'
  reverse = false

else if (i === floor(thumbEnd)):
  // Thumb END edge — partial block showing remaining track
  fraction = 1 - (thumbEnd - i)
  blockIndex = floor(fraction * 8)
  char = blocks[blockIndex] || '█'
  reverse = true

else if (i > thumbStart && i < thumbEnd):
  // Thumb INTERIOR — full block
  reverse = false

// else: track cell — full block with reverse = true

screen.setCell(x, y + i, char, { fg: thumbColor, bg: trackColor, reverse }, 1)
```

The `reverse` trick:
- `reverse: false` + `fg: thumbColor` + `█` → solid thumb color fill
- `reverse: true` + `fg: thumbColor, bg: trackColor` → after swap, solid track color fill
- Partial blocks at thumb edges create smooth 1/8th-cell transitions

#### Hidden Scrollbar

When `showScrollbar` is false (content fits viewport), the scrollbar still lays out at its natural size but paints nothing. This preserves layout stability when content grows/shrinks.

### ScrollbarState — Mouse Interaction

**Click handling:**
- Click above thumb → `controller.scrollPageUp(viewportHeight)`
- Click below thumb → `controller.scrollPageDown(viewportHeight)`

**Drag handling:**
- On drag start: record initial thumb position and mouse Y
- On drag move: compute delta, map to scroll offset proportionally:
  ```
  scrollDelta = (mouseY - dragStartY) / availableTrack * maxScrollExtent
  controller.jumpTo(dragStartOffset + scrollDelta)
  ```

**Hover:** Track `isHovered` state for optional visual feedback (future use).

### Props

```typescript
interface ScrollbarProps {
  controller: ScrollController;
  getScrollInfo: () => {
    totalContentHeight: number;
    viewportHeight: number;
    scrollOffset: number;
  };
  thickness?: number;       // default 1
  thumbColor?: Color;       // default from theme
  trackColor?: Color;       // default from theme
  showTrack?: boolean;      // default true
}
```

### Composition Patterns

**Pattern 1 — Row (recommended):**
```typescript
new Row({
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: [
    new Expanded({ child: new Scrollable({ controller, child: content }) }),
    new Scrollbar({
      controller,
      getScrollInfo: () => ({
        totalContentHeight: controller.maxScrollExtent + viewportHeight,
        viewportHeight,
        scrollOffset: controller.offset,
      }),
    }),
  ],
})
```

**Pattern 2 — Stack overlay:**
```typescript
new Stack({
  children: [
    new Padding({ padding: EdgeInsets.only({ right: 1 }), child: content }),
    new Positioned({
      right: 0, top: 0, bottom: 0,
      child: new SizedBox({ width: 1, child: new Scrollbar({ ... }) }),
    }),
  ],
})
```

### Testing Strategy

1. **Unit tests**: Metric calculation (edge cases: content smaller than viewport, single-line content, zero scroll offset, max scroll offset), block element selection math
2. **Visual tests**: Verify correct block characters at various scroll positions (known inputs → expected characters)
3. **tmux E2E test**: Scrollable list with scrollbar, scroll via keyboard, verify thumb position via `capture-pane`

---

## File Changes Summary

### New Files
- `packages/tui/src/editing/render-text-field.ts` — `RenderTextField` (RenderBox) and `TextFieldRenderWidget` (RenderObjectWidget)
- `packages/tui/src/widgets/scrollbar.ts` — `Scrollbar`, `ScrollbarState`, `ScrollbarRenderWidget`, `RenderScrollbar`

### Modified Files
- `packages/tui/src/editing/text-field.ts` — Replace stub `build()` with full implementation, expand props interface
- `packages/tui/src/editing/index.ts` — Export new render-text-field module
- `packages/tui/src/widgets/index.ts` — Export Scrollbar
- `packages/tui/src/scroll/index.ts` — Ensure ScrollController exports `maxScrollExtent`, `offset` for getScrollInfo pattern

### Test Files
- `packages/tui/src/editing/__tests__/render-text-field.test.ts`
- `packages/tui/src/editing/__tests__/text-field-keys.test.ts`
- `packages/tui/src/widgets/__tests__/scrollbar.test.ts`

### Demo Files
- `packages/tui/examples/12-text-field-demo.ts` — Interactive TextField demo
- `packages/tui/examples/13-scrollbar-demo.ts` — Scrollable list with scrollbar

---

## Dependencies

Both features depend only on existing flitter primitives:
- `TextEditingController`, `TextLayoutEngine` (exist, complete)
- `FocusNode`, `FocusManager` (exist, complete)
- `MouseRegion`, `MouseManager` (exist, complete)
- `ScrollController` (exists, complete)
- `RenderBox`, `BoxConstraints` (exist, complete)
- `ClipScreen` (exists, for viewport clipping in multiline TextField)

No new external dependencies needed.

## Out of Scope

- Image attachments in TextField (app-level feature, not TUI primitive)
- Autocomplete integration (already exists separately in `AutocompleteController`)
- Shell-mode prompt prefix rendering (app-level)
- Border/decoration on TextField (use Container wrapper)
- Horizontal scrollbar (amp's "horizontal" scrollbar is actually vertical; defer true horizontal until needed)
