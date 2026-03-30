# Gap U14 (Gap #36): No Expand/Collapse Animations

## Problem Statement

All expand/collapse transitions in the flitter TUI are instantaneous. When a user
toggles a `CollapsibleDrawer` or any tool card, the content region snaps from zero
height to full height (or vice versa) in a single frame. There is no height
interpolation or tweening of any kind. The switch is a boolean gate in `build()`:
one frame shows nothing, the next frame shows everything.

### Affected Components

1. **`CollapsibleDrawer`** (`packages/flitter-core/src/widgets/collapsible-drawer.ts`)
   - `CollapsibleDrawerState.build()` lines 184-195: when `_expanded` is false, it
     returns only the `focusedTitleBar`. When true, it returns a `Column` containing
     the title bar and the full content widget. The transition between these two widget
     trees happens atomically in one frame.

2. **`ThinkingBlock`** (`packages/flitter-amp/src/widgets/thinking-block.ts`)
   - A `StatelessWidget` that conditionally includes thinking text based on
     `item.collapsed` (line 81). No intermediate state exists.

3. **Tool cards** (`packages/flitter-amp/src/widgets/tool-call/`)
   - `BashTool`, `ReadTool`, `GrepTool`, `EditFileTool`, `CreateFileTool`,
     `WebSearchTool`, `GenericToolCard`, `TaskTool`, `HandoffTool`, `TodoListTool`
   - All follow the same pattern: `if (!this.isExpanded) return header;` (e.g.,
     `bash-tool.ts` line 53). The `isExpanded` boolean is propagated from
     `ToolCallWidget` which reads `toolCall.collapsed` from the data model.

4. **`json-tree.ts` example** (`packages/flitter-core/examples/json-tree.ts`)
   - Tree nodes toggle an `expanded` boolean, rebuilding subtrees instantly.

### User Impact

The experience is jarring. Large content blocks (tool output, thinking text) appear
or disappear without any visual continuity. Users lose spatial context about where
content came from or where it went. This is especially disorienting for tall content
blocks (30+ rows of bash output) that pop into existence instantaneously.

---

## TUI Animation Constraints

Terminal UIs operate on a character grid, which imposes specific constraints that
differ fundamentally from pixel-based graphical UIs:

### 1. Integer Row Heights

Content height is measured in rows (lines), not pixels. A 15-row content block can
only animate through discrete heights: 0, 1, 2, ..., 15. There is no sub-row
granularity. This means easing curves have minimal visual impact -- the difference
between linear and ease-out interpolation over 15 integer steps is nearly
imperceptible.

### 2. 60fps Frame Budget

The `FrameScheduler` (`packages/flitter-core/src/scheduler/frame-scheduler.ts`)
targets 60fps with `FRAME_BUDGET_MS = 16.67ms`. The scheduler is on-demand:
frames execute only when dirty state triggers `requestFrame()`. Animation ticks
that call `setState()` automatically mark elements dirty, which triggers
`requestFrame()`, which coalesces into the next frame. This means animation frames
integrate naturally with the existing frame pipeline.

### 3. Full Repaint Cost

There is no `RepaintBoundary` optimization (gap 12 is still open). Every frame
repaints the entire tree. However, the existing spinner animations (running
indefinitely at 100-200ms intervals) demonstrate that the frame budget can
accommodate periodic `setState()` rebuilds. A short-lived height animation
(~9 frames over 150ms) is well within this budget.

### 4. ClipRect-Based Truncation

The `ClipRect` widget (`packages/flitter-core/src/widgets/clip-rect.ts`) already
clips child content to a bounding rectangle. Its `RenderClipRect.paint()` method
uses `PaintContext.withClip()` to restrict the painting area. This is the exact
mechanism needed to show a partial-height view of content during animation.

### 5. SizedBox Height Constraints

The `SizedBox` widget (`packages/flitter-core/src/widgets/sized-box.ts`) creates
a `RenderConstrainedBox` with tight constraints. Setting `height: N` constrains
the child to exactly N rows. Combined with `ClipRect`, this gives us the ability
to show exactly N rows of a taller content block.

### Feasibility Assessment

A 15-row section expanding over 150ms at 60fps produces ~9 frames, revealing
approximately 1-2 new rows per frame. This is sufficient to convey directional
motion and preserve spatial context. Even a 5-row section over 150ms gives ~9
frames at sub-row-per-frame granularity, which with integer rounding still
produces 5 visible transitions -- enough for a smooth feel.

