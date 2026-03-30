# Gap R07: Scrollbar Enhancements -- Horizontal Support, Mouse Interaction, and Type Safety

## Status: Detailed Solution Proposal
## Affected packages: `flitter-core`
## Companion gaps: R03 (Hit Testing on RenderObject), R09 (Type Safety / `any` Removal)

---

## 1. Problem Statement

The current `Scrollbar` widget (`/packages/flitter-core/src/widgets/scrollbar.ts`) has three concrete deficiencies:

1. **Vertical-only rendering**: The `ScrollInfo` interface uses `totalContentHeight` / `viewportHeight` field names. `RenderScrollbar.performLayout()` always assigns `thickness` to width and fills available height. `computeThumbMetrics()` accepts a single `viewportHeight` parameter. The sub-character precision rendering uses only lower block elements (`U+2581`--`U+2588`), which fill from the bottom of a cell upward. There is no `axis` parameter, no horizontal layout path, no left block element support, and no horizontal thumb metrics computation. Given that `SingleChildScrollView` already supports `scrollDirection: 'horizontal'`, the scrollbar cannot visually accompany horizontal scroll views.

2. **No mouse interaction**: The scrollbar is a `LeafRenderObjectWidget` (`_ScrollbarRender`) that creates a leaf `RenderBox` (`RenderScrollbar`) with no children and no event handling. There is no `MouseRegion` wrapper, no hit-test participation, no click-to-jump, and no thumb dragging. Users must rely entirely on mouse wheel events (dispatched through `ScrollableState._handleScroll` at button codes 64/65) or keyboard shortcuts (`j/k`, `ArrowUp/ArrowDown`, `PageUp/PageDown`, `g/G`, `Ctrl-d/Ctrl-u`). This is a significant usability gap for mouse-oriented TUI applications.

3. **`PaintContext` type casting**: The `paint()` method at line 331 casts `context` from the interface type `PaintContext` (imported from `render-object.ts`) to `any` before calling `drawChar()`. The root cause is that the `PaintContext` interface in `render-object.ts` (lines 20--22) is an empty placeholder with a comment "Will be fully defined in Phase 5." The actual `PaintContext` class in `scheduler/paint-context.ts` has `drawChar()`, `drawText()`, `fillRect()`, `withClip()`, and other concrete methods. This split means every widget that paints must cast to `any`, losing all type safety. The scrollbar has 7 separate `as any` casts in its paint method alone, plus several untyped style object literals (`const trackStyle: any = {}`).

### 1.1 Amp Reference Context

The Amp binary's scrollbar class (`ia`, amp-strings.txt:530899) is also vertical-only. No horizontal variant or mouse interaction callbacks appear in the extracted reference for `ia`. However:

- Amp's `SingleChildScrollView` (`R4`) supports `scrollDirection: 'vertical' | 'horizontal'`, confirming framework-level horizontal scroll support.
- Amp's `MouseRegion` (`T3`/`Ba`) provides the full mouse event infrastructure: `onClick`, `onRelease`, `onDrag`, `onHover`, `onEnter`, `onExit`, `onScroll`.
- The `MouseManager` dispatches these events through hit testing. All building blocks for an interactive scrollbar exist.

Therefore, adding horizontal support and mouse interaction is a natural extension of the existing architecture, not a deviation from Amp's design patterns.

---

## 2. Current Architecture Analysis

### 2.1 Widget Hierarchy

```
Scrollbar (StatefulWidget)
  ScrollbarState (State<Scrollbar>)
    build() --> _ScrollbarRender (LeafRenderObjectWidget)
                  createRenderObject() --> RenderScrollbar (RenderBox, leaf, no children)
```

`ScrollbarState` subscribes to `ScrollController.addListener()` in `initState()` and calls `setState()` on every scroll change, triggering a rebuild. The `_ScrollbarRender` widget creates or updates the `RenderScrollbar` render object with the current scroll info, thickness, track/thumb chars, colors, and sub-character precision flag.

### 2.2 ScrollInfo Interface (Current)

```typescript
export interface ScrollInfo {
  totalContentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}
```

All field names hardcode vertical semantics. `computeThumbMetrics(viewportHeight: number)` returns `{ thumbTop: number; thumbHeight: number }`.

### 2.3 Layout (Current)

```typescript
performLayout(): void {
  const constraints = this.constraints!;
  const width = Math.max(constraints.minWidth, Math.min(this.thickness, constraints.maxWidth));
  const height = constraints.maxHeight;
  this.size = new Size(width, height);
}
```

Width is clamped to `thickness`. Height fills available space. This is purely vertical.

### 2.4 Paint -- Sub-Character Precision (Current)

The vertical sub-character precision path (lines 359--476) uses Unicode lower block elements (`U+2581` through `U+2588`), which fill from the **bottom** of a character cell upward. It calculates thumb position in eighths of a character (1/8th precision), then for each row determines:

- **Fully covered**: Full block character with `fg = thumbColor`, `bg = thumbColor`.
- **Top edge** (thumb starts mid-row): Lower block element (represents the covered bottom portion) with `fg = thumbColor`, `bg = trackColor`.
- **Bottom edge** (thumb ends mid-row): Inverted -- lower block element (represents the uncovered bottom gap) with `fg = trackColor`, `bg = thumbColor`.

This rendering strategy is well-tested (200+ lines of tests) and produces smooth scrollbar movement.

### 2.5 PaintContext Type Issue

The `PaintContext` interface in `render-object.ts`:

```typescript
export interface PaintContext {
  // Placeholder -- painting details defined later
}
```

The concrete `PaintContext` class in `scheduler/paint-context.ts`:

```typescript
export class PaintContext {
  drawChar(x: number, y: number, char: string, style?: CellStyle, width?: number): void { ... }
  drawText(x: number, y: number, text: string, style?: CellStyle): number { ... }
  fillRect(x: number, y: number, w: number, h: number, char?: string, style?: CellStyle): void { ... }
  withClip(x: number, y: number, w: number, h: number): PaintContext { ... }
  // ... more methods
}
```

