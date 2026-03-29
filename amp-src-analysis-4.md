# Analysis 4: ScrollView, ScrollController, and Viewport System

## Source Files Analyzed

- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-view.ts` (Amp refs: R4, dH0, yH0, oH0)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scroll-controller.ts` (Amp ref: Lg)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/scrollbar.ts` (Amp ref: ia)
- `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` (integration)
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts` (content)
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/scroll-controller-enhancements.test.ts`

---

## 1. SingleChildScrollView (Amp: R4)

`SingleChildScrollView` is a `StatelessWidget` that acts as the public API for scrollable containers. It accepts configuration for direction (`vertical` | `horizontal`), content anchoring (`top` | `bottom`), optional external `ScrollController`, and boolean flags for keyboard and mouse scroll enablement. Its `build()` method delegates entirely to a `Scrollable` stateful widget, passing all properties through. This separation keeps the public API clean while the state management lives in `ScrollableState`.

Constructor defaults: `scrollDirection = 'vertical'`, `position = 'top'`, `enableKeyboardScroll = false`, `enableMouseScroll = true`. The chat view in `app.ts` overrides these to `position: 'bottom'` and `enableKeyboardScroll: true`.

## 2. Scrollable and ScrollableState (Amp: dH0)

`Scrollable` is a `StatefulWidget` that manages the scroll state lifecycle. `ScrollableState` is its companion state class, and it does three critical things:

### Controller Ownership

`ScrollableState.initState()` creates a private `ScrollController` if none was provided via `widget.controller`. This ensures every scroll view always has a controller. `dispose()` cleans up the internally-created controller. The `effectiveController` getter resolves which controller to use (external or private), following the Flutter pattern of optional external controller injection.

### Keyboard Input Handling (`_handleKey`)

The keyboard handler implements a vim-style navigation scheme:

| Key | Action | Follow Mode |
|-----|--------|-------------|
| `j` / `ArrowDown` | `scrollBy(1)` | Unchanged |
| `k` / `ArrowUp` | `scrollBy(-1)` | **Disabled** |
| `g` | `jumpTo(0)` (top) | **Disabled** |
| `G` (shift) | `jumpTo(maxScrollExtent)` (bottom) | Unchanged |
| `PageDown` | `scrollBy(pageSize)` | Unchanged |
| `PageUp` | `scrollBy(-pageSize)` | **Disabled** |
| `Ctrl+D` | `scrollBy(pageSize/2)` | Unchanged |
| `Ctrl+U` | `scrollBy(-pageSize/2)` | **Disabled** |

The critical design decision: upward scrolling explicitly calls `ctrl.disableFollowMode()` before scrolling. Downward scrolling does not disable follow mode; instead, the controller's `jumpTo()` will re-enable it if the scroll reaches the bottom. This asymmetry is deliberate -- when a user scrolls up, they are actively reviewing history and should not be snapped back to the bottom when new content arrives. The `pageSize` defaults to `ctrl.viewportSize || 20`, meaning the controller's viewport size (set during layout) determines page-scroll distances.

### Mouse Scroll Handling (`_handleScroll`)

Mouse wheel events are decoded from raw button codes: `button === 64` is scroll-up, `button === 65` is scroll-down. Scroll-up disables follow mode and scrolls by -3 lines; scroll-down scrolls by +3 lines without disabling follow mode. The same asymmetric follow-mode logic applies.

### Widget Composition

`ScrollableState.build()` nests the child inside up to three layers:
1. `ScrollViewport` (always) -- the rendering layer
2. `MouseRegion` (if `enableMouseScroll`) -- captures mouse wheel events
3. `FocusScope` (if `enableKeyboardScroll`) -- captures keyboard events with `autofocus: true`

The layering is conditional, so a scroll view with only mouse scrolling does not install a FocusScope node.

## 3. ScrollViewport and RenderScrollViewport (Amp: yH0, oH0)

### ScrollViewport Widget

`ScrollViewport` is a `SingleChildRenderObjectWidget` that bridges the widget tree to the render tree. It creates and updates a `RenderScrollViewport`, passing the `controller`, `scrollDirection`, and `position` properties. `updateRenderObject()` mutates the render object's properties on rebuild.

### RenderScrollViewport -- Layout Protocol

`RenderScrollViewport.performLayout()` implements the core scroll layout algorithm:

1. **Unbounded child layout**: The child is laid out with `maxHeight: Infinity` (vertical) or `maxWidth: Infinity` (horizontal). This allows the child (typically a Column with `mainAxisSize: 'min'`) to size itself to its natural content height.

2. **Self-sizing**: The viewport itself sizes to the constrained dimensions from its parent (typically `Expanded` fills available height).

3. **Max scroll extent calculation**: `maxExtent = max(0, childMainSize - viewportMainSize)`. This is the fundamental value: how many rows of content overflow beyond the visible area.

4. **Controller update**: Two calls are made in sequence:
   - `scrollController.updateViewportSize(viewportMainSize)` -- stores the visible area size for page-scroll calculations and scrollbar thumb sizing.
   - `scrollController.updateMaxScrollExtent(maxExtent)` -- updates the scroll range, which triggers follow-mode auto-scroll logic inside the controller.

5. **Bottom anchoring**: When `position === 'bottom'` and the child is shorter than the viewport, the child's offset is set to `viewportMainSize - childMainSize`, pushing content to the bottom of the viewport. This is essential for the chat view: when there are only a few messages, they appear at the bottom of the screen rather than the top.

### RenderScrollViewport -- Paint Protocol

`paint()` implements clipped painting with scroll offset adjustment:

1. Reads the current `scrollController.offset`.
2. Creates a clip context via `context.withClip(col, row, width, height)` to constrain painting to the viewport rectangle.
3. Paints the child at an offset adjusted by `-scrollOffset` on the main axis. For vertical scrolling, this means `row = baseRow + childOffset.row - scrollOffset`.

### Attach/Detach Lifecycle

The render object manages a scroll listener that calls `markNeedsPaint()` whenever the controller's offset changes. `attach()` registers this listener; `detach()` removes it. The `scrollController` setter also handles listener re-registration when the controller is swapped. This ensures the viewport repaints whenever scrolling occurs, without relaying out (scroll offset changes are purely a paint-time concern, since the child's layout is independent of scroll position).

## 4. ScrollController (Amp: Lg)

The `ScrollController` is the shared state object for all scroll coordination. It is a pure model with a listener-based notification pattern.

### Core State

- `_offset: number` -- current scroll position in rows.
- `_maxScrollExtent: number` -- maximum valid scroll offset.
- `_followMode: boolean` -- whether auto-scroll is active.
- `_viewportSize: number` -- visible area height, set by the viewport during layout.
- `_animationTimer` -- `setInterval` handle for smooth scroll animations.
- `_disposed: boolean` -- guards against post-dispose mutations.
- `_listeners: Set<() => void>` -- notification subscribers.

### Follow Mode Logic

Follow mode is the key to the chat auto-scroll experience. It starts `true` by default and controls whether new content at the bottom automatically scrolls the view down.

**`updateMaxScrollExtent(extent)`**: This is called by the viewport during layout. If follow mode is active and the viewport was at the bottom (`wasAtBottom`), the offset is snapped to the new maximum. This is the auto-scroll trigger: when streaming content grows the conversation, the viewport relays out, the child is taller, the max extent increases, and the controller auto-scrolls to show the new content.

**`disableFollowMode()`**: Called explicitly by `ScrollableState._handleKey()` and `_handleScroll()` on upward scrolling. Once disabled, content growth no longer auto-scrolls.

**Re-enable via `jumpTo()`**: When `jumpTo()` is called and the new offset satisfies `atBottom` (within 1-row tolerance), follow mode is automatically re-enabled. This means a user who scrolls back down to the bottom will resume auto-scrolling.

**`atBottom` getter**: `offset >= maxScrollExtent - 1`. The 1-row tolerance prevents edge cases where rounding or off-by-one prevents follow mode re-engagement.

### Smooth Animation (`animateTo`)

`animateTo(targetOffset, duration)` implements linear-interpolation smooth scrolling via `setInterval` at 16ms intervals (~60fps). It:
- Cancels any existing animation.
- Clamps the target to `[0, maxScrollExtent]`.
- For `duration <= 0`, falls through to `jumpTo()`.
- Each frame calculates `progress = min(elapsed / duration, 1)` and sets `offset = start + delta * progress`.
- Bypasses `jumpTo()` during animation to avoid follow-mode re-enable on intermediate frames.
- Clears the timer when `progress >= 1`.

The `isAnimating` getter and `dispose()` cleanup ensure no leaked timers.

### Listener Pattern

`addListener()` / `removeListener()` manage a `Set<() => void>`. The `_notifyListeners()` method iterates the set, calling each function. This is used by `RenderScrollViewport` (triggers `markNeedsPaint()`), `ScrollbarState` (triggers `setState()`), and potentially any external consumer.

## 5. Chat View Auto-Scroll Integration

The integration between the scroll system and the chat view lives in `app.ts`'s `AppStateWidget`:

### Architecture

```
AppStateWidget
  scrollController (owned, created once)
  +-- Column
       +-- Expanded
       |    +-- Row
       |         +-- Expanded
       |         |    +-- SingleChildScrollView(controller, position:'bottom', enableKeyboardScroll:true)
       |         |         +-- Padding
       |         |              +-- ChatView
       |         +-- Scrollbar(controller)
       +-- BottomGrid (input area + status)
