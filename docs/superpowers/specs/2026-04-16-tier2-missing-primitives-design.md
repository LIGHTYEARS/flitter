# Tier 2: Missing Framework Primitives — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Goal:** Implement all 10 missing framework primitives that block real application development, organized in 3 dependency-ordered waves.

---

## Context

Tier 1 (foundational correctness — 8 tasks) is complete. Flitter's TUI framework has correct layout/paint pipelines, proper lifecycle guards, and a working mouse dispatch system.

Tier 2 addresses **absent subsystems**: the Focus/keyboard system, Actions/Intents/Shortcuts, ancestor traversal, text rendering features, intrinsic sizing, clipping, and scrollable integration. These are the primitives required to build a real keyboard-navigable TUI application.

All designs in this spec cross-reference the amp reversed source in `amp-cli-reversed/`.

---

## Wave Structure

```
Wave 1: Tree primitives + Layout/Text (7 items, fully parallelizable)
  ├─ 1.1 findAncestorWidgetOfType / findAncestorStateOfType
  ├─ 1.2 FocusNode.addKeyHandler / removeKeyHandler
  ├─ 1.3 ClipBox widget
  ├─ 1.4 Text alignment / overflow / maxLines
  ├─ 1.5 Text intrinsic sizes on RenderParagraph
  ├─ 1.6 Flex intrinsic sizes
  └─ 1.7 TextSpan hyperlink / onClick

Wave 2: Focus + Keyboard system (3 items, depends on Wave 1)
  ├─ 2.1 Focus widget (depends on 1.1, 1.2)
  ├─ 2.2 Actions widget + Intent + ActionDispatcher
  └─ 2.3 Shortcuts widget + ShortcutManager + KeyActivator (depends on 2.1, 2.2)

Wave 3: Scrollable integration (1 item, depends on Wave 2)
  └─ 3.1 Scrollable StatefulWidget rewrite with Focus/key/mouse wiring
```

---

## Wave 1: Tree Primitives + Layout/Text

All items are independent and touch different files. They can be implemented in parallel.

### 1.1 — `findAncestorWidgetOfType` / `findAncestorStateOfType`

**File:** `packages/tui/src/tree/element.ts`

**Amp reference:** `qm.findAncestorWidgetOfType` in `0537_unknown_qm.js` — walks element parent chain checking `element.widget instanceof T`.

**Design:**

Two new methods on `Element` (which serves as `BuildContext`):

```ts
findAncestorWidgetOfType<T extends Widget>(type: new (...args: any[]) => T): T | null
```
- Walks `_parent` chain
- Checks `current.widget instanceof type`
- Returns the widget cast to `T`, or `null`
- O(depth) — no caching, no dependency registration

```ts
findAncestorStateOfType<T extends State>(type: new (...args: any[]) => T): T | null
```
- Walks `_parent` chain
- Checks if current element is a `StatefulElement` and `current.state instanceof type`
- Returns the state cast to `T`, or `null`

The existing `findAncestorElementOfType` stays unchanged.

**Verification:** Unit tests covering basic lookup, missing ancestor (returns null), and nested widgets.

---

### 1.2 — `FocusNode.addKeyHandler` / `removeKeyHandler`

**File:** `packages/tui/src/focus/focus-node.ts`

**Amp reference:** `l8.addKeyHandler` / `l8.removeKeyHandler` in `2103_unknown_l8.js`

**Design:**

```ts
addKeyHandler(handler: KeyHandler): void
```
- `this._keyHandlers.push(handler)`
- No deduplication (matches amp)

```ts
removeKeyHandler(handler: KeyHandler): void
```
- `const idx = this._keyHandlers.indexOf(handler); if (idx !== -1) this._keyHandlers.splice(idx, 1);`
- Removes first occurrence only (matches amp)

Also add symmetric `addPasteHandler` / `removePasteHandler` following the same pattern.

**Verification:** Unit tests for add/remove lifecycle, multiple handlers, remove-by-reference semantics.

---

### 1.3 — ClipBox Widget

**New file:** `packages/tui/src/widgets/clip-box.ts`

**Amp reference:** `r1T` in `layout_widgets.js` — single-child render object that wraps child painting in a `ClipScreen`.

**Design:**