These are two completely different types that happen to share a name. The `import { type PaintContext } from '../framework/render-object'` in `scrollbar.ts` imports the empty interface, not the class with methods. This forces the `const ctx = context as any` cast at line 332.

### 2.6 Mouse Event Infrastructure (Available)

`MouseRegion` (`mouse-region.ts`) provides:
- `onClick(event: MouseRegionEvent)` -- button press within bounds
- `onRelease(event: MouseRegionEvent)` -- button release within bounds
- `onDrag(event: MouseRegionEvent)` -- mouse move while button held
- `onScroll(event: MouseRegionEvent)` -- scroll wheel within bounds
- `onEnter/onExit` -- hover enter/exit

`MouseRegionEvent` provides `{ x: number; y: number; button?: number }`. The `x` and `y` are screen-space coordinates.

`RenderMouseRegion` wraps a single child, delegates layout and paint, and dispatches events via `handleMouseEvent()`.

---

## 3. Proposed Solution

### 3.1 Design Principles

1. **Backward compatible**: All new properties are optional with defaults matching current behavior. Existing `Scrollbar` constructor calls continue to work identically.
2. **Axis-generic internals**: A single `computeThumbMetrics()` method handles both axes by parameterizing on "extent" rather than "height/width".
3. **Composition over inheritance for mouse handling**: `ScrollbarState.build()` wraps the leaf render widget in a `MouseRegion` when interactive mode is enabled, rather than adding mouse handling to the leaf `RenderScrollbar` itself.
4. **Controller-driven interaction**: Mouse interactions mutate the `ScrollController` offset directly, triggering the standard listener-based rebuild cycle. No separate "interactive position" state is needed.
5. **Incremental type safety**: The `PaintContext` type issue is addressed by augmenting the placeholder interface, not by restructuring the module graph.

### 3.2 Type Safety Fix -- PaintContext Interface

The root cause is the empty `PaintContext` interface in `render-object.ts`. The fix is to declare the `drawChar` method signature on the interface, which the concrete class in `scheduler/paint-context.ts` already implements:

```typescript
// render-object.ts -- revised PaintContext interface
export interface PaintContext {
  drawChar(
    x: number,
    y: number,
    char: string,
    style?: Record<string, unknown>,
    width?: number,
  ): void;
  withClip?(
    x: number,
    y: number,
    w: number,
    h: number,
  ): PaintContext;
}
```

This allows the scrollbar to call `context.drawChar(...)` directly without `as any`. The `withClip` is marked optional (`?`) since not all contexts support it (the scrollbar does not use it, but the scroll viewport does).

With this change, the scrollbar `paint()` method eliminates all 7 `as any` casts:

**Before** (line 332):
```typescript
paint(context: PaintContext, offset: Offset): void {
  const ctx = context as any;
  if (typeof ctx.drawChar !== 'function') return;
  // ... ctx.drawChar(...) with no type checking
```

**After**:
```typescript
paint(context: PaintContext, offset: Offset): void {
  if (typeof context.drawChar !== 'function') return;
  // ... context.drawChar(...) with full type checking
```

The style objects also get proper typing:

**Before**:
```typescript
const trackStyle: any = {};
const thumbStyle: any = {};
```

**After** (using the `CellStyle` type or a local interface):
```typescript
interface ScrollbarCellStyle {
  fg?: Color;
  bg?: Color;
  inverse?: boolean;
}
const trackStyle: ScrollbarCellStyle = {};
const thumbStyle: ScrollbarCellStyle = {};
```

**Impact on other widgets**: The `PaintContext` interface augmentation also benefits `RenderScrollViewport.paint()` (line 408 in `scroll-view.ts`, which uses `(context as any).withClip`), `RenderText.paint()`, and every other render object that currently casts to `any` for painting. However, those changes are tracked under Gap R09; this proposal only covers the scrollbar-specific casts.

### 3.3 Horizontal Scrollbar Support

#### 3.3.1 Extended ScrollInfo Interface

```typescript
export interface ScrollInfo {
  /** Total content size along the scroll axis. */
  totalContentExtent: number;
  /** Viewport size along the scroll axis. */
  viewportExtent: number;
  /** Current scroll offset along the scroll axis. */
  scrollOffset: number;

  // Backward-compatible aliases (deprecated):
  /** @deprecated Use totalContentExtent instead. */
  totalContentHeight?: number;
  /** @deprecated Use viewportExtent instead. */
  viewportHeight?: number;
}
```

Internally, `RenderScrollbar` reads `totalContentExtent` first, falling back to `totalContentHeight` for backward compatibility. This ensures existing `getScrollInfo` callbacks continue to work without modification.

The `ScrollbarState.build()` method, when deriving `ScrollInfo` from a `ScrollController`, populates the axis-generic fields:

```typescript
// In ScrollbarState.build():
scrollInfo = {
  totalContentExtent: vpSize > 0 ? ctrl.maxScrollExtent + vpSize : 0,
  viewportExtent: vpSize,
  scrollOffset: ctrl.offset,
  // Backward compat aliases:
  totalContentHeight: vpSize > 0 ? ctrl.maxScrollExtent + vpSize : 0,
  viewportHeight: vpSize,
};
```

#### 3.3.2 New `axis` Property

```typescript
export class Scrollbar extends StatefulWidget {
  // ... existing properties ...
  readonly axis: 'vertical' | 'horizontal';  // NEW, default 'vertical'

  constructor(opts: {
    // ... existing options ...
    axis?: 'vertical' | 'horizontal';
  }) {
    // ...
    this.axis = opts.axis ?? 'vertical';
  }
}
```

The `axis` property flows through `_ScrollbarRender` into `RenderScrollbar`.

#### 3.3.3 Axis-Generic Layout

```typescript
performLayout(): void {
  const constraints = this.constraints!;
  if (this.axis === 'vertical') {
    const width = Math.max(constraints.minWidth, Math.min(this.thickness, constraints.maxWidth));
    const height = constraints.maxHeight;
    this.size = new Size(width, height);
  } else {
    const width = constraints.maxWidth;
    const height = Math.max(constraints.minHeight, Math.min(this.thickness, constraints.maxHeight));
    this.size = new Size(width, height);
  }
}
```

