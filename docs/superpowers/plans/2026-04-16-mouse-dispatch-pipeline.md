# Mouse Dispatch Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete mouse event dispatch pipeline in `MouseManager`, matching amp's `ha` class, so that `MouseRegion` callbacks (onClick, onEnter, onExit, onHover, onDrag, onRelease, onScroll) actually fire when users interact with the terminal.

**Architecture:** `MouseManager.handleMouseEvent()` currently does hit testing but never dispatches events to targets. Amp's `ha` class has ~300 lines of dispatch logic that: (1) filters hit results to mouse-capable nodes (`_findMouseTargets`), (2) maps raw terminal actions (press/release/move/wheel_*) to typed widget events (click/enter/exit/hover/drag/release/scroll), and (3) dispatches them to `RenderMouseRegion.handleMouseEvent()` with opaque propagation stopping. This plan implements all of that.

**Tech Stack:** TypeScript, Bun test runner, tmux E2E testing

**Amp reference:** `amp-cli-reversed/modules/2026_tail_anonymous.js:158200-158518` (class `ha`)

**Key type mapping (amp raw → Flitter raw):**
- amp `action: "press"` → Flitter `action: "press"`
- amp `action: "release"` → Flitter `action: "release"` 
- amp `action: "move"` → Flitter `action: "move"`
- amp `action: "scroll", button: "wheel_up"` → Flitter `action: "wheel_up"` (scroll direction is in action, not button)
- amp `T.drag` boolean → Flitter: inferred from `action === "move" && button !== "none"`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/tui/src/gestures/mouse-manager.ts` | **Major rewrite**: add dispatch methods, hover tracking, drag tracking, double-click, scroll sessions, removeRegion |
| `packages/tui/src/gestures/mouse-event-helpers.ts` | **New**: event factory functions (`createClickEvent`, `createBaseEvent`, `createScrollEvent`) matching amp's `Ol`, `wy0`, `yF` |
| `packages/tui/src/gestures/mouse-manager.test.ts` | **Rewrite**: update tests for the new dispatch pipeline |
| `packages/tui/src/widgets/mouse-region.test.ts` | **Fix**: existing 6 failing tests should pass after dispatch is implemented |
| `packages/tui/src/widgets/mouse-region-e2e.test.ts` | **Verify**: existing e2e tests should pass |
| `packages/tui/src/widgets/mouse-region.ts` | **Minor**: fix `removeRegion` call (currently calls non-existent method) |

---

### Task 1: Create mouse event helper functions

Matching amp's `Ol`, `wy0`, `yF` helpers (`amp-cli-reversed/modules/0543_unknown_Ol.js`, `0544_unknown_wy0.js`, `0545_unknown_yF.js`).

**Files:**
- Create: `packages/tui/src/gestures/mouse-event-helpers.ts`
- Test: `packages/tui/src/gestures/mouse-event-helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/tui/src/gestures/mouse-event-helpers.test.ts
import { describe, expect, test } from "bun:test";
import {
  createBaseEvent,
  createClickEvent,
  createScrollEvent,
  createDragEvent,
  createReleaseEvent,
} from "./mouse-event-helpers.js";
import type { MouseEvent as TermMouseEvent, Modifiers } from "../vt/types.js";

const MODS_NONE: Modifiers = { shift: false, alt: false, ctrl: false, meta: false };

function makeRawEvent(overrides: Partial<TermMouseEvent> = {}): TermMouseEvent {
  return {
    type: "mouse",
    x: 10,
    y: 5,
    button: "left",
    action: "press",
    modifiers: MODS_NONE,
    ...overrides,
  };
}