- `ClipBox`: `SingleChildRenderObjectWidget` that creates `RenderClipBox`
- `RenderClipBox`: single-child `RenderBox`:
  - `performLayout()`: passes constraints to child, takes child's size as own size
  - `performPaint(screen, offsetX, offsetY)`: creates `ClipScreen(screen, offsetX, offsetY, size.width, size.height)`, calls `child.paint(clipScreen, offsetX, offsetY)`

Uses the existing `ClipScreen` class in `packages/tui/src/screen/screen.ts` (already used by viewports).

**Verification:** Unit test for layout pass-through. Visual test: child content wider than ClipBox is not visible beyond bounds.

---

### 1.4 — Text Alignment / Overflow / MaxLines

**File:** `packages/tui/src/widgets/rich-text.ts`

**Amp reference:** `t1T` in `text_rendering.js` — `textAlign`, `overflow`, `maxLines` properties.

**Design:**

New properties on `RichText` widget and `RenderParagraph`:

```ts
textAlign: 'left' | 'center' | 'right'       // default: 'left'
overflow: 'clip' | 'ellipsis' | 'visible'     // default: 'clip'
maxLines?: number                              // undefined = unlimited
```

**`RichText.updateRenderObject`** — must be added (currently missing). Propagates `textAlign`, `overflow`, `maxLines`, and `textSpan` changes to the existing `RenderParagraph`. Without this, dynamic property changes are silently ignored (same bug class as the Flex `updateRenderObject` fixed in Tier 1).

**`RenderParagraph.performLayout`:**
- After line-wrapping, if `maxLines` is set and `lines.length > maxLines`, truncate to `maxLines` lines
- If `overflow === 'ellipsis'`, replace the trailing characters of the last visible line with `…` (ellipsis character or `...`) to fit within `size.width`

**`RenderParagraph.performPaint`:**
- For each line, compute alignment offset:
  - `left`: x offset = 0
  - `center`: x offset = `Math.floor((size.width - lineWidth) / 2)`
  - `right`: x offset = `size.width - lineWidth`
- If `overflow === 'clip'`: wrap screen in `ClipScreen` to hard-clip characters beyond bounds
- If `overflow === 'visible'`: paint without clipping (existing behavior)

**Verification:** Unit tests for each alignment mode. Visual test for ellipsis truncation. Test for `maxLines` capping.

---

### 1.5 — Text Intrinsic Sizes on RenderParagraph

**File:** `packages/tui/src/widgets/rich-text.ts`

**Amp reference:** `t1T.getMinIntrinsicWidth/Height` etc.

**Design:**

Override all 4 intrinsic methods on `RenderParagraph`:

```ts
getMinIntrinsicWidth(height: number): number
```
- Returns the width of the widest non-breakable word/sequence
- Requires splitting text into words at space/punctuation boundaries
- Each word's width = sum of grapheme widths in the word

```ts
getMaxIntrinsicWidth(height: number): number
```
- Returns total width of all glyphs on a single line (no wrapping)

```ts
getMinIntrinsicHeight(width: number): number
```
- Runs the line-wrapping algorithm at the given `width`, returns the number of lines
- Must respect `maxLines` if set

```ts
getMaxIntrinsicHeight(width: number): number
```
- Same as `getMinIntrinsicHeight` for text (text does not expand vertically beyond its wrapped line count)

**Implementation detail:** Extract the existing glyph-collection + line-wrapping logic from `performLayout` into a shared helper `_computeLayout(maxWidth)` that both `performLayout` and intrinsic methods can call.

**Verification:** Unit tests: single-line text intrinsics, multi-line wrapping intrinsics, interaction with `maxLines`.

---

### 1.6 — Flex Intrinsic Sizes

**File:** `packages/tui/src/widgets/flex.ts`

**Amp reference:** `s1T` lines 480-600 in `layout_widgets.js`

**Design:**

Override all 4 intrinsic methods on `RenderFlex`:

For **horizontal** Flex (Row):

