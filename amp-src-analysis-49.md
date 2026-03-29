# Analysis 49: Event System -- Input Events, Dispatch Pipeline, Focus Management, and Hit Testing

## 1. Event Type Hierarchy

The event type system is defined in `/home/gem/workspace/flitter/packages/flitter-core/src/input/events.ts` using a discriminated union pattern. All terminal input flows through a single `InputEvent` union type, narrowed by the `type` field.

### 1.1 Core Event Interfaces

**KeyEvent** -- Keyboard input from escape sequence parsing:
```ts
interface KeyEvent {
  readonly type: 'key';
  readonly key: string;        // Logical key name: "ArrowUp", "Enter", "a", "Escape", "f1"
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly sequence?: string;  // Raw escape sequence that produced this event
}
```

**MouseEvent** -- SGR mouse protocol events:
```ts
interface MouseEvent {
  readonly type: 'mouse';
  readonly action: 'press' | 'release' | 'move' | 'scroll';
  readonly button: number;     // 0=left, 1=middle, 2=right, 64=scrollUp, 65=scrollDown
  readonly x: number;          // Column, 0-based
  readonly y: number;          // Row, 0-based
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}
```

**ResizeEvent** -- Terminal window resize (SIGWINCH):
```ts
interface ResizeEvent {
  readonly type: 'resize';
  readonly width: number;
  readonly height: number;
}
```

**FocusEvent** -- Terminal focus tracking (enabled via `\x1b[?1004h`):
```ts
interface FocusEvent {
  readonly type: 'focus';
  readonly focused: boolean;
}
```

**PasteEvent** -- Bracketed paste content:
```ts
interface PasteEvent {
  readonly type: 'paste';
  readonly text: string;
}
```

### 1.2 Discriminated Union and Result Type

All five interfaces form the union:
```ts
type InputEvent = KeyEvent | MouseEvent | ResizeEvent | FocusEvent | PasteEvent;
```

The `KeyEventResult` type controls event propagation:
```ts
type KeyEventResult = 'handled' | 'ignored';
```

Returning `'handled'` from any key event handler stops further propagation. Returning `'ignored'` allows the event to bubble up or continue to the next handler in the chain.

### 1.3 Factory Helpers

Each event type has a corresponding factory function (`createKeyEvent`, `createMouseEvent`, `createResizeEvent`, `createFocusEvent`, `createPasteEvent`) that provides sensible defaults for modifier flags. For example, `createKeyEvent('a')` produces an event with all modifiers set to `false`.

---

## 2. EventDispatcher Architecture

The `EventDispatcher` in `/home/gem/workspace/flitter/packages/flitter-core/src/input/event-dispatcher.ts` is a singleton that serves as the central routing hub for all parsed input events. It corresponds to the Amp `Pg` class.

### 2.1 Singleton Pattern

```ts
class EventDispatcher {
  private static _instance: EventDispatcher | null = null;
  static get instance(): EventDispatcher { ... }
  static reset(): void { ... }  // For testing
}
```

### 2.2 Handler Registries

The dispatcher maintains six separate handler collections:

| Registry | Type | Purpose |
|----------|------|---------|
| `_keyInterceptors` | `KeyHandler[]` | Global shortcuts that run BEFORE focus dispatch |
| `_keyHandlers` | `KeyHandler[]` | Fallback key handlers that run AFTER focus dispatch |
| `_mouseHandlers` | `MouseHandler[]` | Mouse position tracking and action dispatch |
| `_resizeHandlers` | `ResizeHandler[]` | Terminal resize listeners |
| `_globalReleaseCallbacks` | `Set<(event: MouseEvent) => void>` | Drag operation completion callbacks |
| `_focusHandlers` | `((event: FocusEvent) => void)[]` | Application-level terminal focus tracking |
| `_pasteHandlers` | `((event: PasteEvent) => void)[]` | Fallback paste handlers (when no FocusManager) |

### 2.3 Main Dispatch Method

