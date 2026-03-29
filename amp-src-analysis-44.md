# Analysis 44: Spinner/Loading Animations, BrailleSpinner, and the Animation/Timer System

## 1. Inventory of All Spinner and Animation Widgets

The flitter codebase contains a diverse set of animated widgets spanning both `flitter-core` (the framework layer) and `flitter-amp` (the application layer). Every animated widget in the codebase relies on `setInterval` + `setState` as its core timing mechanism, rather than integrating directly with the `FrameScheduler` pipeline. The full inventory is:

### flitter-core

| Widget / Utility | File | Animation Type |
|---|---|---|
| `BrailleSpinner` | `src/utilities/braille-spinner.ts` | Cellular automaton producing braille characters |
| `CollapsibleDrawer` (spinner mode) | `src/widgets/collapsible-drawer.ts` | 10-frame braille rotation at 200ms |
| `ScrollController` (animateTo) | `src/widgets/scroll-controller.ts` | Linear interpolation scroll at ~60fps (16ms) |
| `SpinnerApp` (example) | `examples/spinner.ts` | 6 spinner styles at 100ms, color cycling, bounce bar |
| `DebugInspector` (periodic scan) | `src/diagnostics/debug-inspector.ts` | 1000ms periodic tree scan (not visual) |

### flitter-amp

| Widget | File | Animation Type |
|---|---|---|
| `ToolHeader` (BrailleSpinner) | `src/widgets/tool-call/tool-header.ts` | Cellular automaton spinner at 100ms |
| `HandoffTool` (blink) | `src/widgets/tool-call/handoff-tool.ts` | 700ms boolean blink toggle |
| `OrbWidget` (deprecated) | `src/widgets/orb-widget.ts` | Perlin noise braille orb at 100ms |
| `DensityOrbWidget` | `src/widgets/density-orb-widget.ts` | ASCII density orb with shockwaves at 100ms |
| `GlowText` | `src/widgets/glow-text.ts` | Per-character noise-based color interpolation at 100ms |
| `StatusBar` (static) | `src/widgets/status-bar.ts` | Static wave chars (`" ", "~", "~", "~", "~", "~"`), not animated |
| `ThinkingBlock` (static) | `src/widgets/thinking-block.ts` | StatelessWidget, icon changes with state but no timer |
| `ChatView` (streaming cursor) | `src/widgets/chat-view.ts` | Appends `▌` character during streaming (not timer-based) |

---

## 2. The BrailleSpinner Implementation and Character Set

### Location

`/home/gem/workspace/flitter/packages/flitter-core/src/utilities/braille-spinner.ts`

### Architecture: Cellular Automaton on a 2x4 Grid

The `BrailleSpinner` is not a simple frame-sequence spinner. It implements a **cellular automaton** running modified Game of Life rules on a 2-column by 4-row grid, where each cell maps to one of the 8 dots in a Unicode braille character (U+2800 through U+28FF).

The braille dot layout maps the grid positions to Unicode bit weights:

```
dot1(0,0)  dot4(1,0)   ->  0x01  0x08
dot2(0,1)  dot5(1,1)   ->  0x02  0x10
dot3(0,2)  dot6(1,2)   ->  0x04  0x20
dot7(0,3)  dot8(1,3)   ->  0x40  0x80
```

The braille codepoint is `0x2800 + (bitwise OR of weights of all live cells)`. This gives 256 possible characters (2^8 combinations).

### Automaton Rules

The rules are a modified Game of Life variant tuned for the tiny 2x4 grid:

- **Survival**: A live cell with 1-3 neighbors survives (standard GoL requires exactly 2-3).
- **Birth**: A dead cell with exactly 2-3 neighbors becomes alive (matches standard GoL).
- **Death**: Otherwise the cell dies.

The widened survival condition (1-3 instead of 2-3) compensates for the very small grid where cells have at most 5 neighbors (interior cells) and often fewer (corner cells have only 3 neighbors).

### Auto-Reseeding Mechanism

Because an 8-cell grid has only 256 possible states, the automaton quickly reaches fixed points or short cycles. The spinner detects three stagnation conditions and reseeds:

1. **Depletion**: Fewer than 2 live cells remaining.
2. **Static**: The last 2 consecutive frames are identical (no change between generations).
3. **Cyclical**: The current state matches any earlier state within a 5-frame rolling history window (detects periods <= 4).