```

The `ScrollController` is created as a field of `AppStateWidget` and shared between `SingleChildScrollView` and `Scrollbar`. Both widgets read from the same state; the scroll view writes offset changes via user interaction, while the scrollbar is a passive consumer that repaints when the controller notifies.

### State Change Flow

`AppState` emits change notifications (e.g., when streaming text arrives). `AppStateWidget.stateListener` is throttled to 50ms to avoid excessive rebuilds during fast streaming. The `_flushUpdate()` method captures `wasAtBottom` before `setState()`, then conditionally calls `scrollController.enableFollowMode()` if the app is processing and was at the bottom. This is an explicit re-engagement: even though the controller's own `updateMaxScrollExtent()` handles auto-scroll when follow mode is already on, the app-level logic ensures follow mode gets re-enabled at the right time during active streaming.

### Welcome Screen Bypass

When `items.length === 0`, the app skips the scroll view entirely and uses `Center` instead. This is documented as "BUG-1 FIX" in the source: a `SingleChildScrollView` gives its child unbounded height, so a `Column` with `mainAxisAlignment: 'center'` cannot center vertically (there is no bounded height to center within). The fix is architecturally clean: bypass the scroll infrastructure when there is nothing to scroll.

### Position 'bottom' Anchoring

The `position: 'bottom'` setting on `SingleChildScrollView` is critical for chat UX. When conversation content is shorter than the terminal height, `RenderScrollViewport.performLayout()` anchors the child to the bottom of the viewport. As content grows beyond the viewport, scrolling takes over. This gives the natural chat appearance where messages accumulate from the bottom upward.

## 6. Scrollbar Widget (Amp: ia)

The `Scrollbar` widget provides visual scroll position feedback. It is a `StatefulWidget` that:

1. Listens to the shared `ScrollController` via `addListener()` in `initState()`.
2. Calls `setState()` on scroll changes to trigger repaint.
3. Handles controller swaps in `didUpdateWidget()`.
4. Builds a `_ScrollbarRender` leaf widget with current scroll info.

The `RenderScrollbar` supports two rendering modes:
- **Standard**: Whole-character rendering with track (`\u2591`) and thumb (`\u2588`) characters.
- **Sub-character precision** (default): Uses Unicode lower-block elements (`\u2581`-`\u2588`) for 1/8th character granularity. Each row is divided into 8 "eighths" and the thumb position/size are calculated in this sub-character space, giving smooth visual feedback even with small viewports. Edge cells use partial block elements with carefully managed foreground/background colors to blend the thumb and track regions.

The thumb size is proportional to the viewport-to-content ratio: `thumbEighths = max(8, floor(scrollRatio * totalEighths))`. The thumb position is derived from `scrollOffset / maxScrollOffset`, mapped to the available track space. In `app.ts`, the scrollbar uses `Color.defaultColor` for the thumb and `Color.ansi256(8)` (dark gray) for the track, matching the Amp CLI aesthetic.

## 7. Summary of Key Design Patterns

1. **Separation of concerns**: `SingleChildScrollView` (API) -> `Scrollable` (state + input) -> `ScrollViewport` (widget bridge) -> `RenderScrollViewport` (layout + paint). Each layer has a single responsibility.

2. **Follow mode asymmetry**: Upward scrolling disables follow mode; downward scrolling to the bottom re-enables it. This ensures chat auto-scroll does not fight manual review.

3. **Layout-time controller updates**: The viewport updates the controller's max extent and viewport size during layout, not during paint. This ensures the controller state is consistent before paint reads the offset.

4. **Paint-only scrolling**: Scroll offset changes only trigger `markNeedsPaint()`, not `markNeedsLayout()`. Since the child's layout is independent of scroll position (it is laid out with unbounded constraints regardless), this avoids unnecessary relayout.

5. **Throttled streaming updates**: The app throttles state change notifications to 50ms during streaming, preventing frame flooding while still providing responsive auto-scroll.

6. **Shared controller pattern**: A single `ScrollController` instance is shared between the scroll view and the scrollbar, ensuring consistent state without explicit synchronization.
