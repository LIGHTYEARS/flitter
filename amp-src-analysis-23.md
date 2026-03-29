# Analysis 23: FrameScheduler, BuildOwner, and WidgetsBinding

## FrameScheduler (Amp: c9)

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/frame-scheduler.ts`

The FrameScheduler is a singleton that orchestrates the on-demand, event-driven frame pipeline. It has no `setInterval` or continuous loop; frames are only produced when something requests one.

### Four-Phase Pipeline

Every frame executes four phases in strict order, defined by the `Phase` enum and the `PHASE_ORDER` array:

1. **BUILD** -- rebuilds dirty elements (widget-to-element reconciliation)
2. **LAYOUT** -- computes sizes and positions of render objects
3. **PAINT** -- paints the render tree into the screen buffer
4. **RENDER** -- diffs the buffer and writes ANSI escape sequences to stdout

Callbacks are registered per-phase via `addFrameCallback(id, callback, phase, priority, name)`, stored in a `Map<string, FrameCallback>`. During `executePhase(phase)`, callbacks are filtered by phase, sorted by `priority` (lower runs first), and invoked with individual try/catch guards so one error does not block subsequent callbacks.

### Frame Coalescing and Pacing

`requestFrame()` is the sole entry point for scheduling. It implements three key behaviors:

- **Coalescing**: If `_frameScheduled` is already true, the call is a no-op. Multiple dirty-marking events in the same tick collapse into a single frame.
- **Re-entry guard**: If a frame is currently in progress (`_frameInProgress`), the method sets `_frameScheduled = true` so a follow-up frame is queued after the current one completes.
- **Frame pacing**: In production mode (`_useFramePacing = true`), the scheduler respects a 60 fps budget (`FRAME_BUDGET_MS = ~16.67ms`). It computes the elapsed time since `_lastFrameTimestamp` and, if the budget has not been consumed, delays via `setTimeout`. If sufficient time has passed (or it is the very first frame), it schedules immediately via `setImmediate`.

In test environments (detected by `BUN_TEST`, `VITEST`, or `NODE_TEST_CONTEXT` environment variables), frame pacing is disabled and `scheduleFrameExecution(0)` always uses `setImmediate` for deterministic, immediate execution.

### Post-Frame Callbacks

`addPostFrameCallback(callback, name)` registers one-shot callbacks that run after all four phases complete. During `executePostFrameCallbacks()`, the pending array is drained with `splice(0)` -- callbacks added during execution are deferred to the next frame. This is used for tasks like re-establishing hover state after layout.

### Frame Execution Core

`executeFrame()` is the top-level method. It sets `_frameInProgress = true`, iterates `PHASE_ORDER` calling `executePhase` for each, runs post-frame callbacks, records timing stats, and then checks: if `_frameScheduled` was set during execution (because a callback requested another frame), it re-schedules with appropriate pacing. The `finally` block ensures `_frameInProgress` is always cleared, preventing deadlocks.

---

## BuildOwner (Amp: NB0)

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/framework/build-owner.ts`

The BuildOwner manages the build phase of the pipeline. It tracks which elements are dirty and need rebuilding.

### Dirty Element Tracking

Dirty elements are stored in a `Set<Element>` (`_dirtyElements`), which provides automatic deduplication. When `scheduleBuildFor(element)` is called, it adds the element to the set and directly calls `FrameScheduler.instance.requestFrame()`. This direct coupling to the FrameScheduler singleton matches the Amp architecture (NB0 calls c9 directly, with no intermediate layers).

### buildScope / buildScopes -- Depth-Sorted Rebuild

The `buildScope(callback?)` method is the core build algorithm. It uses a `while` loop that continues as long as `_dirtyElements.size > 0`:

1. Snapshot the dirty set into an array and clear the set immediately.
2. Sort the array by `element.depth` ascending -- parents rebuild before children. This is essential because rebuilding a parent may obsolete or change a child, and processing in depth order prevents redundant work.
3. Iterate the sorted elements: for each one that is still `dirty`, call `element.performRebuild()` and then clear `element._dirty = false`. Errors are caught per-element and the dirty flag is cleared even on error, preventing infinite rebuild loops.
4. After the inner for-loop, the while-loop re-checks `_dirtyElements.size`. If any `performRebuild()` call triggered `setState()` or `markNeedsBuild()` on other elements, those new entries appear in the set and get processed in the next iteration. This cascading-dirty design ensures convergence.

The `buildScopes()` convenience method is an alias for `buildScope()` with no callback, matching Amp's NB0.buildScopes().

### Build Statistics

A rolling 60-sample window (matching the 60 fps target) tracks rebuild counts and durations per frame, computing averages and maximums in `_recordBuildStats`.

### GlobalKeyRegistry

The BuildOwner also owns a `GlobalKeyRegistry` that maps `GlobalKey` string representations to `Element` instances, enforcing the single-use constraint (each GlobalKey can only appear once in the tree).

---