When any condition triggers, `_randomGrid()` generates a fresh random state with approximately 60% initial density (`Math.random() > 0.4`).

### Comparison with Amp Reference (class `Af`)

The Amp reference at `/home/gem/workspace/flitter/packages/flitter-amp/.ref/amp-cli/braille-spinner-Af.js` uses a different approach:

- **Flat array**: Amp uses a flat 8-element boolean array (`state=[!0,!1,!0,!1,!0,!1,!0,!1]`) instead of a 2D grid.
- **Hardcoded neighbor map**: Amp precomputes `neighborMap` as a static adjacency list, while flitter-core dynamically scans `(dr, dc)` offsets in `_countNeighbors()`.
- **Different rules**: Amp's birth rule uses `B === 3 || B === 6` (an unusual rule where 6 neighbors also births), while flitter-core uses `B >= 2 && B <= 3`.
- **Different reseeding density**: Amp uses `Math.random() > 0.6` (~40% density) vs flitter-core's `Math.random() > 0.4` (~60% density).
- **Generation counter**: Amp uses a `maxGenerations=15` counter as an additional reseed trigger, while flitter-core relies solely on state-based detection.
- **Different braille encoding**: Amp applies a reordering permutation (`H = [0,1,2,6,3,4,5,7]`) before computing the braille codepoint, which swaps dot positions. Flitter-core uses the standard dot weight table directly.

Despite these implementation differences, the visual effect is similar: a continuously changing single braille character that appears as an organic, evolving loading indicator.

### Export

The `BrailleSpinner` is exported from `flitter-core/src/index.ts` as a public utility:

```typescript
export { BrailleSpinner } from './utilities/braille-spinner';
```

---

## 3. Timer/Interval Management Patterns

All animated widgets in the codebase follow a consistent timer management pattern built around the `StatefulWidget` lifecycle.

### The Canonical Pattern: `setInterval` + `setState`

Every timer-driven animation in the codebase uses the same fundamental pattern:

```typescript
class SomeState extends State<SomeWidget> {
  private timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    super.initState();
    this.timer = setInterval(() => {
      this.setState(() => {
        // mutate animation state
      });
    }, INTERVAL_MS);
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.dispose();
  }
}
```

### Observed Timer Intervals

The codebase uses a small set of standard intervals:

| Interval | Usage | Effective FPS |
|---|---|---|
| 16ms | `ScrollController.animateTo()` | ~60fps (matches frame budget) |
| 100ms | `ToolHeader`, `OrbWidget`, `DensityOrbWidget`, `GlowText`, `SpinnerApp` example | 10fps |
| 200ms | `CollapsibleDrawer` spinner | 5fps |
| 700ms | `HandoffTool` blink | ~1.4fps |
| 1000ms | `DebugInspector` periodic scan | 1fps (not visual) |

The dominant animation rate is **100ms (10fps)**, used by most visual spinners and effects. This is a deliberate trade-off: the animations need to appear alive and responsive without consuming unnecessary CPU on what are essentially decorative loading indicators.

### Conditional Timer Lifecycle

Several widgets implement **conditional timers** that start and stop based on widget properties. The `ToolHeader`, `HandoffTool`, and `CollapsibleDrawer` all follow this pattern:

```typescript
initState(): void {
  if (this.widget.status === 'in_progress') {
    this.startSpinner();
  }
}

didUpdateWidget(oldWidget): void {
  if (this.widget.status === 'in_progress' && !this.timer) {
    this.startSpinner();
  } else if (this.widget.status !== 'in_progress' && this.timer) {
    this.stopSpinner();
  }
}

dispose(): void {
  this.stopSpinner();
  super.dispose();
}
```

This three-point lifecycle (init / update / dispose) ensures timers are only active when the animation should be visible, and are always cleaned up when the widget is removed from the tree.

---

## 4. How Animations Integrate with the Frame Scheduler

### The FrameScheduler Pipeline

The `FrameScheduler` (at `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/frame-scheduler.ts`) implements the core rendering pipeline. It is a singleton (`c9` in Amp) that executes 4 phases in strict order: BUILD -> LAYOUT -> PAINT -> RENDER. The scheduler is **on-demand**: frames only execute when `requestFrame()` is called, and frame requests are coalesced and paced to a 60fps budget (~16.67ms).

