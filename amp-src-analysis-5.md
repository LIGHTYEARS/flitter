# Analysis 5: Text Rendering Pipeline -- Text Widget, TextSpan, TextStyle, Terminal Output

## Overview

The flitter text rendering pipeline transforms a tree of styled text segments into individually positioned and styled characters in a terminal cell grid, then emits minimal ANSI escape sequences for display. The pipeline spans five tightly coupled modules: `TextSpan` (rich text tree), `TextStyle` (attribute descriptor), `Text`/`RenderText` (widget and render object), `PaintContext` (canvas API), and `Renderer` (ANSI output generation). Each layer delegates clearly to the next, forming a strictly unidirectional flow: TextSpan tree -> flattened character segments -> cell grid -> diff patches -> ANSI byte stream.

---

## 1. TextSpan -- Rich Text Tree Structure

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/text-span.ts`

`TextSpan` is an immutable tree node. Each node holds optional fields: `text` (a string leaf), `style` (a `TextStyle`), `children` (a frozen array of child `TextSpan` nodes), `hyperlink` (an OSC 8 descriptor with `uri` and optional `id`), and `onClick` (a callback for interactive text).

The critical method is `visitChildren(visitor, parentStyle?, parentHyperlink?, parentOnClick?)`. It performs a depth-first pre-order walk of the tree and computes an **effective style** at each node by merging the parent's style with the node's own via `TextStyle.merge()`. This implements CSS-like style inheritance: a child node only needs to specify the attributes it wants to override; all undefined attributes inherit from the parent. The effective hyperlink and onClick are resolved by "closest ancestor wins" semantics -- the node's own value overrides the parent's if defined.

The visitor callback receives `(text, effectiveStyle, effectiveHyperlink, effectiveOnClick)` for every text leaf in tree order. Early termination is supported: if the visitor returns `false`, the walk aborts immediately.

`toPlainText()` collects all text content without styling. `computeWidth()` delegates to `stringWidth()` from the vendored `wcwidth` module for terminal column-width calculation. `equals()` performs deep structural comparison including recursive child comparison and reference-identity checks for `onClick` handlers.

---

## 2. TextStyle -- Immutable Style Descriptor and ANSI SGR Mapping

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/text-style.ts`

`TextStyle` is an immutable value object with nine optional boolean/color properties:

| Property        | SGR Code | Description                     |
|-----------------|----------|---------------------------------|
| `foreground`    | Color    | Foreground color (named/256/RGB)|
| `background`    | Color    | Background color (named/256/RGB)|
| `bold`          | 1        | Bold/bright                     |
| `dim`           | 2        | Faint/dim                       |
| `italic`        | 3        | Italic                          |
| `underline`     | 4        | Underline                       |
| `inverse`       | 7        | Reverse video                   |
| `hidden`        | 8        | Hidden/invisible                |
| `strikethrough` | 9        | Strikethrough                   |

Two core operations:

- **`merge(other)`**: Produces a new `TextStyle` where each field from `other` overrides `this` only when the field is explicitly defined (not `undefined`). This is the basis for style inheritance in `TextSpan.visitChildren()`.
- **`copyWith(overrides)`**: Similar to merge but takes a plain options object. Used by `RenderText` to apply selection highlighting by overriding just the background color.

The **`toSgr()`** method generates an SGR parameter string (e.g., `"1;31;42"` for bold + red foreground + green background). It maps each boolean attribute to its standard SGR code and delegates color encoding to `Color.toSgrFg()` / `Color.toSgrBg()`. Note that `toSgr()` only includes explicitly set attributes; undefined fields produce no output. This is used primarily for debugging; the actual rendering pipeline uses `buildSgrDelta()` in the renderer for differential output.

Static factory methods provide convenient construction: `TextStyle.bold()`, `TextStyle.italic()`, `TextStyle.underline()`, `TextStyle.colored()`, `TextStyle.background()`.

---