---

## Existing Animation Precedents

The codebase already has two proven timer-driven animation patterns. The proposed
solution follows these patterns exactly rather than introducing new infrastructure.

### Precedent 1: ScrollController.animateTo()

File: `packages/flitter-core/src/widgets/scroll-controller.ts`, lines 65-108.

```typescript
animateTo(targetOffset: number, duration: number = 200): void {
  this._cancelAnimation();
  const clampedTarget = Math.max(0, Math.min(targetOffset, this._maxScrollExtent));
  if (clampedTarget === this._offset) return;
  if (duration <= 0) { this.jumpTo(clampedTarget); return; }

  const startOffset = this._offset;
  const delta = clampedTarget - startOffset;
  const frameInterval = 16; // ~60fps
  const startTime = Date.now();

  this._animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const newOffset = startOffset + delta * progress;
    // ... update and notify
    if (progress >= 1) this._cancelAnimation();
  }, frameInterval);
}
```

**Pattern**: `setInterval(16ms)` + `Date.now()` elapsed time + linear
interpolation + timer cancellation on completion. This is the canonical
animation pattern in flitter.

### Precedent 2: Spinner Animations

`CollapsibleDrawerState._startSpinner()` (lines 260-265) and
`ToolHeaderState.startSpinner()` (`tool-header.ts` lines 83-88):

```typescript
private _startSpinner(): void {
  this._spinnerTimer = setInterval(() => {
    this.setState(() => { this._spinnerFrame++; });
  }, 200);
}
```

**Pattern**: `setInterval` + `setState()` to drive periodic visual updates.
This establishes that `setState()`-driven timer animations are idiomatic in
flitter and work correctly with the `FrameScheduler`.

### Why No Full Animation Framework

The REQUIREMENTS.md (lines 188-190) explicitly defers these to v2:
- **ANIM-01**: Tween-based animation controller
- **ANIM-02**: Curve library (ease, bounce, elastic)
- **ANIM-03**: AnimatedContainer, AnimatedOpacity widgets

The height animation only needs linear interpolation with `setInterval`, which
the codebase already uses. Building a full `AnimationController`/`Ticker`/`Tween`
stack would be 500+ lines of new infrastructure for a problem solvable in ~120
lines using proven patterns.

---

## Proposed Solution: AnimatedExpandSection Widget

### Core Concept

Instead of switching between "content absent" and "content present" in one frame,
animate by progressively changing the **visible height** of the content region
from 0 to its natural height (expand) or from natural height to 0 (collapse).

The child widget is **always present** in the widget tree during animation. Only
the visible portion changes via `SizedBox(height: _animatedHeight)` +
`ClipRect` clamping.

### Why a Shared Utility Widget

Rather than modifying every individual tool card and the CollapsibleDrawer
independently, a single reusable `AnimatedExpandSection` widget encapsulates
the entire animation pattern. Consumers wrap their content:

```typescript
// Before (BashTool.build):
if (!this.isExpanded) return header;
return new Column({ children: [header, content] });

// After (BashTool.build):
return new Column({
  children: [
    header,
    new AnimatedExpandSection({
      expanded: this.isExpanded,
      child: content,
    }),
  ],
});
```

### Widget Architecture

```
AnimatedExpandSection (StatefulWidget)
  expanded: boolean           // controlled from parent
  child: Widget               // the content to reveal/hide
  duration: number            // ms, default 150

AnimatedExpandSectionState (State)
  _animatedHeight: number     // current visible rows (0..targetHeight)
  _targetHeight: number       // child's natural height
  _animationTimer: handle     // setInterval handle, null when idle
  _animationStartTime: number // Date.now() at animation start
  _startHeight: number        // height when animation began
  _endHeight: number          // height animation is moving toward

Build output:
  SizedBox(height: _animatedHeight)
    ClipRect
      child
```

When `_animatedHeight` is 0, the `SizedBox` constrains to zero height and
`ClipRect` clips all content -- visually identical to the content being absent.
When `_animatedHeight` equals the child's natural height, the full content
is visible with no clipping.

### State Machine

