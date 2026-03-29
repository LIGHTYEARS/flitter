# Analysis 35: Scrollbar Widget and Sub-Character Precision Rendering

## Overview

The Scrollbar widget in `flitter-core` provides a vertical scroll indicator that syncs with a `ScrollController`. Its most notable feature is **sub-character precision rendering**, which uses Unicode lower-block elements (`U+2581` through `U+2588`) to achieve 1/8th character granularity for the thumb position and edges. This technique allows smooth, nearly pixel-level scrollbar movement within the inherently coarse grid of a terminal UI.

The primary source files analyzed:

- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scrollbar.ts` (479 lines)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-view.ts` (428 lines)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-controller.ts` (201 lines)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/scrollbar.test.ts` (1059 lines)
- `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/paint-context.ts` (PaintContext with `drawChar`)

---

## 1. Widget Hierarchy: Scrollbar to RenderObject

The Scrollbar follows a three-layer architecture that mirrors Flutter's widget/state/render-object separation:

### Layer 1: `Scrollbar` (StatefulWidget)

```
Scrollbar extends StatefulWidget
```

The public API widget. Accepts configuration options:
- `controller?: ScrollController` -- binds to a shared scroll controller
- `getScrollInfo?: () => ScrollInfo` -- alternative: provide scroll state via callback
- `thickness: number` (default `1`) -- width in terminal columns
- `trackChar: string` (default `'░'` / `U+2591`) -- character for the track background
- `thumbChar: string` (default `'█'` / `U+2588`) -- character for the thumb (used only in classic mode)
- `showTrack: boolean` (default `true`) -- whether to render the track background
- `thumbColor?: Color`, `trackColor?: Color` -- styling
- `subCharacterPrecision: boolean` (default `true`) -- enable 1/8th precision rendering

### Layer 2: `ScrollbarState` (State)

Manages the lifecycle connection between the `ScrollController` and the widget tree:

1. **`initState()`**: Subscribes to `controller.addListener(this._onScrollChanged)`
2. **`didUpdateWidget()`**: Handles controller hot-swapping -- removes old listener, attaches new one
3. **`dispose()`**: Removes listener to prevent leaks
4. **`build()`**: Computes a `ScrollInfo` object from either the `getScrollInfo` callback or the controller's state, then passes it to `_ScrollbarRender`

The `_onScrollChanged` handler simply calls `this.setState()`, which triggers a rebuild. This means every scroll offset change triggers a full rebuild of the `_ScrollbarRender` leaf widget.

### Layer 3: `_ScrollbarRender` (LeafRenderObjectWidget) and `RenderScrollbar` (RenderBox)

`_ScrollbarRender` is a private `LeafRenderObjectWidget` that creates and updates a `RenderScrollbar`:

```
_ScrollbarRender extends LeafRenderObjectWidget
  -> createRenderObject(): RenderScrollbar
  -> updateRenderObject(): copies all fields, calls markNeedsPaint()
```

`RenderScrollbar` is the actual `RenderBox` that performs layout and painting. As a leaf node, it has no children.

### Hierarchy Diagram

```
Scrollbar (StatefulWidget)
  └─ ScrollbarState (State)
       └─ _ScrollbarRender (LeafRenderObjectWidget)
            └─ RenderScrollbar (RenderBox, leaf)
                 ├─ performLayout()
                 └─ paint()
```

---

## 2. Thumb Position and Size Calculation Algorithm

The scrollbar provides two calculation modes: a `computeThumbMetrics()` method for classic whole-character rendering, and an inline computation within the `paint()` method for sub-character precision.

### 2.1 Classic Mode: `computeThumbMetrics()`

This method computes thumb position in integer row units:

```typescript
computeThumbMetrics(viewportHeight: number): { thumbTop: number; thumbHeight: number } | null
```

**Null guard**: Returns `null` if no `scrollInfo`, viewport is zero, or content fits entirely within the viewport (no scrolling needed).

**Effective total content**: When `scrollInfo.viewportHeight` is zero (fallback mode), the code adjusts:
```
effectiveTotalContent = totalContentHeight - 1 + vpHeight
```
This accounts for the off-by-one when deriving total content from `maxScrollExtent + 1`.