describe("mouse-event-helpers", () => {
  test("createBaseEvent produces position, localPosition, modifiers, timestamp", () => {
    const raw = makeRawEvent({ modifiers: { shift: true, alt: false, ctrl: false, meta: false } });
    const pos = { x: 10, y: 5 };
    const localPos = { x: 3, y: 2 };
    const result = createBaseEvent(raw, pos, localPos);
    expect(result.position).toEqual(pos);
    expect(result.localPosition).toEqual(localPos);
    expect(result.modifiers.shift).toBe(true);
    expect(typeof result.timestamp).toBe("number");
  });

  test("createClickEvent includes type, button, clickCount", () => {
    const raw = makeRawEvent({ button: "right" });
    const result = createClickEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 }, 2);
    expect(result.type).toBe("click");
    expect(result.button).toBe("right");
    expect(result.clickCount).toBe(2);
    expect(result.position).toEqual({ x: 10, y: 5 });
  });

  test("createClickEvent defaults clickCount to 1", () => {
    const raw = makeRawEvent();
    const result = createClickEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.clickCount).toBe(1);
  });

  test("createScrollEvent maps wheel_up action to direction up", () => {
    const raw = makeRawEvent({ action: "wheel_up", button: "none" });
    const result = createScrollEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.type).toBe("scroll");
    expect(result.direction).toBe("up");
  });

  test("createScrollEvent maps wheel_down action to direction down", () => {
    const raw = makeRawEvent({ action: "wheel_down", button: "none" });
    const result = createScrollEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.type).toBe("scroll");
    expect(result.direction).toBe("down");
  });

  test("createDragEvent includes deltaX, deltaY, button", () => {
    const raw = makeRawEvent({ action: "move", button: "left" });
    const result = createDragEvent(raw, { x: 12, y: 7 }, { x: 3, y: 2 }, 2, 1);
    expect(result.type).toBe("drag");
    expect(result.button).toBe("left");
    expect(result.deltaX).toBe(2);
    expect(result.deltaY).toBe(1);
  });

  test("createReleaseEvent includes button", () => {
    const raw = makeRawEvent({ action: "release", button: "left" });
    const result = createReleaseEvent(raw, { x: 10, y: 5 }, { x: 3, y: 2 });
    expect(result.type).toBe("release");
    expect(result.button).toBe("left");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/src/gestures/mouse-event-helpers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the helper functions**

```typescript
// packages/tui/src/gestures/mouse-event-helpers.ts
/**
 * Mouse event factory functions.
 *
 * 逆向: Ol (0543_unknown_Ol.js), wy0 (0544_unknown_wy0.js), yF (0545_unknown_yF.js)
 *
 * Creates typed widget-level mouse events from raw terminal mouse events.
 * These match the event shape expected by RenderMouseRegion.handleMouseEvent().
 *
 * @module
 */

import type { MouseEvent as TermMouseEvent, MouseAction } from "../vt/types.js";
import type { MouseEvent as WidgetMouseEvent } from "../widgets/mouse-region.js";

/** Base fields shared by all typed mouse events. */
export interface MouseEventBase {
  position: { x: number; y: number };
  localPosition: { x: number; y: number };
  modifiers: { shift: boolean; alt: boolean; ctrl: boolean; meta: boolean };
  timestamp: number;
}

/**
 * Create base event fields.
 *
 * 逆向: Ol(T, R, a) in 0543_unknown_Ol.js
 *
 * @param raw - Raw terminal mouse event (for modifiers)
 * @param position - Global position
 * @param localPosition - Position relative to the target
 */
export function createBaseEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
): MouseEventBase {
  return {
    position,
    localPosition,
    modifiers: {
      shift: raw.modifiers.shift,
      ctrl: raw.modifiers.ctrl,
      alt: raw.modifiers.alt,
      meta: raw.modifiers.meta,
    },
    timestamp: Date.now(),
  };
}

/**
 * Create a click event.
 *
 * 逆向: wy0(T, R, a, e=1) in 0544_unknown_wy0.js
 */
export function createClickEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
  clickCount = 1,
): WidgetMouseEvent & MouseEventBase {
  return {
    type: "click",
    button: raw.button === "left" ? "left" : raw.button === "middle" ? "middle" : raw.button === "right" ? "right" : "left",
    clickCount,
    ...createBaseEvent(raw, position, localPosition),
  } as WidgetMouseEvent & MouseEventBase;
}

/**
 * Create a scroll event.
 *
 * 逆向: yF(T, R, a) in 0545_unknown_yF.js
 *
 * NOTE: In amp, scroll comes as action="scroll" + button="wheel_up/down".
 * In Flitter, scroll comes as action="wheel_up/wheel_down" + button="none".
 * This function handles the Flitter convention.
 */
export function createScrollEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
): WidgetMouseEvent & MouseEventBase {
  let direction: string;
  switch (raw.action as MouseAction) {
    case "wheel_up": direction = "up"; break;
    case "wheel_down": direction = "down"; break;
    default: direction = "down";
  }
  return {
    type: "scroll",
    direction,
    ...createBaseEvent(raw, position, localPosition),
  } as WidgetMouseEvent & MouseEventBase;
}

/**
 * Create a drag event.
 *
 * 逆向: _handleDrag dispatch in ha class (2026_tail_anonymous.js:158320-158341)
 */
export function createDragEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
  deltaX: number,
  deltaY: number,
): WidgetMouseEvent & MouseEventBase {
  return {
    type: "drag",
    button: raw.button === "left" ? "left" : raw.button === "middle" ? "middle" : raw.button === "right" ? "right" : "left",
    deltaX,
    deltaY,
    ...createBaseEvent(raw, position, localPosition),
  } as WidgetMouseEvent & MouseEventBase;
}

/**
 * Create a release event.
 *
 * 逆向: _handleRelease dispatch in ha class (2026_tail_anonymous.js:158291-158318)
 */
export function createReleaseEvent(
  raw: TermMouseEvent,
  position: { x: number; y: number },
  localPosition: { x: number; y: number },
): WidgetMouseEvent & MouseEventBase {
  return {
    type: "release",
    button: raw.button === "left" ? "left" : raw.button === "middle" ? "middle" : raw.button === "right" ? "right" : "left",
    ...createBaseEvent(raw, position, localPosition),
  } as WidgetMouseEvent & MouseEventBase;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/gestures/mouse-event-helpers.test.ts`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/gestures/mouse-event-helpers.ts packages/tui/src/gestures/mouse-event-helpers.test.ts
git commit -m "feat(gestures): add mouse event helper functions matching amp Ol/wy0/yF"
```

- [ ] **Step 6: tmux e2e smoke test**

Run the interactive demo, verify rendering is still intact (no regressions from adding a new file):
```bash
tmux new-session -d -s test -x 80 -y 24 "bun run examples/tui-interactive-demo.ts 2>/tmp/test.log"
sleep 2
tmux capture-pane -t test -p | grep -q "Flitter TUI Interactive Demo" || echo "RENDER FAIL"
tmux kill-session -t test
```

---

### Task 2: Implement MouseManager dispatch core — _findMouseTargets + _handleClick + removeRegion

This is the critical task that makes clicks work. Matching amp's `ha.handleMouseEvent` switch on `action`, `_findMouseTargets`, `_handleClick`, and `removeRegion`.

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`
- Modify: `packages/tui/src/gestures/mouse-manager.test.ts`

**Amp reference:** `2026_tail_anonymous.js:158234-158275` (handleMouseEvent), `158343-158357` (_handleClick), `158451-158458` (_findMouseTargets), `158480-158482` (removeRegion)

- [ ] **Step 1: Write failing tests for click dispatch**

```typescript
// Add to packages/tui/src/gestures/mouse-manager.test.ts
// (these tests should be appended to existing test file)

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { MouseManager } from "./mouse-manager.js";
import { RenderMouseRegion } from "../widgets/mouse-region.js";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { setPipelineOwner } from "../tree/types.js";
import type { MouseEvent as TermMouseEvent, Modifiers } from "../vt/types.js";

const MODS_NONE: Modifiers = { shift: false, alt: false, ctrl: false, meta: false };

function makeRawEvent(overrides: Partial<TermMouseEvent> = {}): TermMouseEvent {
  return {
    type: "mouse",
    x: 5,
    y: 3,
    button: "left",
    action: "press",
    modifiers: MODS_NONE,
    ...overrides,
  };
}

// Minimal concrete RenderBox for building a test tree
class TestBox extends RenderBox {
  performLayout(): void {
    const c = this._lastConstraints!;
    this.size = c.constrain(c.maxWidth, c.maxHeight);
    for (const child of this._children) {
      (child as RenderBox).layout(c);
    }
  }
}

describe("MouseManager dispatch", () => {
  let mm: MouseManager;
  let mockPO: { requestLayout: () => void; requestPaint: () => void; removeFromQueues: () => void };

  beforeEach(() => {
    // Reset singleton
    (MouseManager as any)._instance = null;
    mm = MouseManager.instance;
    mockPO = { requestLayout: () => {}, requestPaint: () => {}, removeFromQueues: () => {} };
    setPipelineOwner(mockPO);
  });

  afterEach(() => {
    mm.dispose();
    setPipelineOwner(undefined);
  });

  test("press dispatches click event to RenderMouseRegion", () => {
    let receivedEvent: any = null;
    const region = new RenderMouseRegion({
      onClick: (e) => { receivedEvent = e; },
      onEnter: null, onExit: null, onHover: null,
      onScroll: null, onRelease: null, onDrag: null,
      cursor: null, opaque: true,
    });

    // Build a simple tree: root → region
    const root = new TestBox();
    root.adoptChild(region);
    root.attach();
    root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

    mm.setRootRenderObject(root);
    mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent.type).toBe("click");
  });

  test("opaque region stops propagation to deeper regions", () => {
    const events: string[] = [];
    const inner = new RenderMouseRegion({
      onClick: () => { events.push("inner"); },
      onEnter: null, onExit: null, onHover: null,
      onScroll: null, onRelease: null, onDrag: null,
      cursor: null, opaque: true,  // opaque stops propagation
    });
    const outer = new RenderMouseRegion({
      onClick: () => { events.push("outer"); },
      onEnter: null, onExit: null, onHover: null,
      onScroll: null, onRelease: null, onDrag: null,
      cursor: null, opaque: false,
    });

    const root = new TestBox();
    root.adoptChild(outer);
    outer.adoptChild(inner);
    root.attach();
    root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

    mm.setRootRenderObject(root);
    mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));

    // inner is opaque, so outer should NOT receive the event
    // Note: hit test returns deepest first, so inner is dispatched first
    expect(events).toEqual(["inner"]);
  });

  test("removeRegion removes from hoveredRegions", () => {
    const region = new RenderMouseRegion({
      onClick: null, onEnter: () => {}, onExit: null, onHover: null,
      onScroll: null, onRelease: null, onDrag: null,
      cursor: null, opaque: true,
    });

    const root = new TestBox();
    root.adoptChild(region);
    root.attach();
    root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

    mm.setRootRenderObject(root);

    // Simulate move to enter the region
    mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "move", button: "none" }));

    // removeRegion should not throw
    mm.removeRegion(region);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: new tests FAIL (handleMouseEvent doesn't dispatch)

- [ ] **Step 3: Implement _findMouseTargets, _handleClick, removeRegion, and wire up handleMouseEvent switch**

Replace the body of `handleMouseEvent` and add the new methods to `MouseManager`. The full implementation:

```typescript
// In packages/tui/src/gestures/mouse-manager.ts

import { RenderMouseRegion } from "../widgets/mouse-region.js";
import {
  createClickEvent,
  createReleaseEvent,
  createDragEvent,
  createScrollEvent,
  createBaseEvent,
} from "./mouse-event-helpers.js";

// Add these fields to the class:
//   private _hoveredRegions = new Set<RenderMouseRegion>();
//   private _dragTargets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number }; globalOffset: { x: number; y: number } }> = [];
//   private _lastDragPosition: { x: number; y: number } | null = null;
//   private _lastClickTime = new Map<string, number>();
//   private _lastClickPosition = new Map<string, { x: number; y: number }>();
//   private _currentClickCount = new Map<string, number>();
//   static readonly DOUBLE_CLICK_TIME = 500;
//   static readonly DOUBLE_CLICK_DISTANCE = 2;

// Replace handleMouseEvent body:
handleMouseEvent(event: MouseEvent): void {
  if (!this._rootRenderObject) return;
  log.debug("event", { action: event.action, x: event.x, y: event.y, button: event.button });

  const position = { x: event.x, y: event.y };
  this._lastMousePosition = position;

  const result = HitTestResult.hitTest(this._rootRenderObject, position);
  this._lastHoverTargets = [...result.hits];
  const mouseTargets = this._findMouseTargets(result.hits);
  log.debug("hitTest", { hits: result.hits.length, mouseTargets: mouseTargets.length });

  switch (event.action) {
    case "press":
      if (event.button === "left" || event.button === "middle" || event.button === "right") {
        this._handleClick(event, position, mouseTargets);
        if (event.button === "left") {
          this._dragTargets = [];
          for (const { target, localPosition } of mouseTargets) {
            const globalOffset = { x: position.x - localPosition.x, y: position.y - localPosition.y };
            this._dragTargets.push({ target, localPosition, globalOffset });
            if (target.opaque) break;
          }
        }
      }
      break;
    case "release":
      this._handleRelease(event, position, mouseTargets);
      this._dragTargets = [];
      this._lastDragPosition = null;
      break;
    case "wheel_up":
    case "wheel_down":
      this._handleScroll(event, position, mouseTargets);
      break;
    case "move":
      this._handleMove(event, position, mouseTargets);
      if (event.button !== "none") {
        this._handleDrag(event, position, mouseTargets);
      }
      break;
  }
}

// Add these methods:

private _findMouseTargets(hits: readonly HitTestEntry[]): Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }> {
  const targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }> = [];
  for (const hit of hits) {
    if (hit.target instanceof RenderMouseRegion) {
      targets.push({ target: hit.target, localPosition: hit.localPosition });
    }
  }
  return targets;
}

