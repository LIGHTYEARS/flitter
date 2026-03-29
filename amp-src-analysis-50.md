# Analysis 50: Capstone Cross-Cutting Architecture Summary

## Preamble

This document is the final capstone analysis (agent 50 of 50) for the flitter-amp TUI ACP client codebase. It synthesizes patterns observed across the entire codebase into a comprehensive architectural overview, covering the two-package structure, the three-tree model, the four-phase frame pipeline, state management, ACP protocol integration, input handling, terminal rendering, cross-cutting design patterns, and an honest assessment of strengths, weaknesses, and fidelity to the original Flutter architecture.

---

## 1. System Architecture Overview: The Two-Package Structure

The codebase is organized as a monorepo with two packages under `/home/gem/workspace/flitter/packages/`:

### flitter-core

The platform-agnostic TUI framework library. This package contains all foundational abstractions and has zero transitive runtime dependencies. It is structured into eight module groups:

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `core/` | Primitive types: Offset, Size, Rect, Color, Key, BoxConstraints, TextSpan, TextStyle, wcwidth | `types.ts`, `box-constraints.ts`, `color.ts` |
| `framework/` | Three-tree model: Widget, Element, RenderObject, BuildOwner, PipelineOwner, WidgetsBinding | `widget.ts`, `element.ts`, `render-object.ts`, `binding.ts` |
| `layout/` | Concrete RenderObject implementations: flex, padding, constrained, decorated, table, sticky header, grid border | `render-flex.ts`, `render-padded.ts`, `render-table.ts` |
| `scheduler/` | Frame pipeline: FrameScheduler (4-phase execution), PaintContext, paint traversal | `frame-scheduler.ts`, `paint-context.ts`, `paint.ts` |
| `terminal/` | Terminal abstraction: ScreenBuffer (double-buffered), Renderer (ANSI builder), TerminalManager, platform adapters, cell model | `screen-buffer.ts`, `renderer.ts`, `terminal-manager.ts` |
| `input/` | Input pipeline: InputParser (byte-to-event), EventDispatcher (routing), FocusManager/FocusNode (focus tree), MouseManager, hit testing | `input-parser.ts`, `event-dispatcher.ts`, `focus.ts` |
| `widgets/` | 40+ built-in widget catalog: Text, Column, Row, Expanded, Container, Padding, SizedBox, Stack, ScrollView, Scrollbar, Table, Markdown, TextField, SelectionList, Dialog, etc. | `text.ts`, `flex.ts`, `scroll-view.ts`, `markdown.ts` |
| `diagnostics/` | Debug tools: FrameStats, PerformanceOverlay, DebugInspector, debug flags | `frame-stats.ts`, `perf-overlay.ts` |
| `painting/` | Drawing utilities: border painter, tree connector | `border-painter.ts`, `tree-connector.ts` |

### flitter-amp

The application layer -- an ACP (Agent Control Protocol) client TUI built on flitter-core. This package implements the user-facing Amp CLI experience:

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `acp/` | ACP protocol integration: connection management, client callbacks, session handling, types | `connection.ts`, `client.ts`, `types.ts`, `session.ts` |
| `state/` | Application state: AppState (central store), ConversationState, config parsing, prompt history | `app-state.ts`, `conversation.ts`, `config.ts` |
| `widgets/` | Application-specific widgets: ChatView, BottomGrid, ToolCallWidget (with specialized renderers per tool kind), PermissionDialog, CommandPalette, ThinkingBlock, InputArea, etc. | `chat-view.ts`, `bottom-grid.ts`, `permission-dialog.ts` |
| `themes/` | Theme system: AmpThemeProvider (InheritedWidget), dark/light/nord/gruvbox/catppuccin/solarized themes | `index.ts`, `dark.ts`, `amp-theme-data.ts` |
| `utils/` | Utilities: logger, process spawning, editor integration | `logger.ts`, `process.ts` |
| `test-utils/` | Testing infrastructure: capture helpers, grid assertion helpers, tmux harness, visual snapshot tools | `capture.ts`, `termshot.ts` |

The dependency flows strictly one-way: flitter-amp depends on flitter-core. flitter-core has no knowledge of flitter-amp. This clean separation means flitter-core could theoretically be used to build any terminal application, not just an ACP client.

---

## 2. The Three-Tree Model: Widget, Element, RenderObject

The central architectural concept, inherited directly from Flutter, is the three-tree model. Three parallel tree structures cooperate to produce screen output:

### Tree 1: Widget Tree (Configuration)

**Role**: Immutable descriptions of UI configuration. Widgets are lightweight, frequently recreated, and compared for identity and type.