## WidgetsBinding (Amp: J3)

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`

WidgetsBinding is the top-level singleton orchestrator that wires together the FrameScheduler, BuildOwner, PipelineOwner, TerminalManager, and the input system. It is the Flitter equivalent of Flutter's `WidgetsBinding`.

### Singleton Construction and Wiring

The private constructor performs all critical wiring:

1. Creates `BuildOwner` and `PipelineOwner` instances.
2. Creates a `TerminalManager` with a `MockPlatform` (safe for tests; replaced with `BunPlatform` in production).
3. Obtains `MouseManager.instance` and `FocusManager.instance`.
4. Calls `initSchedulers(buildScheduler, paintScheduler)` to set the module-level global bridges (`_buildScheduler`, `_paintScheduler`). These are the functions that `Element.markNeedsRebuild()` (via `getBuildScheduler()` / Amp: `XG8()`) and `RenderObject.markNeedsLayout/Paint()` (via `getPaintScheduler()` / Amp: `xH()`) call into.
5. Registers **six named frame callbacks** with the FrameScheduler, covering the full pipeline:

| Callback ID | Phase | Priority | Purpose |
|---|---|---|---|
| `frame-start` | build | -2000 | `beginFrame()` -- determines if paint is needed |
| `resize` | build | -1000 | `processResizeIfPending()` -- applies pending terminal resize |
| `build` | build | 0 | `buildOwner.buildScopes()` + `updateRootRenderObject()` |
| `layout` | layout | 0 | `updateRootConstraints()` + `pipelineOwner.flushLayout()` |
| `paint-phase` | paint | 0 | `paint()` -- paints render tree to screen buffer |
| `render-phase` | render | 0 | `render()` -- diffs buffer, writes ANSI + reestablishes hover |

Priority ordering within the build phase ensures `beginFrame` (priority -2000) runs before resize (-1000) which runs before the actual build (0).

### Frame Phase Methods

- **`beginFrame()`**: Resets per-frame flags. Sets `_shouldPaintCurrentFrame` to true if any dirty state exists (dirty elements, layout needs, paint needs, forced paint, or full-refresh required on the screen buffer).
- **`processResizeIfPending()`**: If a resize event is pending, updates `_renderViewSize`, resizes the screen buffer, updates root constraints, and marks paint needed.
- **`paint()`**: Short-circuits if `_shouldPaintCurrentFrame` is false (frame skip). Otherwise calls `pipelineOwner.flushPaint()`, clears the screen buffer, calls `paintRenderTree(rootRO, screen)`, optionally draws a performance overlay, and sets `_didPaintCurrentFrame = true`.
- **`render()`**: Short-circuits if paint did not execute. Gets the diff patches from the screen buffer, builds cursor state, generates ANSI output via `Renderer.render()`, writes to the output writer, and calls `screen.present()` to swap buffers.

### runApp -- The Main Run Loop

The `runApp(widget, options?)` instance method (and its standalone wrapper `runApp()` matching Amp's `cz8`) is the application entry point:

1. Detects terminal size (via `BunPlatform` or options).
2. Wraps the user widget in a `MediaQuery` providing screen dimensions.
3. Calls `attachRootWidget(wrappedWidget)` which creates a `_RootWidget` wrapper, mounts the root element, sets initial constraints, wires the root render object to PipelineOwner and MouseManager.
4. In production mode, replaces the MockPlatform TerminalManager with a real `BunPlatform`-backed one, calls `_tui.initialize()` (raw mode, alt screen, mouse enable, bracketed paste), and invokes `setupEventHandlers()`.
5. Registers process signal handlers (`exit`, `SIGINT`, `SIGTERM` for cleanup; `SIGWINCH` for resize).
6. Calls `requestForcedPaintFrame()` and `frameScheduler.requestFrame()` to kick off the first frame.

### Input Pipeline Setup

`setupEventHandlers()` creates an `InputParser` with a dispatch callback wired to `EventDispatcher.instance.dispatch()`. The TerminalManager's `onInput` callback feeds raw `Buffer` data into the parser. A default Ctrl+C interceptor (`process.exit(0)`) is registered. Mouse events are forwarded to `MouseManager.updatePosition()` and `dispatchMouseAction()`.

### Cleanup and Lifecycle

`stop()` sets `_isRunning = false`, resolves the exit promise, unmounts the root element, and disposes BuildOwner and PipelineOwner. `cleanup()` is a more thorough teardown that also disposes FocusManager, MouseManager, InputParser, removes all six frame callbacks, and disposes the TerminalManager (restoring terminal state). The `waitForExit()` / `stop()` pattern provides a promise-based mechanism for the application to wait until the binding signals shutdown.

### Test Support

`drawFrameSync()` is a synchronous test helper that manually executes the same sequence as the FrameScheduler callbacks (beginFrame, resize, build, layout, paint, render, hover reestablish) without going through the async scheduling machinery. `WidgetsBinding.reset()` tears down the singleton and all its owned resources, including calling `resetSchedulers()` to clear the module-level global bridges.

---

## Summary of Interconnections

The flow from user action to screen update follows this path:

1. A `State.setState()` call marks an element dirty via `Element.markNeedsRebuild()`.
2. `markNeedsRebuild()` calls `getBuildScheduler().scheduleBuildFor(element)` (the global bridge set by WidgetsBinding).
3. `BuildOwner.scheduleBuildFor()` adds the element to the dirty set and calls `FrameScheduler.instance.requestFrame()`.
4. FrameScheduler coalesces the request and schedules a frame via `setImmediate` or `setTimeout`.
5. When the frame fires, `executeFrame()` runs BUILD -> LAYOUT -> PAINT -> RENDER through the six registered callbacks.
6. The build callback calls `BuildOwner.buildScopes()` which depth-sorts and rebuilds dirty elements.
7. Layout, paint, and render phases propagate changes to the terminal screen buffer and ultimately to stdout as ANSI escape sequences.

This architecture is entirely on-demand and event-driven -- no frames are produced when the UI is quiescent.