private _handleClick(raw: MouseEvent, position: { x: number; y: number }, targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>): void {
  const clickCount = this._calculateClickCount(position, raw.button);
  for (const { target, localPosition } of targets) {
    const event = createClickEvent(raw, position, localPosition, clickCount);
    target.handleMouseEvent(event);
    if (target.opaque) break;
  }
}

removeRegion(region: RenderMouseRegion): void {
  this._hoveredRegions.delete(region);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Run existing mouse-region tests to check click tests now pass**

Run: `bun test packages/tui/src/widgets/mouse-region.test.ts`
Expected: click-related tests should now pass (some hover/drag tests may still fail)

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts packages/tui/src/gestures/mouse-manager.test.ts
git commit -m "feat(gestures): implement click dispatch and _findMouseTargets in MouseManager

逆向: ha._handleClick, ha._findMouseTargets, ha.removeRegion
(2026_tail_anonymous.js:158234-158358, 158451-158482)"
```

- [ ] **Step 7: tmux e2e smoke test — verify clicks work**

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run examples/tui-interactive-demo.ts 2>/tmp/test.log"
sleep 2
# Click on "Click Me" button area (approximate coordinates: col~5, row~7)
tmux send-keys -t test -- $'\x1b[<0;5;7M'
tmux send-keys -t test -- $'\x1b[<0;5;7m'
sleep 1
tmux capture-pane -t test -p > /tmp/capture.txt
grep -q "Clicked" /tmp/capture.txt && echo "CLICK WORKS" || echo "CLICK FAIL"
tmux kill-session -t test
```
If "CLICK FAIL", investigate immediately — do not proceed to Task 3.

---

### Task 3: Implement _handleMove (enter/exit/hover dispatch)

Matching amp's `ha._handleMove` (`2026_tail_anonymous.js:158393-158435`). This is the most complex handler — it tracks which regions are hovered, computes enter/exit sets, and dispatches events.

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`
- Modify: `packages/tui/src/gestures/mouse-manager.test.ts`

**Amp reference:** `2026_tail_anonymous.js:158393-158435`

- [ ] **Step 1: Write failing tests for move/enter/exit/hover**

```typescript
// Append to mouse-manager.test.ts

test("move into a region dispatches enter event", () => {
  let enteredWith: any = null;
  const region = new RenderMouseRegion({
    onClick: null,
    onEnter: (e) => { enteredWith = e; },
    onExit: null, onHover: null,
    onScroll: null, onRelease: null, onDrag: null,
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "move", button: "none" }));

  expect(enteredWith).not.toBeNull();
  expect(enteredWith.type).toBe("enter");
});

