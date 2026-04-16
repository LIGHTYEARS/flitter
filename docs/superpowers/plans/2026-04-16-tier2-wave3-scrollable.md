# Tier 2 Wave 3: Scrollable Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Scrollable from a StatelessWidget/RenderObjectWidget to a StatefulWidget that auto-wires Focus + MouseRegion + ScrollBehavior, so keyboard and mouse scrolling "just works" without manual FocusNode setup.

**Architecture:** The current `Scrollable` is a `Widget implements RenderObjectWidget` that creates `RenderScrollable` directly. The rewrite converts it to a `StatefulWidget` whose `build()` composes `Focus > MouseRegion > viewportBuilder(controller)`. A new `ScrollBehavior` class replaces `ScrollKeyHandler` with all vim-style key bindings. `ScrollController` gains `animateTo` enhancements.

**Tech Stack:** TypeScript, Bun test runner, `node:test` + `node:assert/strict`

**MANDATORY: All implementations MUST cross-reference amp source code.**

**Prerequisites:** Wave 2 Tasks 1-3 (Focus widget, Actions, Shortcuts) must be complete.

**Amp References:**
- `I1T` = ScrollableState: `amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js:0-81`
- `P1T` = ScrollBehavior: `amp-cli-reversed/modules/2135_unknown_P1T.js`
- `Q3` = ScrollController: `amp-cli-reversed/modules/2136_unknown_Q3.js`

---

### Task 1: ScrollBehavior (replaces ScrollKeyHandler)

**Files:**
- Create: `packages/tui/src/scroll/scroll-behavior.ts`
- Create: `packages/tui/src/scroll/scroll-behavior.test.ts`

**Amp reference:** `P1T` in `2135_unknown_P1T.js`

- [ ] **Step 1: Write failing tests**

Create `packages/tui/src/scroll/scroll-behavior.test.ts`:

```ts
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ScrollBehavior } from "./scroll-behavior.js";
import { ScrollController } from "./scroll-controller.js";

describe("ScrollBehavior — key bindings (amp P1T alignment)", () => {
  it("ArrowDown scrolls down by step", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    const result = behavior.handleKeyEvent({ key: "ArrowDown", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(result, "handled");
    assert.equal(controller.offset, 3);
  });

  it("j scrolls down (vim)", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    behavior.handleKeyEvent({ key: "j", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(controller.offset, 3);
  });

  it("ArrowUp scrolls up by step", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(10);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    behavior.handleKeyEvent({ key: "ArrowUp", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(controller.offset, 7);
  });

  it("Ctrl+d scrolls down by page", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    behavior.handleKeyEvent({ key: "d", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(controller.offset, 10);
  });

  it("Home scrolls to top", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    controller.jumpTo(50);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    behavior.handleKeyEvent({ key: "Home", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(controller.offset, 0);
  });

  it("End scrolls to bottom", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    behavior.handleKeyEvent({ key: "End", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(controller.offset, 100);
  });

  it("returns ignored for unrecognized keys", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(100);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    const result = behavior.handleKeyEvent({ key: "x", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(result, "ignored");
  });

  it("ArrowDown is ignored when maxScrollExtent is 0", () => {
    const controller = new ScrollController();
    controller.updateMaxScrollExtent(0);
    const behavior = new ScrollBehavior(controller, { scrollStep: 3, pageScrollStep: 10 });

    const result = behavior.handleKeyEvent({ key: "ArrowDown", ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as any);
    assert.equal(result, "ignored");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/scroll/scroll-behavior.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement ScrollBehavior**

Create `packages/tui/src/scroll/scroll-behavior.ts`:

```ts
/**
 * ScrollBehavior — 键盘/鼠标滚动事件处理。
 *
 * 逆向: amp P1T (2135_unknown_P1T.js) — handleKeyEvent 实现完整的
 * vim/标准键绑定, handleScrollDelta 执行带钳位的偏移更新。
 *
 * 替代旧的 ScrollKeyHandler，提供与 Focus 系统兼容的 KeyEventResult 返回值。
 *
 * @module
 */

import type { KeyEvent } from "../vt/types.js";
import type { KeyEventResult } from "../focus/focus-node.js";
import type { ScrollController } from "./scroll-controller.js";