## 3. Color -- Three-Mode Terminal Color with SGR Generation

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/color.ts` (lines 88-199+)

`Color` supports three modes:

- **Named (16 colors)**: `value` 0-15 maps to SGR codes 30-37 (fg normal), 90-97 (fg bright), 40-47 (bg normal), 100-107 (bg bright). Value -1 means "default" (SGR 39/49).
- **Ansi256**: `value` 0-255 maps to SGR `38;5;N` (fg) and `48;5;N` (bg).
- **RGB (TrueColor)**: Packed `(r << 16 | g << 8 | b)` maps to SGR `38;2;R;G;B` (fg) and `48;2;R;G;B` (bg).

When the terminal does not support TrueColor (detected via `TerminalCapabilities.trueColor`), the renderer's `addColorCodes()` function calls `color.toAnsi256()` to down-convert RGB to the nearest 256-color index. The down-conversion uses a cache (`rgbToAnsi256Cache`) for performance.

---

## 4. Text Widget and RenderText -- Layout and Painting

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/text.ts`

### 4.1 Text Widget (Amp: e0)

`Text` is a `LeafRenderObjectWidget` -- it has no child widgets. It holds a `TextSpan` tree, a `textAlign` ('left' | 'center' | 'right'), optional `maxLines`, and an `overflow` mode ('clip' | 'ellipsis'). It creates and updates a `RenderText` render object.

### 4.2 RenderText (Amp: gU0) -- Layout

`RenderText` extends `RenderBox`. During `performLayout()`:

1. **Flatten the TextSpan tree** via `_getLines()`, which calls `TextSpan.visitChildren()` to produce a flat array of `{text, style, hyperlink, onClick}` segments, then splits by newline characters into lines of individual `{char, style, hyperlink, onClick}` entries.
2. **Apply maxLines clipping**: Truncate to the first N lines if `maxLines` is set.
3. **Compute intrinsic size**: Width is the maximum line width (using `stringWidth()` which accounts for CJK double-width characters). Height is the number of display lines.
4. **Constrain**: The intrinsic size is clamped to `BoxConstraints` from the parent.
5. **Build position cache**: `_rebuildPositionCache()` records a `CharacterPosition` (col, row, width) and `CharacterInteraction` (hyperlink, onClick) for every character, and a `VisualLine` (startIndex, endIndex, row) for each line. Text alignment offsets are computed here (center = `floor((availWidth - lineW) / 2)`, right = `availWidth - lineW`).

### 4.3 RenderText -- Painting

During `paint(context, offset)`:

1. Lines are re-extracted and clipped by `maxLines`.
2. If the last line is truncated (by maxLines or width overflow) and `overflow === 'ellipsis'`, `_applyEllipsis()` truncates the line to fit `availWidth - 3` columns and appends `'...'` (three period characters, each width 1).
3. For each character in each visible line, `ctx.drawChar!(col, row, char, textStyleToCellStyle(style))` is called. The `textStyleToCellStyle()` function maps `TextStyle` properties to the `CellStyle` interface expected by the screen buffer: `foreground -> fg`, `background -> bg`, plus all boolean attributes.
4. **Selection highlighting**: If the render object is selectable and has active ranges, highlighted characters get their style overridden via `style.copyWith({ background: highlightColor })` before painting. Two highlight modes are supported: 'selection' (drag selection) and 'copy' (clipboard flash).

### 4.4 Text Selection and Interaction

`RenderText` provides rich interaction support:

- **`updateSelection(start, end, mode)`**: Sets character-range-based selection with clamping.
- **`getOffsetForPosition(x, y)`**: Hit-tests to find the nearest character index to a screen coordinate, using the cached position data. Finds the closest row first, then the character whose center is nearest to x.
- **`getHyperlinkAtPosition(x, y)`** and **`getOnClickAtPosition(x, y)`**: Exact cell-based hit testing (point must be within `[col, col+width)` of a character).
- **`handleMouseEvent(event)`**: Dispatches click/enter/hover/exit events. On hover over interactive text, updates the mouse cursor to POINTER via `MouseManager`.
- **Emoji width support**: `updateEmojiSupport()` toggles between narrow (1-column) and wide (2-column) emoji rendering based on `MediaQueryData.capabilities.emojiWidth`, triggering relayout.