#### 3.3.4 Axis-Generic Intrinsic Dimensions

```typescript
getMinIntrinsicWidth(_height: number): number {
  return this.axis === 'vertical' ? this.thickness : 0;
}
getMaxIntrinsicWidth(_height: number): number {
  return this.axis === 'vertical' ? this.thickness : Infinity;
}
getMinIntrinsicHeight(_width: number): number {
  return this.axis === 'horizontal' ? this.thickness : 0;
}
getMaxIntrinsicHeight(_width: number): number {
  return this.axis === 'horizontal' ? this.thickness : Infinity;
}
```

#### 3.3.5 Axis-Generic computeThumbMetrics

Rename the return type from `{ thumbTop, thumbHeight }` to `{ thumbStart, thumbExtent }` for axis-neutrality. Provide a legacy adapter for existing callers:

```typescript
computeThumbMetrics(scrollbarExtent: number): { thumbStart: number; thumbExtent: number } | null {
  if (!this.scrollInfo || scrollbarExtent <= 0) return null;

  const totalContentExtent = this.scrollInfo.totalContentExtent
    ?? this.scrollInfo.totalContentHeight
    ?? 0;
  const viewportExtent = this.scrollInfo.viewportExtent
    ?? this.scrollInfo.viewportHeight
    ?? (viewportExtent > 0 ? viewportExtent : scrollbarExtent);
  const scrollOffset = this.scrollInfo.scrollOffset;

  // Recompute for the zero-viewportExtent fallback case
  const effectiveTotalContent = viewportExtent > 0
    ? totalContentExtent
    : (totalContentExtent > 0 ? totalContentExtent - 1 + scrollbarExtent : 0);

  if (effectiveTotalContent <= 0 || effectiveTotalContent <= viewportExtent) {
    return null;
  }

  const thumbExtent = Math.max(1, Math.round((viewportExtent / effectiveTotalContent) * scrollbarExtent));
  const maxThumbStart = scrollbarExtent - thumbExtent;
  const scrollFraction = scrollOffset / (effectiveTotalContent - viewportExtent);
  const thumbStart = Math.round(Math.max(0, Math.min(scrollFraction * maxThumbStart, maxThumbStart)));

  return { thumbStart, thumbExtent };
}
```

The existing `computeThumbMetrics(viewportHeight)` call sites that expect `{ thumbTop, thumbHeight }` can be updated to use `{ thumbStart: thumbTop, thumbExtent: thumbHeight }` -- this is a rename, not a behavioral change.

#### 3.3.6 Horizontal Block Elements

The horizontal analogue of lower block elements are **left block elements**:

```typescript
/** Unicode left block elements for 1/8 character precision horizontal scrollbar rendering. */
const LEFT_BLOCK_ELEMENTS = [' ', '\u258F', '\u258E', '\u258D', '\u258C', '\u258B', '\u258A', '\u2589', '\u2588'];
// Index: 0=space, 1=1/8 left, 2=2/8 left, ..., 7=7/8 left, 8=full block
```

| Character | Unicode | Left Coverage |
|-----------|---------|---------------|
| `\u258F`  | U+258F  | 1/8           |
| `\u258E`  | U+258E  | 2/8           |
| `\u258D`  | U+258D  | 3/8           |
| `\u258C`  | U+258C  | 4/8 (left half)|
| `\u258B`  | U+258B  | 5/8           |
| `\u258A`  | U+258A  | 6/8           |
| `\u2589`  | U+2589  | 7/8           |
| `\u2588`  | U+2588  | 8/8 (full)    |

Left block elements fill from the **left** edge rightward, which is the exact horizontal analogue of lower block elements filling from the bottom upward. The edge rendering strategy mirrors the vertical approach:

- **Fully covered column**: Full block with `fg = thumbColor`, `bg = thumbColor`.
- **Left edge** (thumb starts mid-column, covers right portion): Left block of the uncovered left gap with `fg = trackColor`, `bg = thumbColor`. (Inverted, because the left block covers from the left, but we want to show the gap on the left and thumb on the right.)
- **Right edge** (thumb covers left portion, stops mid-column): Left block of the covered left portion with `fg = thumbColor`, `bg = trackColor`.

#### 3.3.7 Paint Dispatch

```typescript
paint(context: PaintContext, offset: Offset): void {
  if (this.axis === 'vertical') {
    this._paintVertical(context, offset);
  } else {
    this._paintHorizontal(context, offset);
  }
}
```

The existing vertical paint logic moves into `_paintVertical()` unchanged. The new `_paintHorizontal()` method mirrors the vertical logic with swapped axes and left block elements.

### 3.4 Mouse Interaction Design

#### 3.4.1 New Properties

```typescript
export class Scrollbar extends StatefulWidget {
  // ... existing properties ...
  readonly interactive: boolean;     // NEW, default true
  readonly thumbMinExtent: number;   // NEW, default 1

  constructor(opts: {
    // ... existing options ...
    interactive?: boolean;
    thumbMinExtent?: number;
  }) {
    // ...
    this.interactive = opts.interactive ?? true;
    this.thumbMinExtent = opts.thumbMinExtent ?? 1;
  }
}
```

- `interactive`: When `true` and a `ScrollController` is provided, wraps the scrollbar in a `MouseRegion` for click-to-jump and thumb dragging. When `false` or when only `getScrollInfo` is provided, the scrollbar is display-only (current behavior).
- `thumbMinExtent`: Minimum thumb size in characters. Prevents the thumb from becoming too small to click on with very large content.

#### 3.4.2 State Management for Drag

```typescript
class ScrollbarState extends State<Scrollbar> {
  // ... existing fields ...
  private _isDragging: boolean = false;
  private _dragStartScrollOffset: number = 0;
  private _dragStartAxisPosition: number = 0;
```