test("move out of a region dispatches exit event", () => {
  let exitedWith: any = null;
  const region = new RenderMouseRegion({
    onClick: null, onEnter: null,
    onExit: (e) => { exitedWith = e; },
    onHover: null,
    onScroll: null, onRelease: null, onDrag: null,
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  // Region is 20x10
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);

  // Move into region
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "move", button: "none" }));
  expect(exitedWith).toBeNull();

  // Move out of region (x=25 is outside 20-wide region)
  mm.handleMouseEvent(makeRawEvent({ x: 25, y: 3, action: "move", button: "none" }));
  expect(exitedWith).not.toBeNull();
  expect(exitedWith.type).toBe("exit");
});

test("move within hovered region dispatches hover event", () => {
  let hoverCount = 0;
  const region = new RenderMouseRegion({
    onClick: null, onEnter: null, onExit: null,
    onHover: () => { hoverCount++; },
    onScroll: null, onRelease: null, onDrag: null,
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);

  // First move: enter (not yet hovered, so no hover event)
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "move", button: "none" }));
  expect(hoverCount).toBe(0); // first move is "enter", not "hover"

  // Second move: now hovered, should dispatch hover
  mm.handleMouseEvent(makeRawEvent({ x: 6, y: 3, action: "move", button: "none" }));
  expect(hoverCount).toBe(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: new move/enter/exit/hover tests FAIL

- [ ] **Step 3: Implement _handleMove**

```typescript
// Add to MouseManager class:

private _handleMove(
  raw: MouseEvent,
  position: { x: number; y: number },
  targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
): void {
  // 逆向: ha._handleMove (2026_tail_anonymous.js:158393-158435)
  const currentRegions = new Set<RenderMouseRegion>();
  for (const { target } of targets) {
    currentRegions.add(target);
  }

  // Compute exited regions (was hovered, no longer under cursor)
  const exitedRegions = new Set<RenderMouseRegion>();
  for (const region of this._hoveredRegions) {
    if (!currentRegions.has(region)) exitedRegions.add(region);
  }

  // Compute entered regions (under cursor, was not hovered)
  const enteredRegions = new Set<RenderMouseRegion>();
  for (const region of currentRegions) {
    if (!this._hoveredRegions.has(region)) enteredRegions.add(region);
  }

  // Dispatch exit events
  for (const region of exitedRegions) {
    if (region.onExit) {
      // 逆向: exit uses global position as localPosition (158408-158411)
      const event = { type: "exit" as const, ...createBaseEvent(raw, position, position) };
      region.handleMouseEvent(event as any);
    }
  }

  // Dispatch enter events
  for (const { target, localPosition } of targets) {
    if (enteredRegions.has(target) && target.onEnter) {
      const event = { type: "enter" as const, ...createBaseEvent(raw, position, localPosition) };
      target.handleMouseEvent(event as any);
    }
  }

  // Dispatch hover events (only for regions that were already hovered)
  for (const { target, localPosition } of targets) {
    if (target.onHover && this._hoveredRegions.has(target)) {
      const event = { type: "hover" as const, ...createBaseEvent(raw, position, localPosition) };
      target.handleMouseEvent(event as any);
    }
  }

  // Update hovered set
  this._hoveredRegions.clear();
  for (const region of currentRegions) {
    this._hoveredRegions.add(region);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts packages/tui/src/gestures/mouse-manager.test.ts
git commit -m "feat(gestures): implement _handleMove for enter/exit/hover dispatch

逆向: ha._handleMove (2026_tail_anonymous.js:158393-158435)"
```

- [ ] **Step 6: tmux e2e smoke test — verify hover works**

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run examples/tui-interactive-demo.ts 2>/tmp/test.log"
sleep 2
# Move mouse over button area to trigger enter
tmux send-keys -t test -- $'\x1b[<35;5;7M'
sleep 0.5
tmux capture-pane -t test -p > /tmp/capture.txt
grep -q "Entered" /tmp/capture.txt && echo "HOVER WORKS" || echo "HOVER FAIL"
tmux kill-session -t test
```

---

### Task 4: Implement _handleRelease and _handleDrag

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`
- Modify: `packages/tui/src/gestures/mouse-manager.test.ts`

**Amp reference:** `2026_tail_anonymous.js:158291-158341` (_handleRelease, _handleDrag)

- [ ] **Step 1: Write failing tests**

```typescript
test("release dispatches to current targets when no drag active", () => {
  let receivedRelease: any = null;
  const region = new RenderMouseRegion({
    onClick: null, onEnter: null, onExit: null, onHover: null,
    onScroll: null,
    onRelease: (e) => { receivedRelease = e; },
    onDrag: null,
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "release", button: "left" }));

  expect(receivedRelease).not.toBeNull();
  expect(receivedRelease.type).toBe("release");
});

test("drag dispatches to original press targets", () => {
  let dragCount = 0;
  const region = new RenderMouseRegion({
    onClick: null, onEnter: null, onExit: null, onHover: null,
    onScroll: null, onRelease: null,
    onDrag: () => { dragCount++; },
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);

  // Press to capture drag targets
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));

  // Move with button held (drag) — in Flitter, action="move" + button="left"
  mm.handleMouseEvent(makeRawEvent({ x: 7, y: 4, action: "move", button: "left" }));

  expect(dragCount).toBe(1);
});

test("release after drag dispatches to drag targets, not current targets", () => {
  let releaseTarget = "";
  const regionA = new RenderMouseRegion({
    onClick: null, onEnter: null, onExit: null, onHover: null,
    onScroll: null,
    onRelease: () => { releaseTarget = "A"; },
    onDrag: null,
    cursor: null, opaque: true,
  });
  // regionA is at offset (0,0), regionB would be somewhere else
  // For simplicity, press on regionA then release on regionA
  const root = new TestBox();
  root.adoptChild(regionA);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "release", button: "left" }));

  expect(releaseTarget).toBe("A");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement _handleRelease and _handleDrag**

```typescript
// Add to MouseManager:

private _handleRelease(
  raw: MouseEvent,
  position: { x: number; y: number },
  targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
): void {
  // 逆向: ha._handleRelease (2026_tail_anonymous.js:158291-158318)
  const button = (raw.button === "left" || raw.button === "middle" || raw.button === "right") ? raw.button : "left";

  if (this._dragTargets.length > 0) {
    // Release goes to original drag targets
    for (const { target, globalOffset } of this._dragTargets) {
      const localPos = { x: position.x - globalOffset.x, y: position.y - globalOffset.y };
      const event = createReleaseEvent(
        { ...raw, button } as any,
        position,
        localPos,
      );
      target.handleMouseEvent(event as any);
    }
  } else {
    // Release goes to current hit targets
    for (const { target, localPosition } of targets) {
      const event = createReleaseEvent(
        { ...raw, button } as any,
        position,
        localPosition,
      );
      target.handleMouseEvent(event as any);
      if (target.opaque) break;
    }
  }
}

private _handleDrag(
  raw: MouseEvent,
  position: { x: number; y: number },
  _targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
): void {
  // 逆向: ha._handleDrag (2026_tail_anonymous.js:158320-158341)
  const button = (raw.button === "left" || raw.button === "middle" || raw.button === "right") ? raw.button : "left";
  const deltaX = this._lastDragPosition ? position.x - this._lastDragPosition.x : 0;
  const deltaY = this._lastDragPosition ? position.y - this._lastDragPosition.y : 0;

  for (const { target, globalOffset } of this._dragTargets) {
    const localPos = { x: position.x - globalOffset.x, y: position.y - globalOffset.y };
    const event = createDragEvent(
      { ...raw, button } as any,
      position,
      localPos,
      deltaX,
      deltaY,
    );
    target.handleMouseEvent(event as any);
  }
  this._lastDragPosition = position;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts packages/tui/src/gestures/mouse-manager.test.ts
git commit -m "feat(gestures): implement _handleRelease and _handleDrag dispatch

逆向: ha._handleRelease, ha._handleDrag (2026_tail_anonymous.js:158291-158341)"
```

- [ ] **Step 6: tmux e2e smoke test**

Same as Task 2 Step 7 — verify click still works and no regressions.

---

### Task 5: Implement _handleScroll with session stickiness

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`
- Modify: `packages/tui/src/gestures/mouse-manager.test.ts`

**Amp reference:** `2026_tail_anonymous.js:158359-158392`

- [ ] **Step 1: Write failing tests**

```typescript
test("wheel_up dispatches scroll event with direction up", () => {
  let receivedScroll: any = null;
  const region = new RenderMouseRegion({
    onClick: null, onEnter: null, onExit: null, onHover: null,
    onScroll: (e) => { receivedScroll = e; },
    onRelease: null, onDrag: null,
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "wheel_up", button: "none" }));

  expect(receivedScroll).not.toBeNull();
  expect(receivedScroll.type).toBe("scroll");
  expect(receivedScroll.direction).toBe("up");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement _handleScroll**

```typescript
// Add fields:
//   private _scrollSessionTarget: RenderMouseRegion | null = null;
//   private _scrollSessionLastEvent = 0;
//   static readonly SCROLL_SESSION_TIMEOUT = 200;

private _handleScroll(
  raw: MouseEvent,
  position: { x: number; y: number },
  targets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>,
): void {
  // 逆向: ha._handleScroll (2026_tail_anonymous.js:158359-158392)
  const now = Date.now();

  // Scroll session stickiness: if same target is still visible and within timeout, stick to it
  if (
    this._scrollSessionTarget &&
    this._scrollSessionTarget.attached &&
    now - this._scrollSessionLastEvent <= MouseManager.SCROLL_SESSION_TIMEOUT
  ) {
    const found = targets.find(t => t.target === this._scrollSessionTarget);
    if (found) {
      const event = createScrollEvent(raw, position, found.localPosition);
      this._scrollSessionTarget.onScroll?.(event as any);
    } else {
      const localPos = this._scrollSessionTarget.globalToLocal(position);
      const event = createScrollEvent(raw, position, localPos);
      this._scrollSessionTarget.onScroll?.(event as any);
    }
    this._scrollSessionLastEvent = now;
    return;
  }

  // Find deepest scroll target
  const scrollTargets = targets.filter(t => t.target.onScroll);
  if (scrollTargets.length === 0) {
    this._scrollSessionTarget = null;
    this._scrollSessionLastEvent = 0;
    return;
  }

  // Dispatch to deepest scroll target (last in array = deepest due to reverse-order hit test)
  for (let i = scrollTargets.length - 1; i >= 0; i--) {
    const { target, localPosition } = scrollTargets[i]!;
    const event = createScrollEvent(raw, position, localPosition);
    target.onScroll?.(event as any);
    this._scrollSessionTarget = target;
    this._scrollSessionLastEvent = now;
    return;
  }

  this._scrollSessionTarget = null;
  this._scrollSessionLastEvent = 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts packages/tui/src/gestures/mouse-manager.test.ts
git commit -m "feat(gestures): implement _handleScroll with session stickiness

逆向: ha._handleScroll (2026_tail_anonymous.js:158359-158392)"
```

- [ ] **Step 6: tmux e2e smoke test**

---

### Task 6: Implement _calculateClickCount (double-click detection)

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`
- Modify: `packages/tui/src/gestures/mouse-manager.test.ts`

**Amp reference:** `2026_tail_anonymous.js:158501-158514`

- [ ] **Step 1: Write failing test**

```typescript
test("rapid clicks at same position increment clickCount", () => {
  const clickCounts: number[] = [];
  const region = new RenderMouseRegion({
    onClick: (e) => { clickCounts.push((e as any).clickCount); },
    onEnter: null, onExit: null, onHover: null,
    onScroll: null, onRelease: null, onDrag: null,
    cursor: null, opaque: true,
  });

  const root = new TestBox();
  root.adoptChild(region);
  root.attach();
  root.layout(new BoxConstraints({ minWidth: 0, maxWidth: 20, minHeight: 0, maxHeight: 10 }));

  mm.setRootRenderObject(root);

  // Three rapid clicks at same position
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));
  mm.handleMouseEvent(makeRawEvent({ x: 5, y: 3, action: "press", button: "left" }));

  expect(clickCounts).toEqual([1, 2, 3]);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement _calculateClickCount**

```typescript
private _calculateClickCount(position: { x: number; y: number }, button = "left"): number {
  // 逆向: ha._calculateClickCount (2026_tail_anonymous.js:158501-158508)
  const now = Date.now();
  const lastTime = this._lastClickTime.get(button) ?? 0;
  const elapsed = now - lastTime;
  let count = 1;

  const lastPos = this._lastClickPosition.get(button);
  if (lastPos && elapsed <= MouseManager.DOUBLE_CLICK_TIME && this._isWithinDoubleClickDistance(position, lastPos)) {
    count = (this._currentClickCount.get(button) ?? 0) + 1;
  }

  this._lastClickTime.set(button, now);
  this._lastClickPosition.set(button, position);
  this._currentClickCount.set(button, count);
  return count;
}

private _isWithinDoubleClickDistance(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  // 逆向: ha._isWithinDoubleClickDistance (2026_tail_anonymous.js:158510-158514)
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= MouseManager.DOUBLE_CLICK_DISTANCE * MouseManager.DOUBLE_CLICK_DISTANCE;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/tui/src/gestures/mouse-manager.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts packages/tui/src/gestures/mouse-manager.test.ts
git commit -m "feat(gestures): implement double-click detection via _calculateClickCount

逆向: ha._calculateClickCount (2026_tail_anonymous.js:158501-158514)"
```

- [ ] **Step 6: tmux e2e smoke test**

---

### Task 7: Fix clearHoverState and dispose to match amp + run full test suite

Clean up `clearHoverState` and `dispose` to clear all new state fields, matching amp's implementation. Then run ALL tests to verify no regressions.

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`

**Amp reference:** `2026_tail_anonymous.js:158477-158478` (clearHoverState), `158515-158517` (dispose)

- [ ] **Step 1: Update clearHoverState to clear drag state too**

```typescript
clearHoverState(): void {
  // 逆向: ha.clearHoverState (2026_tail_anonymous.js:158477-158478)
  this._hoveredRegions.clear();
  this._dragTargets = [];
  this._lastHoverTargets = [];
}
```

- [ ] **Step 2: Update dispose to clear all new state**

```typescript
dispose(): void {
  // 逆向: ha.dispose (2026_tail_anonymous.js:158515-158517)
  this.clearHoverState();
  this._lastMousePosition = null;
  this._rootRenderObject = null;
  this._tui = null;
  this._lastClickTime.clear();
  this._lastClickPosition.clear();
  this._currentClickCount.clear();
  this._scrollSessionTarget = null;
  this._scrollSessionLastEvent = 0;
  this._lastDragPosition = null;
  MouseManager._instance = null;
}
```

- [ ] **Step 3: Run full test suite**

Run: `bun test packages/tui/src/`
Expected: all tests pass (except pre-existing container.test.ts failures)

- [ ] **Step 4: Run mouse-region.test.ts specifically — all 7 tests should pass**

Run: `bun test packages/tui/src/widgets/mouse-region.test.ts`
Expected: 7/7 PASS

- [ ] **Step 5: Run mouse-region-e2e.test.ts**

Run: `bun test packages/tui/src/widgets/mouse-region-e2e.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts
git commit -m "fix(gestures): align clearHoverState and dispose with amp

逆向: ha.clearHoverState, ha.dispose (2026_tail_anonymous.js:158477-158517)"
```

- [ ] **Step 7: tmux e2e full interaction test**

This is the critical verification. Test ALL interaction types:

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run examples/tui-interactive-demo.ts 2>/tmp/test.log"
sleep 2

# 1. Verify initial render
tmux capture-pane -t test -p > /tmp/capture.txt
grep -q "Flitter TUI Interactive Demo" /tmp/capture.txt && echo "RENDER OK" || echo "RENDER FAIL"
grep -q "None yet" /tmp/capture.txt && echo "INITIAL STATE OK" || echo "INITIAL STATE FAIL"

# 2. Test click on "Click Me" button (approximate col=5, row=7)
tmux send-keys -t test -- $'\x1b[<0;5;7M'
tmux send-keys -t test -- $'\x1b[<0;5;7m'
sleep 1
tmux capture-pane -t test -p > /tmp/capture.txt
grep -q "Clicked" /tmp/capture.txt && echo "CLICK OK" || echo "CLICK FAIL"

# 3. Test hover (move to different button area, col=20, row=7)
tmux send-keys -t test -- $'\x1b[<35;20;7M'
sleep 0.5
tmux capture-pane -t test -p > /tmp/capture.txt
grep -q "Entered" /tmp/capture.txt && echo "HOVER OK" || echo "HOVER FAIL"

# 4. Test GestureDetector tap (approximate col=5, row=13)
tmux send-keys -t test -- $'\x1b[<0;5;13M'
tmux send-keys -t test -- $'\x1b[<0;5;13m'
sleep 1
tmux capture-pane -t test -p > /tmp/capture.txt
grep -q "tap" /tmp/capture.txt && echo "GESTURE TAP OK" || echo "GESTURE TAP FAIL"

# 5. Quit
tmux send-keys -t test q
sleep 0.5
tmux kill-session -t test 2>/dev/null || true

echo "=== Full capture ==="
cat /tmp/capture.txt
```

If ANY check says FAIL, investigate and fix before declaring this plan complete.

---

### Task 8: Update barrel exports and fix type consistency

Ensure the new `mouse-event-helpers.ts` module is properly exported, and that the `WidgetMouseEvent` type in `mouse-region.ts` aligns with the typed events produced by the helpers.

**Files:**
- Modify: `packages/tui/src/gestures/index.ts` (or wherever gestures barrel is)
- Modify: `packages/tui/src/index.ts` (if needed)

- [ ] **Step 1: Check if gestures barrel exists**

```bash
ls packages/tui/src/gestures/index.ts
```

- [ ] **Step 2: Add export for mouse-event-helpers if barrel exists**

```typescript
export { createBaseEvent, createClickEvent, createScrollEvent, createDragEvent, createReleaseEvent } from "./mouse-event-helpers.js";
```

- [ ] **Step 3: Run full test suite one final time**

Run: `bun test packages/tui/src/`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/
git commit -m "chore(gestures): export mouse event helpers from barrel"
```

- [ ] **Step 5: Final tmux e2e test (same as Task 7 Step 7)**

This is the definitive verification. If it passes, the mouse dispatch pipeline is complete.
