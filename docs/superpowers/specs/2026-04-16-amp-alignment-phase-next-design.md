# Flitter-Amp Alignment: Next Phase Design

**Date:** 2026-04-16
**Status:** Draft
**Goal:** Close the most critical gaps between Flitter's TUI framework and amp's reversed implementation, prioritized by impact on correctness and usability.

---

## Context

Flitter's TUI framework has the core three-tree architecture (Widget -> Element -> RenderObject) in place, with basic layout widgets, screen double-buffering, mouse event dispatch, and a frame pipeline. Two major bugs were recently fixed (MouseManager event dispatch and MultiChildRenderObjectElement reconciliation).

A comprehensive gap analysis comparing Flitter against amp's reversed source identified gaps across every subsystem. This design proposes the next phase of work, scoped to what delivers the most value for framework correctness and real-world usability.

---

## Gap Inventory Summary

### Tier 1 — Foundational Correctness (bugs & missing guards)

These are defects in existing code that cause incorrect behavior today:

| Gap | Impact | Amp Reference |
|-----|--------|---------------|
| **Flex has no `updateRenderObject`** — widget rebuilds don't propagate property changes (direction, alignment, mainAxisSize) to the existing RenderFlex | Correctness bug: any dynamic Flex property change is silently ignored | `s1T.updateProperties` in `layout_widgets.js` |
| **RenderObject `markNeedsLayout`/`markNeedsPaint` lack early-exit guards** — already-dirty or detached nodes re-propagate up the tree, O(depth) per call | Performance bug, potential crash on detached nodes | `vH.markNeedsLayout/markNeedsPaint` guards |
| **RenderObject `attach`/`detach` lack idempotency guards** — double-attach/detach recurses unnecessarily | Performance bug, potential state corruption | `vH.attach/detach` guards |
| **RenderObject `dispose` doesn't call `removeFromQueues`** — disposed nodes linger in pipeline layout/paint queues | Crash risk: pipeline tries to layout/paint a disposed node | `vH.dispose → uF().removeFromQueues(this)` |
| **`beginFrame` misses `hasNodesNeedingLayout` check** — frames where layout is dirty but paint isn't yet flagged are skipped | Visual stale-frame bug | `d9.beginFrame` conditions |
| **`paint()` doesn't clear screen buffer** — stale cells from previous frame persist | Ghost artifacts on screen | `d9.paint → screen.clear()` |
| **Resize doesn't call `rootElement.update()`** — new MediaQueryData may not propagate correctly | Resize rendering broken for MediaQuery-dependent widgets | `d9.processResizeIfPending → rootElement.update()` |
| **Depth tracking is eager, no invalidation** — `_depth` goes stale on subtree re-parenting | Build queue ordering can be wrong (sorted by depth) | `vH._invalidateDepth()` cascade |
| **Flex space allocation doesn't use `Math.floor`** — fractional character positions in terminal | Visual misalignment of flex children | `s1T` line 402 |
| **`paint()` offset contract differs from amp** — Flitter passes absolute child position; amp passes parent-accumulated offset | Override confusion for custom render objects | `O9.paint` offset convention |

### Tier 2 — Missing Framework Primitives

These are absent subsystems that block real application development:

| Gap | Impact | Amp Reference |
|-----|--------|---------------|
| **No Focus widget / FocusScope widget** — FocusNode/FocusManager exist but have no widget-tree integration | Can't build keyboard-navigable UIs | `C8` (Focus), `kc` (FocusScope) in `actions_intents.js` |
| **No `addKeyHandler`/`removeKeyHandler` on FocusNode** — handlers only settable at construction | Blocks dynamic key handler registration (used by Focus widget, Shortcuts) | `l8.addKeyHandler/removeKeyHandler` |
| **No Actions/Intents/Shortcuts system** — no Intent, Action, ActionDispatcher, Actions widget, Shortcuts widget | Can't build keyboard shortcut dispatch; no scoped action lookup | `Nt`, `dtT`, `UXT`, `x9`, `Bn`, `kc`, `CtT` |
| **No `findAncestorWidgetOfType` / `findAncestorStateOfType`** on Element/BuildContext | Can't traverse widget tree for ancestor lookup (used everywhere in amp) | `qm.findAncestorWidgetOfType`, `Ib.findAncestorStateOfType` |
| **No ClipBox widget** — content overflows are never clipped | Container children can paint outside bounds | `r1T` in `layout_widgets.js` |
| **Scrollable has no built-in focus/key/mouse wiring** — callers must manually compose scroll + focus + mouse | Awkward API, error-prone integration | `f1T`/`I1T` (ScrollableState) |
| **Text rendering lacks alignment, overflow, maxLines** — always left-aligned, always wraps, no truncation | Can't build real text layouts | `t1T` in `text_rendering.js` |
| **Text rendering lacks intrinsic sizes** — parent queries return 0 | IntrinsicHeight, auto-sizing containers broken for text | `t1T.getMin/MaxIntrinsic*` |
| **Flex layout lacks intrinsic size methods** — returns 0 for all queries | Any parent querying Flex intrinsics gets wrong answer | `s1T.getMin/MaxIntrinsic*` |
| **No TextSpan hyperlink/onClick** — no interactive text | Can't build clickable links in markdown rendering | `G.hyperlink`, `G.onClick` |