Three new fields track the drag state:
- `_isDragging`: Whether the user is currently dragging the thumb.
- `_dragStartScrollOffset`: The `ScrollController.offset` at the moment the drag started.
- `_dragStartAxisPosition`: The mouse position along the scroll axis at drag start.

#### 3.4.3 Click-to-Jump Logic

When the user clicks on the scrollbar track (outside the thumb), the scroll position jumps so the viewport is centered at the click position:

```typescript
private _handleClick = (event: MouseRegionEvent): void => {
  const ctrl = this.widget.controller;
  if (!ctrl) return;

  const isVertical = this.widget.axis === 'vertical';

  // Convert screen-space event coordinates to scrollbar-local coordinates.
  // The MouseRegionEvent provides screen-space x/y. We need to subtract
  // the scrollbar's screen-space origin to get local coordinates.
  // However, MouseRegion dispatches events with coordinates relative to
  // the screen, so we need to compute the scrollbar extent from the controller.
  const scrollbarExtent = ctrl.viewportSize;
  if (scrollbarExtent <= 0) return;

  // Use local coordinate along the axis
  const axisPosition = isVertical ? event.y : event.x;

  // Check if click is on the thumb
  const thumbMetrics = this._getCurrentThumbMetrics(scrollbarExtent);
  if (thumbMetrics) {
    const { thumbStart, thumbEnd } = thumbMetrics;
    if (axisPosition >= thumbStart && axisPosition < thumbEnd) {
      // Click is on the thumb -- start drag
      this._isDragging = true;
      this._dragStartScrollOffset = ctrl.offset;
      this._dragStartAxisPosition = axisPosition;
      return;
    }
  }

  // Click is on the track -- jump to position (centering the viewport)
  const fraction = Math.max(0, Math.min(axisPosition / scrollbarExtent, 1));
  const targetOffset = fraction * ctrl.maxScrollExtent;
  ctrl.disableFollowMode();
  ctrl.jumpTo(targetOffset);
};
```

**Design decision**: Click-to-jump maps the click position linearly to the scroll range. An alternative is "page jump" (scroll by one viewport in the direction of the click relative to the current thumb), which is how some GUI scrollbars work. The linear mapping is simpler and more intuitive for TUI use cases where the scrollbar is small and precise jumping is desirable.

#### 3.4.4 Thumb Drag Logic

When the user clicks on the thumb and drags, the scroll position tracks the mouse movement:

```typescript
private _handleDrag = (event: MouseRegionEvent): void => {
  if (!this._isDragging) return;

  const ctrl = this.widget.controller;
  if (!ctrl) return;

  const isVertical = this.widget.axis === 'vertical';
  const axisPosition = isVertical ? event.y : event.x;
  const scrollbarExtent = ctrl.viewportSize;
  if (scrollbarExtent <= 0) return;

  // Compute axis delta since drag start
  const axisDelta = axisPosition - this._dragStartAxisPosition;

  // Map axis delta to scroll offset delta
  // The mapping ratio is: maxScrollExtent / (scrollbarExtent - thumbExtent)
  const totalContent = ctrl.maxScrollExtent + ctrl.viewportSize;
  const thumbExtent = Math.max(
    this.widget.thumbMinExtent,
    Math.round((ctrl.viewportSize / totalContent) * scrollbarExtent),
  );
  const trackAvailable = scrollbarExtent - thumbExtent;
  if (trackAvailable <= 0) return;

  const scrollDelta = (axisDelta / trackAvailable) * ctrl.maxScrollExtent;
  const newOffset = this._dragStartScrollOffset + scrollDelta;

  ctrl.disableFollowMode();
  ctrl.jumpTo(newOffset);
};
```

**Key detail**: The drag delta is computed relative to the drag start position, not the previous frame position. This prevents cumulative rounding errors and ensures the thumb stays precisely under the cursor.

#### 3.4.5 Release Handler

```typescript
private _handleRelease = (_event: MouseRegionEvent): void => {
  this._isDragging = false;
};
```

#### 3.4.6 MouseRegion Wrapping in build()

```typescript
build(_context: BuildContext): Widget {
  // ... existing scrollInfo computation ...

  let child: Widget = new _ScrollbarRender({
    scrollInfo,
    axis: this.widget.axis,
    thickness: this.widget.thickness,
    trackChar: this.widget.trackChar,
    thumbChar: this.widget.thumbChar,
    showTrack: this.widget.showTrack,
    thumbColor: this.widget.thumbColor,
    trackColor: this.widget.trackColor,
    subCharacterPrecision: this.widget.subCharacterPrecision,
  });

  // Wrap in MouseRegion for interactive behavior when:
  // 1. interactive is true
  // 2. A controller is available (getScrollInfo-only scrollbars cannot be interactive)
  if (this.widget.interactive && this.widget.controller) {
    child = new MouseRegion({
      onClick: this._handleClick,
      onDrag: this._handleDrag,
      onRelease: this._handleRelease,
      cursor: 'pointer',
      child,
    });
  }

  return child;
}
```

**Important**: The `MouseRegion` only wraps the scrollbar when `interactive && controller`. A `getScrollInfo`-based scrollbar has no `ScrollController` to mutate, so mouse interaction is meaningless.

#### 3.4.7 Coordinate System Consideration

The `MouseRegionEvent` provides screen-space `x` and `y`. For click-to-jump and drag, we need the position relative to the scrollbar's origin. The current `MouseManager.dispatchMouseAction()` provides screen-space coordinates in the event. To get scrollbar-local coordinates, we need to subtract the scrollbar's screen-space origin.

There are two approaches:

**Approach A (Simpler, recommended for Phase 2)**: Use the `ScrollController.viewportSize` as a proxy for the scrollbar extent and compute the axis position as a fraction of the viewport. This works because the scrollbar always fills the available height (or width), which matches the viewport extent reported by the scroll view.

**Approach B (More precise, requires Gap R03)**: After Gap R03 is implemented, the hit-test result provides `localPosition` for each hit entry. The `MouseRegionEvent` could be extended to include local coordinates, making the scrollbar coordinate computation exact. This is deferred to a future enhancement.

