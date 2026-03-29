# Analysis 36: Terminal Screen Size, MediaQuery, and Responsive Layout in flitter-core / flitter-amp

## 1. Terminal Size Detection Mechanism

### 1.1 The PlatformAdapter Abstraction

Terminal dimensions are detected through the `PlatformAdapter` interface defined in `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/platform.ts`. This interface provides a single method for obtaining terminal size:

```typescript
getTerminalSize(): { columns: number; rows: number };
```

Two concrete implementations exist:

**BunPlatform** (production) reads live terminal dimensions from Node's `process.stdout`:

```typescript
// platform.ts lines 168-173
getTerminalSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}
```

The fallback to 80x24 ensures a safe default when stdout is not a TTY (e.g., piped output). This is a Node.js/Bun convention: `process.stdout.columns` and `process.stdout.rows` are `undefined` when stdout is not a terminal.

**MockPlatform** (testing) stores a configurable size tuple and exposes a `simulateResize()` helper:

```typescript
// platform.ts lines 218, 247-249, 280-286
size: { columns: number; rows: number } = { columns: 80, rows: 24 };

getTerminalSize(): { columns: number; rows: number } {
  return { ...this.size };
}

simulateResize(cols: number, rows: number): void {
  this.size = { columns: cols, rows: rows };
  for (const cb of this.resizeCallbacks) {
    cb(cols, rows);
  }
}
```

### 1.2 Initial Size Acquisition in runApp()