```ts
getMinIntrinsicWidth(height: number): number
  // Sum of non-flex children's minIntrinsicWidth
  // Flex children contribute 0 (they can shrink to nothing)

getMaxIntrinsicWidth(height: number): number
  // Sum of ALL children's maxIntrinsicWidth
  // Flex children are measured at their natural (unconstrained) width

getMinIntrinsicHeight(width: number): number
  // Max of all children's minIntrinsicHeight (cross-axis)

getMaxIntrinsicHeight(width: number): number
  // Max of all children's maxIntrinsicHeight (cross-axis)
```

For **vertical** Flex (Column), swap width↔height semantics. The `direction` property determines which axis is main/cross.

**Verification:** Unit tests: Row with mixed flex/non-flex children, Column intrinsics, edge cases (all-flex, no-flex, single child).

---

### 1.7 — TextSpan Hyperlink / onClick

**Files:** `packages/tui/src/widgets/text-span.ts`, `packages/tui/src/widgets/rich-text.ts`

**Amp reference:** `G.hyperlink`, `G.onClick` — TextSpan has URL and tap callback. `t1T` does per-glyph hit-testing.

**Design:**

New properties on `TextSpan`:

```ts
readonly url?: string        // OSC 8 hyperlink URL
readonly onTap?: () => void  // tap callback
```

**OSC 8 hyperlinks:** `TextStyle` gains an optional `url: string` field. During `performPaint`, when painting a glyph sequence with a URL, emit:
- Before: `\x1b]8;;${url}\x07`
- After: `\x1b]8;;\x07`
This makes text clickable in terminals supporting OSC 8 (kitty, iTerm2, WezTerm, etc.).

**`onTap` callbacks:** `RenderParagraph` needs per-glyph hit-testing:
1. Each `LayoutGlyph` stores a reference to its source `TextSpan` (add `span: TextSpan` field to `LayoutGlyph` during glyph collection in `_collectGlyphs`)
2. Add `get isInteractive(): boolean` getter that returns `true` if any span in the tree has `onTap` set
3. When `isInteractive`, `RenderParagraph` overrides `hitTestSelf(x, y)` to return `true` — this makes it participate in the existing `MouseManager` hit-test pipeline
4. `RenderParagraph` implements `handleEvent(event)` — on click events, maps `(event.localX - offsetX, event.localY - offsetY)` to `(lineIndex, columnIndex)`, finds the glyph at that position via `_lines[lineIndex][columnIndex]`, and invokes `glyph.span.onTap?.()` if present

**Verification:** Unit tests for glyph→span lookup. Integration test: TextSpan with onTap receives tap events. OSC 8 output verification via screen buffer inspection.

---

## Wave 2: Focus + Keyboard System

These 3 items form the keyboard dispatch pipeline. They depend on Wave 1 primitives (`findAncestorStateOfType`, `addKeyHandler`).

### 2.1 — Focus Widget

**New file:** `packages/tui/src/widgets/focus.ts`

**Amp reference:** `C8` (widget) + `EtT` (state) in `actions_intents.js:66-134`

**Design:**

```ts
class Focus extends StatefulWidget {
  key?: Key;
  child: Widget;
  focusNode?: FocusNode;     // external, or state creates one internally
  autofocus: boolean;        // default: false
  canRequestFocus: boolean;  // default: true
  skipTraversal: boolean;    // default: false
  onKey?: KeyHandler;
  onPaste?: PasteHandler;
  onFocusChange?: (hasFocus: boolean) => void;
  debugLabel?: string;
}
```

**`FocusState` (matching amp `EtT`):**

- **`get effectiveFocusNode()`**: returns `widget.focusNode ?? _internalFocusNode`

- **`initState()`**:
  1. If no external `widget.focusNode`, create `_internalFocusNode = new FocusNode({ canRequestFocus, skipTraversal, onKey, onPaste, debugLabel })`
  2. If external `focusNode` + `onKey`: call `focusNode.addKeyHandler(onKey)`
  3. If `onPaste`: set `effectiveFocusNode.onPaste = onPaste`
  4. Install `onFocusChange` listener on the node
  5. **Auto-parent**: `context.findAncestorStateOfType(FocusState)?.effectiveFocusNode ?? null`
  6. Call `FocusManager.instance.registerNode(effectiveFocusNode, parentNode)`
  7. If `autofocus`: `queueMicrotask(() => { if (!_isDisposed) effectiveFocusNode.requestFocus() })`