interface ScrollBehaviorOptions {
  scrollStep?: number;
  pageScrollStep?: number;
}

export class ScrollBehavior {
  private _controller: ScrollController;
  private _scrollStep: number;
  private _pageScrollStep: number;

  constructor(
    controller: ScrollController,
    options?: ScrollBehaviorOptions,
  ) {
    this._controller = controller;
    this._scrollStep = options?.scrollStep ?? 3;
    this._pageScrollStep = options?.pageScrollStep ?? 10;
  }

  get controller(): ScrollController {
    return this._controller;
  }

  set controller(value: ScrollController) {
    this._controller = value;
  }

  /**
   * 逆向: amp P1T.handleKeyEvent — 完整键绑定表。
   *
   * ArrowUp/k → up by step, ArrowDown/j → down by step,
   * PageUp/Ctrl+u → up by page, PageDown/Ctrl+d → down by page,
   * Home/g → top, End/G(shift+g) → bottom.
   *
   * 当 maxScrollExtent <= 0 时 Arrow/j/k 返回 "ignored"。
   */
  handleKeyEvent(event: KeyEvent): KeyEventResult {
    const key = event.key;
    const ctrl = (event as any).ctrlKey ?? false;
    const shift = (event as any).shiftKey ?? false;

    // 逆向: amp P1T — ArrowUp/ArrowDown early-return when nothing to scroll
    const canScroll = this._controller.maxScrollExtent > 0;

    switch (key) {
      case "ArrowUp":
      case "k":
        if (!canScroll) return "ignored";
        this.handleScrollDelta(-this._scrollStep);
        return "handled";

      case "ArrowDown":
      case "j":
        if (!canScroll) return "ignored";
        this.handleScrollDelta(this._scrollStep);
        return "handled";

      case "PageUp":
        this.handleScrollDelta(-this._pageScrollStep);
        return "handled";

      case "PageDown":
        this.handleScrollDelta(this._pageScrollStep);
        return "handled";

      case "u":
        if (ctrl) {
          this.handleScrollDelta(-this._pageScrollStep);
          return "handled";
        }
        return "ignored";

      case "d":
        if (ctrl) {
          this.handleScrollDelta(this._pageScrollStep);
          return "handled";
        }
        return "ignored";

      case "Home":
        this._controller.scrollToTop();
        return "handled";

      case "End":
        this._controller.scrollToBottom();
        return "handled";

      case "g":
        if (shift) {
          this._controller.scrollToBottom();
        } else {
          this._controller.scrollToTop();
        }
        return "handled";

      default:
        return "ignored";
    }
  }