**Core formulas**:
```
thumbHeight = max(1, round((vpHeight / effectiveTotalContent) * viewportHeight))
maxThumbTop = viewportHeight - thumbHeight
scrollFraction = scrollOffset / (effectiveTotalContent - vpHeight)
thumbTop = round(clamp(scrollFraction * maxThumbTop, 0, maxThumbTop))
```

The minimum thumb height of 1 ensures the thumb is always visible, even for extremely large content.

### 2.2 Sub-Character Mode: Eighths-Based Calculation

The sub-character rendering performs all position math in **eighths of a character cell**:

```typescript
const totalEighths = height * 8;
const thumbEighths = Math.max(8, Math.floor(scrollRatio * totalEighths));
const maxThumbTopEighths = totalEighths - thumbEighths;
const thumbTopEighths = Math.floor(clamp(scrollPositionRatio * maxThumbTopEighths, 0, maxThumbTopEighths));
const thumbBottomEighths = thumbTopEighths + thumbEighths;
```

Key design decisions:

1. **`Math.floor` for thumb size** (not `Math.round`): Prevents jitter where the thumb size would fluctuate by one eighth as the scroll position changes. The test suite (`thumbEighths is constant across all scroll positions`) explicitly verifies this invariant.

2. **`Math.floor` for thumb position**: Keeps movement monotonically stable -- the thumb never jumps backward as the user scrolls down.

3. **Minimum of 8 eighths** (one full character row): Ensures the thumb is always at least one cell tall.

4. **`scrollRatio = vpHeight / effectiveTotalContent`**: The proportion of content visible determines the thumb's proportional size.

5. **`scrollPositionRatio = scrollOffset / maxScrollOffset`**: The current scroll fraction determines where the thumb sits.

---

## 3. Sub-Character Rendering Technique

This is the most architecturally interesting part of the scrollbar. Unicode provides "Lower Block Elements" that fill a character cell from the bottom upward:

```typescript
const BLOCK_ELEMENTS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
//                       0    1    2    3    4    5    6    7    8
```

Index `N` means the lower `N/8` of the cell is filled. The rendering algorithm uses this to represent partial thumb coverage of a cell with three distinct strategies.

### 3.1 Per-Row Classification

For each row in the viewport, the algorithm computes the overlap between the row's eighth-range `[row*8, row*8+8)` and the thumb's eighth-range `[thumbTopEighths, thumbBottomEighths)`:

```typescript
const overlapStart = Math.max(rowTopEighths, thumbTopEighths);
const overlapEnd = Math.min(rowBottomEighths, thumbBottomEighths);
const coveredEighths = Math.max(0, overlapEnd - overlapStart);
```

This yields three cases:

### 3.2 Case A: Fully Covered (`coveredEighths >= 8`)

The entire cell is within the thumb. Rendered as a full block (`█`) with **both fg and bg set to `thumbColor`**:

```typescript
style.fg = thumbColor;
style.bg = thumbColor;
```

Setting both colors ensures a seamless solid fill with no visible gaps from the character glyph's kerning or rendering artifacts.

### 3.3 Case B: Top Edge (`overlapStart > rowTopEighths`)

The thumb **starts** partway through this row, covering the bottom portion. Since lower-block elements naturally fill from the bottom, this maps directly:

```typescript
ctx.drawChar(col, row, BLOCK_ELEMENTS[coveredEighths], {
  fg: thumbColor,    // the filled lower portion = thumb
  bg: trackColor,    // the unfilled upper portion = track
});
```

For example, if 3 eighths are covered, `BLOCK_ELEMENTS[3]` (`▃`) is drawn. The lower 3/8 of the cell shows in `thumbColor` (fg), while the upper 5/8 shows in `trackColor` (bg).

### 3.4 Case C: Bottom Edge (`overlapStart === rowTopEighths`, partial coverage)

The thumb **ends** partway through this row, covering the top portion but leaving a gap at the bottom. Since lower-block elements only fill from the bottom, the rendering is **inverted**:

```typescript
const gapEighths = 8 - coveredEighths;
ctx.drawChar(col, row, BLOCK_ELEMENTS[gapEighths], {
  fg: trackColor,    // the filled lower portion = track (the gap)
  bg: thumbColor,    // the unfilled upper portion = thumb
});
```