- **`build()`**: returns `widget.child` — purely structural widget

- **`dispose()`**:
  1. If external node + onKey: `focusNode.removeKeyHandler(onKey)`
  2. `FocusManager.instance.unregisterNode(effectiveFocusNode)`
  3. Dispose `_internalFocusNode` if owned

**No `didUpdateWidget`** — matches amp `EtT` exactly. Props are baked at `initState` time.

**FocusScope:** Amp has no separate FocusScope widget. Focus scoping is achieved by the parent-child tree in FocusNode. `FocusManager._rootScope` acts as the implicit root. We follow this same design — no `FocusScope` class needed.

**FocusManager changes:**
- Add `registerNode(node: FocusNode, parentNode: FocusNode | null)` — calls `node._attach(parent ?? _rootScope)`
- Add `unregisterNode(node: FocusNode)` — detaches node, updates focus stack

**Verification:** Unit tests: Focus creates node, auto-parents correctly, autofocus works, dispose cleans up. Integration test: nested Focus widgets form correct parent-child chain, key events bubble.

---

### 2.2 — Actions Widget + Intent + ActionDispatcher

**New files:**
- `packages/tui/src/actions/intent.ts`
- `packages/tui/src/actions/action.ts`
- `packages/tui/src/actions/action-dispatcher.ts`
- `packages/tui/src/actions/actions.ts`

**Amp reference:** `Nt` (Actions widget), `Ww` (ActionsState), `dtT` (ActionDispatcher), `UXT` (Action base), `H8` (Intent base)

**Design:**

```ts
// intent.ts
abstract class Intent {}

// action.ts
abstract class Action<T extends Intent = Intent> {
  isEnabled(intent: T): boolean { return true; }
  abstract invoke(intent: T): 'handled' | 'ignored' | void;
}

// action-dispatcher.ts
class ActionDispatcher {
  invokeAction(intent: Intent, context: BuildContext): unknown | null {
    const result = this.findAction(intent, context);
    if (result && result.enabled) return result.action.invoke(intent);
    return null;
  }
  
  findAction(intent: Intent, context: BuildContext): { action: Action; enabled: boolean } | null {
    // Walk element tree upward from context
    // At each ancestor, check if it's an ActionsState
    // If so, call getActionForIntent(intent)
    // First match wins (nearest ancestor)
  }
}

// actions.ts — the widget
class Actions extends StatefulWidget {
  actions: Map<new (...args: any[]) => Intent, Action<any>>;  // keyed by Intent class
  child: Widget;
  dispatcher?: ActionDispatcher;
  
  // Static helpers:
  static of(context: BuildContext): ActionDispatcher
  static invoke(context: BuildContext, intent: Intent): unknown
  static maybeInvoke(context: BuildContext, intent: Intent): unknown | null
  static find<T extends Intent>(context: BuildContext, intentType: new (...args: any[]) => T): Action<T> | null
}
```

**`ActionsState`:**
- `getActionForIntent(intent)`: returns `this.widget.actions.get(intent.constructor)` — keyed by the Intent's class/constructor
- `build()`: returns `widget.child`

**Action lookup (matching amp `HXT`):**
- `ActionDispatcher.findAction` walks the element tree upward
- At each ancestor element, checks if it has a `state` that is an `ActionsState`
- If so, calls `state.getActionForIntent(intent)`
- Stops at the first match (nearest ancestor Actions widget wins)
- This means Actions widgets can nest — inner ones shadow outer ones for the same Intent type

**Verification:** Unit tests: Action lookup finds nearest ancestor, missing action returns null, `isEnabled` check. Integration test: nested Actions with shadowing.

---

### 2.3 — Shortcuts Widget + ShortcutManager + KeyActivator

**New files:**
- `packages/tui/src/actions/key-activator.ts`
- `packages/tui/src/actions/shortcut-manager.ts`
- `packages/tui/src/actions/shortcuts.ts`
- `packages/tui/src/actions/index.ts`

**Amp reference:** `kc` (widget), `GXT` (state), `CtT` (ShortcutManager), `x0` (KeyActivator) in `actions_intents.js:135-199`, `2105_unknown_CtT.js`, `2104_unknown_x0.js`

**Design:**