The `dispatch(event: InputEvent)` method uses a switch on `event.type` to route to type-specific dispatch methods. This is where the discriminated union pattern pays off -- the TypeScript compiler can narrow the type in each case branch.

### 2.4 Key Event Dispatch Pipeline

The `dispatchKeyEvent` method implements a three-stage pipeline:

```
Stage 1: Key Interceptors       (global shortcuts like Ctrl+C)
    |  if 'handled' -> STOP
    v
Stage 2: FocusManager dispatch   (focus tree bubbling)
    |  if 'handled' -> STOP
    v
Stage 3: Registered key handlers  (fallback handlers)
    |  if 'handled' -> STOP
    v
Return 'ignored'
```

The FocusManager integration uses a lazy `require('./focus')` to avoid circular dependency issues. If the FocusManager singleton is not yet initialized, the stage is silently skipped.

### 2.5 Mouse Event Dispatch

Mouse dispatch has two stages:

1. **Release callbacks**: If the event action is `'release'`, all global release callbacks in `_globalReleaseCallbacks` are fired. This supports drag-and-drop operations where a widget (e.g., `TextField`) registers a global release callback to detect when the user releases the mouse anywhere on screen.

2. **Mouse handlers**: All registered mouse handlers are called sequentially.

### 2.6 Paste Event Dispatch

