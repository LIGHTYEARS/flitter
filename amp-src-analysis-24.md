# Analysis 24: Terminal Renderer, ScreenBuffer, and ANSI Output

## Source Files

- `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/cell.ts` -- Cell/CellStyle data model
- `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/screen-buffer.ts` -- ScreenBuffer and Buffer classes
- `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/renderer.ts` -- ANSI Renderer and SGR generation
- `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/terminal-manager.ts` -- TerminalManager orchestration

---

## 1. Cell and CellStyle Data Model

The atomic unit of the terminal display is the `Cell` interface defined in `cell.ts`. Each Cell holds four fields: `char` (a single grapheme, defaulting to a space), `style` (a `CellStyle` object), `width` (display width -- 1 for normal characters, 2 for CJK full-width), and an optional `hyperlink` string for OSC 8 links.

`CellStyle` is an interface carrying optional visual attributes: `fg` and `bg` (both `Color` instances), plus boolean flags for `bold`, `dim`, `italic`, `underline`, `strikethrough`, and `inverse`. This matches the Amp reference where the minified `q3` factory creates cell objects with these same properties.

A critical optimization is `EMPTY_CELL` -- a frozen sentinel object (`Object.freeze`) representing a blank space with an empty style. Because it is a singleton reference, the diff algorithm can use identity comparison (`===`) as a fast-path skip, avoiding the cost of deep equality checks on cells that have not been touched. The `cellsEqual()` function performs full deep comparison when the identity check fails, comparing char, width, style (via `stylesEqual()`), and hyperlink. The `stylesEqual()` function compares all eight style properties, delegating color comparison to a helper that handles the `undefined`-vs-`Color` cases.

A companion `blendStyle()` function supports alpha compositing: when a front cell has colors with alpha less than 1.0, they are blended with the back cell's colors via `blendColor()`. Boolean attributes use a fallback chain (`front.bold ?? back.bold`).

The diff output types -- `CellPatch` (a contiguous horizontal run of changed cells starting at a column) and `RowPatch` (all patches for a given row) -- are also defined here, providing the structured diff format that the renderer consumes.

---

## 2. ScreenBuffer -- Double-Buffered Cell Grid

### Buffer (Internal Grid)

The `Buffer` class is the low-level cell grid, holding cells in a flat array in row-major order (index = `y * width + x`). It provides `getCell(x, y)` and `setCell(x, y, cell)` with bounds checking -- out-of-bounds reads return `EMPTY_CELL`, out-of-bounds writes silently no-op. The `setCell` method also handles CJK wide characters: when a cell has `width > 1`, trailing columns are filled with zero-width continuation markers (cells with empty char and width 0). The `clear()` method resets all cells to the `EMPTY_CELL` reference. The `resize()` method preserves existing content where overlapping dimensions allow, filling new cells with `EMPTY_CELL`. A `copyTo()` method performs deep cloning of the entire cell array to a target buffer.

### ScreenBuffer (Double Buffer)

`ScreenBuffer` owns two `Buffer` instances: `frontBuffer` (the committed/displayed frame) and `backBuffer` (the writable surface for the current paint cycle). Widget painting always targets the back buffer. The class exposes convenience methods: `setCell()`, `setChar()`, `fill()` (for rectangular regions), and `clear()`.

The key operations are:

**`getDiff()`** -- Computes the difference between front and back buffers, returning `RowPatch[]`. Two paths exist:
- **Full refresh path**: When `needsFullRefresh` is true (after resize or explicit `markForRefresh()`), every cell in the back buffer is emitted as a single contiguous run per row. This resets the flag afterward.
- **Incremental diff path**: Scans every cell position, comparing front and back. The identity fast-path (`frontCell === EMPTY_CELL && backCell === EMPTY_CELL`) skips cells that are both the empty sentinel. For all other cells, `cellsEqual()` determines whether a change occurred. Changed cells are grouped into contiguous `CellPatch` runs. Only rows with at least one change produce a `RowPatch`.

**`present()`** -- Classic double-buffer swap: the front and back buffer references are exchanged, and the new back buffer (the old front) is cleared for the next frame. This is a cheap pointer swap, not a data copy.