**Key classes** (defined in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts`):

- `Widget` (Amp: Sf) -- abstract base. Carries an optional `Key` and defines `canUpdate(oldWidget, newWidget)` which checks constructor identity and key equality.
- `StatelessWidget` (Amp: H3) -- immutable widgets with a `build(context)` method.
- `StatefulWidget` (Amp: H8) -- widgets with mutable `State` objects. `createState()` is the factory.
- `State<T>` (Amp: _8) -- mutable state with lifecycle hooks: `initState()`, `didUpdateWidget()`, `build()`, `dispose()`, and the critical `setState(fn?)` trigger.
- `InheritedWidget` (Amp: Bt) -- data propagation widgets with `updateShouldNotify()` for dependency-based rebuilds.
- `RenderObjectWidget` / `SingleChildRenderObjectWidget` / `MultiChildRenderObjectWidget` / `LeafRenderObjectWidget` -- bridge widgets that create and configure RenderObjects.

### Tree 2: Element Tree (Lifecycle Management)

**Role**: Long-lived objects that manage widget-to-widget reconciliation and lifecycle. Elements are the "glue" between the widget configuration and the render objects.

**Key classes** (defined in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`):

- `Element` (Amp: T$) -- base class with parent/children references, dirty tracking, depth caching, inherited dependency tracking, and the `markNeedsRebuild()` -> `getBuildScheduler().scheduleBuildFor()` chain.
- `StatelessElement` (Amp: lU0) -- manages a single child produced by `StatelessWidget.build()`.
- `StatefulElement` (Amp: V_0) -- owns a `State` instance, manages mount/update/unmount lifecycle.
- `InheritedElement` (Amp: Z_0) -- tracks dependents via a `Set<Element>`, notifies them when `updateShouldNotify()` returns true.
- `RenderObjectElement` (Amp: oj) -- creates/updates/detaches a `RenderObject` via the widget's factory methods.
- `SingleChildRenderObjectElement` (Amp: uv) -- manages one child element and wires its render object to the parent.
- `MultiChildRenderObjectElement` (Amp: rJ) -- manages multiple children with the three-phase O(N) `updateChildren()` reconciliation algorithm.
- `LeafRenderObjectElement` (Amp: O$) -- no children, for terminal leaf nodes like Text.
- `BuildContextImpl` (Amp: jd) -- concrete BuildContext wrapping an Element, providing `dependOnInheritedWidgetOfExactType()`, `findAncestorStateOfType()`, and `mediaQuery` shortcut.

### Tree 3: Render Tree (Layout and Paint)

**Role**: Mutable objects that compute layout (sizes and positions) and paint visual content.