Paste dispatch tries the FocusManager first (routing to the focused node's `onPaste` handler), then falls back to registered paste handlers.

---

## 3. Focus Tree Structure

The focus system in `/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts` implements a tree of focus nodes that mirrors the widget tree's focus-relevant portions. It consists of three classes: `FocusNode`, `FocusScopeNode`, and `FocusManager`.

### 3.1 FocusNode (Amp: D9)

Each `FocusNode` is a participant in the focus tree with the following structure:

**Tree links:**
- `_parent: FocusNode | null` -- parent in the focus tree
- `_children: FocusNode[]` -- child nodes

**State:**
- `_hasPrimaryFocus: boolean` -- true if THIS node is the single primary focused node
- `_canRequestFocus: boolean` -- whether focus can be requested on this node
- `_skipTraversal: boolean` -- whether Tab/Shift+Tab skip this node
- `_disposed: boolean` -- lifecycle flag

**Handlers:**
- `onKey: ((event: KeyEvent) => KeyEventResult) | null` -- primary key handler
- `onPaste: ((text: string) => void) | null` -- paste handler
- `_keyHandlers: Array<...>` -- additional key handlers (multiple per node)

**Listeners:**
- `_listeners: Array<() => void>` -- focus change callbacks

Key behavioral distinction: `hasPrimaryFocus` returns true only if THIS specific node is the primary focus, while `hasFocus` recursively checks whether this node OR any descendant has primary focus. This distinction enables parent scope nodes to react when any child gains/loses focus.

### 3.2 FocusScopeNode

`FocusScopeNode` extends `FocusNode` with scope management:

```ts
class FocusScopeNode extends FocusNode {
  private _focusedChild: FocusNode | null = null;

  get focusedChild(): FocusNode | null { ... }
  autofocus(node: FocusNode): void { ... }
  _setFocusedChild(node: FocusNode): void { ... }
}
```

The `_focusedChild` tracks which descendant within this scope currently has focus. When `requestFocus()` is called on a `FocusNode`, it walks up the tree to find the nearest ancestor `FocusScopeNode` and updates its `_focusedChild` via `_setFocusedChild`. The `autofocus` method validates that the target node is a descendant before delegating to `requestFocus`.

### 3.3 FocusManager (Amp: er) -- Singleton

The `FocusManager` is the global singleton that owns the root of the focus tree:

```ts
class FocusManager {
  readonly rootScope: FocusScopeNode;  // "Root Focus Scope"

  get primaryFocus(): FocusNode | null { ... }
  registerNode(node, parent): void { ... }
  unregisterNode(node): void { ... }
  dispatchKeyEvent(event): KeyEventResult { ... }
  dispatchPasteEvent(text): void { ... }
  getTraversableNodes(): FocusNode[] { ... }
}
```

The `rootScope` is created in the constructor as a `FocusScopeNode` with the debug label `'Root Focus Scope'`. All focus nodes must ultimately be descendants of this root scope.

**primaryFocus**: Found by DFS traversal from `rootScope`, looking for the node where `hasPrimaryFocus === true`. There is at most one such node at any time.

**registerNode**: Attaches a node to the given parent, or to `rootScope` if no parent is specified.

---

## 4. Event Bubbling and Handling

### 4.1 Key Event Bubbling

The core bubbling algorithm in `FocusManager.dispatchKeyEvent`:

```ts
dispatchKeyEvent(event: KeyEvent): KeyEventResult {
  let node: FocusNode | null = this.primaryFocus;
  while (node !== null) {
    const result = node.handleKeyEvent(event);
    if (result === 'handled') return 'handled';
    node = node.parent;
  }
  return 'ignored';
}
```

This walks from the primary focus node up to the root, calling `handleKeyEvent` at each level. The first handler to return `'handled'` terminates propagation.

### 4.2 Per-Node Key Handling

Within a single `FocusNode`, `handleKeyEvent` checks handlers in order:

1. The `onKey` handler (single primary handler)
2. Each handler in the `_keyHandlers` array (additional registered handlers)

If any returns `'handled'`, the method immediately returns `'handled'`.

### 4.3 Paste Event Bubbling

Paste events bubble similarly but use a simpler model -- they walk up from `primaryFocus` looking for the first node with a non-null `onPaste` handler:

```ts
dispatchPasteEvent(text: string): void {
  let node: FocusNode | null = this.primaryFocus;
  while (node !== null) {
    if (node.onPaste !== null) {
      node.onPaste(text);
      return;
    }
    node = node.parent;
  }
}
```

### 4.4 Focus Change Notification

When focus changes (via `requestFocus` or `unfocus`), listeners are notified up the tree:

1. `_notifyListenersUpTree()` on the affected node fires all its own `_listeners`
2. Then calls `_notifyAncestorListeners()` on the parent
3. `_notifyAncestorListeners()` recursively notifies each ancestor's listeners up to the root

This ensures that any ancestor scope can detect when its subtree's focus state changes, enabling the `hasFocus` reactive pattern.

---

## 5. Interceptor Pattern

### 5.1 Key Interceptors

Key interceptors are registered via `EventDispatcher.addKeyInterceptor` and execute **before** the focus system sees the event. They have the same `KeyHandler` signature:

```ts
type KeyHandler = (event: KeyEvent) => KeyEventResult;
```

If any interceptor returns `'handled'`, the event never reaches the focus tree or fallback handlers.

### 5.2 Default Ctrl+C Interceptor

The `WidgetsBinding.setupEventHandlers()` registers a default Ctrl+C interceptor:

```ts
dispatcher.addKeyInterceptor((event) => {
  if (event.key === 'c' && event.ctrlKey) {
    process.exit(0);
  }
  return 'ignored';
});
```

Because this returns `'ignored'` for non-Ctrl+C keys, it acts as a transparent pass-through for all other events. Application-level widgets can register their own interceptor that returns `'handled'` for Ctrl+C before this one runs, effectively overriding the default behavior.

### 5.3 Interceptor vs. Handler Ordering

The full key event priority chain is:

```
1. EventDispatcher._keyInterceptors  (global interceptors -- Ctrl+C, etc.)
2. FocusManager.dispatchKeyEvent     (focus tree: primary focus -> ancestors)
3. EventDispatcher._keyHandlers      (fallback handlers)
```

This design ensures that critical global shortcuts (safety exits, debug toggles) always have first priority, while widget-specific handlers participate in the focus-aware bubbling system, and fallback handlers catch anything unhandled.

---

## 6. Mouse Hit Testing

Mouse hit testing is implemented in two complementary systems.

### 6.1 Generic Hit Test Module

`/home/gem/workspace/flitter/packages/flitter-core/src/input/hit-test.ts` provides a general-purpose `hitTest(root, x, y)` function that returns a `HitTestResult` containing a `path` from deepest to shallowest render objects at the given screen coordinate.

**Algorithm:**
1. Start at the root `RenderObject`
2. Compute screen-space bounds by accumulating `offset.col` and `offset.row` from parent offsets
3. Check if the point falls within the node's `size` bounds via `hitTestSelf()`
4. Recurse into children in **reverse order** (last-painted = front-most checked first)
5. For `ContainerRenderBox`, only the first (front-most) hit child is taken (`break` after first hit)
6. Build path from deepest hit to root

The result `path` is ordered deepest-first, which naturally supports z-ordering -- the first entry is the topmost visible widget at that position.

### 6.2 MouseManager Hit Testing

The `MouseManager` in `/home/gem/workspace/flitter/packages/flitter-core/src/input/mouse-manager.ts` implements its own specialized hit-test traversal (`_hitTest`) that is focused specifically on `RenderMouseRegion` instances rather than all render objects.

**Key differences from the generic hit-test module:**

- **Targets**: Only collects `RenderMouseRegion` instances, not all render objects
- **Opaque blocking**: Respects `RenderMouseRegion.opaque` to prevent hit detection of regions behind opaque ones
- **DFS depth tracking**: Each hit entry records its DFS `depth` for z-ordering
- **Reverse-order traversal**: Children are visited back-to-front (index `length-1` to `0`), so the topmost child in z-order is checked first. If an opaque child is hit, siblings behind it are skipped.

### 6.3 Hover State Management

The `reestablishHoverState()` method is called as a post-frame callback (after layout+paint) to synchronize hover state with the current layout:

1. Re-run `_hitTest` at the last known mouse position
2. Unregister regions that are no longer under the cursor (fire `'exit'` events)
3. Register newly hit regions (fire `'enter'` events), sorted by DFS depth (shallowest first, deepest last)

The sorting ensures that when iterating `_hoveredRegions` in `updateCursor()`, the last region with a `cursor` property wins -- which is the deepest (most specific) region, matching z-order expectations.

### 6.4 Mouse Action Dispatch

The `dispatchMouseAction(action, x, y, button)` method handles non-move actions (scroll, press, release):

1. Hit-test at `(x, y)` to collect all `RenderMouseRegion` instances
2. Sort entries by depth
3. For the given action, iterate from **deepest to shallowest**, looking for the first region with the matching handler:
   - `'scroll'` looks for `onScroll`
   - `'press'` looks for `onClick`
   - `'release'` looks for `onRelease`
4. Dispatch to the first matching region and stop

This implements the "deepest handler wins" pattern -- only the most specific (front-most) widget with a matching handler receives the event.

---

## 7. Focus Traversal (Tab / Shift+Tab)

### 7.1 Collecting Traversable Nodes

`FocusManager.getTraversableNodes()` performs a DFS from the root scope:

```ts
private _collectTraversable(node: FocusNode, result: FocusNode[]): void {
  if (node !== this.rootScope && node.canRequestFocus && !node.skipTraversal) {
    result.push(node);
  }
  for (const child of node.children) {
    this._collectTraversable(child, result);
  }
}
```

A node is traversable if:
- It is NOT the root scope itself
- `canRequestFocus === true`
- `skipTraversal === false`

The result is a flat array in DFS order, which provides a natural visual ordering for Tab traversal (top-to-bottom, left-to-right, following the widget tree structure).

### 7.2 Navigation Methods

`FocusNode.nextFocus()` and `FocusNode.previousFocus()` implement wrapping traversal:

```ts
nextFocus(): boolean {
  const traversable = FocusManager.instance.getTraversableNodes();
  const currentIndex = traversable.indexOf(this);
  if (currentIndex === -1) {
    traversable[0].requestFocus();  // Not in list -- focus first
  } else {
    const nextIndex = (currentIndex + 1) % traversable.length;  // Wrap around
    traversable[nextIndex].requestFocus();
  }
  return true;
}
```

`previousFocus()` works identically but uses `(currentIndex - 1 + traversable.length) % traversable.length` for reverse wrapping.

If the current node is not in the traversable list (e.g., it has `skipTraversal: true` or was removed), `nextFocus` jumps to the first traversable node, while `previousFocus` jumps to the last.

---

## 8. How FocusScope Widget Connects to the Focus System

The `FocusScope` widget in `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/focus-scope.ts` is the bridge between the widget tree and the focus tree. It is a `StatefulWidget` whose state manages a `FocusNode`'s lifecycle.

### 8.1 Widget Configuration

```ts
class FocusScope extends StatefulWidget {
  readonly focusNode?: FocusNode;     // External node (optional)
  readonly child: Widget;
  readonly autofocus: boolean;         // Request focus on mount
  readonly canRequestFocus: boolean;   // Whether the node can be focused
  readonly skipTraversal: boolean;     // Skip in Tab traversal
  readonly onKey?: (event: KeyEvent) => KeyEventResult;
  readonly onPaste?: (text: string) => void;
  readonly onFocusChange?: (hasFocus: boolean) => void;
  readonly debugLabel?: string;
}
```

### 8.2 State Lifecycle

**initState:**
1. `_createOrAttachNode()` -- If no external `focusNode` was provided, creates an internal `FocusNode` with the widget's configuration
2. `_setupHandlers()` -- Wires `onKey`, `onPaste` handlers onto the effective focus node and registers a focus change listener
3. `_registerNode()` -- Walks up the element tree via `context.findAncestorStateOfType(FocusScopeState)` to find the parent focus node, then calls `FocusManager.instance.registerNode(effectiveFocusNode, parentFocusNode)`
4. **Autofocus** -- If `autofocus: true`, schedules `requestFocus()` via `queueMicrotask`. The microtask delay ensures the full widget tree is mounted before focus is requested.

**didUpdateWidget:**
Handles three scenarios when the widget configuration changes:
- External node changed: detaches listener from old node, sets up new one
- Switched from owned to external node: disposes the owned node
- Switched from external to owned node: creates a new internal node
- Same node, different properties: updates `canRequestFocus`, `skipTraversal`, `onKey`, `onPaste`

**dispose:**
1. Removes the focus change listener
2. Unregisters from `FocusManager`
3. Disposes the owned `FocusNode` (if internally created)

### 8.3 Behavior-Only Widget

The `build` method simply returns `this.widget.child` -- `FocusScope` adds no visual elements. It is purely a behavioral wrapper that injects a `FocusNode` into the focus tree at the corresponding position in the widget tree.

### 8.4 Parent Focus Node Discovery

The `_registerNode` method performs ancestor discovery:

```ts
private _registerNode(): void {
  let parentFocusNode: FocusNode | null = null;
  const ctx = this.context as any;
  if (typeof ctx.findAncestorStateOfType === 'function') {
    const ancestorState = ctx.findAncestorStateOfType(FocusScopeState);
    if (ancestorState && ancestorState instanceof FocusScopeState) {
      parentFocusNode = ancestorState.effectiveFocusNode;
    }
  }
  FocusManager.instance.registerNode(this.effectiveFocusNode, parentFocusNode);
}
```

This mirrors Flutter's approach: the widget tree structure implicitly defines the focus tree structure. Nested `FocusScope` widgets create a parent-child relationship in the focus tree. If no ancestor `FocusScopeState` is found, the node is registered under the root scope.

### 8.5 Focus Change Tracking

The `_onFocusChanged` listener detects transitions in `hasFocus` (which includes descendant focus):

```ts
private _onFocusChanged = (): void => {
  if (!this.mounted) return;
  const hasFocus = this.effectiveFocusNode.hasFocus;
  if (hasFocus !== this._hadFocus) {
    this._hadFocus = hasFocus;
    this.widget.onFocusChange?.(hasFocus);
  }
};
```

This fires only on actual transitions, not on every notification. The `hasFocus` check (not `hasPrimaryFocus`) means a parent scope's `onFocusChange` fires when ANY descendant gains or loses focus.

---

## 9. End-to-End Event Flow

### 9.1 Complete Key Press Pipeline

Here is the complete path a key press takes from raw terminal bytes to a widget handler:

```
stdin (raw bytes)
  |
  v
TerminalManager.onInput(data: Buffer)          [binding.ts:813]
  |
  v
InputParser.feed(data)                          [input-parser.ts:77]
  |  (state machine: Idle -> Escape -> CSI/SS3 -> resolve)
  v
InputParser._callback(event: InputEvent)        [input-parser.ts:639]
  |
  v
EventDispatcher.dispatch(event)                 [event-dispatcher.ts:176]
  |  (switch on event.type -> dispatchKeyEvent)
  v
EventDispatcher.dispatchKeyEvent(event)         [event-dispatcher.ts:206]
  |
  |  Stage 1: _keyInterceptors (Ctrl+C, global shortcuts)
  |    if 'handled' -> STOP
  |
  |  Stage 2: FocusManager.instance.dispatchKeyEvent(event)
  |    |  Walk from primaryFocus to root:
  |    |    node.handleKeyEvent(event)
  |    |      -> node.onKey(event)        -- primary handler
  |    |      -> node._keyHandlers[i](event) -- additional handlers
  |    |    if 'handled' -> STOP
  |    |    node = node.parent            -- bubble up
  |
  |  Stage 3: _keyHandlers (fallback)
  |    if 'handled' -> STOP
  |
  v
Return 'ignored' (unhandled)
```

### 9.2 Complete Mouse Event Pipeline

```
stdin (raw bytes)
  |
  v
InputParser.feed(data)
  |  (SGR mouse: ESC [ < button ; col ; row M|m)
  v
EventDispatcher.dispatch(mouseEvent)
  |
  v
EventDispatcher.dispatchMouseEvent(event)
  |
  |  Stage 1: Global release callbacks (if action === 'release')
  |
  |  Stage 2: Registered mouse handlers
  |    -> MouseManager.updatePosition(x, y)
  |    -> if action in {scroll, press, release}:
  |         MouseManager.dispatchMouseAction(action, x, y, button)
  |           |  Hit-test render tree for RenderMouseRegion instances
  |           |  Sort by depth, find deepest with matching handler
  |           |  Dispatch to that region's callback
  |
  v  (end of frame)

WidgetsBinding render-phase callback:
  -> MouseManager.reestablishHoverState()
       |  Re-run hit-test at last position
       |  Fire enter/exit events for changed regions
       |  Update cursor shape
```

---

## 10. Code Patterns and Observations

### 10.1 Singleton Consistency

All three managers (`EventDispatcher`, `FocusManager`, `MouseManager`) follow the same singleton pattern with a static `_instance` field, a `get instance()` accessor that creates on first access, and a `reset()` method for test cleanup. The `WidgetsBinding` itself is also a singleton. This four-singleton architecture mirrors the Amp original (`Pg`, `er`, and `J3`).

### 10.2 Lazy Require for Circular Dependencies

The `EventDispatcher.dispatchKeyEvent` method uses `require('./focus')` inside a try-catch to access `FocusManager`, rather than a top-level import. This breaks a potential circular dependency: `EventDispatcher` needs `FocusManager` for dispatch, but `FocusManager` imports types from `events.ts` (which is a sibling module). The dynamic require ensures the focus module is loaded only when actually needed.

### 10.3 Two Hit-Test Implementations

There are two separate hit-test implementations:
- `hit-test.ts`: A generic module that builds a path of `HitTestEntry` objects from any `RenderObject` tree, returning `{renderObject, localX, localY}` tuples. This is a general-purpose utility.
- `MouseManager._hitTest`: A specialized traversal that only collects `RenderMouseRegion` instances and supports opaque blocking.

The generic `hitTest` from `hit-test.ts` does not appear to be used by the mouse system directly -- `MouseManager` has its own inline traversal. This separation may reflect the Amp original's architecture or may be intended for future use (e.g., accessibility hit testing).

### 10.4 Opaque Region Blocking

The `RenderMouseRegion.opaque` flag (default `true`) implements visual z-order for mouse events. When an opaque region is hit during the back-to-front DFS traversal, all siblings behind it (lower z-order) are skipped. This prevents click-through to obscured widgets, matching expected UI behavior where a dialog overlay blocks interaction with content beneath it.

### 10.5 Event Handler Multiplicity on FocusNode

A `FocusNode` supports both a single `onKey` handler (set directly) and an array of `_keyHandlers` (added via `addKeyHandler`). The `onKey` handler is checked first. This dual-handler approach allows the `FocusScope` widget to set the primary handler via its `onKey` prop, while other code (e.g., keyboard shortcuts, mixins) can attach additional handlers without replacing the primary one.

### 10.6 Focus Notification Direction

Focus notifications propagate **upward** from the changed node to the root. When a node gains or loses primary focus:
1. Its own listeners fire (via `_notifyListenersUpTree`)
2. Its parent's listeners fire (via `_notifyAncestorListeners`)
3. This continues recursively up to the root

This bottom-up notification model is essential for the `hasFocus` pattern. A `FocusScopeNode` at any level can listen for changes and know whether its subtree contains the focused node, without the FocusManager explicitly maintaining and updating a "focus path" data structure.

### 10.7 Autofocus via Microtask

The `FocusScopeState.initState` schedules autofocus via `queueMicrotask` rather than calling `requestFocus()` synchronously. This is critical because during `initState`, the widget tree may not be fully built. The microtask executes after the current synchronous build phase completes, ensuring that all sibling and child focus nodes are registered before focus is claimed.

### 10.8 Mouse Event Type Mapping

There is an interesting asymmetry in the mouse event naming between the terminal-level `MouseEvent.action` and the widget-level `MouseEventType`:
- Terminal level: `'press'`, `'release'`, `'move'`, `'scroll'`
- Widget level: `'click'`, `'release'`, `'drag'`, `'enter'`, `'exit'`, `'hover'`, `'scroll'`

The `MouseManager.dispatchMouseAction` maps `'press'` to `'click'` when dispatching to `RenderMouseRegion`. The `'enter'`/`'exit'` events are synthesized by the hover state management system, not from raw terminal events. The `'drag'` and `'hover'` types are available but are handled through the continuous position tracking rather than the action dispatch path.

### 10.9 Global Release Callbacks for Drag

The `EventDispatcher._globalReleaseCallbacks` Set provides a mechanism for widgets to detect mouse release events regardless of cursor position. This is essential for drag operations: when a user starts dragging in a text field and releases the mouse outside the field's bounds, the release callback still fires. Without this, the text field would never know the drag ended.

### 10.10 Cursor Shape Resolution

Cursor shape is determined by a last-writer-wins iteration over `_hoveredRegions`. Since `reestablishHoverState` adds regions sorted by depth (shallowest first), and `updateCursor` iterates the Set in insertion order, the deepest (most specific) region with a `cursor` property wins. A `_cursorOverride` field allows non-MouseRegion render objects (e.g., hyperlinks in `RenderText`) to force a specific cursor shape.

### 10.11 Defensive Coding in FocusScopeState

The `_registerNode` method guards against mock contexts in tests by checking for `findAncestorStateOfType` before calling it:

```ts
const ctx = this.context as any;
if (typeof ctx.findAncestorStateOfType === 'function') { ... }
```

This is a practical concession to testability -- unit tests may provide minimal mock contexts that lack the full `BuildContext` API.

### 10.12 Clean Disposal Semantics

`FocusNode.dispose()` is thorough:
1. Clears primary focus if held
2. Detaches from parent
3. Detaches all children (using spread to avoid mutation during iteration)
4. Nulls out handlers
5. Clears handler and listener arrays

This prevents dangling references and ensures that disposed nodes cannot accidentally receive or handle events.