For Phase 2, Approach A is sufficient because the scrollbar's extent always equals the viewport extent in the standard `Row(Expanded(ScrollView), Scrollbar)` layout pattern.

### 3.5 Horizontal Scrollbar Usage Example

```typescript
const hController = new ScrollController();

new Column({
  children: [
    new Expanded({
      child: new SingleChildScrollView({
        controller: hController,
        scrollDirection: 'horizontal',
        child: wideContent,
      }),
    }),
    new Scrollbar({
      controller: hController,
      axis: 'horizontal',
      thickness: 1,
      thumbColor: Color.cyan,
      trackColor: Color.brightBlack,
    }),
  ],
})
```

### 3.6 Interactive Scrollbar Usage Example

```typescript
const controller = new ScrollController();

new Row({
  children: [
    new Expanded({
      child: new SingleChildScrollView({
        controller,
        child: longContent,
      }),
    }),
    new Scrollbar({
      controller,
      interactive: true,   // default; enables click + drag
      thumbColor: Color.cyan,
      trackColor: Color.brightBlack,
    }),
  ],
})
```

### 3.7 Dual-Axis Scrollbar Usage Example

```typescript
const vController = new ScrollController();
const hController = new ScrollController();

new Column({
  children: [
    new Expanded({
      child: new Row({
        children: [
          new Expanded({
            child: new SingleChildScrollView({
              controller: vController,
              scrollDirection: 'vertical',
              child: new SingleChildScrollView({
                controller: hController,
                scrollDirection: 'horizontal',
                child: largeContent,
              }),
            }),
          }),
          new Scrollbar({
            controller: vController,
            axis: 'vertical',
          }),
        ],
      }),
    }),
    new Scrollbar({
      controller: hController,
      axis: 'horizontal',
    }),
  ],
})
```

---

## 4. Migration Plan

### Phase 1: PaintContext Type Safety Fix (Non-Breaking)

**Scope**: Augment the `PaintContext` interface in `render-object.ts` with `drawChar()` and optional `withClip()` method signatures. Remove all `as any` casts from `RenderScrollbar.paint()`.

**Files**:
- `/packages/flitter-core/src/framework/render-object.ts` -- Add method signatures to `PaintContext` interface.
- `/packages/flitter-core/src/widgets/scrollbar.ts` -- Remove `const ctx = context as any`, use `context` directly. Add a local `ScrollbarCellStyle` interface for style objects.
- `/packages/flitter-core/src/widgets/__tests__/scrollbar.test.ts` -- Update `MockPaintContext` to implement the augmented interface (it already has `drawChar`; just ensure the type assertion is valid).

**Validation**: All 45 existing scrollbar tests pass. `bun test` succeeds across the project. No runtime behavioral change.

**Estimated effort**: 1 hour.

### Phase 2: Add `axis` Property and Horizontal Support (Non-Breaking, Additive)

**Scope**: Add the `axis` property, extend `ScrollInfo`, implement axis-generic layout/metrics/paint, add `LEFT_BLOCK_ELEMENTS` constant, implement horizontal sub-character precision.

**Files**:
- `/packages/flitter-core/src/widgets/scrollbar.ts` -- Add `axis` property to `Scrollbar`, `_ScrollbarRender`, `RenderScrollbar`. Extend `ScrollInfo`. Refactor `performLayout()`, `computeThumbMetrics()`, intrinsic dimension methods, and `paint()` for axis-genericity.
- `/packages/flitter-core/src/widgets/__tests__/scrollbar.test.ts` -- Add horizontal layout tests, horizontal thumb metrics tests, horizontal paint tests, horizontal sub-character precision tests, backward compatibility tests for legacy `ScrollInfo` fields.
- `/packages/flitter-core/docs/widgets/scroll/scrollbar.md` -- Document `axis` property, horizontal usage example.

**Validation**: All existing vertical tests pass unchanged (default `axis` is `'vertical'`). New horizontal tests pass. Legacy `ScrollInfo` callbacks work via fallback logic.

**Estimated effort**: 3--4 hours.

### Phase 3: Add Mouse Interaction (Non-Breaking, Additive)

**Scope**: Add `interactive` and `thumbMinExtent` properties. Implement click-to-jump and thumb drag in `ScrollbarState`. Wrap scrollbar in `MouseRegion` when interactive.

**Files**:
- `/packages/flitter-core/src/widgets/scrollbar.ts` -- Add `interactive`, `thumbMinExtent` to `Scrollbar`. Add `_isDragging`, `_dragStartScrollOffset`, `_dragStartAxisPosition` state fields. Add `_handleClick`, `_handleDrag`, `_handleRelease` handlers. Add `_getCurrentThumbMetrics` helper. Modify `build()` to wrap in `MouseRegion`.
- `/packages/flitter-core/src/widgets/__tests__/scrollbar.test.ts` -- Add click-to-jump tests, thumb drag tests, release-ends-drag tests, interactive=false tests, getScrollInfo-no-interaction tests.
- `/packages/flitter-core/docs/widgets/scroll/scrollbar.md` -- Document `interactive`, `thumbMinExtent`, mouse interaction examples.

**Dependency**: Requires Phase 2 (axis support) because the mouse handlers use `this.widget.axis` to determine which event coordinate to use.

**Validation**: All existing tests pass. Mouse interaction tests verify offset changes on the `ScrollController`. No visual regression in display-only mode.

**Estimated effort**: 2--3 hours.

### Phase 4: Visual Feedback for Mouse Hover (Future Enhancement)

**Scope**: Add `hoverThumbColor` and `hoverTrackColor` optional properties. Track hover state via `MouseRegion.onEnter/onExit`. Repaint with hover colors when mouse is over the scrollbar.

This phase is deferred and listed for completeness. It has no dependency on Gap R03.

**Estimated effort**: 1--2 hours.

---

## 5. Detailed Testing Strategy

### 5.1 PaintContext Type Safety Tests