---

## 5. PaintContext -- Canvas Bridge to Screen Buffer

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/paint-context.ts`

`PaintContext` wraps a `ScreenBuffer` and provides drawing primitives with clip-rect enforcement:

- **`drawChar(x, y, char, style?, width?)`**: Draws a single character at absolute coordinates. Uses `wcwidth()` to determine display width. Merges with the existing cell's background color if the new style has no explicit `bg` (this is how transparent text overlays work). Delegates to `ScreenBuffer.setChar()`.
- **`drawText(x, y, text, style?)`**: Iterates over a string, advancing column position by each character's `wcwidth()`. Skips zero-width characters.
- **`drawTextSpan(x, y, span, maxWidth?)`**: Walks a `TextSpan` tree via `visitChildren()`, converting each `TextStyle` to `CellStyle` via `textStyleToCellStyle()`, and draws character-by-character with optional width limit.
- **`withClip(x, y, w, h)`**: Returns a new `PaintContext` with an intersected clip rectangle. All drawing in the sub-context is silently clipped.

The `textStyleToCellStyle()` function is a straightforward field-by-field mapper that only copies defined attributes, preserving the sparse/optional nature of both types.

---

## 6. CellStyle and Cell -- Terminal Grid Data Model

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/cell.ts`

Each terminal cell stores: `char` (a single grapheme), `style` (a `CellStyle` with `fg`, `bg`, `bold`, `italic`, `underline`, `strikethrough`, `dim`, `inverse`), `width` (1 or 2 for CJK), and optional `hyperlink` (URL string for OSC 8).

`EMPTY_CELL` is a frozen sentinel used for identity-based fast-path comparison in the diff algorithm. `cellsEqual()` performs deep comparison including style equality (via `stylesEqual()`) and hyperlink string equality. `blendStyle()` supports alpha compositing for semi-transparent overlays.

---