### Animations Do NOT Integrate Directly with FrameScheduler

A critical observation is that **none of the animated widgets register frame callbacks with the FrameScheduler**. Instead, they use a fundamentally different mechanism:

1. A `setInterval` fires at a fixed rate (e.g., every 100ms).
2. Inside the interval callback, `this.setState()` is called.
3. `setState()` marks the element dirty, which calls `BuildOwner.scheduleBuildFor()`.
4. `scheduleBuildFor()` calls `FrameScheduler.instance.requestFrame()`.
5. The FrameScheduler then executes the full BUILD -> LAYOUT -> PAINT -> RENDER pipeline.

The flow is therefore **indirect**: `setInterval -> setState -> markNeedsRebuild -> scheduleBuildFor -> requestFrame -> executeFrame`. The `setInterval` acts as an external clock that periodically injects dirty state into the framework, which the FrameScheduler then processes.

### Frame Coalescing Protects Against Overload

If multiple animations fire their timers in close succession (e.g., a `ToolHeader` spinner and a `GlowText` both tick within the same 16.67ms window), the FrameScheduler coalesces these into a single frame. The `requestFrame()` method checks `if (this._frameScheduled) return;` and short-circuits duplicate requests. This means that even with many active animations, the system produces at most ~60 frames per second.

### No Animation Controller Abstraction

Unlike Flutter (which has `AnimationController`, `Ticker`, `vsync` providers), flitter has no formal animation controller abstraction. There is no `Ticker` that hooks into the frame scheduler's vsync signal. Every animation manages its own `setInterval` timer independently. This is a simpler design but means:

- Animations are not synchronized to the frame boundary.
- Multiple animations may fire at slightly different times, potentially causing extra frame requests.
- There is no shared "animation clock" or interpolation curve library.

---

## 5. The Streaming Cursor Animation (Blinking `▌`)

### Location

`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts`, method `buildAssistantMessage()`.

### Implementation

The streaming cursor is implemented in the simplest possible way -- it is **not animated at all** in the traditional sense. The `ChatView` (a `StatelessWidget`) appends the Unicode character `▌` (U+258C, LEFT HALF BLOCK) to the end of the assistant's streaming text:

```typescript
private buildAssistantMessage(text: string, isStreaming: boolean, theme?: AmpTheme): Widget {
  if (text.length > 0) {
    const displayText = isStreaming ? text + ' ▌' : text;
    return new Markdown({ markdown: displayText });
  }
  const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
  return new Text({
    text: new TextSpan({
      text: isStreaming ? '▌' : '...',
      style: new TextStyle({ foreground: mutedColor }),
    }),
  });
}
```

Three states are handled:

1. **Streaming with text**: The text is displayed followed by ` ▌`. The cursor appears as a solid block at the end of the stream.
2. **Streaming with no text yet**: Just `▌` is shown in the muted foreground color, indicating the stream has started but no content has arrived.
3. **Not streaming, no text**: `...` is shown as a placeholder.

### Why It Appears to Blink

The cursor appears to "blink" not because of a timer, but because the streaming data arrives in bursts. Each new token from the LLM triggers a rebuild of the `ChatView` with updated text. The `▌` character moves to the end of the newly arrived text, creating a visual impression of a cursor advancing through content. Between token arrivals, the cursor remains static in its last position.

This is fundamentally different from the original Amp CLI, which likely uses a true 500-530ms blink timer on the cursor character. The flitter implementation is simpler and relies on the streaming dynamics to create the visual effect.

### No Terminal Hardware Cursor

The `▌` is rendered as a text character in the widget tree, not as the terminal's hardware cursor. The terminal hardware cursor is managed separately by the `Renderer` class (in `src/terminal/renderer.ts`), which supports `CursorState` with position, visibility, and DECSCUSR shape codes. The streaming indicator is purely a widget-level effect.

---

## 6. Lifecycle Management: Start/Stop/Dispose of Timers

### The Three-Point Lifecycle Protocol

Every timer-owning widget in the codebase implements the same three lifecycle hooks:

1. **`initState()`**: Create the timer if the initial conditions require it.
2. **`didUpdateWidget(oldWidget)`**: Start or stop the timer if relevant props changed.
3. **`dispose()`**: Unconditionally stop the timer and null the handle.