```
States:
  COLLAPSED     -- _animatedHeight = 0, no timer, content clipped to zero
  EXPANDING     -- timer active, _animatedHeight increasing each tick
  EXPANDED      -- _animatedHeight = targetHeight, no timer, fully visible
  COLLAPSING    -- timer active, _animatedHeight decreasing each tick

Transitions:
  COLLAPSED  --[expanded=true]--->  EXPANDING
  EXPANDING  --[tick complete]--->  EXPANDED
  EXPANDING  --[expanded=false]-->  COLLAPSING  (reverse from current height)
  EXPANDED   --[expanded=false]-->  COLLAPSING
  COLLAPSING --[tick complete]--->  COLLAPSED
  COLLAPSING --[expanded=true]--->  EXPANDING   (reverse from current height)
```

Mid-animation reversal is critical: if the user toggles while an expand
animation is in progress, the collapse animation starts from the current
`_animatedHeight` rather than jumping to full height first. This produces
smooth directional changes instead of jarring snaps.

### Animation Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Default duration | 150ms | Fast enough to feel snappy; slow enough for 8-9 frames at 60fps |
| Frame interval | 16ms | Matches `ScrollController.animateTo()` and `FrameScheduler` target |
| Easing | Linear | Integer row heights make easing nearly invisible; matches scroll pattern |
| Min height | 0 rows | Content fully hidden at collapse end |
| Max height | Natural child height | Content fully revealed at expand end |

### Measuring Target Height

The target height (natural height of the child content) must be known before
the expand animation can calculate frame deltas.

**Recommended approach: Always-in-tree measurement.**

The child widget is always included in the tree, wrapped in `SizedBox(height: 0)`
+ `ClipRect` even when fully collapsed. This allows the layout system to measure
the child's natural height without displaying any content. The `RenderConstrainedBox`
constrains the visible area to 0, while `ClipRect` prevents overflow painting.

This approach:
- Avoids a one-frame flash (which would occur if we deferred measurement)
- Matches the existing `CollapsibleDrawer` pattern where `maxContentLines` wraps
  content in `SizedBox` + `ClipRect` (lines 211-216)
- Allows the target height to update naturally when child content changes
  (e.g., streaming tool output)

To read the child's natural height, the state can use a `LayoutCallback` or
query the render object after layout via a `GlobalKey`:

```typescript
// Option A: GlobalKey approach
private _contentKey = new GlobalKey();

build(context: BuildContext): Widget {
  return new SizedBox({
    height: this._animatedHeight,
    child: new ClipRect({
      child: new KeyedSubtree({
        key: this._contentKey,
        child: this.widget.child,
      }),
    }),
  });
}

// After layout, query:
private _measureTargetHeight(): void {
  const renderObject = this._contentKey.currentContext?.findRenderObject();
  if (renderObject) {
    this._targetHeight = (renderObject as RenderBox).size.height;
  }
}
```

```typescript
// Option B: Unconstrained measurement wrapper
// Layout the child with unbounded height, read its natural size,
// then constrain the visible area. This is more robust but requires
// a custom RenderObject.
```

Option A is simpler and sufficient for the expand/collapse use case.

---

## Implementation Details

### AnimatedExpandSectionState Fields

```typescript
class AnimatedExpandSectionState extends State<AnimatedExpandSection> {
  private _animatedHeight: number = 0;
  private _targetHeight: number = 0;
  private _animationTimer: ReturnType<typeof setInterval> | null = null;
  private _animationStartTime: number = 0;
  private _startHeight: number = 0;
  private _endHeight: number = 0;
}
```

### initState

```typescript
initState(): void {
  super.initState();
  if (this.widget.expanded) {
    // Start fully expanded -- _animatedHeight will be set after first layout
    // when _targetHeight is known. For the initial frame, use a large sentinel
    // value that will be constrained by the child's actual size.
    this._animatedHeight = Infinity; // SizedBox will constrain to child size
  }
}
```

### didUpdateWidget -- Trigger Animation on expanded Change

```typescript
didUpdateWidget(oldWidget: AnimatedExpandSection): void {
  if (oldWidget.expanded !== this.widget.expanded) {
    this._startAnimation();
  }
}
```

### _startAnimation

```typescript
private _startAnimation(): void {
  this._cancelAnimation();

  this._startHeight = this._animatedHeight;
  this._endHeight = this.widget.expanded ? this._targetHeight : 0;
  this._animationStartTime = Date.now();

  const duration = this.widget.duration;

  if (duration <= 0 || this._startHeight === this._endHeight) {
    // Instant mode or no-op
    this.setState(() => {
      this._animatedHeight = this._endHeight;
    });
    return;
  }

  this._animationTimer = setInterval(() => {
    this._tick();
  }, 16);
}
```

### _tick -- Per-Frame Update