### Tier 3 — Terminal Protocol & Driver

| Gap | Impact | Amp Reference |
|-----|--------|---------------|
| **No terminal capability query protocol** — Flitter never sends DA2/XTVERSION/XTGETTCAP/OSC queries | Can't detect RGB, kitty keyboard, pixel mouse, emoji width | `XXT.startCapabilityDetection`, `dY` queryParser |
| **No OSC 52 clipboard support** | Can't read/write system clipboard | `XXT.writeClipboard`, OSC 52 handler |
| **Suspend/resume doesn't re-enable capabilities** | After Ctrl+Z resume, kitty keyboard, color palette notifications etc. stay off | `XXT.resume` capability-aware re-activation |
| **No resize debouncing** | Spurious resize events cause unnecessary redraws | `XXT.resizeDebounceTimer` |
| **No `modifyOtherKeys` protocol** | Modifier key combos (Ctrl+Shift+letter) can't be detected | `XXT.enableModifyOtherKeys` |

### Tier 4 — Advanced Widgets & Features

| Gap | Impact | Amp Reference |
|-----|--------|---------------|
| **No Table widget** | Can't render tabular data | `JY`/`EQT` in `layout_widgets.js` |
| **No Select/OptionList widget** | Can't build interactive selection menus | `io` in `actions_intents.js` |
| **No CompositedTransformTarget/Follower** | LayerLink is orphaned; portal-style overlays can't anchor to widgets | `pZT`/`bZT` |
| **No IntrinsicHeight widget** | Can't size-to-content in unconstrained dimension | `n1T` |
| **No OverlapStack** | Can't do overlapping card-style layouts | `LY` |
| **No Offstage** | Can't hide widgets while preserving measurement | `sQ` |
| **Stack missing `fit` mode and `width`/`height` on Positioned** | Limited positioning control | `EY.fit`, `zw.width/height` |
| **No text selection/hit-testing in RenderParagraph** | Can't select text in rendered output | `t1T.getOffsetForPosition`, selection state |
| **No word-boundary wrapping** | Text breaks mid-word | `t1T.splitIntoWords` |

---

## Proposed Scope: Phase 14

**Focus: Tier 1 (all) + Tier 2 (core primitives only)**

Tier 1 is entirely correctness work — these are bugs that affect existing functionality. All 10 items should be fixed.

From Tier 2, the proposal is to implement the 5 items that unblock the most downstream work:

1. **Focus widget + FocusScope widget** (+ `addKeyHandler`/`removeKeyHandler` on FocusNode)
2. **`findAncestorWidgetOfType` / `findAncestorStateOfType`** on Element
3. **Flex intrinsic sizing** (all 4 methods on RenderFlex)
4. **Text alignment + overflow + maxLines** in RenderParagraph
5. **ClipBox widget**

This scope is chosen because:
- Focus/FocusScope is the #1 blocker for keyboard-navigable UIs — it's the bridge between FocusNode primitives and the widget tree
- Ancestor traversal methods are used by almost every stateful widget that needs to interact with its ancestors
- Flex intrinsics and text rendering features are needed for any non-trivial layout
- ClipBox prevents visual overflow artifacts in scrolling/bounded contexts

**Explicitly deferred to Phase 15+:**
- Actions/Intents/Shortcuts (depends on Focus widget from this phase)
- Scrollable StatefulWidget rewrite (depends on Focus widget + Actions)
- Terminal capability detection protocol (large standalone effort)
- Advanced widgets (Table, Select, CompositedTransform)
- Text selection/hit-testing

---

## Implementation Structure

### Wave 1: RenderObject & Pipeline Correctness (Tier 1)

All changes in `tree/render-object.ts`, `tree/render-box.ts`, `binding/widgets-binding.ts`, `widgets/flex.ts`.

**1.1 — RenderObject lifecycle guards**
- Add early-exit guards to `markNeedsLayout()` and `markNeedsPaint()` (check `_needsLayout`/`_needsPaint` and `_attached`)
- Add idempotency guards to `attach()` / `detach()`
- Add `removeFromQueues()` call in `dispose()`
- Add `_invalidateDepth()` cascade method; switch from eager `_depth` to lazy cached `_cachedDepth`