```typescript
describe('RenderScrollbar paint type safety', () => {
  test('paint calls drawChar without any cast', () => {
    // MockPaintContext implements the PaintContext interface directly
    const render = new RenderScrollbar();
    render.showTrack = true;
    render.trackChar = '|';
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 1, minHeight: 0, maxHeight: 5 }));

    const ctx = new MockPaintContext();
    // This should compile without 'as any' -- MockPaintContext satisfies PaintContext
    render.paint(ctx as PaintContext, new Offset(0, 0));

    expect(ctx.drawn.length).toBe(5);
  });
});
```

### 5.2 Horizontal Layout Tests

```typescript
describe('Horizontal Scrollbar layout', () => {
  test('horizontal layout: width fills available, height = thickness', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.thickness = 1;
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    expect(render.size.width).toBe(80);
    expect(render.size.height).toBe(1);
  });

  test('horizontal layout: thickness clamped to maxHeight', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.thickness = 5;
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 3 }));
    expect(render.size.width).toBe(80);
    expect(render.size.height).toBe(3);
  });

  test('horizontal intrinsic height returns thickness', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.thickness = 2;
    expect(render.getMinIntrinsicHeight(80)).toBe(2);
    expect(render.getMaxIntrinsicHeight(80)).toBe(2);
  });

  test('horizontal intrinsic width returns 0 for min', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    expect(render.getMinIntrinsicWidth(10)).toBe(0);
  });
});
```

### 5.3 Horizontal Thumb Metrics Tests

```typescript
describe('Horizontal computeThumbMetrics', () => {
  test('computes correct thumb at left position (scrollOffset=0)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 200,
      viewportExtent: 40,
      scrollOffset: 0,
    };
    const metrics = render.computeThumbMetrics(40);
    expect(metrics).not.toBeNull();
    expect(metrics!.thumbStart).toBe(0);
    expect(metrics!.thumbExtent).toBe(8); // round((40/200)*40) = 8
  });

  test('computes correct thumb at right position (scrollOffset=max)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 200,
      viewportExtent: 40,
      scrollOffset: 160, // 200 - 40
    };
    const metrics = render.computeThumbMetrics(40);
    expect(metrics!.thumbStart).toBe(32); // 40 - 8
    expect(metrics!.thumbExtent).toBe(8);
  });

  test('returns null when content fits viewport', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.scrollInfo = {
      totalContentExtent: 30,
      viewportExtent: 40,
      scrollOffset: 0,
    };
    expect(render.computeThumbMetrics(40)).toBeNull();
  });
});
```

### 5.4 Horizontal Paint Tests

```typescript
describe('Horizontal Scrollbar paint', () => {
  test('draws track across full width for horizontal axis', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.showTrack = true;
    render.trackChar = '-';
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 5));
    const trackChars = ctx.drawn.filter(d => d.char === '-');
    expect(trackChars.length).toBe(10); // 10 columns x 1 row
    // All on the same row (y=5)
    expect(trackChars.every(d => d.y === 5)).toBe(true);
  });

  test('draws thumb at correct horizontal position (whole-character mode)', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = false;
    render.showTrack = false;
    render.thumbChar = '#';
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 0,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    const thumbChars = ctx.drawn.filter(d => d.char === '#');
    expect(thumbChars.length).toBe(4); // round((20/100)*20) = 4
    expect(thumbChars[0].x).toBe(0);
    expect(thumbChars[3].x).toBe(3);
  });

  test('horizontal sub-character precision uses left block elements', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 20,
      scrollOffset: 5,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));
    // Should use left block elements (U+2588-U+258F), not lower blocks (U+2581-U+2587)
    const leftBlocks = ctx.drawn.filter(d =>
      d.char >= '\u2589' && d.char <= '\u258F'
    );
    expect(leftBlocks.length).toBeGreaterThan(0);
  });
});
```

### 5.5 Mouse Click-to-Jump Tests

```typescript
describe('Scrollbar click-to-jump', () => {
  test('click on track middle jumps to ~50% scroll offset', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);
    expect(ctrl.offset).toBe(0);

    // Simulate creating a ScrollbarState and calling the click handler
    // with axisPosition = 10 (middle of 20-row scrollbar)
    // fraction = 10/20 = 0.5, targetOffset = 0.5 * 80 = 40
    const scrollbar = new Scrollbar({ controller: ctrl, interactive: true });
    const state = scrollbar.createState();
    // ... simulate _handleClick with event { y: 10 } ...

    // After click, offset should be approximately 40
    // (exact value depends on thumb position check)
  });

  test('click on thumb starts drag, does not jump', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);
    const initialOffset = ctrl.offset;

    // Click at a position within the thumb area
    // Thumb is at top when scrollOffset=0, thumb height = round((20/100)*20) = 4
    // Click at y=1 (within thumb 0-3) should start drag, not jump
    // Verify: offset does not change, isDragging becomes true
  });

  test('click on track with getScrollInfo-only scrollbar is no-op', () => {
    const scrollbar = new Scrollbar({
      getScrollInfo: () => ({
        totalContentHeight: 100,
        viewportHeight: 20,
        scrollOffset: 0,
      }),
      interactive: true,
    });
    // No MouseRegion is created because controller is undefined
    // Verify that build() does not wrap in MouseRegion
  });
});
```

### 5.6 Mouse Drag Tests

```typescript
describe('Scrollbar thumb dragging', () => {
  test('drag from top to bottom scrolls through full range', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    // Total content = 100, viewport = 20, maxScroll = 80
    // Thumb height = round((20/100)*20) = 4
    // Track available = 20 - 4 = 16

    // Start drag at y=0 (top of thumb), dragStartScrollOffset=0
    // Drag to y=16 (bottom of track)
    // axisDelta = 16, scrollDelta = (16/16)*80 = 80
    // Expected: offset = 80 (fully scrolled)
  });

  test('drag preserves relative cursor position within thumb', () => {
    const ctrl = new ScrollController();
    ctrl.updateViewportSize(20);
    ctrl.disableFollowMode();
    ctrl.updateMaxScrollExtent(80);

    // Click on middle of thumb (y=2 when thumb is at 0-3), drag down 5
    // axisDelta = 5, scrollDelta = (5/16)*80 = 25
    // Expected: offset = 0 + 25 = 25
  });

  test('release ends drag state', () => {
    // After release, further mouse-move events do not change scroll offset
  });

  test('drag beyond scrollbar extent clamps to maxScrollExtent', () => {
    // Drag to y=30 when scrollbar is 20 rows -- jumpTo clamps
  });

  test('drag above scrollbar start clamps to 0', () => {
    // Drag to y=-5 -- jumpTo clamps to 0
  });
});
```