```typescript
private _tick(): void {
  const elapsed = Date.now() - this._animationStartTime;
  const duration = this.widget.duration;
  const progress = Math.min(elapsed / duration, 1);

  const delta = this._endHeight - this._startHeight;
  const newHeight = Math.round(this._startHeight + delta * progress);

  this.setState(() => {
    this._animatedHeight = newHeight;

    if (progress >= 1) {
      this._cancelAnimation();
    }
  });
}
```

### _cancelAnimation

```typescript
private _cancelAnimation(): void {
  if (this._animationTimer !== null) {
    clearInterval(this._animationTimer);
    this._animationTimer = null;
  }
}
```

### dispose

```typescript
dispose(): void {
  this._cancelAnimation();
  super.dispose();
}
```

### build

```typescript
build(context: BuildContext): Widget {
  // Always include child in tree for measurement
  return new SizedBox({
    height: this._animatedHeight,
    child: new ClipRect({ child: this.widget.child }),
  });
}
```

When `_animatedHeight` is 0, `SizedBox` constrains to zero height and `ClipRect`
clips everything. When `_animatedHeight` equals target, full content is visible.

---

## Integration Plan

### 1. CollapsibleDrawer

Add an optional `animationDuration` property (default 0 for backward
compatibility). When > 0, wrap the content region in `AnimatedExpandSection`:

```typescript
// In CollapsibleDrawerState.build(), replace lines 184-195:

// Before:
if (!this._expanded) return focusedTitleBar;
const content = this._buildContent(themeData);
return new Column({ mainAxisSize: 'min', children: [focusedTitleBar, content] });

// After:
const content = this._buildContent(themeData);
return new Column({
  mainAxisSize: 'min',
  children: [
    focusedTitleBar,
    new AnimatedExpandSection({
      expanded: this._expanded,
      child: content,
      duration: this.widget.animationDuration ?? 0,
    }),
  ],
});
```

### 2. Tool Cards (BashTool, ReadTool, GrepTool, etc.)

Each tool card wraps its content body in `AnimatedExpandSection`:

```typescript
// BashTool.build() -- After:
const bodyContent = new Column({
  mainAxisSize: 'min',
  crossAxisAlignment: 'stretch',
  children: bodyChildren,
});

return new Column({
  mainAxisSize: 'min',
  crossAxisAlignment: 'stretch',
  children: [
    header,
    new AnimatedExpandSection({
      expanded: this.isExpanded,
      child: bodyContent,
      duration: 150,
    }),
  ],
});
```

This same pattern applies to all tool cards. The `isExpanded` boolean is already
propagated from `ToolCallWidget`, so no changes to the data flow are needed.

### 3. ThinkingBlock

`ThinkingBlock` is a `StatelessWidget`. Wrap the thinking text content:

```typescript
// Before:
if (!item.collapsed && item.text.length > 0) {
  children.push(thinkingContent);
}

// After:
if (item.text.length > 0) {
  children.push(new AnimatedExpandSection({
    expanded: !item.collapsed,
    child: thinkingContent,
    duration: 150,
  }));
}
```

Note: `AnimatedExpandSection` handles the collapsed state internally, so the
outer `if` guard is no longer needed (only the text existence check remains).

---

## Edge Cases

### 1. Content Height Changes During Animation

If the child's natural height changes during an expand animation (e.g., streaming
tool output appends new lines), the target height should update. The state's
`didUpdateWidget` can detect child changes and re-measure the target. The
in-progress animation adjusts its `_endHeight` without restarting.

### 2. Very Tall Content (50+ rows)

The animation duration remains constant (150ms) regardless of content height.
A 60-row section over 150ms reveals ~7 rows per frame, which still conveys
directional motion effectively. This is preferable to scaling duration with
height (which would make tall sections feel sluggish).

### 3. Rapid Toggle Spam

Each toggle cancels the running animation and starts a new one in the opposite
direction from the current `_animatedHeight`. Because the animation always
starts from the current height (not from 0 or target), rapid toggling produces
a smooth bounce effect rather than jarring jumps.

### 4. Zero-Height Content

If the child content has zero natural height, the animation is a no-op (start
and end are both 0). No timer is started.

### 5. Terminal Resize During Animation

A terminal resize triggers a full relayout. The animation height is an absolute
row count, so it is unaffected. However, if the resize changes the child's
natural height (e.g., text rewrapping), the target updates via the same
mechanism as edge case 1.

### 6. Dispose During Animation