This is the clever trick: instead of drawing what the thumb covers (top portion), the code draws the **uncovered gap** (bottom portion) in track color, with the thumb color as the background. Visually, the bg fills the upper region while the fg lower-block fills the bottom gap.

### 3.5 Fallback: No Colors

When neither `thumbColor` nor `trackColor` is specified, the code sets `style.inverse = true` for both top and bottom edges. This relies on the terminal's default foreground/background colors being swapped to produce a visible distinction.

### 3.6 Visual Example

For a 10-row viewport with content 5x the viewport, scrolled to 10%:

```
Row 0: ░  (no overlap -- track)
Row 1: ▃  (top edge -- thumb starts at 3/8 into the row, fg=thumb, bg=track)
Row 2: █  (fully covered -- both fg+bg = thumb color)
Row 3: ▃  (bottom edge -- gap of 3/8 at bottom, fg=track, bg=thumb)
Row 4: ░  (no overlap -- track)
...
Row 9: ░  (no overlap -- track)
```

---

## 4. Integration with ScrollController and ScrollView

### 4.1 ScrollController

`ScrollController` (`scroll-controller.ts`) is the central scroll state manager:

- **`offset`**: Current scroll position (clamped to `[0, maxScrollExtent]`)
- **`maxScrollExtent`**: Maximum scrollable distance (`childSize - viewportSize`)
- **`viewportSize`**: Set by `RenderScrollViewport` during layout via `updateViewportSize()`
- **`followMode`**: Auto-scroll to bottom when new content is added
- **Listener pattern**: `addListener()` / `removeListener()` with a `Set<() => void>`
- **Animation**: `animateTo()` provides linear interpolation at ~60fps via `setInterval`

### 4.2 Data Flow: Controller to Scrollbar

The `ScrollbarState.build()` method derives `ScrollInfo` from the controller:

```typescript
scrollInfo = {
  totalContentHeight: ctrl.maxScrollExtent + ctrl.viewportSize,
  viewportHeight: ctrl.viewportSize,
  scrollOffset: ctrl.offset,
};
```

This reconstruction is exact: `maxScrollExtent = totalContent - viewportHeight`, so `totalContent = maxScrollExtent + viewportHeight`. The test suite verifies: `expect(scrollInfo.totalContentHeight).toBe(100)` for `maxScrollExtent=80, viewportSize=20`.

### 4.3 ScrollView Architecture

`SingleChildScrollView` is a `StatelessWidget` that delegates to `Scrollable`:

```
SingleChildScrollView (StatelessWidget)
  └─ Scrollable (StatefulWidget)
       └─ ScrollableState
            └─ FocusScope (optional, for keyboard)
                 └─ MouseRegion (optional, for mouse wheel)
                      └─ ScrollViewport (SingleChildRenderObjectWidget)
                           └─ RenderScrollViewport (RenderBox)
                                └─ child (unbounded layout on main axis)
```

### 4.4 RenderScrollViewport Layout Protocol

1. Lays out the child with **unbounded constraints** on the main axis (`maxHeight: Infinity` for vertical)
2. Self-sizes to the parent's constraints
3. Calls `scrollController.updateViewportSize(viewportMainSize)` -- this is how the scrollbar learns the viewport size
4. Calls `scrollController.updateMaxScrollExtent(maxExtent)` where `maxExtent = childSize - viewportSize`
5. Handles `position='bottom'` anchoring (content sticks to the bottom when shorter than viewport)

### 4.5 Typical Usage Pattern

The scrollbar and scroll view share a controller but are siblings in the widget tree:

```typescript
new Row({ children: [
  new Expanded({
    child: new SingleChildScrollView({ controller, child })
  }),
  new Scrollbar({ controller }),
]})
```

The `ScrollController` acts as a shared bus: `RenderScrollViewport` writes scroll metrics (viewport size, max extent), `Scrollable` writes scroll position (from keyboard/mouse input), and `ScrollbarState` reads all of them to render.

---

## 5. Mouse Interaction Handling

### 5.1 Scroll Wheel on the ScrollView

Mouse scroll is handled by `ScrollableState` via a `MouseRegion` wrapper:

```typescript
private _handleScroll = (event: { button?: number }): void => {
  if (event.button === 64) {          // scroll up
    this.effectiveController.disableFollowMode();
    this.effectiveController.scrollBy(-3);
  } else if (event.button === 65) {   // scroll down
    this.effectiveController.scrollBy(3);
  }
};
```

- Button 64/65 correspond to xterm mouse scroll up/down events
- Scroll step is 3 rows per wheel click
- Scrolling up disables `followMode` (prevents auto-scroll-to-bottom)

### 5.2 No Direct Mouse Interaction on the Scrollbar Itself

Notably, the `Scrollbar` widget does **not** handle mouse events directly. There is no click-to-jump, no thumb dragging, and no track clicking. The scrollbar is a purely visual indicator. All scroll interaction goes through the `ScrollView`'s `MouseRegion` (and optionally its `FocusScope` for keyboard input).

This is consistent with many TUI frameworks where the scrollbar is purely decorative and scroll interaction happens through the content area.

### 5.3 Keyboard Scroll

When `enableKeyboardScroll` is true, `ScrollableState` wraps the viewport in a `FocusScope` with handlers for:

| Key | Action |
|-----|--------|
| `j` / `ArrowDown` | Scroll down 1 line |
| `k` / `ArrowUp` | Scroll up 1 line, disable follow mode |
| `g` | Jump to top, disable follow mode |
| `G` (shift+g) | Jump to bottom |
| `PageDown` | Scroll down by viewport size |
| `PageUp` | Scroll up by viewport size, disable follow mode |
| `Ctrl+d` | Scroll down half page |
| `Ctrl+u` | Scroll up half page, disable follow mode |

These are vim-style keybindings, appropriate for a TUI.

---

## 6. Performance Considerations

### 6.1 Rebuild Frequency