## 7. Renderer -- ANSI SGR Delta Generation

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/renderer.ts`

The `Renderer` class converts `RowPatch[]` (produced by ScreenBuffer's diff algorithm) into a complete ANSI byte stream. The rendering algorithm:

1. **BSU** (Begin Synchronized Update, `\x1b[?2026h`) prevents flicker.
2. **Cursor hide** during rendering.
3. For each patch: cursor-move (`\x1b[row;colH`), then for each cell:
   - **`buildSgrDelta(prev, next, capabilities)`** computes the minimal SGR escape to transition from the previous cell's style to the current one. It handles:
     - **Full reset** (SGR 0) when bold/dim interaction requires it (SGR code 22 turns off both bold and dim, so if one must be removed while the other stays, a reset is needed followed by re-emission of all active attributes).
     - **Incremental delta**: Only changed attributes are emitted. Bold on = `1`, off = `22` (then re-emit dim if still needed). Italic = `3/23`. Underline = `4/24`. Inverse = `7/27`. Strikethrough = `9/29`.
     - **Color delta**: If color changed, emit new color's SGR; if removed, emit default (39 or 49). RGB colors are down-converted to ansi256 when `capabilities.trueColor` is false.
   - **Hyperlink delta**: OSC 8 open/close sequences are emitted only when the hyperlink URL changes between consecutive cells.
   - **Character output**: The cell's `char` is appended directly. Width-0 continuation cells (second column of CJK characters) are skipped.
4. Cursor restoration if visible, with optional shape (DECSCUSR).
5. **ESU** (End Synchronized Update) and SGR reset.

---

## 8. wcwidth -- Terminal Column Width Calculation

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/wcwidth.ts`

A vendored zero-dependency implementation that returns 0, 1, or 2 columns for a Unicode code point:

- **0-width**: Control characters (0x00-0x1F, 0x7F-0x9F), combining diacritical marks (0x0300-0x036F and extensions), variation selectors (0xFE00-0xFE0F), zero-width spaces/joiners.
- **2-width**: CJK Unified Ideographs (0x4E00-0x9FFF and extensions), Hangul (0xAC00-0xD7AF), Hiragana/Katakana (0x3040-0x33FF), fullwidth forms (0xFF01-0xFF60), emoji blocks (0x1F000-0x1FAFF).
- **1-width**: Everything else (Latin, Cyrillic, Arabic, etc.).

`stringWidth(str)` iterates over a string's codepoints and sums their widths. This is used throughout the pipeline for line width measurement, text alignment offset computation, and clipping decisions.

---

## 9. End-to-End Data Flow Summary

```
TextSpan tree (with nested styles, hyperlinks, onClick)
    |
    v  [TextSpan.visitChildren -- depth-first, style merging]
Flattened segments: [{text, effectiveStyle, hyperlink, onClick}]
    |
    v  [RenderText._getLines -- split by \n, character-level]
Lines: [[{char, style, hyperlink, onClick}]]
    |
    v  [RenderText.performLayout -- maxLines, stringWidth, alignment]
Character position cache + intrinsic size
    |
    v  [RenderText.paint -> PaintContext.drawChar]
    |  [textStyleToCellStyle converts TextStyle -> CellStyle]
ScreenBuffer back buffer: Cell[][] grid
    |
    v  [ScreenBuffer.getDiff -- front vs back buffer comparison]
RowPatch[]: minimal set of changed cell runs
    |
    v  [Renderer.render -> buildSgrDelta per cell]
ANSI escape string (BSU + cursor moves + SGR deltas + chars + ESU)
    |
    v  [stdout.write]
Terminal display
```

---

## 10. Key Design Observations

1. **Style inheritance is lazy and composable**: `TextStyle.merge()` only overrides defined fields, enabling a natural cascading model identical to CSS inheritance. A deeply nested `TextSpan` child only needs to specify its delta from the parent.

2. **Minimal ANSI output**: The `buildSgrDelta()` function is carefully tuned to emit only the difference between consecutive cell styles. The bold/dim interaction (shared SGR off-code 22) is handled via a reset-and-rebuild strategy that avoids incorrect attribute clearing.

3. **Integer-only coordinates**: All positions use integer `col`/`row` values. There are no fractional coordinates, consistent with terminal cell addressing.

4. **Character-level granularity in painting**: Each character is individually painted via `drawChar()`, allowing per-character style variation, selection highlighting, and hyperlink boundaries. This matches how Amp's original `gU0.paint()` operates.

5. **CJK and emoji width awareness**: The vendored `wcwidth` implementation ensures that double-width characters occupy two grid cells. The emoji width support flag (`_emojiWidthSupported`) allows dynamic adjustment based on terminal capability detection (mode 2027).

6. **OSC 8 hyperlinks**: The hyperlink system threads through the entire pipeline -- from `TextSpanHyperlink` in the tree, through character interaction caches, to `Cell.hyperlink` in the screen buffer, and finally to OSC 8 escape sequences in the renderer. Hit-testing for hyperlinks uses exact cell bounds rather than nearest-character logic.

7. **Selection as a paint-time overlay**: Text selection does not modify the underlying text data. Instead, `RenderText.paint()` checks each character index against a `Set<number>` of highlighted indices and applies a background color override via `TextStyle.copyWith()`. This keeps selection state cleanly separated from content.

8. **Background color preservation**: `PaintContext._mergeWithExistingBg()` ensures that when a character is painted without an explicit background, the existing cell's background color is inherited. This enables transparent text rendering over colored container backgrounds without requiring every text style to explicitly set a background.