**1.2 — WidgetsBinding pipeline fixes**
- Add `hasNodesNeedingLayout` to `beginFrame()` dirty check
- Add `screen.clear()` + `screen.clearCursor()` at top of `paint()`
- Change `processResizeIfPending()` to call `rootElement.update(newMediaQueryWidget)` instead of just `markNeedsRebuild()`
- Add try/catch error handling around `paint()` and `render()`

**1.3 — Flex correctness**
- Add `updateRenderObject()` to Flex widget (propagates direction, mainAxisAlignment, crossAxisAlignment, mainAxisSize)
- Add `Math.floor()` for intermediate flex child space allocation
- Add unbounded cross-axis fallback using `getMaxIntrinsicHeight/Width`

**1.4 — RenderBox paint offset convention**
- Align paint() to pass parent-accumulated offset (not absolute child position) to match amp's O9 convention
- In amp, `paint(screen, parentOffsetX, parentOffsetY)` means "your parent's accumulated offset is this; add your own `this.offset.x/y` to compute your absolute position"
- In Flitter currently, `paint(screen, offsetX, offsetY)` means "your absolute position is (offsetX, offsetY)"
- Change: the parent loop should pass `offsetX + this.offset.x` as the accumulated parent offset, and each node adds its own offset internally
- Affected render objects: `RenderBox`, `ContainerRenderObject`, `RenderFlex`, `RenderStack`, `RenderViewport`, `RenderViewportWithPosition`, `RenderScrollable`, `RenderMouseRegion`, `RenderParagraph`, `RenderPositionedBox`
- Each must be audited to ensure `performPaint()` / `paint()` adds `this.offset` correctly under the new convention

### Wave 2: Element Tree Traversal & Focus Widget (Tier 2 core)

**2.1 — Element ancestor traversal**
- Add `findAncestorWidgetOfType<T>()` to Element
- Add `findAncestorStateOfType<T>()` to Element (for StatefulElement with State)
- These are generic tree walks — straightforward implementation

**2.2 — FocusNode dynamic key handlers**
- Add `addKeyHandler(fn)` / `removeKeyHandler(fn)` public methods
- Refactor `_handleKeyEvent` to iterate the handlers array (already done internally, just needs public API)

**2.3 — Focus widget + FocusScope widget**
- `Focus`: StatefulWidget that creates/manages a FocusNode, supports `autofocus`, `onKey`, `onPaste`, `onFocusChange`, `canRequestFocus`, `skipTraversal`
- Uses `findAncestorStateOfType` to auto-parent to nearest ancestor Focus
- `FocusScope`: Variant of Focus that creates a scope node (groups children for Tab traversal)

### Wave 3: Layout & Text Enhancements (Tier 2 features)

**3.1 — Flex intrinsic sizing**
- Implement all 4 intrinsic methods on RenderFlex
- Account for flex vs non-flex children, cross-axis computation
- Reference: `s1T` lines 480-600 in `layout_widgets.js`

**3.2 — Text alignment + overflow + maxLines**
- Add `textAlign` property to RichText/RenderParagraph: `left` | `center` | `right`
- Add `overflow` property: `clip` | `ellipsis` | `visible`
- Add `maxLines` property: number | undefined
- Alignment: compute per-line offset during paint
- Overflow: truncate wrapped lines, append `...` for ellipsis mode
- Reference: `t1T` in `text_rendering.js`

**3.3 — ClipBox widget**
- Single-child RenderObjectWidget that wraps child painting in a `ClipScreen`
- Passes full constraints to child, takes child size
- Reference: `r1T` in `layout_widgets.js`

---

## Verification Plan

Each wave must be verified before proceeding:

- **Wave 1**: Run existing 1223 tests (no regressions), run `tui-interactive-demo.ts` (no flicker, no ghost artifacts, click/hover still works after resize)
- **Wave 2**: New unit tests for `findAncestorWidgetOfType`/`findAncestorStateOfType`; new test for Focus widget autofocus + key dispatch; interactive demo with keyboard-navigable buttons
- **Wave 3**: New tests for Flex intrinsics; text alignment visual test; ClipBox overflow visual test

---

## Risk Assessment

- **Paint offset convention change (1.4)** is the riskiest item — it changes the contract for all `paint()` overrides. All existing render objects (Container, Viewport, RenderFlex, etc.) must be audited and updated. Consider doing this as a separate sub-phase with extra testing.
- **Lazy depth caching** is low-risk but touches the core `adoptChild`/`dropChild` path — needs careful testing with reconciliation scenarios.
- **Focus widget** is medium complexity — the key challenge is auto-parenting via ancestor traversal, which depends on Wave 2.1 being done first.