### Defensive Null Checks

All timer cleanup code uses the defensive pattern:

```typescript
if (this.timer) {
  clearInterval(this.timer);
  this.timer = null;
}
```

Setting the handle to `null` after clearing serves two purposes: it prevents double-clear if `dispose()` is called multiple times, and it serves as a boolean flag for `isAnimating` checks (e.g., `didUpdateWidget` checks `!this.timer` before starting).

### ScrollController: Finite Animations

The `ScrollController` uses a variant pattern for finite-duration animations:

```typescript
animateTo(targetOffset: number, duration: number = 200): void {
  this._cancelAnimation();
  // ...
  this._animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const newOffset = startOffset + delta * progress;
    this.jumpTo(newOffset);
    if (progress >= 1) {
      this._cancelAnimation();
    }
  }, 16);  // ~60fps
}
```

Key differences from the spinner pattern:
- The interval self-terminates when `progress >= 1`.
- It uses `Date.now()` for elapsed time calculation, making it wall-clock based rather than frame-count based.
- The 16ms interval targets 60fps, matching the FrameScheduler's budget.
- `_cancelAnimation()` is called before starting a new animation, preventing multiple concurrent timers.

### DebugInspector: Non-Visual Periodic Work

The `DebugInspector` uses the same pattern for periodic tree scanning at 1000ms. Its scan is triggered by `_startPeriodicScan()` / `_stopPeriodicScan()` and performs element tree snapshotting for developer tools. This is not an animation but follows the identical lifecycle protocol.

---

## 7. Performance Impact of Animations

### Timer Overhead

Each active `setInterval` adds a timer to the Node.js/Bun event loop. With the typical animation rate of 100ms, a single spinner adds approximately 10 timer events per second. Multiple concurrent animations multiply this linearly:

- **Welcome screen**: `DensityOrbWidget` + `GlowText` = 2 timers at 100ms = 20 events/sec
- **Tool execution**: `ToolHeader` (1 per in-progress tool) = 10 events/sec each
- **Handoff in progress**: `HandoffTool` = ~1.4 events/sec

### setState/rebuild Cost

Each timer tick triggers `setState()`, which marks the element dirty and requests a frame. The rebuild cost depends on the widget's subtree complexity:

| Widget | Subtree Size | Rebuild Cost |
|---|---|---|
| `ToolHeader` (BrailleSpinner) | Single `Text` with spans | Very low |
| `HandoffTool` (blink) | `Column` with `Text` children | Low |
| `CollapsibleDrawer` (spinner) | Title row with spinner text | Low |
| `GlowText` | N `TextSpan` children (one per character) | Moderate (scales with text length) |
| `DensityOrbWidget` | 20 rows x 40 cols = 800 `TextSpan` objects | High |
| `OrbWidget` | 20 rows x 40 cols braille grid | High |

The `DensityOrbWidget` and `OrbWidget` are the most expensive because they regenerate an 800-cell grid of `TextSpan` objects on every frame. Each cell involves Perlin noise computation (`fbm` with 3 octaves), color interpolation, and string creation.

### Frame Coalescing Mitigates Impact

The FrameScheduler's coalescing means that if two timers fire within the same 16.67ms window, only one frame is produced. The 100ms animation rate (10fps) is well below the 60fps frame budget, meaning animations cause approximately 10 frames per second rather than 60, leaving significant headroom.

### No Virtualization for Animated Widgets

Unlike the scroll system (which may virtualize off-screen content), animated widgets always rebuild their full subtree even if they are scrolled off-screen. A `ToolHeader` spinner running inside a collapsed tool call still ticks its timer, though the `CollapsibleDrawer` pattern avoids this by conditionally starting/stopping the timer based on expansion state.

---

## 8. Code Patterns and Observations

### Pattern: Animation-as-External-Clock

The most significant architectural pattern is that all animations operate as external clocks injecting dirty state into the framework. They sit outside the FrameScheduler's callback registration system (`addFrameCallback`). This means:

- Animations are not coordinated with each other.
- There is no shared time base or animation clock.
- Each widget independently decides its tick rate.
- The FrameScheduler only sees the aggregate dirty state, not the individual animation sources.