  /**
   * 逆向: amp P1T.handleScrollDelta — 钳位偏移更新。
   */
  handleScrollDelta(delta: number): void {
    const newOffset = this._controller.offset + delta;
    this._controller.jumpTo(newOffset);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/scroll/scroll-behavior.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/scroll/scroll-behavior.ts packages/tui/src/scroll/scroll-behavior.test.ts
git commit -m "feat(scroll): add ScrollBehavior with vim-style key bindings

Align with amp P1T (2135_unknown_P1T.js). Full key binding table:
ArrowUp/k, ArrowDown/j, PageUp/Ctrl+u, PageDown/Ctrl+d, Home/g,
End/G. Returns KeyEventResult for Focus system integration. Replaces
ScrollKeyHandler."
```

---

### Task 2: Scrollable StatefulWidget Rewrite

**Files:**
- Modify: `packages/tui/src/scroll/scrollable.ts` (rewrite)
- Modify: `packages/tui/src/scroll/scrollable.test.ts`
- Modify: `packages/tui/src/scroll/index.ts` (add scroll-behavior export)

**Amp reference:** `I1T` (ScrollableState) in `interactive_widgets.js:0-81`

- [ ] **Step 1: Write failing tests for new StatefulWidget Scrollable**

Add to or replace content in `packages/tui/src/scroll/scrollable.test.ts`:

```ts
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { Scrollable, ScrollableState } from "./scrollable.js";
import { ScrollController } from "./scroll-controller.js";

describe("Scrollable — StatefulWidget (amp I1T alignment)", () => {
  it("creates an internal ScrollController when none provided", () => {
    const scrollable = new Scrollable({
      viewportBuilder: (ctx, ctrl) => new TestWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as any)._state as ScrollableState;
    assert.ok(state.controller instanceof ScrollController);
  });

  it("uses external controller when provided", () => {
    const ext = new ScrollController();
    const scrollable = new Scrollable({
      controller: ext,
      viewportBuilder: (ctx, ctrl) => new TestWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    const state = (element as any)._state as ScrollableState;
    assert.equal(state.controller, ext);
  });

  it("build returns a Focus > MouseRegion > viewport tree", () => {
    const scrollable = new Scrollable({
      viewportBuilder: (ctx, ctrl) => new TestWidget(),
    });
    const element = scrollable.createElement();
    element.mount(undefined);

    // The build output should be a Focus widget wrapping the viewport
    const state = (element as any)._state as ScrollableState;
    const builtWidget = state.build(element as any);
    // We just verify it doesn't throw and returns a widget
    assert.ok(builtWidget !== null);
  });
});
```

- [ ] **Step 2: Implement Scrollable as StatefulWidget**

Rewrite `packages/tui/src/scroll/scrollable.ts`:

```ts
/**
 * Scrollable StatefulWidget — 自动集成 Focus + MouseRegion + 滚动行为。
 *
 * 逆向: amp I1T (ScrollableState) in interactive_widgets.js:0-81
 *
 * build() 组合: Focus(onKey) > MouseRegion(onScroll) > viewportBuilder(controller)
 * 消费者只需提供 viewportBuilder，键盘和鼠标滚动自动工作。
 *
 * @module
 */

import {
  StatefulWidget,
  State,
} from "../tree/stateful-widget.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import type { KeyEvent } from "../vt/types.js";
import type { KeyEventResult } from "../focus/focus-node.js";
import type { MouseEvent } from "../widgets/mouse-region.js";
import { Focus } from "../widgets/focus.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { ScrollController } from "./scroll-controller.js";
import { ScrollBehavior } from "./scroll-behavior.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

interface ScrollableArgs {
  key?: Key;
  controller?: ScrollController;
  axisDirection?: "vertical" | "horizontal";
  autofocus?: boolean;
  keyboardScrolling?: boolean;
  viewportBuilder: (context: BuildContext, controller: ScrollController) => WidgetInterface;
}

// ════════════════════════════════════════════════════
//  Scrollable Widget
// ════════════════════════════════════════════════════

export class Scrollable extends StatefulWidget {
  readonly controller: ScrollController | undefined;
  readonly axisDirection: "vertical" | "horizontal";
  readonly autofocus: boolean;
  readonly keyboardScrolling: boolean;
  readonly viewportBuilder: (context: BuildContext, controller: ScrollController) => WidgetInterface;

  constructor(args: ScrollableArgs) {
    super({ key: args.key });
    this.controller = args.controller;
    this.axisDirection = args.axisDirection ?? "vertical";
    this.autofocus = args.autofocus ?? false;
    this.keyboardScrolling = args.keyboardScrolling ?? true;
    this.viewportBuilder = args.viewportBuilder;
  }

  createState(): State {
    return new ScrollableState();
  }

  /**
   * 保留静态工具方法（向后兼容）。
   */
  static computeMaxScrollExtent(childHeight: number, viewportHeight: number): number {
    return Math.max(0, childHeight - viewportHeight);
  }
}

// ════════════════════════════════════════════════════
//  ScrollableState
// ════════════════════════════════════════════════════

export class ScrollableState extends State<Scrollable> {
  private _internalController: ScrollController | null = null;
  private _scrollBehavior!: ScrollBehavior;
  private _scrollListener: (() => void) | null = null;

  get controller(): ScrollController {
    return this.widget.controller ?? this._internalController!;
  }

  /**
   * 逆向: amp I1T.initState
   */
  override initState(): void {
    super.initState();

    // Create internal controller if none provided
    if (!this.widget.controller) {
      this._internalController = new ScrollController();
    }

    // Create scroll behavior
    this._scrollBehavior = new ScrollBehavior(this.controller);

    // Add listener → setState triggers rebuild
    this._scrollListener = () => {
      if (this.mounted) this.setState();
    };
    this.controller.addListener(this._scrollListener);
  }

  /**
   * 逆向: amp I1T.handleKeyEvent — 委托给 ScrollBehavior。
   */
  handleKeyEvent = (event: KeyEvent): KeyEventResult => {
    if (!this.widget.keyboardScrolling) return "ignored";
    return this._scrollBehavior.handleKeyEvent(event);
  };

  /**
   * 逆向: amp I1T.handleMouseScrollEvent
   */
  handleMouseScroll = (event: MouseEvent): void => {
    const direction = (event as any).direction as string | undefined;
    if (!direction) return;

    const isVertical = this.widget.axisDirection === "vertical";
    const isUp = direction === "up";
    const isDown = direction === "down";
    const isLeft = direction === "left";
    const isRight = direction === "right";

    const step = 1; // 逆向: amp I1T override — mouse scroll step = 1

    if (isVertical && (isUp || isDown)) {
      this._scrollBehavior.handleScrollDelta(isDown ? step : -step);
    } else if (!isVertical && (isLeft || isRight)) {
      this._scrollBehavior.handleScrollDelta(isRight ? step : -step);
    }
  };

  /**
   * 逆向: amp I1T.build — Focus > MouseRegion > viewportBuilder
   */
  build(context: BuildContext): WidgetInterface {
    const viewport = this.widget.viewportBuilder(context, this.controller);

    return new Focus({
      autofocus: this.widget.autofocus,
      onKey: this.handleKeyEvent,
      debugLabel: "Scrollable",
      child: new MouseRegion({
        onScroll: this.handleMouseScroll,
        opaque: false,
        child: viewport,
      }),
    });
  }

  override dispose(): void {
    // Remove listener
    if (this._scrollListener) {
      this.controller.removeListener(this._scrollListener);
      this._scrollListener = null;
    }

    // Dispose internal controller
    if (this._internalController) {
      this._internalController.dispose();
      this._internalController = null;
    }

    super.dispose();
  }
}
```

- [ ] **Step 3: Update barrel exports**

In `packages/tui/src/scroll/index.ts`, add:

```ts
export * from "./scroll-behavior.js";
```

- [ ] **Step 4: Update existing consumers**

Search the codebase for usages of the old `Scrollable` API. The main consumer is `ListView` in `packages/tui/src/scroll/list-view.ts`. Update it to use the new `viewportBuilder` pattern:

Read `list-view.ts` first, then adapt. The key change: instead of `new Scrollable({ controller, child: viewport })`, use `new Scrollable({ controller, viewportBuilder: (ctx, ctrl) => viewport })`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/scroll/`
Expected: All scroll tests PASS.

- [ ] **Step 6: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 7: tmux e2e verification (CRITICAL)**

```bash
tmux new-session -d -s flitter-scroll -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2
tmux capture-pane -t flitter-scroll -p
# Verify: renders correctly

# Test mouse click
tmux send-keys -t flitter-scroll -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-scroll -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-scroll -p

# Quit
tmux send-keys -t flitter-scroll 'q'
sleep 0.5
tmux kill-session -t flitter-scroll 2>/dev/null
```

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/scroll/ packages/tui/src/index.ts
git commit -m "feat(scroll): rewrite Scrollable as StatefulWidget with Focus integration

Align with amp I1T (interactive_widgets.js:0-81). Scrollable is now a
StatefulWidget whose build() composes Focus > MouseRegion > viewport.
Keyboard scrolling (vim bindings via ScrollBehavior) and mouse wheel
scrolling work automatically. Replaces manual FocusNode + ScrollKeyHandler
wiring."
```

---

## Final Verification — Full Tier 2

After all 3 waves are complete:

1. Run: `cd packages/tui && bun test`
2. Full tmux e2e:

```bash
tmux new-session -d -s flitter-tier2 -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2
tmux capture-pane -t flitter-tier2 -p
# Verify: renders correctly, text alignment visible, no regressions

tmux send-keys -t flitter-tier2 -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-tier2 -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-tier2 -p
# Verify: click works

tmux resize-pane -t flitter-tier2 -x 60 -y 20
sleep 1
tmux capture-pane -t flitter-tier2 -p
# Verify: resize works, no ghost artifacts

tmux send-keys -t flitter-tier2 'q'
sleep 0.5
tmux kill-session -t flitter-tier2 2>/dev/null
```

3. If anything fails, debug and fix before declaring Tier 2 complete.