When the application starts, `WidgetsBinding.runApp()` (in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts`, lines 852-965) reads the terminal size exactly once during initialization:

```typescript
let cols = 80;
let rows = 24;

if (options?.size) {
  cols = options.size.columns;
  rows = options.size.rows;
} else {
  try {
    platform = new BunPlatform();
    const size = platform.getTerminalSize();
    cols = size.columns;
    rows = size.rows;
  } catch (_e) {
    // BunPlatform not available, use defaults
  }
}

this._renderViewSize = new Size(cols, rows);
```

The precedence order is: (1) explicit `options.size` override, (2) live `BunPlatform.getTerminalSize()`, (3) hardcoded 80x24 fallback. This three-tier approach ensures the framework works in production terminals, test harnesses that inject custom sizes, and non-TTY environments.

---

## 2. How Dimensions Propagate Through the Widget Tree

### 2.1 MediaQueryData -- The Immutable Data Carrier

The screen size is packaged into a `MediaQueryData` instance (defined in `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/media-query.ts`, lines 28-96). This class wraps two frozen (immutable) payloads:

- **size**: `{ readonly width: number; readonly height: number }` -- terminal columns and rows, rounded to integers.
- **capabilities**: `TerminalCapabilities` -- color depth, mouse support, emoji width, and Kitty graphics protocol support.

The factory `MediaQueryData.fromTerminal(cols, rows)` constructs a data instance with conservative capability defaults (ansi256, no mouse, unknown emoji width). The `copyWith()` method allows creating modified copies without mutating the original. The `equals()` method performs structural equality comparison across all six fields to determine whether dependent widgets need rebuilding.

### 2.2 MediaQuery -- The InheritedWidget

`MediaQuery` (lines 118-189) extends `InheritedWidget`, which is the canonical mechanism in this Flutter-inspired framework for propagating data down the widget tree without explicit parameter passing. When `runApp()` creates the widget tree, it wraps the user's root widget inside a MediaQuery:

```typescript
// binding.ts lines 892-895
const wrappedWidget = new MediaQuery({
  data: MediaQueryData.fromTerminal(cols, rows),
  child: widget,
});
```

This placement at the very top of the tree means every descendant widget can access terminal size and capabilities.

### 2.3 The InheritedWidget Dependency Mechanism

The propagation relies on the InheritedElement implementation in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`:

1. `InheritedElement` maintains a `_dependents: Set<Element>` tracking all elements that have looked up this inherited widget.
2. When a widget calls `MediaQuery.of(context)`, the underlying `dependOnInheritedWidgetOfExactType()` walks up the parent chain, finds the `InheritedElement` whose widget constructor matches `MediaQuery`, calls `addDependent(this)` to register the calling element, and returns the element.
3. The `MediaQuery` widget is then cast, and its `.data` property returned.

When a new `MediaQuery` widget replaces the old one (e.g., on resize), `updateShouldNotify()` compares old and new `MediaQueryData` via structural equality. If data changed, `InheritedElement.notifyDependents()` calls `markNeedsRebuild()` on every registered dependent element, triggering a cascading rebuild.

### 2.4 Static Accessor Convenience Methods

Four static methods provide ergonomic access patterns:

| Method | Returns | Throws on missing? |
|--------|---------|---------------------|
| `MediaQuery.of(context)` | `MediaQueryData` | Yes |
| `MediaQuery.maybeOf(context)` | `MediaQueryData \| undefined` | No |
| `MediaQuery.sizeOf(context)` | `{ width, height }` | Yes |
| `MediaQuery.capabilitiesOf(context)` | `TerminalCapabilities` | Yes |

Additionally, `BuildContextImpl` (in element.ts, around line 970) exposes a `mediaQuery` getter as a convenience shortcut that internally calls `dependOnInheritedWidgetOfExactType(MediaQuery)`.

### 2.5 Constraint Propagation -- The Render Pipeline Path

Independently from the InheritedWidget data path, terminal dimensions also flow through the render tree as `BoxConstraints`. The `PipelineOwner` (in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts`) converts terminal size into loose constraints:

```typescript
// pipeline-owner.ts lines 81-98
updateRootConstraints(size: Size): void {
  const newConstraints = new BoxConstraints({
    minWidth: 0,
    maxWidth: size.width,
    minHeight: 0,
    maxHeight: size.height,
  });
  // ... marks root for layout if changed
}
```

This creates **loose constraints**: minimum is 0 on both axes, maximum is the terminal size. These constraints are then passed to `RenderBox.layout()` on the root render object. Each render object in the tree interprets these constraints during its `performLayout()`, passing appropriate (potentially modified) constraints down to its children.

---

## 3. Resize Event Handling

### 3.1 SIGWINCH Signal Registration

In production mode, `WidgetsBinding.runApp()` registers a SIGWINCH handler (binding.ts lines 940-960):

```typescript
process.on('SIGWINCH', () => {
  try {
    const p = this._tui.platform;
    if (p) {
      const size = p.getTerminalSize();
      this.handleResize(size.columns, size.rows);
      const newWrapped = new MediaQuery({
        data: MediaQueryData.fromTerminal(size.columns, size.rows),
        child: widget,
      });
      this.attachRootWidget(newWrapped);
    }
  } catch (_e) {
    // Ignore resize errors
  }
});
```

This handler performs two parallel updates:
1. **Layout path**: Calls `handleResize()` which stores a pending resize event and requests a frame.
2. **Widget path**: Creates a new `MediaQuery` with updated dimensions and re-attaches the root widget, triggering a full tree rebuild.

### 3.2 The Platform-Level Resize Listener

In addition to SIGWINCH, `BunPlatform.onResize()` (platform.ts lines 175-186) listens to `process.stdout`'s `'resize'` event:

```typescript
onResize(callback: (cols: number, rows: number) => void): void {
  this.resizeCallbacks.push(callback);
  if (!this.resizeHandler) {
    this.resizeHandler = () => {
      const size = this.getTerminalSize();
      for (const cb of this.resizeCallbacks) {
        cb(size.columns, size.rows);
      }
    };
    process.stdout.on('resize', this.resizeHandler);
  }
}
```

When `TerminalManager.initialize()` runs, it registers `this.handleResize` as a resize callback on the platform (terminal-manager.ts lines 130-133). This private `handleResize()` method in TerminalManager resizes the ScreenBuffer and invokes `this.onResize?.()`.

### 3.3 The Deferred Resize Processing in the Frame Pipeline

The `handleResize()` method on `WidgetsBinding` does not immediately resize. Instead, it stores a pending resize event and requests a new frame:

```typescript
// binding.ts lines 628-631
handleResize(width: number, height: number): void {
  this._pendingResizeEvent = { width, height };
  this.frameScheduler.requestFrame();
}
```

The actual resize processing happens during the BUILD phase of the frame pipeline, in the second registered callback (priority -1000, named 'resize'):

```typescript
// binding.ts lines 544-554
processResizeIfPending(): void {
  if (!this._pendingResizeEvent) return;
  const { width, height } = this._pendingResizeEvent;
  this._pendingResizeEvent = null;

  this._renderViewSize = new Size(width, height);
  this._tui.screenBuffer.resize(width, height);
  this.pipelineOwner.updateRootConstraints(this._renderViewSize);
  this._shouldPaintCurrentFrame = true;
}
```

This performs three critical operations:
1. Updates the binding's `_renderViewSize` (used in the LAYOUT callback).
2. Resizes the `ScreenBuffer`, which resizes both front and back buffers and marks `needsFullRefresh = true`.
3. Updates `PipelineOwner` root constraints, which marks the root render object for layout.

The deferral ensures resize handling is coalesced with other frame work and occurs at a well-defined point in the frame lifecycle, preventing race conditions or partial updates.

### 3.4 ScreenBuffer Resize Mechanics

When `ScreenBuffer.resize()` is called (`screen-buffer.ts` lines 215-222):

```typescript
resize(width: number, height: number): void {
  if (width === this.width && height === this.height) return;
  this.width = width;
  this.height = height;
  this.frontBuffer.resize(width, height);
  this.backBuffer.resize(width, height);
  this.needsFullRefresh = true;
}
```

Each `Buffer.resize()` preserves existing cell content where dimensions overlap (copying row by row) and fills new areas with `EMPTY_CELL`. The `needsFullRefresh = true` flag tells `getDiff()` to emit all cells as changed on the next frame, rather than performing incremental diffing. This ensures the entire screen is repainted after a resize.

---

## 4. The MediaQuery Abstraction in Detail

### 4.1 Design as a Flutter MediaQuery Analogue

The `MediaQuery` / `MediaQueryData` system is a direct analogue of Flutter's `MediaQuery` widget, adapted from the terminal domain. The Amp CLI source (obfuscated as `nA` for MediaQueryData and `Q3` for MediaQuery) implements the same InheritedWidget pattern.

### 4.2 TerminalCapabilities Descriptor

`MediaQueryData.capabilities` carries terminal feature information:

```typescript
export interface TerminalCapabilities {
  readonly colorDepth: 'none' | 'ansi256' | 'truecolor';
  readonly mouseSupport: boolean;
  readonly emojiWidth: 'unknown' | 'narrow' | 'wide';
  readonly kittyGraphics: boolean;
}
```

This is a higher-level, widget-oriented capabilities descriptor distinct from the lower-level `TerminalCapabilities` in `platform.ts` (which tracks raw protocol support like syncOutput, hyperlinks, kittyKeyboard). The MediaQuery version focuses on what matters to widgets making layout or rendering decisions.

### 4.3 Nested MediaQuery Override

The InheritedWidget lookup walks up the ancestor chain and returns the nearest match. This means an inner `MediaQuery` overrides an outer one. This pattern is tested explicitly (media-query.test.ts lines 338-361):

```typescript
it('inner MediaQuery overrides outer', () => {
  const outerData = MediaQueryData.fromTerminal(80, 24);
  const innerData = MediaQueryData.fromTerminal(40, 12);
  // ... inner wins for leaf widget lookups
});
```

This enables sub-regions of the UI to operate with different "virtual" screen sizes, useful for embedded panels or preview areas.

### 4.4 Immutability Guarantees

Both `size` and `capabilities` are `Object.freeze()`-d in the constructor, preventing accidental mutation. The constructor also rounds `width` and `height` to integers via `Math.round()`, enforcing the terminal domain constraint that cell coordinates must be integral.

---

## 5. How Widgets Adapt to Different Terminal Sizes

### 5.1 Layout-Level Adaptation via Constraints

The primary adaptation mechanism is the BoxConstraints system rather than explicit size queries. Terminal dimensions flow as constraints from the root, and layout widgets distribute space:

- **Column/Row (RenderFlex)**: Flex layout with `mainAxisSize: 'max'` fills the main axis. `crossAxisAlignment: 'stretch'` forces children to the cross-axis maximum. The `Expanded` wrapper gives flex children a proportional share of remaining space.
- **SingleChildScrollView**: Passes unbounded height constraints to its child, enabling scrollable content that exceeds the viewport.
- **SizedBox / ConstrainedBox (RenderConstrainedBox)**: Applies additional constraints, e.g., minimum heights for the input area.

The App layout in `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` demonstrates this:

```
Column(mainAxisSize: max, crossAxisAlignment: stretch)  // fills terminal
  Expanded                                                // fills remaining height
    Row(crossAxisAlignment: stretch)                      // fills width
      Expanded(ScrollView(ChatView))                      // flexible chat area
      Scrollbar(1 col wide)                               // fixed width
  BottomGrid                                              // intrinsic height
```

When the terminal is 120x40, the Column takes 120x40, the BottomGrid takes its natural height (e.g., 4 rows), and the Expanded chat area gets 120x36. When the terminal shrinks to 80x24, the same tree re-layouts: BottomGrid still takes its natural height, and the chat area adjusts to 80x(24-N). No explicit size queries are needed.

### 5.2 Explicit MediaQuery Usage for Capability-Driven Rendering

Some widgets do query MediaQuery directly. The `ImagePreview` widget (in `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/image-preview.ts`, around line 602) checks terminal capabilities:

```typescript
build(context: BuildContext): Widget {
  const mediaQueryData = MediaQuery.maybeOf(context);
  const kittySupported = mediaQueryData?.capabilities?.kittyGraphics ?? false;
  this._kittySupported = kittySupported;

  if (!kittySupported) {
    displayState = 'unsupported';
  }
  // ...
}
```

This is a graceful degradation pattern: if the terminal does not support Kitty graphics protocol, the widget renders a fallback representation instead of inline images.

### 5.3 Widget-Level Responsive Patterns in flitter-amp

The flitter-amp application (`/home/gem/workspace/flitter/packages/flitter-amp/src/`) does not currently perform explicit `MediaQuery.of()` / `MediaQuery.sizeOf()` calls in its widgets. Instead, it relies entirely on the constraints-based layout system. Widgets like `ChatView`, `InputArea`, `BottomGrid`, and `ToolCallWidget` accept whatever width the constraint system provides and render accordingly. Text wrapping, for instance, is handled by the `Text` widget respecting its constraint width.

The test utilities in `/home/gem/workspace/flitter/packages/flitter-amp/src/test-utils/capture.ts` demonstrate how different screen sizes can be simulated:

```typescript
export function captureToSvg(widget: Widget, options?: CaptureOptions): string {
  const cols = options?.cols ?? 120;
  const rows = options?.rows ?? 40;
  // ... sets up binding with these dimensions and renders one frame
}
```

Layout guardrail tests (`/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/layout-guardrails.test.ts` and `app-layout.test.ts`) verify the constraint chain at various terminal sizes (120x40 is the standard test size).

---

## 6. Integration with the Render Pipeline

### 6.1 The 4-Phase Frame Pipeline

The FrameScheduler (in `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/frame-scheduler.ts`) orchestrates a strict four-phase pipeline per frame:

| Phase | Priority Callbacks | Purpose |
|-------|--------------------|---------|
| BUILD (-2000) | `beginFrame()` | Determines if paint is needed |
| BUILD (-1000) | `processResizeIfPending()` | Applies deferred resize |
| BUILD (0) | `buildScopes()` + `updateRootRenderObject()` | Rebuilds dirty widgets |
| LAYOUT (0) | `updateRootConstraints()` + `flushLayout()` | Layouts from root |
| PAINT (0) | `paint()` | Paints render tree to ScreenBuffer |
| RENDER (0) | `render()` + `reestablishHoverState()` | Diffs buffer, writes ANSI |

Screen size affects multiple phases:

1. **BUILD phase (resize callback)**: Resizes buffers, updates constraints.
2. **BUILD phase (build callback)**: If MediaQuery data changed, dependent widgets rebuild (via InheritedElement notification).
3. **LAYOUT phase**: Root constraints reflect new terminal size; layout cascades from root.
4. **PAINT phase**: ScreenBuffer now has new dimensions; `paintRenderTree()` paints all render objects to the resized back buffer.
5. **RENDER phase**: `getDiff()` with `needsFullRefresh = true` emits all cells; Renderer generates ANSI escape sequences for the full screen.

### 6.2 Frame Coalescing and Pacing

If multiple resize events arrive rapidly (e.g., user dragging the terminal corner), the FrameScheduler coalesces them: `requestFrame()` is a no-op if a frame is already scheduled. The `_pendingResizeEvent` in WidgetsBinding ensures only the latest dimensions are processed. In production, frames are paced at 60fps (~16.67ms budget); in test mode, pacing is disabled for synchronous execution.

### 6.3 The Double-Buffer Strategy

The ScreenBuffer uses classic double buffering (screen-buffer.ts):

- **Back buffer**: The writable surface. Paint operations write cells here.
- **Front buffer**: The committed frame (what's currently on screen).
- **present()**: Swaps front and back, clears the new back buffer.
- **getDiff()**: Compares front and back to produce minimal `RowPatch[]` for the Renderer.

After resize, both buffers are resized and `needsFullRefresh` is set, causing `getDiff()` to emit every cell. This is necessary because the terminal itself has already reflowed its content and we need to repaint entirely.

### 6.4 Synchronous Test Execution

For testing, `WidgetsBinding.drawFrameSync()` (binding.ts lines 682-708) runs the entire pipeline synchronously in order: beginFrame -> processResizeIfPending -> build -> layout -> paint -> render. This allows tests to set dimensions, attach widgets, call `drawFrameSync()`, and immediately inspect the buffer contents. The `captureToGrid()` and `captureToSvg()` utilities in flitter-amp build on this pattern.

---

## 7. Code Patterns and Observations

### 7.1 Dual Propagation Paths for Screen Size

Terminal dimensions propagate through two independent channels:

1. **Constraints path** (PipelineOwner -> BoxConstraints -> RenderBox.layout): Drives physical layout. This is the "push" model where constraints flow downward during the layout phase.
2. **InheritedWidget path** (MediaQuery -> MediaQueryData -> descendant widgets): Drives widget-level decisions. This is the "pull" model where widgets opt in by calling `MediaQuery.of(context)`.

This duality mirrors Flutter's architecture and is intentional: constraints handle layout math (how wide/tall should this widget be?), while MediaQuery handles policy decisions (should I render images? what color depth is available?).

### 7.2 The SIGWINCH Handler Creates a New Root Widget

A notable pattern is that the SIGWINCH handler creates an entirely new `MediaQuery` widget and re-attaches the root:

```typescript
const newWrapped = new MediaQuery({
  data: MediaQueryData.fromTerminal(size.columns, size.rows),
  child: widget,
});
this.attachRootWidget(newWrapped);
```

This is a somewhat heavy operation -- it rebuilds the entire widget tree from root. The reconciliation system (Element.updateChild / Widget.canUpdate) should recognize that the child widget hasn't changed and reuse existing elements, but the MediaQuery InheritedElement itself will detect the data change via `updateShouldNotify()` and trigger targeted rebuilds of widgets that depend on it. In practice, for a TUI at 60fps with terminals that resize infrequently, this approach works well.

### 7.3 Absence of Responsive Breakpoint Abstractions

Unlike web CSS media queries with breakpoint ranges, flitter-core does not provide built-in responsive breakpoint utilities. There is no `LayoutBuilder`-style widget that exposes constraints to the build method, nor are there `MediaQuery.isNarrow()` or width-range helpers. Widgets that need size-aware decisions must either:
- Call `MediaQuery.sizeOf(context)` and branch explicitly.
- Rely on the constraints system (e.g., `Expanded` automatically adjusts).

The flitter-amp application avoids explicit breakpoint logic entirely, relying on flex-based layouts that naturally adapt to any terminal size.

### 7.4 Conservative Capability Defaults

`MediaQueryData.fromTerminal()` defaults to conservative capabilities (ansi256, no mouse, unknown emoji width, no Kitty). This is a "safe rendering" posture: widgets that check capabilities will choose fallback rendering paths unless the binding explicitly provides richer capability information. The Amp reference binary resolves actual capabilities via DA1/DA2/XTVERSION terminal queries (as implemented in `buildCapabilityQuery()` and `parseCapabilityResponse()` in platform.ts), but this detection is not yet wired into the MediaQuery wrapping in `runApp()`.

### 7.5 MockPlatform Enables Deterministic Testing

The `MockPlatform` class provides complete control over terminal dimensions and events for testing. The `simulateResize()` method updates the stored size and fires all registered callbacks, exactly mimicking what happens in production when `process.stdout` fires a `'resize'` event. Combined with `drawFrameSync()`, this allows fully deterministic, synchronous testing of resize behavior without any actual terminal.

### 7.6 Integer-Only Coordinates

BoxConstraints, Size, and MediaQueryData all enforce integer values (via `Math.round()` or the `roundOrInf()` helper in box-constraints.ts). This reflects the fundamental terminal constraint that cells are addressed by integer (column, row) pairs. Subpixel positioning is not meaningful in a character-cell display.

### 7.7 The TerminalManager as I/O Coordinator

`TerminalManager` (in `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/terminal-manager.ts`) sits between the platform and the rendering system. It owns both the `ScreenBuffer` and `Renderer`, and its constructor reads the initial terminal size from the platform to initialize the buffer:

```typescript
constructor(platform: PlatformAdapter) {
  this.platform = platform;
  const size = platform.getTerminalSize();
  this.screenBuffer = new ScreenBuffer(size.columns, size.rows);
  // ...
}
```

This ensures the buffer is correctly sized from the start, even before `runApp()` processes its first frame. The TerminalManager also provides `suspend()` and `resume()` for external editor integration, where `resume()` calls `screenBuffer.markForRefresh()` to force a full repaint after returning from the suspended state.

### 7.8 Observation: No Widget-Level Size Queries in flitter-amp

Scanning the entire `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/` directory reveals zero calls to `MediaQuery.of()`, `MediaQuery.sizeOf()`, or equivalent. Every widget in the amp client relies solely on the constraint-based layout system. This is a clean separation of concerns: the core framework provides both propagation paths, but the application layer only uses constraints. This could change in the future if features like responsive panels or terminal-width-dependent column counts are added.

---

## Summary

The flitter-core framework implements a comprehensive, Flutter-inspired system for terminal size management:

- **Detection**: Via `PlatformAdapter.getTerminalSize()` reading `process.stdout.columns/rows`.
- **Propagation**: Dual-path through BoxConstraints (layout) and MediaQuery InheritedWidget (widget policy).
- **Resize**: Deferred to the frame pipeline's BUILD phase; ScreenBuffer resized with full-refresh flag; MediaQuery widget re-created to trigger InheritedWidget notification cascade.
- **Adaptation**: Primarily constraint-driven via flex layout; capability-driven via MediaQuery for protocol-level features (Kitty graphics, color depth).
- **Integration**: Tightly coupled with the 4-phase frame scheduler, double-buffered rendering, and ANSI diff-based output.

The architecture achieves clean separation between terminal I/O (PlatformAdapter), screen management (TerminalManager/ScreenBuffer), layout (PipelineOwner/BoxConstraints), and widget-level data propagation (MediaQuery/InheritedWidget), while keeping all paths synchronized through the frame scheduler.