```ts
// key-activator.ts
class KeyActivator {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  
  constructor(key: string, modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean; meta?: boolean })
  
  accepts(event: KeyEvent): boolean {
    return normalizeKey(event) === this.key
      && event.shiftKey === this.shift
      && event.ctrlKey === this.ctrl
      && event.altKey === this.alt
      && event.metaKey === this.meta;
  }
  
  // Static factories:
  static key(k: string): KeyActivator      // no modifiers
  static ctrl(k: string): KeyActivator     // ctrl only
  static shift(k: string): KeyActivator    // shift only
  static alt(k: string): KeyActivator      // alt only
}

// shortcut-manager.ts
class ShortcutManager {
  shortcuts: Map<KeyActivator, Intent>;
  
  handleKeyEvent(event: KeyEvent): Intent | null {
    for (const [activator, intent] of this.shortcuts) {
      if (activator.accepts(event)) return intent;  // first match wins
    }
    return null;
  }
}

// shortcuts.ts — the widget
class Shortcuts extends StatefulWidget {
  shortcuts: Map<KeyActivator, Intent>;
  child: Widget;
  manager?: ShortcutManager;    // external, or state creates one
  focusNode?: FocusNode;        // external, or build() wraps in Focus
  debugLabel?: string;
}
```

**`ShortcutsState` (matching amp `GXT`):**

- **`initState()`**:
  1. Create `ShortcutManager` from `widget.shortcuts` (or use `widget.manager`)
  2. If external `focusNode`: call `focusNode.addKeyHandler(this.handleKeyEvent)`

- **`handleKeyEvent`** (arrow function for stable reference):
  ```ts
  handleKeyEvent = (event: KeyEvent): KeyHandlerResult => {
    const intent = this.manager.handleKeyEvent(event);
    if (!intent) return 'ignored';
    const result = this.invokeIntent(intent);
    return result === 'handled' ? 'handled' : 'ignored';
  }
  ```

- **`invokeIntent(intent)`**:
  - Creates `new ActionDispatcher()`
  - Calls `findAction(intent, this.context)`
  - If found and enabled: `action.invoke(intent)` → return `'handled'`

- **`didUpdateWidget(prev)`**: if shortcuts/manager changed, recreate ShortcutManager

- **`build()`**:
  - If external `focusNode`: return `widget.child` (handler already attached)
  - Else: return `new Focus({ onKey: this.handleKeyEvent, child: widget.child })` — wraps in Focus

- **`dispose()`**: remove key handler from external focusNode if applicable

**Full key event dispatch flow:**
```
Terminal keystroke
  → InputParser → KeyEvent
  → FocusManager.handleKeyEvent(event)
  → Bubbles up FocusNode tree (primaryFocus → parent → ... → rootScope)
  → At each FocusNode: iterate _keyHandlers[]
    → ShortcutsState.handleKeyEvent:
      → ShortcutManager matches key combo → Intent
      → ActionDispatcher walks element tree upward
      → Finds nearest ActionsState with matching Action
      → Action.invoke(intent) → "handled" stops bubbling
```

**Verification:** Unit tests: KeyActivator matching, ShortcutManager lookup. Integration test: full pipeline from key event → intent → action invocation. Test that unhandled keys continue bubbling.

---

## Wave 3: Scrollable Integration

Depends on Wave 2 (Focus widget, Actions system).

### 3.1 — Scrollable StatefulWidget Rewrite

**Files:**
- `packages/tui/src/scroll/scrollable.ts` — REWRITE from StatelessWidget to StatefulWidget
- `packages/tui/src/scroll/scroll-behavior.ts` — NEW, replaces `scroll-key-handler.ts`
- `packages/tui/src/scroll/scroll-controller.ts` — ENHANCE with missing methods
- `packages/tui/src/scroll/render-scrollable.ts` — MINOR updates

**Amp reference:** `I1T` (ScrollableState) in `interactive_widgets.js:0-81`, `P1T` (ScrollBehavior) in `2135_unknown_P1T.js`, `Q3` (ScrollController) in `2136_unknown_Q3.js`

**Design:**

#### Scrollable Widget

