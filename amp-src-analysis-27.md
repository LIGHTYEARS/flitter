# Analysis 27: Color System, wcwidth, and Character Width Handling

## Source Files

- `/home/gem/workspace/flitter/packages/flitter-core/src/core/color.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/core/wcwidth.ts`

---

## Color System (`color.ts`)

### Architecture

The `Color` class is an immutable value type that models terminal colors across three fidelity modes, expressed via the discriminated union type `ColorMode = 'named' | 'ansi256' | 'rgb'`. All three modes share a single `value: number` field whose interpretation depends on the mode: named colors store an index 0-15 (or -1 for the terminal default sentinel), ansi256 stores 0-255, and RGB packs three 8-bit channels into a single integer via `(r << 16) | (g << 8) | b`. The constructor is private, enforcing creation exclusively through static constants and factory methods.

### Named Color Constants and Factory Methods

The class exposes 16 singleton static constants (`Color.black` through `Color.brightWhite`) plus `Color.defaultColor` (value -1), serving as the standard 16-color ANSI palette. Three factory methods serve different creation paths: `Color.named(index)` for explicit index-based creation with range validation (0-15), `Color.ansi256(index)` for 256-color palette access (0-255), and `Color.rgb(r, g, b)` which clamps and rounds each channel before bit-packing. There is no explicit `Color.rgba()` factory; instead, any Color can be given an alpha channel through the `withAlpha(alpha)` method, which returns a new Color with the same mode and value but a different alpha (clamped to [0.0, 1.0]).

### SGR Escape Sequence Generation

The `toSgrFg()` and `toSgrBg()` methods convert colors into ANSI SGR parameter strings for terminal escape sequences. For named colors, standard indices 0-7 map to foreground codes 30-37 (background 40-47), bright indices 8-15 map to 90-97 (background 100-107), and the default sentinel produces code 39 (foreground) or 49 (background). Ansi256 colors emit `38;5;N` or `48;5;N`. RGB colors emit `38;2;R;G;B` or `48;2;R;G;B`. The `r`, `g`, `b` getters extract channels from the packed integer using bit shifts and masks, but throw errors if invoked on non-RGB colors.

### Ansi256 Downconversion from RGB

The `findNearestAnsi256(r, g, b)` function performs brute-force nearest-neighbor search across palette indices 16-255 (the 6x6x6 color cube plus the 24-step grayscale ramp), using squared Euclidean distance in RGB space. A `Map<number, number>` cache keyed by `(r << 16) | (g << 8) | b` memoizes results to avoid repeated O(240) scans. The full 256-color lookup table is generated at module load by `buildAnsi256Table()`, which enumerates the 8 standard colors, 8 bright colors, the 6x6x6 cube (using the canonical step values [0, 95, 135, 175, 215, 255]), and the grayscale ramp (8 + i*10 for i in 0..23).

### Alpha Channel and Color Blending

The alpha channel defaults to 1.0 (fully opaque). The standalone `blendColor(front, back)` function implements standard "front over back" alpha compositing: `result = front * alpha + back * (1 - alpha)`. It short-circuits for fully opaque or fully transparent fronts. Both colors are converted to RGB for blending math, with the result always having alpha 1.0. The `defaultColor` sentinel cannot be converted to RGB, so the function falls through to returning `front` in that edge case.

### Integration with the Cell Model

The `Cell` interface in `terminal/cell.ts` carries a `CellStyle` that holds optional `fg` and `bg` fields of type `Color`. The `blendStyle()` function uses `blendColor()` to composite foreground and background colors between overlapping cell styles when alpha is less than 1.0, enabling translucent layering effects. Boolean attributes (bold, italic, underline, strikethrough, dim, inverse) use nullish coalescing, falling back to the back style.

---

## wcwidth Implementation (`wcwidth.ts`)

### Core Function

The `wcwidth(codePoint)` function returns the display width of a Unicode code point in terminal columns: 0 for control characters and zero-width characters, 2 for CJK/fullwidth/wide characters, and 1 for everything else. This is a vendored, zero-dependency implementation that replaces the standard POSIX wcwidth behavior for use in a JavaScript/TypeScript environment.