This contrasts with Flutter's approach where `Ticker` objects are bound to the frame scheduler's vsync signal, ensuring all animations advance in lockstep with the frame pipeline.

### Pattern: Stateful Wrapper for Stateless Content

Several widgets that are conceptually "stateless" become `StatefulWidget` solely to host a timer. `ToolHeader` renders static content (an icon, name, and details) plus a spinner that only exists during `in_progress` state. Without the spinner, it could be a `StatelessWidget`. The animation requirement forces the StatefulWidget upgrade.

### Pattern: Property-Driven Timer Lifecycle

The `didUpdateWidget` hook is used consistently to react to property changes that should start or stop animations. This is a clean pattern that keeps the timer lifecycle tightly coupled to the widget's semantic state (e.g., `status === 'in_progress'`).

### Observation: No Shared Animation Utility

There is no `AnimatedWidget` base class or `useAnimation` hook. Each widget independently implements the `setInterval`/`setState`/`dispose` boilerplate. This leads to significant code duplication. A shared `AnimationMixin` or `TimerMixin` could reduce this.

### Observation: Two Spinner Implementations

There are effectively two spinner implementations:

1. **`BrailleSpinner` class**: A standalone utility that maintains cellular automaton state and produces braille characters via `step()` + `toBraille()`. Used by `ToolHeader`.
2. **Hardcoded frame arrays**: `CollapsibleDrawer` and the `SpinnerApp` example use static arrays of braille characters (`['~', '~', '~', '~', '~', '~', '~', '~', '~', '~']`), cycling through them by frame index modulo length.

The `BrailleSpinner` produces non-repeating, organic-looking patterns (due to the cellular automaton), while the frame arrays produce predictable cyclic patterns. The `ToolHeader` uses the more sophisticated `BrailleSpinner` for its tool-in-progress indicator, which is the most visible spinner in the Amp UI.

### Observation: StatusBar Uses Static Wave Characters

The `StatusBar` widget (deprecated in favor of `BottomGrid`) mentions Amp's spinner characters `[" ", "~", "~", "~", "~", "~"]` in a comment but renders them statically. It shows `~` as a processing indicator but does not animate through the sequence. The `StatusBar` is a `StatelessWidget` and has no timer.

### Observation: Streaming Cursor Is Passive

The `▌` streaming cursor in `ChatView` is driven by external state updates (new tokens arriving from the LLM stream) rather than an internal timer. This means the cursor does not blink when the stream pauses. In the original Amp CLI, the cursor likely blinks on a 500ms timer to indicate "still waiting" even during pauses. This is a fidelity gap between the flitter implementation and the Amp reference.

### Observation: OrbWidget Duplication

Both `OrbWidget` (braille-based) and `DensityOrbWidget` (ASCII density-based) implement Perlin noise with nearly identical helper functions (`fade`, `grad2d`, `noise2d`, `fbm`, `initPerm`). The `OrbWidget` is marked `@deprecated` in favor of `DensityOrbWidget`. The shared noise functions could be extracted into a utility module.

### Observation: Timer Type Safety

All timer handles use `ReturnType<typeof setInterval>` as the type, which resolves to `NodeJS.Timeout` in Node.js or `Timer` in Bun. This is the correct portable approach for TypeScript targeting multiple runtimes. The handle is consistently typed as `T | null` (using `null` as the "no timer" sentinel), and the cleanup pattern `if (this.timer) { clearInterval(this.timer); this.timer = null; }` is used uniformly.

### Summary of Key Findings

1. All animations use `setInterval` + `setState` as their timing mechanism, with no direct FrameScheduler integration.
2. The `BrailleSpinner` is a cellular automaton, not a frame sequence, producing organic non-repeating patterns.
3. Timer lifecycle is managed through the `initState` / `didUpdateWidget` / `dispose` triple.
4. The streaming cursor (`▌`) is not timer-animated; it advances passively with incoming stream tokens.
5. The FrameScheduler's coalescing prevents animation timers from causing excessive frame production.
6. There is no shared animation controller, ticker, or animation curve system.
7. The `DensityOrbWidget` and `OrbWidget` are the most computationally expensive animated widgets due to per-cell Perlin noise computation.
8. Animation widgets represent a fidelity gap with Amp in several areas: the streaming cursor blink, the status bar wave animation, and the exact BrailleSpinner rules.