```ts
class Scrollable extends StatefulWidget {
  controller?: ScrollController;
  axisDirection: 'vertical' | 'horizontal';  // default: 'vertical'
  autofocus: boolean;                        // default: false
  keyboardScrolling: boolean;                // default: true
  viewportBuilder: (context: BuildContext, controller: ScrollController) => Widget;
}
```

#### ScrollableState (matching amp `I1T`)

- **`initState()`**:
  1. Create or adopt `ScrollController`
  2. Add scroll change listener → `setState(() => {})` triggers rebuild
  3. Create `ScrollBehavior` instance

- **`build()`** — composes Focus + MouseRegion + viewport:
  ```ts
  return new Focus({
    autofocus: widget.autofocus,
    onKey: this.handleKeyEvent,
    debugLabel: 'Scrollable',
    child: new MouseRegion({
      onScroll: this.handleMouseScroll,
      opaque: false,
      child: widget.viewportBuilder(context, controller)
    })
  });
  ```

- **`handleKeyEvent`** — delegates to ScrollBehavior:
  ```ts
  handleKeyEvent = (event: KeyEvent): KeyHandlerResult => {
    if (!widget.keyboardScrolling) return 'ignored';
    return scrollBehavior.handleKeyEvent(event);
  }
  ```

- **`handleMouseScroll`** — matching amp `I1T.handleMouseScrollEvent`:
  - Axis-aware: vertical Scrollable handles up/down (or up/down+shift for horizontal)
  - Mouse scroll step = 1 line (amp `I1T` override)
  - Returns `true` if offset changed (consumed), `false` otherwise

- **`dispose()`**: remove listener, dispose internal controller if owned

#### ScrollBehavior (replaces ScrollKeyHandler)

```ts
class ScrollBehavior {
  controller: ScrollController;
  context: BuildContext;
  
  handleKeyEvent(event: KeyEvent): KeyHandlerResult;
  handleScrollDelta(delta: number): void;
}
```

Key bindings (matching amp `P1T`):

| Key | Action |
|-----|--------|
| `ArrowUp` / `k` | scroll up by step (no-op if `maxScrollExtent <= 0`) |
| `ArrowDown` / `j` | scroll down by step |
| `PageUp` / `Ctrl+u` | scroll up by page step |
| `PageDown` / `Ctrl+d` | scroll down by page step |
| `Home` / `g` | scroll to top |
| `End` / `G` (Shift+g) | scroll to bottom |

Step sizes:
- `getScrollStep()`: queries `MediaQuery.capabilitiesOf(context)?.scrollStep ?? 3`
- `getPageScrollStep()`: hardcoded `10` (matching amp)

#### ScrollController Enhancements

New or missing methods to add:

```ts
animateTo(target: number, options?: { duration?: number; curve?: string }): void
```
- Default duration: 150ms
- Frame interval: 16ms (~60fps) via `setInterval`
- Easing curves: `'linear'` (default), `'easeOutCubic'`, `'easeInOutCubic'`
- In-flight retargeting: if already animating, update target without restarting
- Jump threshold: if `|current - target| <= 1`, skip animation

```ts
updateMaxScrollExtent(extent: number): void
```
- Called by viewport render objects during layout
- Notifies listeners on change

Helper methods:
```ts
scrollToTop(): void           // jumpTo(0)
scrollToBottom(): void        // jumpTo(maxScrollExtent)
animatePageUp(vh: number): void   // animateTo(offset - vh)
animatePageDown(vh: number): void // animateTo(offset + vh)
```

Listener snapshot: `_notifyListeners` copies `[...this._listeners]` before iteration to prevent mutation during callbacks.

#### Migration

- `ScrollKeyHandler` → deprecated, replaced by `ScrollBehavior`
- Old `Scrollable` (StatelessWidget) → replaced by new `Scrollable` (StatefulWidget)
- Clean replacement, no backward-compatibility shims (internal project)
- Consumers switch from manual `FocusNode` + `ScrollKeyHandler` wiring to just `Scrollable`

**Verification:** Unit tests: ScrollBehavior key mappings, ScrollController animation, mouse scroll direction handling. Integration test: Scrollable with Focus receives key events and scrolls. tmux E2E: arrow keys scroll content, mouse wheel scrolls, focus indicator visible.

---

## File Organization