### Zero-Width Detection

The `isZeroWidth()` helper identifies characters that occupy no column space: explicit zero-width Unicode characters (U+200B Zero Width Space, U+200C ZWNJ, U+200D ZWJ, U+FEFF BOM, U+2060 Word Joiner, U+00AD Soft Hyphen) and five ranges of combining marks (Combining Diacritical Marks U+0300-036F, Extended U+1AB0-1AFF, Supplement U+1DC0-1DFF, Symbols U+20D0-20FF, Half Marks U+FE20-FE2F). It also covers Variation Selectors (U+FE00-FE0F) and the Variation Selectors Supplement (U+E0100-E01EF).

### Wide Character Detection

The `isWide()` helper covers a comprehensive set of East Asian and emoji ranges: Hangul Jamo (U+1100-115F), CJK Radicals/Kangxi/Symbols (U+2E80-303E), Hiragana through CJK Compatibility (U+3040-33FF), CJK Unified Ideographs Extension A (U+3400-4DBF), CJK Unified Ideographs (U+4E00-9FFF), Yi Syllables (U+A000-A4CF), Hangul Jamo Extended-A (U+A960-A97F), Hangul Syllables (U+AC00-D7AF), CJK Compatibility Ideographs (U+F900-FAFF), CJK Compatibility Forms (U+FE10-FE6F), Fullwidth Forms (U+FF01-FF60, U+FFE0-FFE6), emoji blocks (U+1F000-1F9FF, U+1FA00-1FA6F, U+1FA70-1FAFF), and extended CJK planes (U+20000-2FFFF, U+30000-3FFFF). Notably, the halfwidth katakana range U+FF61-FFDC is explicitly excluded from the fullwidth block.

### String Width Convenience

The `stringWidth(str)` function iterates over all codepoints (using `for...of` to correctly handle surrogate pairs for characters above U+FFFF) and sums their individual `wcwidth()` values.

---

## Integration with Text Layout

### TextSpan Width Calculation

The `TextSpan` class in `core/text-span.ts` imports `stringWidth` and uses it in its `computeWidth()` method, which extracts plain text via tree traversal and then computes the total display column width. This is the entry point for layout calculations that need to know how wide a styled text tree will render.

### Paint Context Character Rendering

The `PaintContext` in `scheduler/paint-context.ts` imports `wcwidth` directly and uses it at three critical points:
1. **`drawChar()`** -- determines the display width of a single character, defaulting to `wcwidth(codePoint)` if no explicit width is provided. Wide characters (width 2) must occupy two cell slots.
2. **`drawText()`** -- iterates over each codepoint in a text string, calling `wcwidth()` per character. Zero-width characters are skipped entirely. The cursor position `curX` advances by the character's width (1 or 2).
3. **`drawTextSpan()`** -- walks the TextSpan tree via `visitChildren()`, computing per-character widths with `wcwidth()` and respecting a `maxWidth` limit to prevent overflow.

### Text Widget Layout and Rendering

The `RenderText` object in `widgets/text.ts` uses `stringWidth` extensively during layout and paint:
- **`_lineWidth()`** computes the pixel-column width of a laid-out line by summing `stringWidth()` for each character entry.
- **Layout positioning** uses `stringWidth()` to place each character at the correct column offset, storing `{ col, row, width }` tuples for hit testing and selection.
- **Paint phase** calls `stringWidth()` per character to advance the column cursor and clips characters that would exceed the available width.
- **Ellipsis truncation** uses `stringWidth()` to measure when accumulated characters exceed `availWidth - ellipsisWidth`, breaking the line and appending the ellipsis marker.

This consistent use of `wcwidth`/`stringWidth` throughout the rendering pipeline ensures that CJK characters, emoji, combining marks, and control characters are all handled correctly at every stage -- from abstract layout measurement through concrete screen-buffer cell placement.