If the widget is removed from the tree during animation, `dispose()` cancels
the timer. This follows the exact pattern used by
`CollapsibleDrawerState._stopSpinner()` and `ToolHeaderState.stopSpinner()`.

### 7. Initial State When Expanded

If the widget mounts with `expanded=true`, it should display the full content
immediately without an animation. The `initState()` sets `_animatedHeight` to
the target height (or `Infinity` which gets constrained by the child's actual
size). Animation only occurs on state transitions, not on initial mount.

---

## Alternatives Considered

### A. CSS-Style Opacity Fade

Fade content from invisible to visible using dim/bold text style transitions.
**Rejected**: Terminal cells have no true opacity. The `dim` attribute provides
only two states (dim/normal), not a gradient. The transition would still be a
binary snap. Does not convey spatial information.

### B. Line-by-Line Reveal (Typewriter Effect)

Reveal content one line at a time from top to bottom.
**Rejected**: Requires per-line clipping or conditional rendering, which is more
complex than a single height clamp. For tall content, line-by-line feels slow.
Does not support smooth reverse (collapse) without equivalent complexity.

### C. Horizontal Slide-In

Content slides in from the left edge.
**Rejected**: Horizontal animation in a vertical list is spatially confusing.
Requires column-level clipping. Does not match the vertical expand/collapse
mental model.

### D. Instant with Visual Flash

Keep instant transitions but briefly highlight the newly revealed area with a
background color, then fade the highlight.
**Rejected**: Requires the same timer infrastructure as height animation without
providing the spatial continuity benefits. Content still pops in; only the
color provides a cue.

### E. Full Animation Framework (ANIM-01/02/03)

Implement the deferred v2 `Tween`/`Curve`/`AnimationController` infrastructure.
**Deferred**: Explicitly marked as v2 scope in REQUIREMENTS.md. The height
animation pattern only needs linear interpolation with `setInterval`, which the
codebase already uses in two places. Building the full framework is ~500+ lines
vs ~120 lines for `AnimatedExpandSection`.

---

## Performance Analysis

### Per-Animation Cost

A typical animation (150ms duration) produces ~9 frames at 60fps. Each frame:
1. `setInterval` fires, calls `setState()` (~0.01ms)
2. Element marked dirty, `requestFrame()` called (~0.01ms)
3. `FrameScheduler` coalesces and executes frame
4. BUILD phase: `AnimatedExpandSectionState.build()` creates new `SizedBox` with
   updated height (~0.1ms)
5. LAYOUT phase: `RenderConstrainedBox.performLayout()` constrains child to new
   height (~0.1ms for the subtree)
6. PAINT phase: `RenderClipRect.paint()` clips child to new bounds (~0.1ms)
7. RENDER phase: diff and emit ANSI sequences (~0.5ms)

Total per-frame overhead: ~1ms, well within the 16.67ms budget.

### Concurrent Animations

Multiple drawers animating simultaneously each run independent timers. The
`FrameScheduler` coalesces all `requestFrame()` calls into a single frame
execution, so concurrent animations do NOT multiply the number of frames.
They add minimal per-animation BUILD/LAYOUT cost within a shared frame.

### Memory Overhead

Each animated drawer holds one `setInterval` timer handle (~8 bytes) during
animation. After completion, the handle is cleared. The `SizedBox` + `ClipRect`
wrapper adds two render objects per instance, which exist even when idle (but
are lightweight: ~200 bytes each).

### Comparison with Existing Animations

| Animation | Duration | Interval | Frames | Lifetime |
|-----------|----------|----------|--------|----------|
| BrailleSpinner | Infinite | 100-200ms | 5-10/s | While tool runs |
| ScrollController.animateTo | 200ms | 16ms | ~12 | Per scroll |
| **AnimatedExpandSection** | **150ms** | **16ms** | **~9** | **Per toggle** |

The expand/collapse animation is shorter-lived and lower-frequency than the
spinner animations that already run continuously during tool execution.

---

## Affected Files