```
packages/tui/src/
├── tree/
│   └── element.ts             ← 1.1: +findAncestorWidgetOfType, +findAncestorStateOfType
├── focus/
│   ├── focus-node.ts          ← 1.2: +addKeyHandler, +removeKeyHandler
│   └── focus-manager.ts       ← 2.1: +registerNode, +unregisterNode
├── widgets/
│   ├── rich-text.ts           ← 1.4: +textAlign/overflow/maxLines, 1.5: +intrinsic sizes
│   ├── text-span.ts           ← 1.7: +url, +onTap
│   ├── flex.ts                ← 1.6: +intrinsic size overrides
│   ├── clip-box.ts            ← 1.3: NEW — ClipBox + RenderClipBox
│   └── focus.ts               ← 2.1: NEW — Focus widget + FocusState
├── actions/                   ← 2.2 + 2.3: NEW directory
│   ├── intent.ts              ← Intent base class
│   ├── action.ts              ← Action base class
│   ├── action-dispatcher.ts   ← ActionDispatcher
│   ├── actions.ts             ← Actions widget + ActionsState
│   ├── key-activator.ts       ← KeyActivator
│   ├── shortcut-manager.ts    ← ShortcutManager
│   ├── shortcuts.ts           ← Shortcuts widget + ShortcutsState
│   └── index.ts               ← barrel export
└── scroll/
    ├── scrollable.ts          ← 3.1: REWRITE to StatefulWidget + ScrollableState
    ├── scroll-behavior.ts     ← 3.1: NEW — replaces scroll-key-handler.ts
    ├── scroll-controller.ts   ← 3.1: +animateTo, +updateMaxScrollExtent, +helpers
    └── render-scrollable.ts   ← 3.1: minor updates
```

---

## Testing Strategy

### Per-item tests (co-located `.test.ts`)

Every new class gets unit tests covering:
- Constructor / initialization
- Core API methods
- Edge cases (null, empty, boundary conditions)
- Cleanup / dispose

### Subsystem integration tests

- **Wave 1**: Independent items, no cross-item integration needed
- **Wave 2**: Full keyboard dispatch pipeline test: key event → FocusNode → Shortcuts → ShortcutManager → Intent → ActionDispatcher → Actions → Action.invoke
- **Wave 3**: Scrollable integration: Focus + MouseRegion + ScrollBehavior + ScrollController working together

### tmux E2E verification (mandatory per CLAUDE.md)

After each wave completes:
1. Launch interactive demo via tmux
2. Verify no visual regressions from previous work
3. Wave-specific checks:
   - **Wave 1**: text alignment renders correctly, ClipBox clips content
   - **Wave 2**: keyboard events reach Focus widgets, shortcuts trigger actions
   - **Wave 3**: arrow keys scroll, mouse wheel scrolls, focus moves between scrollables

---

## Risk Assessment

| Item | Risk | Mitigation |
|------|------|------------|
| Focus auto-parenting | Medium — relies on `findAncestorStateOfType` working correctly through the element tree | Wave 1 delivers the traversal method first; Focus widget can't be built until it's verified |
| Actions element-tree traversal | Low — simple upward walk, well-understood pattern | Direct port of amp's `HXT` function |
| Scrollable rewrite | Medium — replaces an existing working system | Keep `RenderScrollable` largely intact; the rewrite is at the widget/state level, not the render object level |
| TextSpan onClick hit-testing | Medium — requires per-glyph position tracking in RenderParagraph | Layout already tracks line/glyph positions; hit-test math is straightforward |
| RichText.updateRenderObject | Low but critical — without it, dynamic text changes are broken | Same pattern as Flex.updateRenderObject fixed in Tier 1 |

---

## Explicitly Deferred

These are **not** in scope for this spec:

- Terminal capability detection (DA2/XTVERSION/XTGETTCAP) — Tier 3
- OSC 52 clipboard — Tier 3
- Table widget, Select/OptionList — Tier 4
- CompositedTransformTarget/Follower — Tier 4
- Text selection hit-testing in RenderParagraph (beyond single-span onTap) — Tier 4
- Word-boundary wrapping (improves text rendering but not blocking) — Tier 4
- Scrollbar drag-to-scroll and sub-character rendering — nice-to-have, can be added incrementally