### 5.7 Backward Compatibility Tests

```typescript
describe('Scrollbar backward compatibility', () => {
  test('default axis is vertical', () => {
    expect(new Scrollbar({}).axis).toBe('vertical');
  });

  test('default interactive is true', () => {
    expect(new Scrollbar({}).interactive).toBe(true);
  });

  test('default thumbMinExtent is 1', () => {
    expect(new Scrollbar({}).thumbMinExtent).toBe(1);
  });

  test('existing vertical constructor call works unchanged', () => {
    const ctrl = new ScrollController();
    const scrollbar = new Scrollbar({
      controller: ctrl,
      thickness: 1,
      trackChar: '|',
      thumbChar: '#',
      showTrack: true,
    });
    expect(scrollbar.axis).toBe('vertical');
    expect(scrollbar.interactive).toBe(true);
  });

  test('legacy ScrollInfo with totalContentHeight/viewportHeight still works', () => {
    const render = new RenderScrollbar();
    render.scrollInfo = {
      totalContentHeight: 100,
      viewportHeight: 20,
      scrollOffset: 0,
    } as ScrollInfo; // Legacy fields
    const metrics = render.computeThumbMetrics(20);
    expect(metrics).not.toBeNull();
    expect(metrics!.thumbExtent).toBe(4);
  });

  test('all existing scrollbar tests pass without modification', () => {
    // This is verified by running the full test suite.
    // No existing test should need changes for Phase 1 or Phase 2.
  });
});
```

### 5.8 Horizontal Sub-Character Edge Rendering Tests

```typescript
describe('Horizontal sub-character edge rendering', () => {
  test('left edge uses inverted colors (track fg, thumb bg)', () => {
    // Thumb starts mid-column: the uncovered left gap is drawn
    // as a left block element with fg=trackColor, bg=thumbColor
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.green;
    render.trackColor = Color.brightBlack;
    render.scrollInfo = {
      totalContentExtent: 100,
      viewportExtent: 10,
      scrollOffset: 5,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    // Find entries with left block partial characters
    const partials = ctx.drawn.filter(d =>
      d.char >= '\u2589' && d.char <= '\u258F'
    );
    expect(partials.length).toBeGreaterThan(0);
  });

  test('right edge uses thumb fg, track bg', () => {
    // Similar to above but for the right edge of the thumb
  });

  test('fully covered columns use full block with both fg and bg = thumbColor', () => {
    const render = new RenderScrollbar();
    render.axis = 'horizontal';
    render.subCharacterPrecision = true;
    render.showTrack = false;
    render.thumbColor = Color.cyan;
    render.scrollInfo = {
      totalContentExtent: 30,
      viewportExtent: 10,
      scrollOffset: 0,
    };
    render.layout(new BoxConstraints({ minWidth: 0, maxWidth: 10, minHeight: 0, maxHeight: 1 }));
    const ctx = new MockPaintContext();
    render.paint(ctx as any, new Offset(0, 0));

    const fullBlocks = ctx.drawn.filter(d => d.char === '\u2588');
    expect(fullBlocks.length).toBeGreaterThan(0);
    for (const fb of fullBlocks) {
      expect(fb.style?.fg).toBe(Color.cyan);
      expect(fb.style?.bg).toBe(Color.cyan);
    }
  });
});
```

---

## 6. updateRenderObject Type Safety Fix

The `_ScrollbarRender.updateRenderObject()` method at line 215 currently uses `any`:

```typescript
updateRenderObject(renderObject: any): void {
  const r = renderObject as RenderScrollbar;
```

This should be typed properly:

```typescript
updateRenderObject(renderObject: RenderScrollbar): void {
  renderObject.scrollInfo = this.scrollInfo;
  renderObject.axis = this.axis;
  renderObject.thickness = this.thickness;
  // ... etc, no 'as' cast needed
  renderObject.markNeedsPaint();
}
```

This requires that `LeafRenderObjectWidget.updateRenderObject()` in the base class accepts a generic type or `RenderObject`, which it likely does. If the base class signature is `updateRenderObject(renderObject: RenderObject)`, we can use `RenderScrollbar` (which extends `RenderBox` extends `RenderObject`) and access the specific properties directly after a single safe cast.

---

## 7. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Breaking existing vertical scrollbar behavior | Very Low | `axis` defaults to `'vertical'`; all existing constructor calls are unchanged; layout/paint paths for vertical are identical to current code |
| Left block elements render poorly in some terminals | Medium | `subCharacterPrecision: false` falls back to whole-character mode; document terminal compatibility in docs |
| Drag coordinate mapping jitter for small scrollbar | Low | Use floating-point intermediates; only call `jumpTo()` with the final rounded value; `ScrollController.jumpTo()` already clamps |
| MouseRegion scrollbar conflicts with scroll-view MouseRegion | Very Low | The scrollbar's `MouseRegion` is a sibling (not descendant) of the scroll view's `MouseRegion`; hit testing dispatches to the correct one based on spatial position |
| PaintContext interface augmentation breaks other render objects | Very Low | The augmentation adds methods that the concrete `PaintContext` class already implements; other render objects that cast to `any` continue to work (their casts become redundant but not harmful) |
| `interactive: true` with `getScrollInfo` (no controller) confuses users | Low | Document that interaction requires a `ScrollController`; the `build()` method silently skips `MouseRegion` wrapping when no controller is present |
| Performance regression from wrapping every interactive scrollbar in MouseRegion | Very Low | `MouseRegion` adds one extra `RenderBox` in the tree with passthrough layout/paint; negligible overhead for TUI render tree sizes |