Every `ScrollController` notification triggers `ScrollbarState.setState()`, which causes a full rebuild of `_ScrollbarRender`. The `updateRenderObject()` path copies all fields and calls `markNeedsPaint()`, which is the lightest possible repaint trigger (no re-layout needed since the scrollbar's size does not change with scroll position).

However, there is a subtlety: `performLayout()` always recalculates `Size` even though the scrollbar's size never changes after the first layout (it is always `thickness x maxHeight`). The layout phase could potentially be short-circuited by checking if constraints have changed, but the base `RenderBox.layout()` already includes a constraints-unchanged check (`_needsLayout is cleared BEFORE performLayout() is called`), so this is handled at the framework level.

### 6.2 Paint Efficiency

The sub-character precision paint loop iterates over `height * width` cells:

```typescript
for (let row = 0; row < height; row++) {
  // ... compute overlap
  for (let col = 0; col < width; col++) {
    ctx.drawChar(...);
  }
}
```

For a typical terminal (24-50 rows, thickness 1), this is 24-50 `drawChar` calls per paint -- negligible.

The track is drawn first as a full pass, then the thumb overdraw occurs. Rows with no overlap (`coveredEighths <= 0`) skip the inner column loop via `continue`, so only thumb rows generate double-writes.

### 6.3 Math.floor vs Math.round for Stability

The choice of `Math.floor` over `Math.round` for both `thumbEighths` and `thumbTopEighths` is a deliberate performance-of-visual quality decision. `Math.round` would cause the thumb size to oscillate by 1 eighth as the scroll position changes, creating a visually distracting jitter. `Math.floor` ensures monotonic, stable values. The test suite explicitly regresses this:

```typescript
test('thumbEighths is constant across all scroll positions', () => {
  // ... iterates all scroll positions
  expect(thumbSizes.size).toBeLessThanOrEqual(2);
});
```

### 6.4 No Caching

The render object does not cache the computed thumb metrics or the resulting character array between paints. Given the small size (typically < 50 cells), this is appropriate -- the computation cost is dominated by the `drawChar` calls to the screen buffer, not the arithmetic.

---

## 7. Code Quality and Architecture Observations

### 7.1 Strengths

**Clean separation of concerns**: The three-layer architecture (StatefulWidget, State, LeafRenderObjectWidget + RenderBox) follows Flutter's pattern precisely. The State handles lifecycle (listener subscription), the widget is immutable configuration, and the render object handles layout + paint.

**Dual input mode**: Supporting both `ScrollController` and `getScrollInfo` callback gives consumers flexibility. The controller path is the standard integration; the callback path enables use without a full ScrollView (e.g., a custom virtualized list).

**Thorough test coverage**: 1059 lines of tests (more than 2x the implementation) cover:
- Default construction
- Custom options
- Layout sizing
- Thumb metrics edge cases (null, content-fits, top/middle/bottom)
- Track rendering (show/hide, colors)
- Sub-character precision (block elements, top edge, bottom edge, full coverage)
- Color inversion strategy
- Thumb size stability regression test
- Controller integration

**Documented inversion trick**: The bottom-edge rendering technique (drawing the gap instead of the thumb) is well-commented in the source, making it maintainable despite its non-obvious logic.

### 7.2 Areas of Note

**`updateRenderObject` always marks paint**: The `_ScrollbarRender.updateRenderObject()` unconditionally calls `markNeedsPaint()`, even if no properties actually changed. A more optimized approach would check for actual changes before marking. However, since the scrollbar updates primarily when the scroll offset changes (which always requires a repaint), this is practically correct.

**Type casting in paint**: The paint method casts the PaintContext to `any` to access `drawChar`:

```typescript
const ctx = context as any;
if (typeof ctx.drawChar !== 'function') return;
```

This is because the base `PaintContext` interface in `render-object.ts` is a minimal placeholder. The actual `PaintContext` class in `scheduler/paint-context.ts` provides `drawChar`. The cast is guarded by a runtime check, making it safe but not type-safe.

**Single-axis support**: The scrollbar is vertical-only. There is no horizontal scrollbar implementation, even though `SingleChildScrollView` supports `scrollDirection: 'horizontal'`. This is a reasonable scope limitation for a TUI where horizontal scrolling is less common.

**No `hitTest` override**: `RenderScrollbar` inherits the default `RenderBox` hit testing, which means mouse events that land on the scrollbar column will not be intercepted in any special way. This is consistent with the design decision to not support direct scrollbar interaction.

### 7.3 The `ScrollInfo` Interface

The `ScrollInfo` interface acts as a clean data transfer object:

```typescript
export interface ScrollInfo {
  totalContentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}
```

This decouples the scrollbar from the `ScrollController` API. The scrollbar only needs these three numbers to render, regardless of how they are derived. This is good API design that enables testing (inject a literal `ScrollInfo`) and alternative data sources (the `getScrollInfo` callback).

### 7.4 Relationship to Amp Binary

The code contains `// Amp ref: ia class` annotations, indicating this implementation is reverse-engineered from the Amp CLI binary's minified `ia` class. The overall architecture (StatefulWidget with a leaf RenderBox, Unicode block elements for sub-character rendering) matches patterns commonly seen in sophisticated TUI applications that need smooth scroll indicators.

---

## 8. Summary of the Sub-Character Rendering Pipeline

The complete data flow from scroll event to screen update:

```
1. User scrolls (mouse wheel / keyboard)
     ↓
2. ScrollableState._handleScroll() or _handleKey()
     ↓
3. ScrollController.scrollBy() / jumpTo()
     ↓
4. ScrollController._notifyListeners()
     ↓
5. ScrollbarState._onScrollChanged() → setState()
     ↓
6. ScrollbarState.build() → new _ScrollbarRender(scrollInfo)
     ↓
7. _ScrollbarRender.updateRenderObject() → markNeedsPaint()
     ↓
8. Next frame: RenderScrollbar.paint()
     ↓
9. For each row in viewport:
   a. Compute overlap in eighths between row and thumb
   b. Select rendering strategy:
      - No overlap → skip (track already drawn)
      - Full coverage → █ with fg=bg=thumbColor
      - Top edge → BLOCK_ELEMENTS[coveredEighths], fg=thumbColor, bg=trackColor
      - Bottom edge → BLOCK_ELEMENTS[gapEighths], fg=trackColor, bg=thumbColor
     ↓
10. PaintContext.drawChar() → ScreenBuffer back buffer
     ↓
11. ScreenBuffer diff → ANSI escape sequences → terminal
```

This pipeline achieves smooth, visually precise scrollbar rendering at 1/8th character resolution, all within the constraints of a text-mode terminal interface.