**Key classes** (defined in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts`):

- `RenderObject` (Amp: n_) -- abstract base with `markNeedsLayout()`, `markNeedsPaint()`, `adoptChild()`, `dropChild()`, `attach()`/`detach()`, and abstract `performLayout()` + `paint()`.
- `RenderBox` (Amp: j9) -- adds the box-model: `layout(constraints)`, `size`, `offset`, `_lastConstraints` for the skip optimization.
- `ContainerRenderBox` -- ordered child list with `insert()`, `remove()`, `move()`, `visitChildren()`.
- Concrete implementations: `RenderFlex` (Row/Column), `RenderPadding`, `RenderConstrainedBox` (SizedBox), `RenderDecoratedBox` (Container), `RenderTable`, `RenderStickyHeader`, `RenderGridBorder`, `RenderCenter`, `RenderStack`, `RenderClipRect`, `RenderScrollView`, etc.

### How the Three Trees Connect End-to-End

```
Widget.createElement()  -->  Element  -->  RenderObjectWidget.createRenderObject()  -->  RenderObject
     ^                        |                        |
     |                   manages lifecycle         layout() / paint()
     |                        |                        |
  StatefulWidget         StatefulElement           RenderBox
  .createState()         ._state.build()          .performLayout()
                              |                   .paint(context, offset)
                         produces new               |
                         Widget subtree          writes to ScreenBuffer
```

1. A `StatefulWidget.createState()` produces a `State` object.
2. The `State.build(context)` method returns a widget subtree.
3. The element tree reconciles old vs. new widgets using `Widget.canUpdate()`.
4. Matching widgets get `Element.update(newWidget)`; non-matching ones trigger unmount + remount.
5. `RenderObjectElement.mount()` calls `widget.createRenderObject()` to create the render object.
6. `RenderObjectElement.update()` calls `widget.updateRenderObject()` to apply changed properties.
7. The render tree performs layout (constraints down, sizes up) and paint (DFS traversal to screen buffer).

---

## 3. The Four-Phase Frame Pipeline: BUILD, LAYOUT, PAINT, RENDER

The `FrameScheduler` (Amp: c9, defined in `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/frame-scheduler.ts`) orchestrates an on-demand, event-driven frame pipeline. No frames are produced when the UI is quiescent.

### Phase Architecture

```
requestFrame()  -->  [coalesce + pace]  -->  executeFrame()
                                                  |
                                    +---------+---------+---------+--------+
                                    |         |         |         |        |
                                  BUILD    LAYOUT     PAINT    RENDER   POST-FRAME
                                    |         |         |         |        |
                                beginFrame  flush    paint    render   reestablish
                                resize      Layout   RenderTree  diff   HoverState
                                buildScopes          to buffer   ANSI
```

### Phase 1: BUILD (priority-ordered callbacks)

Three callbacks execute in the BUILD phase, sorted by priority:

1. **`beginFrame`** (priority -2000): Resets per-frame flags. Determines if paint is needed by checking dirty elements, layout needs, paint needs, forced paint, or screen buffer refresh requirements.
2. **`processResizeIfPending`** (priority -1000): If a terminal resize event is pending, updates the render view size, resizes the screen buffer, and updates root constraints.
3. **`buildScopes`** (priority 0): The `BuildOwner.buildScopes()` method depth-sorts dirty elements and rebuilds them parent-first. This is the heart of widget reconciliation. After building, `updateRootRenderObject()` ensures the pipeline owner has the current root render object.

### Phase 2: LAYOUT

A single callback: `PipelineOwner.flushLayout()` runs the root render object's `layout(constraints)`, which cascades down the tree via `performLayout()` calls. Each parent passes constraints to children, children compute sizes, parents read sizes and set child offsets. If any layout changed, the paint flag is set.

### Phase 3: PAINT

A single callback: `WidgetsBinding.paint()` calls `pipelineOwner.flushPaint()` (bookkeeping), clears the screen buffer, then calls `paintRenderTree(rootRO, screen)` which performs a DFS traversal calling `renderObject.paint(context, offset)` at each node. The PaintContext writes characters with styles into the ScreenBuffer's back buffer.

### Phase 4: RENDER

A single callback: `WidgetsBinding.render()` gets the diff patches from the screen buffer (comparing back buffer against front buffer), builds cursor state, generates minimal ANSI escape sequences via `Renderer.render(patches, cursor)`, writes the output string to stdout, and calls `screen.present()` to swap the front and back buffers.

### Frame Coalescing and Pacing

`requestFrame()` implements coalescing (multiple requests in the same tick produce one frame), re-entry guarding (dirty-marking during a frame schedules a follow-up), and 60fps pacing in production (via `setTimeout` if the frame budget has not elapsed). Test environments use `setImmediate` for deterministic execution.

---

## 4. State Management Patterns

### AppState: The Central Store

`AppState` (`/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`) is the single source of truth for the entire application. It implements a ChangeNotifier pattern with a `Set<StateListener>` and a `notifyListeners()` method that iterates all registered listeners on every mutation.

AppState implements the `ClientCallbacks` interface, making it the direct receiver of ACP protocol events. This dual role (state store + protocol handler) creates a clean bridge between the network layer and the UI:

```
ACP Event  -->  AppState.onSessionUpdate()  -->  mutate state  -->  notifyListeners()
                                                                         |
                                                                    AppStateWidget.stateListener
                                                                         |
                                                                    setState(() => {})
                                                                         |
                                                                    Element.markNeedsRebuild()
                                                                         |
                                                                    BuildOwner.scheduleBuildFor()
                                                                         |
                                                                    FrameScheduler.requestFrame()
                                                                         |
                                                                    Frame executes...
```

### ConversationState: Domain-Specific State

`ConversationState` (`/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts`) manages the ordered list of conversation items and streaming state. It owns the `_streamingMessage` and `_streamingThinking` references for in-progress text accumulation. Methods like `appendAssistantChunk()` lazily create the streaming item on first call, then append to it on subsequent calls. `finalizeAssistantMessage()` and `finalizeThinking()` close the streaming state.

### The Listener/Observer Pattern

The codebase uses a consistent listener pattern throughout:

1. **AppState -> AppStateWidget**: Via `addListener()` / `removeListener()` with `notifyListeners()`. The widget's `initState()` registers and `dispose()` unregisters.
2. **InheritedWidget -> dependents**: Via `InheritedElement._dependents` set. Dependents call `dependOnInheritedWidgetOfExactType()` to register. When the inherited widget updates and `updateShouldNotify()` returns true, `notifyDependents()` calls `markNeedsRebuild()` on each dependent.
3. **ScrollController -> ScrollView**: Similar listener registration for scroll position changes.
4. **FocusNode -> listeners**: FocusNode maintains `_listeners` arrays that fire on focus state changes.

### 50ms Throttle for Streaming

A distinctive pattern in `AppStateWidget` throttles state-driven rebuilds to at most one every 50 milliseconds during streaming. This prevents the rapid-fire `agent_message_chunk` events (which can arrive many times per second) from causing excessive rebuilds. The implementation uses a `_lastUpdate` timestamp and a trailing `setTimeout` to ensure no update is lost.

---

## 5. ACP Protocol Integration Architecture

The ACP integration lives in `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/` and follows a clean layered design:

### Connection Establishment (`connection.ts`)

1. Spawn the agent as a subprocess via `spawnAgent()`.
2. Wrap subprocess stdin/stdout in an ndJSON stream via `acp.ndJsonStream()`.
3. Create a `FlitterClient` (which wraps `ClientCallbacks` i.e., `AppState`).
4. Create a `ClientSideConnection` from the ACP SDK.
5. Send `initialize` request (negotiate protocol version, declare capabilities).
6. Create a new session via `connection.newSession()`.
7. Return a `ConnectionHandle` with connection, client, agent process, capabilities, and session ID.

### Event Flow

```
Agent subprocess stdout
    |
    v
ndJSON stream (ReadableStream<Uint8Array>)
    |
    v
ClientSideConnection (ACP SDK)
    |
    v
FlitterClient.onSessionUpdate(sessionId, update)
    |
    v
AppState.onSessionUpdate(sessionId, update)   <-- implements ClientCallbacks
    |
    v
switch(update.sessionUpdate) {
  'agent_message_chunk' -> conversation.appendAssistantChunk()
  'agent_thought_chunk'  -> conversation.appendThinkingChunk()
  'tool_call'            -> conversation.addToolCall()
  'tool_call_update'     -> conversation.updateToolCall()
  'plan'                 -> conversation.setPlan()
  'usage_update'         -> conversation.setUsage()
  'current_mode_update'  -> this.currentMode = ...
}
    |
    v
notifyListeners()  -->  widget rebuild chain
```

### Permission Request Flow

ACP's permission model is bridged to the TUI via a Promise-based handshake. When the agent requests permission, `AppState.onPermissionRequest()` stores a `resolve` function and the request object, then notifies listeners. The widget tree detects `hasPendingPermission` and renders a `PermissionDialog` overlay. When the user selects an option, `resolvePermission(optionId)` resolves the stored Promise, which the ACP SDK awaits.

### Prompt Submission

The entry point `index.ts` wires `handleSubmit` which calls `sendPrompt(connection, sessionId, text)`. This sends a prompt via the ACP connection and awaits the `PromptResponse`. During processing, streaming events flow through the callback chain described above.

---

## 6. Input -> Event Dispatch -> Widget Handler Flow

The input pipeline transforms raw terminal bytes into structured events that reach widget handlers:

### Stage 1: Raw Input (TerminalManager)

`TerminalManager` (`terminal-manager.ts`) initializes the terminal in raw mode, enables mouse tracking, and registers a stdin data handler. Raw bytes arrive as `Buffer` chunks via the `onInput` callback.

### Stage 2: Parsing (InputParser)

`InputParser` (`input/input-parser.ts`) consumes raw bytes and emits structured `InputEvent` objects (discriminated union: `KeyEvent`, `MouseEvent`, `ResizeEvent`, `PasteEvent`, `FocusEvent`). It handles ANSI escape sequence parsing, CSI sequences, mouse SGR mode, bracketed paste, and Kitty keyboard protocol.

### Stage 3: Dispatch (EventDispatcher)

`EventDispatcher` (`input/event-dispatcher.ts`, Amp: Pg) is a singleton that routes events through a priority pipeline:

**Key events:**
1. Key interceptors (global shortcuts like Ctrl+C) -- if any returns `'handled'`, propagation stops.
2. FocusManager dispatch -- routes the event up the focus tree from the currently focused node.
3. Registered key handlers (fallback).

**Mouse events:**
1. Global release callbacks (for drag operations).
2. Registered mouse handlers.
3. MouseManager updates position and dispatches action-based events (scroll, press, release) to hit-tested regions.

### Stage 4: Focus Tree (FocusManager / FocusNode)

`FocusManager` (`input/focus.ts`) owns the focus tree. Key events bubble up from the primary-focused `FocusNode` to its ancestors. Each `FocusNode` can have an `onKey` handler that returns `'handled'` or `'ignored'`. `FocusScopeNode` groups focus traversal (Tab/Shift+Tab).

### Stage 5: Widget Handlers

Widget-level `FocusScope` widgets register `onKey` handlers on their corresponding `FocusScopeNode`. For example, `AppStateWidget.build()` wraps the main content in a `FocusScope` with handlers for Escape, Ctrl+O, Ctrl+C, Ctrl+L, Alt+T, etc. `TextField` widgets register handlers for character input, cursor movement, and paste.

```
stdin bytes -> InputParser -> EventDispatcher -> FocusManager -> FocusNode.onKey -> widget handler
                                   |
                              key interceptors
                              (Ctrl+C -> exit)
```

---

## 7. Terminal Rendering Pipeline: ScreenBuffer -> ANSI Output

### Cell Model

The fundamental unit is a `Cell` (`terminal/cell.ts`): a character with a `CellStyle` (foreground color, background color, bold, italic, underline, strikethrough, dim, inverse, hyperlink) and a width (1 for normal, 2 for CJK/wide characters, 0 for continuation).

### Double Buffering (ScreenBuffer)

`ScreenBuffer` (`terminal/screen-buffer.ts`, Amp: ij) owns two `Buffer` instances (front and back). Each `Buffer` is a flat `Cell[]` array in row-major order (`index = y * width + x`).

- **Write phase**: Widgets paint to the back buffer via `PaintContext.drawChar()` / `fillRect()` / `drawBorder()`.
- **Diff phase**: `getDiff()` compares back buffer against front buffer, producing `RowPatch[]` containing only changed cells.
- **Present phase**: `present()` swaps front and back buffers (the new back buffer becomes a copy of front for the next diff cycle).

### ANSI Renderer

`Renderer` (`terminal/renderer.ts`, Amp: z_0) converts `RowPatch[]` into minimal ANSI escape strings:

1. Wraps output in Synchronized Update markers (BSU/ESU) to prevent flicker.
2. For each row patch, emits a cursor move (`CSI row;col H`).
3. Tracks current SGR (Select Graphic Rendition) state and emits delta SGR codes only when style changes.
4. Writes character content.
5. Appends cursor positioning and shape control if the cursor is visible.

The renderer supports ANSI 16, ANSI 256, and true-color (24-bit) modes, with fallback degradation based on terminal capabilities.

### Key Terminal Protocol Support

- Synchronized output (mode 2026) to prevent flicker
- Alternate screen buffer (mode 1049) to preserve scrollback
- Mouse tracking (mode 1003 + SGR mode 1006)
- Bracketed paste (mode 2004)
- Kitty keyboard protocol (progressive enhancement mode 5)
- Emoji width mode (mode 2027)
- In-band resize (mode 2048)
- Hyperlinks via OSC 8

---

## 8. Cross-Cutting Patterns

### 8.1 InheritedWidget for Dependency Injection

The InheritedWidget pattern is used throughout for ambient data propagation:

- **MediaQuery** (`widgets/media-query.ts`): Provides terminal dimensions (columns, rows) to all descendants. Wraps the root widget in `WidgetsBinding.runApp()`.
- **AmpThemeProvider** (`flitter-amp/src/themes/index.ts`): Provides the current `AmpTheme` to all descendants. Uses `AmpThemeProvider.maybeOf(context)` with null-safety.
- **DefaultTextStyle** (`widgets/default-text-style.ts`): Propagates default text styling down the tree.
- **HoverContext** (`widgets/hover-context.ts`): Provides hover state information.

Each follows the same pattern: an `InheritedWidget` subclass with a static `of(context)` or `maybeOf(context)` method that calls `context.dependOnInheritedWidgetOfExactType()`. This establishes a rebuild dependency -- when the inherited data changes and `updateShouldNotify()` returns true, all dependents are automatically scheduled for rebuild.

### 8.2 Listener/Observer Pattern for State Changes

The listener pattern appears at multiple levels:

- **AppState listeners** (Set-based): `addListener()` / `removeListener()` / `notifyListeners()`. Simple, direct, no event typing.
- **FocusNode listeners** (Array-based): `addListener()` / `removeListener()`. Fires on focus state changes.
- **ScrollController**: Notifies when scroll position changes, enabling Scrollbar and follow-mode.
- **Listenable** (`framework/listenable.ts`): A formal `Listenable` base class exists for more structured notification.

The pattern is always the same: register in `initState()` or `mount()`, unregister in `dispose()` or `unmount()`, and call `setState()` in the callback to trigger a rebuild.

### 8.3 Defensive Coding Patterns

**Fallback chains**: Theme lookups always provide defaults:
```typescript
theme?.base.success ?? Color.green
theme?.base.destructive ?? Color.red
```

**Type guards at boundaries**: Element mounting uses duck-typing checks rather than static type assertions:
```typescript
if ('mount' in child && typeof (child as any).mount === 'function') {
  (child as any).mount();
}
```

**Lazy imports for circular dependency avoidance**: `widget.ts` and `element.ts` have a circular dependency (widgets create elements, elements reference widgets). This is resolved via `require()` inside `createElement()` methods, which only executes at runtime after both modules are fully loaded.

**Null-safe scheduler access**: `getBuildScheduler()` and `getPaintScheduler()` return no-op implementations when the binding is not yet initialized, preventing crashes during early lifecycle or test scenarios.

**Out-of-bounds safety**: `Buffer.getCell()` returns `EMPTY_CELL` for invalid coordinates. `Buffer.setCell()` silently no-ops. This prevents crashes from off-by-one errors or oversized content without polluting calling code with bounds checks.

### 8.4 Singleton Patterns

The codebase makes extensive use of singletons, matching the Amp binary's architecture:

| Singleton | Access Pattern | Owner |
|-----------|---------------|-------|
| `WidgetsBinding` (Amp: J3) | `WidgetsBinding.instance` (lazy creation) | Top-level; owns all others |
| `FrameScheduler` (Amp: c9) | `FrameScheduler.instance` (lazy creation) | Referenced by WidgetsBinding |
| `EventDispatcher` (Amp: Pg) | `EventDispatcher.instance` (lazy creation) | Referenced by WidgetsBinding |
| `MouseManager` | `MouseManager.instance` (lazy creation) | Referenced by WidgetsBinding |
| `FocusManager` | `FocusManager.instance` (lazy creation) | Referenced by WidgetsBinding |
| `BuildOwner` (Amp: NB0) | Created by WidgetsBinding constructor | Owned by WidgetsBinding |
| `PipelineOwner` (Amp: UB0) | Created by WidgetsBinding constructor | Owned by WidgetsBinding |

All singletons expose a `reset()` static method for test isolation. The module-level `_buildScheduler` and `_paintScheduler` bridges provide global access points (Amp: XG8, xH) that decouple elements and render objects from the binding.

---

## 9. Key Architectural Strengths

### 9.1 Faithful Flutter Architecture

The most significant strength is the disciplined reproduction of Flutter's core architecture. The three-tree model, the constraint-based layout protocol ("constraints down, sizes up, parent positions children"), the element reconciliation with `canUpdate()`, the `StatefulWidget` / `State` lifecycle, and the `InheritedWidget` dependency mechanism are all faithfully implemented. This gives the codebase a proven, well-understood architecture rather than an ad-hoc design.

### 9.2 Clean Separation of Concerns

The two-package split enforces a strong boundary: flitter-core knows nothing about ACP, conversations, or application logic. flitter-amp knows nothing about rendering internals, layout algorithms, or terminal escape sequences. This separation makes both packages independently testable and potentially reusable.

### 9.3 On-Demand, Event-Driven Frame Pipeline

The FrameScheduler's coalescing and pacing design is elegant. No CPU cycles are spent when the UI is quiescent. Multiple rapid state changes collapse into single frames. The 60fps pacing prevents unnecessary renders while the trailing-edge timer in AppStateWidget's 50ms throttle ensures streaming updates are never lost.

### 9.4 Comprehensive Widget Catalog

With 40+ built-in widgets (Text, Column, Row, Expanded, Container, Padding, SizedBox, Stack, ScrollView, Scrollbar, Table, Markdown, TextField, SelectionList, Dialog, StickyHeader, DiffView, SyntaxHighlight, ClipRect, etc.), the framework provides a rich vocabulary for building terminal UIs. The Markdown widget alone handles headings, bold, italic, code blocks, links, lists, and tables.

### 9.5 Three-Phase Reconciliation

The `MultiChildRenderObjectElement.updateChildren()` algorithm implements the classic three-phase O(N) reconciliation (top-down scan, bottom-up scan, keyed middle reconciliation). This matches React's and Flutter's approach and efficiently handles list updates with minimal element re-creation.

### 9.6 Thorough Test Infrastructure

The presence of `__tests__/` directories throughout, along with specialized test utilities (capture helpers, grid assertion helpers, visual snapshot tests, tmux harness), indicates a mature testing approach. The `drawFrameSync()` method enables deterministic synchronous testing of the full pipeline.

### 9.7 Excellent Source Traceability

Every significant class, method, and algorithm includes `// Amp ref:` comments tracing back to the original binary's minified identifiers and string offsets. This makes the codebase an unusually well-documented reverse-engineering effort and enables future maintainers to verify fidelity.

---

## 10. Key Architectural Weaknesses and Growth Areas

### 10.1 No RelayoutBoundary or RepaintBoundary

Layout always starts from root. Paint always traverses the entire tree. While this is acceptable for current TUI complexity (shallow trees, fast operations), it establishes a hard scalability ceiling. If the widget tree grows to hundreds of render objects (e.g., a complex multi-panel IDE layout), full-tree layout and paint could become a bottleneck. The absence is intentional and well-documented, but it limits the framework's reuse potential for more complex TUIs.

### 10.2 Singleton Coupling

The pervasive singleton pattern (WidgetsBinding, FrameScheduler, EventDispatcher, MouseManager, FocusManager) creates tight global coupling. While `reset()` methods exist for testing, running multiple independent widget trees in the same process (e.g., for split-pane testing or embedded TUI components) is architecturally impossible. This mirrors Amp's design but limits composability.

### 10.3 Heavy Use of `any` Types

The codebase uses `any` in several strategic locations:

- `Widget.createElement(): any` -- return type is `any` to break circular import.
- `Element.renderObject: any` -- forward-references RenderObject before it is typed.
- `RenderObjectElement._renderObject: any` -- same reason.
- Various `as any` casts for duck-typing checks.

While these are pragmatic solutions to TypeScript's circular dependency limitations, they reduce type safety at the most critical architectural boundaries. A future improvement could use declaration-level interfaces or module restructuring to eliminate these.

### 10.4 Circular Dependency Management via `require()`

The `require()` calls inside `createElement()` methods (e.g., `const { StatelessElement } = require('./element')`) are necessary to break circular module dependencies. However, they bypass TypeScript's type system at import time and create runtime coupling that is invisible to static analysis. In a Bun/ES module environment, this works but is fragile.

### 10.5 Mutable State in ConversationItems

`ConversationState` stores items as mutable objects. The `_streamingMessage` reference is shared between the items array and the streaming state, meaning `appendAssistantChunk()` mutates an object that the widget tree might be reading. This works because the 50ms throttle and the single-threaded event loop ensure reads and writes do not interleave destructively, but it violates the immutability principle that makes the widget/element reconciliation sound.

### 10.6 Missing Widget Lifecycle Methods

The implementation deliberately omits several Flutter lifecycle methods:
- No `didChangeDependencies()` on State
- No `deactivate()` on Element (goes directly from mounted to unmounted)
- No `reassemble()` (no hot reload)
- No `debugFillProperties()` beyond basic toString

These omissions are documented as matching the Amp binary, but they reduce the expressiveness available to widget authors, particularly `didChangeDependencies()` which is commonly needed when InheritedWidget data changes.

### 10.7 Error Recovery

Error handling is per-callback in the FrameScheduler (try/catch around each callback) and per-element in BuildOwner (try/catch around each `performRebuild()`). However, there is no `ErrorWidget` fallback in the widget tree -- a build error in a subtree will produce an exception log but may leave that subtree in an inconsistent state. Flutter's `ErrorWidget` pattern provides graceful degradation.

---

## 11. Comparison with Flutter's Architecture

### What Is Faithfully Reproduced

| Concept | Flutter | Flitter | Fidelity |
|---------|---------|---------|----------|
| Widget / Element / RenderObject three-tree model | Core architecture | Fully implemented | High |
| StatelessWidget / StatefulWidget / State lifecycle | initState, didUpdateWidget, dispose, setState | All present | High |
| InheritedWidget dependency mechanism | updateShouldNotify, dependOnInheritedWidgetOfExactType | Fully implemented | High |
| Element reconciliation with canUpdate | Constructor + key comparison | Identical algorithm | High |
| Constraint-based layout protocol | Constraints down, sizes up | Identical protocol | High |
| BuildOwner depth-sorted rebuild | Sort dirty elements by depth, rebuild | Identical algorithm | High |
| PipelineOwner flush pipeline | flushLayout, flushPaint | Simplified but correct | Medium-High |
| FrameScheduler 4-phase pipeline | Similar to SchedulerBinding | Named phases with callbacks | High |
| Key-based reconciliation | GlobalKey, ValueKey | Key base class, equality | Medium |
| ParentData system | FlexParentData, BoxParentData | Present, slightly simplified | Medium |
| MediaQuery for screen dimensions | MediaQueryData via InheritedWidget | Identical pattern | High |

### What Diverges

| Concept | Flutter | Flitter | Reason |
|---------|---------|---------|--------|
| RelayoutBoundary | Incremental re-layout from boundary | Always from root | TUI trees are shallow |
| RepaintBoundary / compositing layers | Layer tree for partial repaint | Full repaint to buffer | Double-buffering handles it |
| Hit testing | RenderObject.hitTest() tree walk | No hit testing (MouseManager uses rect-based approach) | Focus-driven input model |
| `sizedByParent` / `performResize()` | Separate intrinsic-size path | Collapsed into performLayout() | Simplification |
| `layout(constraints, {parentUsesSize})` | Second param for dependency tracking | Single-param layout() | No relayout boundary |
| Offset in BoxParentData | Standard Flutter pattern | Offset stored directly on RenderBox | Matches Amp binary |
| Child model | Linked list (firstChild/nextSibling) | Array (_children[]) | Simpler, sufficient for TUI |
| Coordinate system | Floating-point logical pixels | Integer terminal cells | Terminal cells are discrete |
| deactivate() / GlobalKey reparent | Element can be deactivated, reactivated | No deactivate; unmount is final | Amp simplification |
| Compositing / Layer painting | OffsetLayer, ClipRectLayer, etc. | Direct paint to screen buffer | No compositing needed |
| Accessibility | SemanticsNode tree | None | TUI is inherently text-based |
| Animation framework | AnimationController, Tween, Curves | Minimal (timer-based in DensityOrb) | Limited animation needs |

### Assessment of Divergences

The divergences fall into two categories:

**Justified simplifications**: RelayoutBoundary, RepaintBoundary, compositing layers, `sizedByParent`, accessibility, and the linked-list child model are all optimizations or features that serve GUI needs but add complexity without benefit in a TUI context. These are wise omissions.

**Potential limitations**: The absence of `deactivate()`, `didChangeDependencies()`, and proper hit testing may limit the framework as it grows. If the TUI needs to support complex widget reparenting (e.g., drag-and-drop of panels) or mouse-driven spatial interactions beyond basic click regions, these missing pieces would need to be added.

---

## 12. Overall Assessment of Code Quality and Maintainability

### Code Quality: Strong

The codebase demonstrates high code quality across several dimensions:

- **Consistent naming conventions**: TypeScript strict mode, clear class names, descriptive method names.
- **Architectural discipline**: The anti-drift rule in CLAUDE.md ("every implementation must faithfully reproduce the Amp architecture") is evidently enforced throughout.
- **Documentation**: Amp reference comments appear on virtually every significant method. The `.reference/` directory provides structured architectural documentation.
- **Type safety**: Despite the `any` holes noted above, the vast majority of the codebase is well-typed with discriminated unions (InputEvent, ConversationItem), generic State<T>, and proper interface contracts.
- **Error handling**: Per-callback and per-element error isolation prevents cascading failures.
- **Testing**: Comprehensive test suites with specialized test utilities.

### Maintainability: Good with Caveats

**Strengths for maintainability**:
- The two-package structure makes it clear where changes should go.
- The Flutter-based architecture is well-documented externally, so new contributors familiar with Flutter can orient quickly.
- The Amp reference comments create a traceable audit trail.
- The three-tree model provides clear separation of configuration (widgets), lifecycle (elements), and rendering (render objects).

**Risks for maintainability**:
- The singleton-heavy design means changes to global state management affect the entire system.
- The `require()` lazy imports for circular dependencies create non-obvious coupling.
- The `any` types at architectural boundaries mean certain bugs will only surface at runtime.
- The mutable-object-in-array pattern in ConversationState could cause subtle bugs if the threading model ever changes.

### Overall Rating

This is a well-executed, architecturally sound reverse-engineering project. The decision to faithfully reproduce Flutter's three-tree model for a terminal UI framework was ambitious but has proven to be a strong foundation. The codebase successfully balances fidelity to the original Amp binary with pragmatic simplifications appropriate for the terminal context. The 40+ widget catalog, the comprehensive input pipeline, the double-buffered rendering system, and the ACP protocol integration together constitute a production-quality terminal UI framework with a working application built on top of it.

The primary areas for future improvement are: (1) reducing the `any` type usage at framework boundaries, (2) addressing the singleton coupling if multi-instance support becomes needed, (3) adding the missing lifecycle methods (`didChangeDependencies`, `deactivate`) if widget complexity grows, and (4) introducing an `ErrorWidget` fallback pattern for build-time errors.

---

## Appendix: Key File Reference

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/widget.ts` | Widget, StatelessWidget, StatefulWidget, State, InheritedWidget |
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts` | Element tree, reconciliation, BuildContextImpl |
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/render-object.ts` | RenderObject, RenderBox, ContainerRenderBox, widget bridges |
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/binding.ts` | WidgetsBinding singleton, runApp, 4-phase pipeline wiring |
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/build-owner.ts` | BuildOwner dirty element tracking, depth-sorted rebuild |
| `/home/gem/workspace/flitter/packages/flitter-core/src/framework/pipeline-owner.ts` | PipelineOwner layout/paint scheduling |
| `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/frame-scheduler.ts` | FrameScheduler 4-phase execution, coalescing, pacing |
| `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/screen-buffer.ts` | Double-buffered cell grid, diff computation |
| `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/renderer.ts` | ANSI escape sequence generation |
| `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/terminal-manager.ts` | Terminal initialization, raw mode, mouse, resize |
| `/home/gem/workspace/flitter/packages/flitter-core/src/input/input-parser.ts` | Raw byte to InputEvent parsing |
| `/home/gem/workspace/flitter/packages/flitter-core/src/input/event-dispatcher.ts` | Event routing singleton |
| `/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts` | FocusNode, FocusScopeNode, FocusManager |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/index.ts` | Application entry point |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | Root App widget, overlay system, keyboard shortcuts |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts` | Central application state, ClientCallbacks |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts` | Conversation item management, streaming state |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/connection.ts` | ACP connection establishment |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/client.ts` | FlitterClient, ClientCallbacks interface |