---

## 8. Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `/packages/flitter-core/src/framework/render-object.ts` | 1 | Augment `PaintContext` interface with `drawChar()` and optional `withClip()` |
| `/packages/flitter-core/src/widgets/scrollbar.ts` | 1 | Remove `as any` casts from `paint()`, add local style types |
| `/packages/flitter-core/src/widgets/scrollbar.ts` | 2 | Add `axis` property to `Scrollbar`, `_ScrollbarRender`, `RenderScrollbar`; extend `ScrollInfo`; add `LEFT_BLOCK_ELEMENTS`; refactor layout/metrics/paint for axis-genericity; add horizontal sub-character paint |
| `/packages/flitter-core/src/widgets/scrollbar.ts` | 3 | Add `interactive`, `thumbMinExtent` properties; add drag state fields; add `_handleClick`, `_handleDrag`, `_handleRelease`; add `_getCurrentThumbMetrics`; wrap in `MouseRegion` in `build()` |
| `/packages/flitter-core/src/widgets/__tests__/scrollbar.test.ts` | 1--3 | Add type safety tests (Phase 1); horizontal layout/paint/metrics tests (Phase 2); mouse interaction tests (Phase 3); backward compatibility tests |
| `/packages/flitter-core/docs/widgets/scroll/scrollbar.md` | 2--3 | Document `axis`, `interactive`, `thumbMinExtent`; add horizontal and interactive usage examples |

---

## 9. Open Questions

1. **Should click-to-jump center the viewport or set the thumb top/left?** Centering is more intuitive (the thumb appears under the cursor after the jump). Most GUI scrollbar implementations center the viewport at the clicked track position. **Recommendation**: center the viewport, i.e., `targetOffset = fraction * maxScrollExtent`.

2. **Should drag events outside the scrollbar bounds still be tracked?** In GUI scrollbars, dragging past the edge continues to scrub. In flitter's `MouseRegion`, the `onDrag` callback only fires within bounds (the `MouseManager` uses hit-testing). To support drag-past-edge, the drag handler would need global mouse capture, which is not currently supported. **Recommendation**: for Phase 3, limit drag to within bounds; investigate global drag capture as a future enhancement after Gap R03.

3. **Should the horizontal scrollbar auto-rotate `trackChar` / `thumbChar`?** The default `trackChar` ('░') and `thumbChar` ('█') are visually axis-neutral. No rotation is needed. **Recommendation**: reuse the same defaults.

4. **Where should `LEFT_BLOCK_ELEMENTS` be defined?** Alongside the existing `BLOCK_ELEMENTS` constant at the top of `scrollbar.ts`. Both constants are module-private (no `export`). **Recommendation**: keep them co-located.

5. **Should the `PaintContext` interface augmentation include all methods or just `drawChar`?** For the scrollbar fix, only `drawChar` and optionally `withClip` are needed. However, augmenting with all concrete methods (`drawText`, `fillRect`, `drawBorder`, `drawTextSpan`) would benefit other widgets. **Recommendation**: add all methods to the interface in a single change (tracked under Gap R09), but for this proposal's Phase 1 scope, add only `drawChar` and `withClip` to unblock the scrollbar without over-scoping.

6. **Should the `computeThumbMetrics` return type change break the public API?** The current return is `{ thumbTop: number; thumbHeight: number }`. The new axis-generic return is `{ thumbStart: number; thumbExtent: number }`. Since `RenderScrollbar` and `computeThumbMetrics` are exported, changing the return type is a public API change. **Recommendation**: maintain both via a union return type or add a new method `computeThumbMetricsGeneric()` and deprecate the old one. Alternatively, since this is a pre-1.0 project, simply rename and update all call sites.

---

## 10. Estimated Effort

| Phase | Scope | Effort | Risk |
|-------|-------|--------|------|
| Phase 1 | PaintContext type fix + `as any` removal | 1 hour | Very Low |
| Phase 2 | Horizontal scrollbar support | 3--4 hours | Low |
| Phase 3 | Mouse interaction (click + drag) | 2--3 hours | Low |
| Phase 4 | Hover visual feedback (future) | 1--2 hours | Very Low |
| **Total** | | **7--10 hours** | |

Phase 1 is independent and can be done immediately. Phase 2 and Phase 3 are sequential (Phase 3 depends on Phase 2 for the `axis` property). Phase 4 is independent of Phase 3 but benefits from it (hover coloring is more useful when the scrollbar is already interactive).

---

## 11. Summary of Changes

### Type Safety (Phase 1)
- Augment `PaintContext` interface in `render-object.ts` with `drawChar()` signature
- Remove 7 `as any` casts from `RenderScrollbar.paint()`
- Add typed `ScrollbarCellStyle` interface for style objects
- Fix `updateRenderObject(renderObject: any)` to use proper type

### Horizontal Support (Phase 2)
- Add `axis: 'vertical' | 'horizontal'` property (default `'vertical'`)
- Extend `ScrollInfo` with `totalContentExtent`/`viewportExtent` (backward-compat aliases)
- Axis-generic `performLayout()`: vertical fills height, horizontal fills width
- Axis-generic `computeThumbMetrics()`: returns `{ thumbStart, thumbExtent }`
- Add `LEFT_BLOCK_ELEMENTS` constant for horizontal sub-character precision
- Add `_paintHorizontal()` method with left block element edge rendering
- Add horizontal intrinsic dimension methods

### Mouse Interaction (Phase 3)
- Add `interactive: boolean` property (default `true`)
- Add `thumbMinExtent: number` property (default `1`)
- Add drag state fields: `_isDragging`, `_dragStartScrollOffset`, `_dragStartAxisPosition`
- Implement `_handleClick()`: click on track jumps, click on thumb starts drag
- Implement `_handleDrag()`: maps axis delta to scroll offset delta
- Implement `_handleRelease()`: ends drag
- Wrap leaf render widget in `MouseRegion` when `interactive && controller`