Additional state tracked by ScreenBuffer includes cursor position (`{x, y}` or null), cursor visibility, cursor shape (DECSCUSR 0-6), default foreground/background colors, and an optional 256-color index-to-RGB mapping table used for alpha blending with ansi256 colors.

---

## 3. Renderer -- ANSI Escape Sequence Generation

### Escape Sequence Constants

The renderer module defines a comprehensive set of ANSI/xterm escape sequences as exported constants:

- **Core**: `ESC` (`\x1b`), `CSI` (`\x1b[`), `OSC` (`\x1b]`), `ST` (`\x1b\\`)
- **Synchronized Update**: `BSU` (`\x1b[?2026h`) and `ESU` (`\x1b[?2026l`) -- prevent flicker by telling the terminal to buffer output between these markers
- **Cursor**: `CURSOR_HIDE`, `CURSOR_SHOW`, `CURSOR_MOVE(x, y)` (1-based CUP sequence), `CURSOR_SHAPE(n)` (DECSCUSR)
- **Screen**: `ALT_SCREEN_ON/OFF` (mode 1049), `CLEAR_SCREEN` (ED 2J)
- **Mouse**: Enable/disable sequences for button tracking (1002), any-event tracking (1003), focus events (1004), SGR extended mode (1006), and pixel mouse (1016)
- **Bracketed Paste**: Mode 2004 on/off
- **Hyperlinks**: OSC 8 open/close for clickable URLs
- **Terminal Protocol Extensions (TPRO-01 through TPRO-08)**: Kitty keyboard protocol, ModifyOtherKeys, emoji width mode (2027), in-band resize (2048), progress bar (OSC 9;4), window title (OSC 0), mouse cursor shape (OSC 22), and pixel mouse mode
- **Clipboard**: `osc52Copy()` encodes text as base64 and wraps in OSC 52 for system clipboard access

### buildSgrDelta -- Minimal Style Transition

The `buildSgrDelta(prev, next, capabilities?)` function is the core performance optimization for text styling. Rather than emitting a full SGR reset followed by all attributes for every cell, it computes the minimal set of SGR codes needed to transition from one style to the next.

The algorithm proceeds as follows:

1. **Identity check**: If `stylesEqual(prev, next)` returns true, return an empty string -- no escape sequence needed.

2. **Reset detection** via `checkNeedsReset()`: Bold and dim share the SGR off-code `22`. If the transition requires turning off bold while keeping dim (or vice versa), a full `SGR 0` reset is required because there is no way to turn off only one of the two independently. This is a known SGR limitation faithfully reproduced from the Amp reference (`WF8`).

3. **Reset path**: When a reset is needed, the code emits `0` (reset all), then re-emits all of the next style's active attributes: colors, bold, dim, italic, underline, inverse, strikethrough.

4. **Incremental path**: When no reset is needed, only changed attributes are emitted:
   - **Colors**: `addColorCodes()` compares prev and next colors. If the next color is undefined, it emits the default reset code (39 for fg, 49 for bg). Otherwise it delegates to `Color.toSgrFg()` / `toSgrBg()`. When `TerminalCapabilities` indicates no trueColor support, RGB colors are automatically downconverted to ansi256 via `color.toAnsi256()` before emission.
   - **Boolean attributes**: `addBoolAttrDelta()` compares each boolean flag. When turning off bold, it emits `22` (which also disables dim), then re-emits dim if it should remain active. The same logic applies symmetrically for dim. Other attributes (italic 3/23, underline 4/24, inverse 7/27, strikethrough 9/29) have independent on/off codes.

The final output is a single CSI sequence: `\x1b[<codes>m` with semicolon-separated codes.

### Hyperlink Delta

The `buildHyperlinkDelta()` method tracks the last hyperlink URL. When the hyperlink changes, it emits either `HYPERLINK_CLOSE` (OSC 8 with empty URI) or `hyperlinkOpen(uri)` (which implicitly closes any previous link).

### Renderer.render() -- Main Output Pipeline