| File | Action | Estimated Lines |
|------|--------|-----------------|
| `packages/flitter-core/src/widgets/animated-expand-section.ts` | **New file** | ~120 |
| `packages/flitter-core/src/widgets/collapsible-drawer.ts` | Add `animationDuration` prop, use `AnimatedExpandSection` | ~15 modified |
| `packages/flitter-core/src/widgets/__tests__/animated-expand-section.test.ts` | **New file** | ~150 |
| `packages/flitter-core/src/widgets/__tests__/collapsible-drawer.test.ts` | Add animation integration tests | ~40 added |
| `packages/flitter-core/examples/collapsible-demo.ts` | Add `animationDuration: 150` to demo | ~5 modified |
| `packages/flitter-amp/src/widgets/thinking-block.ts` | Wrap content in `AnimatedExpandSection` | ~10 modified |
| `packages/flitter-amp/src/widgets/tool-call/bash-tool.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |
| `packages/flitter-amp/src/widgets/tool-call/read-tool.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |
| `packages/flitter-amp/src/widgets/tool-call/grep-tool.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |
| `packages/flitter-amp/src/widgets/tool-call/edit-file-tool.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |
| `packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |
| `packages/flitter-amp/src/widgets/tool-call/create-file-tool.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |
| `packages/flitter-amp/src/widgets/tool-call/web-search-tool.ts` | Wrap body in `AnimatedExpandSection` | ~8 modified |

---

## Testing Strategy

### Unit Tests for AnimatedExpandSection

```typescript
describe('AnimatedExpandSection', () => {
  test('starts collapsed (height=0) when expanded=false', () => {
    // Build with expanded=false, verify SizedBox height is 0
  });

  test('starts expanded when expanded=true on mount', () => {
    // Build with expanded=true, verify no animation timer, height = target
  });

  test('toggle from collapsed starts animation timer', () => {
    // Build collapsed, update with expanded=true
    // Verify setInterval timer is active
  });

  test('animation progresses height from 0 to target over duration', async () => {
    // Build collapsed, toggle expanded
    // Advance fake timers by duration
    // Verify _animatedHeight reached target
  });

  test('animation completes and clears timer', async () => {
    // Run full animation, verify timer is null after completion
  });

  test('mid-animation reversal starts from current height', () => {
    // Start expand, after partial progress toggle collapse
    // Verify collapse starts from intermediate height, not from target
  });

  test('duration=0 produces instant transition', () => {
    // Toggle with duration=0, verify immediate height change, no timer
  });

  test('dispose cancels running animation', () => {
    // Start animation, dispose widget, verify timer cleared
  });

  test('zero-height content produces no animation', () => {
    // Child with 0 natural height, toggle, verify no timer started
  });

  test('build wraps child in SizedBox + ClipRect', () => {
    // Inspect widget tree structure
  });
});
```

### Integration Tests

Update existing `collapsible-drawer.test.ts` to cover:
- `animationDuration > 0` triggers animated expand
- `animationDuration = 0` preserves instant behavior (backward compat)
- Animation height progresses correctly from 0 to target
- Collapse animation progresses from target to 0

### Visual Verification

Update `collapsible-demo.ts` with `animationDuration: 150` on demo sections.
Toggle sections with Enter/Space and verify content smoothly reveals over ~150ms
rather than snapping instantly.

---

## Verification Steps

1. **Type check:**
   ```bash
   cd packages/flitter-core && bun run build
   cd packages/flitter-amp && bun run build
   ```

2. **Unit tests:**
   ```bash
   cd packages/flitter-core && bun test -- --grep "AnimatedExpandSection"
   cd packages/flitter-core && bun test -- --grep "CollapsibleDrawer animation"
   ```

3. **Visual verification:**
   ```bash
   cd packages/flitter-core && bun run examples/collapsible-demo.ts
   ```

4. **Backward compatibility:**
   ```bash
   cd packages/flitter-core && bun test
   cd packages/flitter-amp && bun test
   ```
   All existing tests must pass. Default `animationDuration` of 0 preserves
   current instant behavior.

5. **Performance check:**
   Open `collapsible-demo.ts` with `PerformanceOverlay` enabled. Frame times
   during animation should stay under 16ms with no frame drops.

---

## Summary

The gap is that all expand/collapse transitions in flitter are instantaneous
boolean switches. The proposed solution introduces a shared `AnimatedExpandSection`
`StatefulWidget` that uses the same `setInterval(16ms)` + `setState()` + linear
interpolation pattern already proven by `ScrollController.animateTo()` and the
spinner animations. The widget progressively changes a `SizedBox` height from 0
to the child's natural height (expand) or the reverse (collapse), with the child
always present in the tree and clipped via `ClipRect`. The animation is 150ms by
default, cancellable, reversible mid-animation, and degrades to instant behavior
when duration is 0. Integration requires wrapping content regions in
`AnimatedExpandSection` across `CollapsibleDrawer`, `ThinkingBlock`, and all tool
card widgets in `flitter-amp`.