The `render(patches, cursor?)` method converts diff patches into a single ANSI output string:

1. **BSU** -- Begin Synchronized Update to prevent partial-frame flicker.
2. **Hide cursor** -- Prevents cursor flash during cell updates.
3. **Process patches** -- Patches are sorted by row. For each `RowPatch`, for each `CellPatch`:
   - A `CURSOR_MOVE` sequence positions the terminal cursor at the patch's starting column and row.
   - For each cell in the patch: width-0 continuation cells (trailing columns of CJK characters) are skipped. For real cells, `buildSgrDelta()` computes the minimal SGR transition from `lastStyle` to the cell's style. The SGR sequence (if any) is emitted, followed by the hyperlink delta (if any), followed by the cell's character.
   - `lastStyle` is updated after each cell emission to enable incremental SGR tracking.
4. **Cursor state** -- If the cursor should be visible, a `CURSOR_MOVE` positions it, an optional `CURSOR_SHAPE` sets the shape (DECSCUSR), and `CURSOR_SHOW` makes it visible.
5. **ESU** -- End Synchronized Update.
6. **SGR Reset** -- A final `\x1b[0m` ensures the terminal is left in a clean state. `lastStyle` and `lastHyperlink` are cleared.

All parts are concatenated with `parts.join('')` for a single write to stdout.

### Convenience Methods

The Renderer also exposes individual escape sequence generators used by TerminalManager for lifecycle operations: `clearScreen()`, `enterAltScreen()`, `exitAltScreen()`, `enableMouse()`, `disableMouse()`, `enableBracketedPaste()`, `disableBracketedPaste()`, and the TPRO-01 through TPRO-08 protocol methods. These return raw escape strings that the caller writes to stdout.

---

## 4. TerminalManager -- Orchestration

`TerminalManager` (Amp class `wB0`) ties the system together. It owns a `ScreenBuffer`, a `Renderer`, and a `PlatformAdapter`. Its `flush()` method executes the full render cycle:

1. Call `screenBuffer.getDiff()` to get the changed cells.
2. Count changed cells and compute render statistics (repainted cell count, total cell count, repainted percentage, bytes written).
3. Build a `CursorState` from the screen buffer's cursor position, visibility, and shape.
4. Call `renderer.render(diff, cursorState)` to produce the ANSI output string.
5. Write the output to stdout via `platform.writeStdout()`.
6. Call `screenBuffer.present()` to swap buffers.

The manager handles lifecycle (initialize/dispose with raw mode, alt screen, mouse, bracketed paste), resize events (resizing the ScreenBuffer and marking for full refresh), suspend/resume for external editor integration, JetBrains terminal wheel event debouncing (MINR-01, 50ms threshold), configurable scroll step (MINR-05, clamped 1-20), and OSC 52 clipboard operations.

---

## 5. Performance Optimizations

Several deliberate optimizations minimize the bytes written per frame:

- **EMPTY_CELL identity check**: The most common case (unchanged empty cells) is handled by a single `===` comparison, avoiding any property access.
- **Incremental SGR via buildSgrDelta**: Only the attributes that actually changed between adjacent cells are emitted. Across a row of identically styled text, zero SGR bytes are produced after the first cell.
- **Contiguous run grouping**: Changed cells are grouped into CellPatch runs. A single CURSOR_MOVE positions the cursor at the start of each run, avoiding per-cell cursor repositioning.
- **Sorted row processing**: Patches are sorted by row, enabling top-to-bottom cursor movement that avoids unnecessary long-distance jumps.
- **Double buffer swap (not copy)**: `present()` swaps two buffer pointers rather than copying cell data, making the frame commit O(1).
- **Synchronized update protocol**: BSU/ESU wrapping ensures the terminal does not render partial frames, eliminating visual tearing.
- **Color downconversion**: When the terminal lacks trueColor support, RGB colors are automatically converted to ansi256, avoiding unsupported escape sequences.
- **Full refresh flag**: After resize, a single flag triggers a complete re-emit of the back buffer, avoiding stale front-buffer comparisons against a differently sized grid.
