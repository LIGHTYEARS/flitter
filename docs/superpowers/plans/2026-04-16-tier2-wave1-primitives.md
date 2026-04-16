# Tier 2 Wave 1: Tree Primitives + Layout/Text

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 independent framework primitives that unblock Wave 2 (Focus/Actions/Shortcuts) and real-world text/layout features.

**Architecture:** All 7 tasks touch different files with no shared state. They can be executed in parallel. Each task adds new methods or properties to existing classes, plus co-located unit tests. All tasks follow TDD: write failing test → implement → verify → commit.

**Tech Stack:** TypeScript, Bun test runner, `node:test` + `node:assert/strict`

**MANDATORY: All implementations MUST cross-reference amp source code.** Before writing any functional code, find the corresponding amp source in `amp-cli-reversed/` (use the `逆向:` comments in existing code to locate the reference). Read and understand amp's implementation. Match amp's behavior, not just its happy path.

**MANDATORY: tmux e2e verification after ALL tasks complete.** After all 7 tasks land, run:

```bash
tmux new-session -d -s flitter-wave1 -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2
tmux capture-pane -t flitter-wave1 -p
# Verify: renders correctly, no regressions
tmux send-keys -t flitter-wave1 -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-wave1 -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-wave1 -p
# Verify: click still works
tmux send-keys -t flitter-wave1 'q'
sleep 0.5
tmux kill-session -t flitter-wave1 2>/dev/null
```

**Amp References:**
- `qm` = Element base: `amp-cli-reversed/modules/0537_unknown_qm.js`
- `l8` = FocusNode: `amp-cli-reversed/modules/2103_unknown_l8.js`
- `r1T` = ClipRect: `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js`
- `t1T` = RenderText: `amp-cli-reversed/modules/1472_tui_components/text_rendering.js`
- `s1T` = RenderFlex: `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js`
- `zm` = ClipScreen: `amp-cli-reversed/modules/1472_tui_components/text_rendering.js:1019-1097`

---

### Task 1: Element.findAncestorWidgetOfType / findAncestorStateOfType

**Files:**
- Modify: `packages/tui/src/tree/element.ts:310` (insert after `findAncestorElementOfType`)
- Test: `packages/tui/src/tree/element.test.ts`

**Amp reference:** `qm.findAncestorWidgetOfType` in `0537_unknown_qm.js` — walks element parent chain, checks `element.widget instanceof T`.

- [ ] **Step 1: Write failing tests for findAncestorWidgetOfType**

Add to `packages/tui/src/tree/element.test.ts`:

```ts
import { StatefulWidget, State, StatefulElement } from "./stateful-widget.js";

describe("Element — findAncestorWidgetOfType (amp qm alignment)", () => {
  it("finds the nearest ancestor widget of the given type", () => {
    // Create a widget tree: Outer > Inner > Leaf
    const leaf = new TestStatelessWidget("leaf");
    const inner = new TestStatelessWidget("inner", leaf);
    const outer = new TestStatelessWidget("outer", inner);

    const rootElement = outer.createElement();
    rootElement.mount(undefined);

    // Walk down to the leaf element
    const innerElement = rootElement.children[0]!;
    const leafElement = innerElement.children[0]!;

    // leafElement should find TestStatelessWidget ancestors
    const found = leafElement.findAncestorWidgetOfType(TestStatelessWidget);
    assert.ok(found !== null);
    assert.ok(found instanceof TestStatelessWidget);
  });

  it("returns null when no ancestor of the given type exists", () => {
    const widget = new TestStatelessWidget("root");
    const element = widget.createElement();
    element.mount(undefined);

    const result = element.findAncestorWidgetOfType(StatefulWidget);
    assert.equal(result, null);
  });
});
```

Note: `TestStatelessWidget` should already exist in the test file. If not, create a minimal one:

```ts
class TestStatelessWidget extends Widget {
  readonly debugName: string;
  readonly child: WidgetInterface | undefined;
  constructor(name: string, child?: WidgetInterface) {
    super({});
    this.debugName = name;
    this.child = child;
  }
  createElement(): Element { return new StatelessElement(this); }
  build(context: BuildContext): WidgetInterface { return this.child!; }
}
```

- [ ] **Step 2: Write failing tests for findAncestorStateOfType**

```ts
describe("Element — findAncestorStateOfType (amp qm alignment)", () => {
  it("finds the nearest ancestor state of the given type", () => {
    // We need a StatefulWidget to test state lookup
    class TestState extends State<TestStatefulWidget> {
      build(context: BuildContext): WidgetInterface {
        return this.widget.child!;
      }
    }
    class TestStatefulWidget extends StatefulWidget {
      child: WidgetInterface;
      constructor(child: WidgetInterface) {
        super({});
        this.child = child;
      }
      createState(): State { return new TestState(); }
    }

    const leaf = new TestStatelessWidget("leaf");
    const stateful = new TestStatefulWidget(leaf);
    const rootElement = stateful.createElement();
    rootElement.mount(undefined);

    // The leaf's element should find TestState as an ancestor state
    const leafElement = rootElement.children[0]!;
    const found = leafElement.findAncestorStateOfType(TestState);
    assert.ok(found !== null);
    assert.ok(found instanceof TestState);
  });

  it("returns null when no ancestor has a matching state", () => {
    class OtherState extends State {
      build(context: BuildContext): WidgetInterface { throw new Error("unused"); }
    }
    const leaf = new TestStatelessWidget("leaf");
    const element = leaf.createElement();
    element.mount(undefined);

    const result = element.findAncestorStateOfType(OtherState);
    assert.equal(result, null);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/tree/element.test.ts`
Expected: FAIL — `findAncestorWidgetOfType` and `findAncestorStateOfType` do not exist.

- [ ] **Step 4: Implement findAncestorWidgetOfType**

In `packages/tui/src/tree/element.ts`, add after `findAncestorElementOfType` (after line 310):

```ts
  /**
   * 向上查找指定类型的祖先 Widget。
   *
   * 逆向: amp qm.findAncestorWidgetOfType — 遍历父链检查 widget instanceof T。
   * 不注册依赖关系（与 dependOnInheritedWidgetOfExactType 不同）。
   *
   * @param type - 目标 Widget 的构造函数
   * @returns 匹配的祖先 Widget，未找到时返回 null
   */
  findAncestorWidgetOfType<T extends WidgetInterface>(
    type: new (...args: unknown[]) => T,
  ): T | null {
    let current = this._parent;
    while (current !== undefined) {
      if (current.widget instanceof type) {
        return current.widget as T;
      }
      current = current._parent;
    }
    return null;
  }
```

- [ ] **Step 5: Implement findAncestorStateOfType**

Add immediately after `findAncestorWidgetOfType`:

```ts
  /**
   * 向上查找指定类型的祖先 State。
   *
   * 逆向: amp qm.findAncestorStateOfType — 遍历父链找 StatefulElement，
   * 检查 element.state instanceof T。
   *
   * @param type - 目标 State 的构造函数
   * @returns 匹配的祖先 State，未找到时返回 null
   */
  findAncestorStateOfType<T>(
    type: new (...args: unknown[]) => T,
  ): T | null {
    let current = this._parent;
    while (current !== undefined) {
      if ("state" in current && (current as any).state instanceof type) {
        return (current as any).state as T;
      }
      current = current._parent;
    }
    return null;
  }
```

Note: We use `"state" in current` duck-type check instead of importing `StatefulElement` to avoid a circular dependency (element.ts ↔ stateful-widget.ts). The `StatefulElement` class exposes `_state` as a public field (line 202 of `stateful-widget.ts`) and a `state` getter (line 209). The `"state" in current` check safely detects it.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/tree/element.test.ts`
Expected: All tests PASS including the 4 new ones.

- [ ] **Step 7: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All ~1289 tests PASS (no regressions).

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/tree/element.ts packages/tui/src/tree/element.test.ts
git commit -m "feat(element): add findAncestorWidgetOfType and findAncestorStateOfType

Align with amp qm.findAncestorWidgetOfType (0537_unknown_qm.js). Both
methods walk the element parent chain: findAncestorWidgetOfType checks
widget instanceof T, findAncestorStateOfType checks for StatefulElement
with state instanceof T. No dependency registration (unlike inherited
widget lookup). Used by Focus widget for auto-parenting."
```

---

### Task 2: FocusNode.addKeyHandler / removeKeyHandler

**Files:**
- Modify: `packages/tui/src/focus/focus-node.ts:204` (insert after `set onPaste`)
- Test: `packages/tui/src/focus/focus-node.test.ts`

**Amp reference:** `l8.addKeyHandler` / `l8.removeKeyHandler` in `2103_unknown_l8.js` — push/indexOf+splice pattern.

- [ ] **Step 1: Write failing tests**

Add to `packages/tui/src/focus/focus-node.test.ts`:

```ts
describe("FocusNode — addKeyHandler / removeKeyHandler (amp l8 alignment)", () => {
  it("addKeyHandler appends a handler that receives key events", () => {
    const node = new FocusNode();
    let receivedEvent: KeyEvent | null = null;
    const handler: KeyHandler = (event) => {
      receivedEvent = event;
      return "handled";
    };

    node.addKeyHandler(handler);

    const event: KeyEvent = { key: "a", code: "KeyA", type: "keydown" } as KeyEvent;
    const result = node._handleKeyEvent(event);
    assert.equal(result, "handled");
    assert.equal(receivedEvent, event);
  });

  it("removeKeyHandler removes a handler by reference", () => {
    const node = new FocusNode();
    let callCount = 0;
    const handler: KeyHandler = () => { callCount++; return "ignored"; };

    node.addKeyHandler(handler);
    node._handleKeyEvent({ key: "a", code: "KeyA", type: "keydown" } as KeyEvent);
    assert.equal(callCount, 1);

    node.removeKeyHandler(handler);
    node._handleKeyEvent({ key: "b", code: "KeyB", type: "keydown" } as KeyEvent);
    assert.equal(callCount, 1, "handler should not be called after removal");
  });

  it("removeKeyHandler only removes first occurrence", () => {
    const node = new FocusNode();
    let callCount = 0;
    const handler: KeyHandler = () => { callCount++; return "ignored"; };

    node.addKeyHandler(handler);
    node.addKeyHandler(handler); // added twice
    node.removeKeyHandler(handler); // removes first

    node._handleKeyEvent({ key: "a", code: "KeyA", type: "keydown" } as KeyEvent);
    assert.equal(callCount, 1, "one copy should remain after removing first");
  });

  it("removeKeyHandler is no-op for unknown handler", () => {
    const node = new FocusNode();
    const handler: KeyHandler = () => "ignored";
    // Should not throw
    node.removeKeyHandler(handler);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/focus/focus-node.test.ts`
Expected: FAIL — `addKeyHandler` and `removeKeyHandler` do not exist.

- [ ] **Step 3: Implement addKeyHandler and removeKeyHandler**

In `packages/tui/src/focus/focus-node.ts`, add after the `set onPaste` block (after line 204):

```ts
  // ──────────────────────────────────────────────
  // 键盘处理器管理
  // ──────────────────────────────────────────────

  /**
   * 添加一个键盘事件处理器。
   *
   * 逆向: amp l8.addKeyHandler — push 到 _keyHandlers 数组末尾，不去重。
   *
   * @param handler - 键盘事件处理函数
   */
  addKeyHandler(handler: KeyHandler): void {
    this._keyHandlers.push(handler);
  }

  /**
   * 移除一个键盘事件处理器。
   *
   * 逆向: amp l8.removeKeyHandler — indexOf + splice，仅移除第一个匹配项。
   *
   * @param handler - 要移除的处理函数引用
   */
  removeKeyHandler(handler: KeyHandler): void {
    const idx = this._keyHandlers.indexOf(handler);
    if (idx !== -1) {
      this._keyHandlers.splice(idx, 1);
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/focus/focus-node.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All ~1289 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/focus/focus-node.ts packages/tui/src/focus/focus-node.test.ts
git commit -m "feat(focus-node): add addKeyHandler and removeKeyHandler

Align with amp l8.addKeyHandler/removeKeyHandler (2103_unknown_l8.js).
addKeyHandler appends without dedup; removeKeyHandler removes first
occurrence by reference via indexOf+splice. Required by Focus widget
(Wave 2) for dynamic key handler registration."
```

---

### Task 3: ClipBox Widget

**Files:**
- Create: `packages/tui/src/widgets/clip-box.ts`
- Create: `packages/tui/src/widgets/clip-box.test.ts`
- Modify: `packages/tui/src/index.ts` (add exports)

**Amp reference:** `r1T` in `layout_widgets.js` — single-child render object that wraps child painting in `ClipScreen` (`zm`).

- [ ] **Step 1: Write failing test**

Create `packages/tui/src/widgets/clip-box.test.ts`:

```ts
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { ClipBox, RenderClipBox } from "./clip-box.js";
import { BoxConstraints } from "../tree/constraints.js";
import { Screen } from "../screen/screen.js";

describe("RenderClipBox", () => {
  it("passes constraints to child and takes child size", () => {
    const renderClip = new RenderClipBox();
    const child = new TestRenderBox(20, 5);
    renderClip.adoptChild(child);
    renderClip.attach();

    const constraints = BoxConstraints.tight(80, 24);
    renderClip.layout(constraints);

    assert.equal(renderClip.size.width, 20);
    assert.equal(renderClip.size.height, 5);
  });

  it("clips child painting to own bounds", () => {
    const renderClip = new RenderClipBox();
    const child = new WideTestBox(100, 3); // wider than clip area
    renderClip.adoptChild(child);
    renderClip.attach();

    // Clip box constrained to 40x10
    const constraints = new BoxConstraints({ minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 10 });
    renderClip.layout(constraints);

    const screen = new Screen(80, 24);
    renderClip.paint(screen, 5, 2);

    // Characters at x=5..44 (within clip 5+0..5+40-1=44) should be visible
    const cellInside = screen.getCell(10, 2);
    assert.ok(cellInside.char !== " ", "cell inside clip should be painted");

    // Characters at x=46 (outside clip) should be empty
    const cellOutside = screen.getCell(46, 2);
    assert.equal(cellOutside.char, " ", "cell outside clip should be empty");
  });
});
```

Note: `TestRenderBox` and `WideTestBox` are test helpers — `TestRenderBox` sets its size to the given fixed dimensions; `WideTestBox` always paints characters across its full width. Create them in the test file:

```ts
import { RenderBox } from "../tree/render-box.js";

class TestRenderBox extends RenderBox {
  private _w: number;
  private _h: number;
  constructor(w: number, h: number) { super(); this._w = w; this._h = h; }
  performLayout(): void { this.size = this._constraints!.constrain(this._w, this._h); }
}

class WideTestBox extends RenderBox {
  private _w: number;
  private _h: number;
  constructor(w: number, h: number) { super(); this._w = w; this._h = h; }
  performLayout(): void { this.size = { width: this._w, height: this._h }; }
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    for (let x = 0; x < this._w; x++) {
      for (let y = 0; y < this._h; y++) {
        screen.writeChar(offsetX + x, offsetY + y, "X", undefined, 1);
      }
    }
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/widgets/clip-box.test.ts`
Expected: FAIL — module `./clip-box.js` does not exist.

- [ ] **Step 3: Implement ClipBox and RenderClipBox**

Create `packages/tui/src/widgets/clip-box.ts`:

```ts
/**
 * 裁剪盒 Widget。
 *
 * 将子节点绘制限制在自身尺寸范围内，超出部分被静默丢弃。
 *
 * 逆向: amp r1T (layout_widgets.js) — 单子 RenderObject，
 * performPaint 中创建 ClipScreen 包裹子节点绘制。
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import { SingleChildRenderObjectElement } from "../tree/render-object-element.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { ClipScreen } from "./viewport.js";

// ════════════════════════════════════════════════════
//  RenderClipBox
// ════════════════════════════════════════════════════

/**
 * 裁剪渲染对象。
 *
 * 子节点在自身约束范围内布局，绘制时通过 ClipScreen
 * 静默丢弃超出自身尺寸的像素。
 *
 * 逆向: amp r1T — performPaint 创建 ClipScreen
 */
export class RenderClipBox extends RenderBox {
  /**
   * 布局：将约束传递给子节点，取子节点尺寸为自身尺寸。
   */
  performLayout(): void {
    const constraints = this._constraints!;
    const child = this._children[0];
    if (child && child instanceof RenderBox) {
      child.layout(constraints);
      this.size = child.size;
    } else {
      this.size = constraints.constrain(0, 0);
    }
  }

  /**
   * 绘制：创建 ClipScreen 限制子节点绘制范围。
   *
   * 逆向: amp r1T.performPaint — new zm(screen, x, y, w, h)
   */
  override performPaint(
    screen: Screen,
    offsetX: number,
    offsetY: number,
  ): void {
    const child = this._children[0];
    if (!child) return;

    const clipScreen = new ClipScreen(
      screen,
      offsetX,
      offsetY,
      this._size.width,
      this._size.height,
    );
    child.paint(clipScreen as unknown as Screen, offsetX, offsetY);
  }
}

// ════════════════════════════════════════════════════
//  ClipBox Widget
// ════════════════════════════════════════════════════

interface ClipBoxArgs {
  key?: Key;
  child?: WidgetInterface;
}

/**
 * 裁剪盒 Widget。
 *
 * 创建 {@link RenderClipBox} 渲染对象，将子节点绘制限制在自身尺寸范围内。
 */
export class ClipBox extends Widget implements RenderObjectWidget {
  readonly child: WidgetInterface | undefined;

  constructor(args: ClipBoxArgs) {
    super({ key: args.key });
    this.child = args.child;
  }

  createElement(): Element {
    return new SingleChildRenderObjectElement(
      this as unknown as WidgetInterface,
    );
  }

  createRenderObject(): RenderObject {
    return new RenderClipBox();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // No mutable properties to update
  }
}
```

- [ ] **Step 4: Add exports to barrel**

In `packages/tui/src/index.ts`, add:

```ts
export { ClipBox, RenderClipBox } from "./widgets/clip-box.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/widgets/clip-box.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All ~1289 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/widgets/clip-box.ts packages/tui/src/widgets/clip-box.test.ts packages/tui/src/index.ts
git commit -m "feat(widgets): add ClipBox widget for paint-level clipping

Add ClipBox (SingleChildRenderObjectWidget) and RenderClipBox that wraps
child painting in a ClipScreen. Aligns with amp r1T (layout_widgets.js).
Child content beyond the clip box bounds is silently discarded."
```

---

### Task 4: Text Alignment / Overflow / MaxLines

**Files:**
- Modify: `packages/tui/src/widgets/rich-text.ts` (RenderParagraph + RichText)
- Test: `packages/tui/src/widgets/rich-text.test.ts`

**Amp reference:** `t1T` in `text_rendering.js` — `textAlign`, `overflow`, `maxLines` on the render object.

- [ ] **Step 1: Write failing tests for textAlign**

Add to `packages/tui/src/widgets/rich-text.test.ts`:

```ts
describe("RenderParagraph — textAlign (amp t1T alignment)", () => {
  it("center alignment offsets text to the center of the line", () => {
    const span = new TextSpan({ text: "Hi" }); // width=2
    const rp = new RenderParagraph(span, { textAlign: "center" });
    rp.layout(BoxConstraints.tight(10, 3));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // "Hi" is 2 wide in a 10-wide box → offset = floor((10-2)/2) = 4
    const cell0 = screen.getCell(4, 0);
    assert.equal(cell0.char, "H");
  });

  it("right alignment offsets text to the right edge", () => {
    const span = new TextSpan({ text: "Hi" }); // width=2
    const rp = new RenderParagraph(span, { textAlign: "right" });
    rp.layout(BoxConstraints.tight(10, 3));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // "Hi" is 2 wide in a 10-wide box → offset = 10-2 = 8
    const cell0 = screen.getCell(8, 0);
    assert.equal(cell0.char, "H");
  });
});
```

- [ ] **Step 2: Write failing tests for maxLines and overflow**

```ts
describe("RenderParagraph — maxLines + overflow (amp t1T alignment)", () => {
  it("maxLines truncates visible lines", () => {
    // "abcde fghij klmno" wrapping at width=6 produces 3 lines: "abcde ", "fghij ", "klmno"
    const span = new TextSpan({ text: "abcde fghij klmno" });
    const rp = new RenderParagraph(span, { maxLines: 2 });
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 6, minHeight: 0, maxHeight: 100 }));

    assert.equal(rp.size.height, 2, "height should be capped at maxLines");
  });

  it("overflow ellipsis appends '…' on last visible line", () => {
    const span = new TextSpan({ text: "abcde fghij klmno" });
    const rp = new RenderParagraph(span, { maxLines: 2, overflow: "ellipsis" });
    rp.layout(new BoxConstraints({ minWidth: 0, maxWidth: 6, minHeight: 0, maxHeight: 100 }));

    const screen = new Screen(80, 24);
    rp.paint(screen, 0, 0);

    // Last visible line (line 1) should end with "…"
    // Check the last character of line 1 is the ellipsis
    const lastChar = screen.getCell(5, 1);
    assert.equal(lastChar.char, "…");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/widgets/rich-text.test.ts`
Expected: FAIL — `RenderParagraph` constructor does not accept options object.

- [ ] **Step 4: Add properties to RenderParagraph**

In `packages/tui/src/widgets/rich-text.ts`, modify the `RenderParagraph` class:

Add type definition after the `LayoutGlyph` interface (after line 46):

```ts
/** 文本对齐方式 */
export type TextAlign = "left" | "center" | "right";

/** 文本溢出处理 */
export type TextOverflow = "clip" | "ellipsis" | "visible";

/** RenderParagraph 配置选项 */
interface RenderParagraphOptions {
  textAlign?: TextAlign;
  overflow?: TextOverflow;
  maxLines?: number;
}
```

Add fields to `RenderParagraph` (after line 98):

```ts
  /** 文本对齐方式 */
  private _textAlign: TextAlign;

  /** 溢出处理方式 */
  private _overflow: TextOverflow;

  /** 最大行数 */
  private _maxLines: number | undefined;
```

Update constructor (replace lines 105-108):

```ts
  constructor(textSpan: TextSpan, options?: RenderParagraphOptions) {
    super();
    this._textSpan = textSpan;
    this._textAlign = options?.textAlign ?? "left";
    this._overflow = options?.overflow ?? "clip";
    this._maxLines = options?.maxLines;
  }
```

Add getters/setters (after `set textSpan`):

```ts
  get textAlign(): TextAlign { return this._textAlign; }
  set textAlign(value: TextAlign) {
    if (this._textAlign !== value) {
      this._textAlign = value;
      this.markNeedsPaint();
    }
  }

  get overflow(): TextOverflow { return this._overflow; }
  set overflow(value: TextOverflow) {
    if (this._overflow !== value) {
      this._overflow = value;
      if (value === "ellipsis") this.markNeedsLayout(); else this.markNeedsPaint();
    }
  }

  get maxLines(): number | undefined { return this._maxLines; }
  set maxLines(value: number | undefined) {
    if (this._maxLines !== value) {
      this._maxLines = value;
      this.markNeedsLayout();
    }
  }
```

- [ ] **Step 5: Implement maxLines + ellipsis in performLayout**

In `performLayout()`, after the existing line-wrapping loop and before setting size (after line 176 `this._lines = lines;`), add:

```ts
    // maxLines 截断
    // 逆向: amp t1T — 超过 maxLines 的行被丢弃
    if (this._maxLines !== undefined && lines.length > this._maxLines) {
      lines.length = this._maxLines;

      // ellipsis 处理: 替换最后一行的尾部字符为 '…'
      if (this._overflow === "ellipsis" && lines.length > 0) {
        const lastLine = lines[lines.length - 1]!;
        let lastLineWidth = 0;
        for (const g of lastLine) lastLineWidth += g.width;

        // 如果最后一行已满，替换最后一个字符为 …
        if (lastLineWidth >= maxWidth) {
          // 移除尾部字符直到腾出 1 格空间
          while (lastLine.length > 0 && lastLineWidth > maxWidth - 1) {
            const removed = lastLine.pop()!;
            lastLineWidth -= removed.width;
          }
        }
        // 追加 … 字素
        const ellipsisStyle = lastLine.length > 0
          ? lastLine[lastLine.length - 1]!.style
          : TextStyle.NORMAL;
        lastLine.push({ grapheme: "…", style: ellipsisStyle, width: 1 });
      }
    }

    this._lines = lines;
```

Remove the duplicate `this._lines = lines;` that was at the old location (line 176). The new code now assigns it.

- [ ] **Step 6: Implement textAlign in performPaint**

Replace `performPaint` (lines 202-213) with:

```ts
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const boxWidth = this._size.width;

    for (let lineIdx = 0; lineIdx < this._lines.length; lineIdx++) {
      const line = this._lines[lineIdx]!;
      const y = offsetY + lineIdx;

      // 计算行宽
      let lineWidth = 0;
      for (const glyph of line) lineWidth += glyph.width;

      // 逆向: amp t1T — 按 textAlign 计算行起始偏移
      let alignOffset = 0;
      if (this._textAlign === "center") {
        alignOffset = Math.floor((boxWidth - lineWidth) / 2);
      } else if (this._textAlign === "right") {
        alignOffset = boxWidth - lineWidth;
      }

      let x = offsetX + alignOffset;
      for (const glyph of line) {
        screen.writeChar(x, y, glyph.grapheme, glyph.style, glyph.width);
        x += glyph.width;
      }
    }
  }
```

- [ ] **Step 7: Update RichText widget to propagate new properties**

In the `RichTextArgs` interface (around line 273), add:

```ts
  textAlign?: TextAlign;
  overflow?: TextOverflow;
  maxLines?: number;
```

In the `RichText` class, add fields:

```ts
  readonly textAlign: TextAlign;
  readonly overflow: TextOverflow;
  readonly maxLines: number | undefined;
```

Update `RichText` constructor (replace the body):

```ts
  constructor(args: RichTextArgs) {
    super({ key: args.key });
    this.text = args.text;
    this.textAlign = args.textAlign ?? "left";
    this.overflow = args.overflow ?? "clip";
    this.maxLines = args.maxLines;
  }
```

Update `createRenderObject`:

```ts
  createRenderObject(): RenderObject {
    return new RenderParagraph(this.text, {
      textAlign: this.textAlign,
      overflow: this.overflow,
      maxLines: this.maxLines,
    });
  }
```

Update `updateRenderObject`:

```ts
  updateRenderObject(renderObject: RenderObject): void {
    const rp = renderObject as RenderParagraph;
    rp.textSpan = this.text;
    rp.textAlign = this.textAlign;
    rp.overflow = this.overflow;
    rp.maxLines = this.maxLines;
  }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/widgets/rich-text.test.ts`
Expected: All tests PASS.

- [ ] **Step 9: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/tui/src/widgets/rich-text.ts packages/tui/src/widgets/rich-text.test.ts
git commit -m "feat(rich-text): add textAlign, overflow, maxLines to RenderParagraph

Align with amp t1T (text_rendering.js). textAlign supports left/center/
right with per-line offset in paint. maxLines truncates visible lines.
overflow=ellipsis appends '…' on the last visible line. Also adds
updateRenderObject to RichText for dynamic property propagation."
```

---

### Task 5: Text Intrinsic Sizes on RenderParagraph

**Files:**
- Modify: `packages/tui/src/widgets/rich-text.ts` (add 4 intrinsic methods)
- Test: `packages/tui/src/widgets/rich-text.test.ts`

**Amp reference:** `t1T.getMinIntrinsicWidth/Height` in `text_rendering.js`

- [ ] **Step 1: Write failing tests**

Add to `packages/tui/src/widgets/rich-text.test.ts`:

```ts
describe("RenderParagraph — intrinsic sizes (amp t1T alignment)", () => {
  it("getMaxIntrinsicWidth returns total single-line width", () => {
    const span = new TextSpan({ text: "Hello World" }); // 11 chars, each width=1
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMaxIntrinsicWidth(Infinity), 11);
  });

  it("getMinIntrinsicWidth returns widest word", () => {
    const span = new TextSpan({ text: "Hi There" }); // words: "Hi"(2), "There"(5)
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMinIntrinsicWidth(Infinity), 5);
  });

  it("getMinIntrinsicHeight returns wrapped line count", () => {
    const span = new TextSpan({ text: "Hello World" }); // 11 chars
    const rp = new RenderParagraph(span);
    // At width=6, wraps to: "Hello "(6) + "World"(5) = 2 lines
    assert.equal(rp.getMinIntrinsicHeight(6), 2);
  });

  it("getMaxIntrinsicHeight equals minIntrinsicHeight for text", () => {
    const span = new TextSpan({ text: "Hello World" });
    const rp = new RenderParagraph(span);
    assert.equal(rp.getMaxIntrinsicHeight(6), rp.getMinIntrinsicHeight(6));
  });

  it("getMinIntrinsicHeight respects maxLines", () => {
    const span = new TextSpan({ text: "a b c d e f" }); // 6 words
    const rp = new RenderParagraph(span, { maxLines: 2 });
    // At width=2, each word is its own line → 6 lines, but maxLines=2
    assert.equal(rp.getMinIntrinsicHeight(2), 2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/widgets/rich-text.test.ts`
Expected: FAIL — intrinsic methods return 0 (default RenderBox behavior for leaf nodes).

- [ ] **Step 3: Extract _computeLines helper**

In `RenderParagraph`, extract the glyph-collection + wrapping logic into a reusable method. Add before `performLayout`:

```ts
  /**
   * 收集字素并按给定宽度换行。
   *
   * 供 performLayout 和 intrinsic size 方法共用。
   */
  private _computeLines(maxWidth: number): LayoutGlyph[][] {
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);

    if (allGlyphs.length === 0) return [];

    const lines: LayoutGlyph[][] = [];
    let currentLine: LayoutGlyph[] = [];
    let currentLineWidth = 0;

    for (const glyph of allGlyphs) {
      if (currentLine.length > 0 && currentLineWidth + glyph.width > maxWidth) {
        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }
      currentLine.push(glyph);
      currentLineWidth += glyph.width;
    }
    if (currentLine.length > 0) lines.push(currentLine);

    return lines;
  }
```

Then update `performLayout` to use `_computeLines`:

```ts
  performLayout(): void {
    const constraints = this._constraints!;
    const maxWidth = constraints.maxWidth;

    let lines = this._computeLines(maxWidth);

    // 空文本
    if (lines.length === 0) {
      this._lines = [];
      this.size = constraints.constrain(0, 0);
      return;
    }

    // maxLines 截断 + ellipsis (existing code from Task 4)
    if (this._maxLines !== undefined && lines.length > this._maxLines) {
      lines.length = this._maxLines;
      if (this._overflow === "ellipsis" && lines.length > 0) {
        const lastLine = lines[lines.length - 1]!;
        let lastLineWidth = 0;
        for (const g of lastLine) lastLineWidth += g.width;
        if (lastLineWidth >= maxWidth) {
          while (lastLine.length > 0 && lastLineWidth > maxWidth - 1) {
            const removed = lastLine.pop()!;
            lastLineWidth -= removed.width;
          }
        }
        const ellipsisStyle = lastLine.length > 0
          ? lastLine[lastLine.length - 1]!.style
          : TextStyle.NORMAL;
        lastLine.push({ grapheme: "…", style: ellipsisStyle, width: 1 });
      }
    }

    this._lines = lines;

    let maxLineWidth = 0;
    for (const line of lines) {
      let lineWidth = 0;
      for (const glyph of line) lineWidth += glyph.width;
      if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
    }

    this.size = constraints.constrain(maxLineWidth, lines.length);
  }
```

- [ ] **Step 4: Implement the 4 intrinsic methods**

Add to `RenderParagraph` (after `_computeLines`, before `performLayout`):

```ts
  /**
   * 逆向: amp t1T.getMinIntrinsicWidth — 最宽不可断行词的宽度。
   */
  override getMinIntrinsicWidth(_height: number): number {
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);
    if (allGlyphs.length === 0) return 0;

    let maxWordWidth = 0;
    let currentWordWidth = 0;
    for (const glyph of allGlyphs) {
      if (glyph.grapheme === " " || glyph.grapheme === "\t") {
        if (currentWordWidth > maxWordWidth) maxWordWidth = currentWordWidth;
        currentWordWidth = 0;
      } else {
        currentWordWidth += glyph.width;
      }
    }
    if (currentWordWidth > maxWordWidth) maxWordWidth = currentWordWidth;
    return maxWordWidth;
  }

  /**
   * 逆向: amp t1T.getMaxIntrinsicWidth — 所有字素在单行时的总宽度。
   */
  override getMaxIntrinsicWidth(_height: number): number {
    const allGlyphs: LayoutGlyph[] = [];
    this._collectGlyphs(this._textSpan, [], allGlyphs);
    let total = 0;
    for (const glyph of allGlyphs) total += glyph.width;
    return total;
  }

  /**
   * 逆向: amp t1T.getMinIntrinsicHeight — 在给定宽度下的换行行数。
   */
  override getMinIntrinsicHeight(width: number): number {
    const lines = this._computeLines(width);
    const count = lines.length;
    if (this._maxLines !== undefined && count > this._maxLines) return this._maxLines;
    return count;
  }

  /**
   * 逆向: amp t1T.getMaxIntrinsicHeight — 文本不会垂直扩展，等于 min。
   */
  override getMaxIntrinsicHeight(width: number): number {
    return this.getMinIntrinsicHeight(width);
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/widgets/rich-text.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/widgets/rich-text.ts packages/tui/src/widgets/rich-text.test.ts
git commit -m "feat(rich-text): add intrinsic size methods to RenderParagraph

Align with amp t1T intrinsic methods. getMinIntrinsicWidth returns the
widest non-breakable word. getMaxIntrinsicWidth returns total single-line
width. getMin/MaxIntrinsicHeight return wrapped line count (respecting
maxLines). Also extracts _computeLines helper for shared use."
```

---

### Task 6: Flex Intrinsic Sizes

**Files:**
- Modify: `packages/tui/src/widgets/flex.ts:399` (add 4 intrinsic methods to RenderFlex)
- Test: `packages/tui/src/widgets/flex.test.ts`

**Amp reference:** `s1T` lines 480-600 in `layout_widgets.js`

- [ ] **Step 1: Write failing tests**

Add to `packages/tui/src/widgets/flex.test.ts`:

```ts
describe("RenderFlex — intrinsic sizes (amp s1T alignment)", () => {
  it("Row: getMinIntrinsicWidth = sum of non-flex children minWidths", () => {
    const flex = new RenderFlex({ direction: "horizontal" });
    const fixed1 = new FixedSizeBox(10, 5); // minWidth=10
    const fixed2 = new FixedSizeBox(20, 5); // minWidth=20
    const flexChild = new FixedSizeBox(30, 5);

    flex.adoptChild(fixed1);
    flex.adoptChild(fixed2);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    // non-flex: 10 + 20 = 30; flex child contributes 0 for min
    assert.equal(flex.getMinIntrinsicWidth(Infinity), 30);
  });

  it("Row: getMaxIntrinsicWidth = sum of ALL children maxWidths", () => {
    const flex = new RenderFlex({ direction: "horizontal" });
    const fixed1 = new FixedSizeBox(10, 5);
    const fixed2 = new FixedSizeBox(20, 5);
    const flexChild = new FixedSizeBox(30, 5);

    flex.adoptChild(fixed1);
    flex.adoptChild(fixed2);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    // All children: 10 + 20 + 30 = 60
    assert.equal(flex.getMaxIntrinsicWidth(Infinity), 60);
  });

  it("Row: getMinIntrinsicHeight = max of children minHeights (cross axis)", () => {
    const flex = new RenderFlex({ direction: "horizontal" });
    const child1 = new FixedSizeBox(10, 3);
    const child2 = new FixedSizeBox(10, 7);

    flex.adoptChild(child1);
    flex.adoptChild(child2);

    assert.equal(flex.getMinIntrinsicHeight(Infinity), 7);
  });

  it("Column: getMinIntrinsicHeight = sum of non-flex children minHeights", () => {
    const flex = new RenderFlex({ direction: "vertical" });
    const fixed1 = new FixedSizeBox(10, 5);
    const flexChild = new FixedSizeBox(10, 8);

    flex.adoptChild(fixed1);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    assert.equal(flex.getMinIntrinsicHeight(Infinity), 5);
  });
});
```

Note: `FixedSizeBox` is a test helper with fixed intrinsic sizes:

```ts
class FixedSizeBox extends RenderBox {
  private _w: number;
  private _h: number;
  constructor(w: number, h: number) { super(); this._w = w; this._h = h; }
  performLayout(): void { this.size = this._constraints!.constrain(this._w, this._h); }
  override getMinIntrinsicWidth(_h: number): number { return this._w; }
  override getMaxIntrinsicWidth(_h: number): number { return this._w; }
  override getMinIntrinsicHeight(_w: number): number { return this._h; }
  override getMaxIntrinsicHeight(_w: number): number { return this._h; }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/widgets/flex.test.ts`
Expected: FAIL — RenderFlex intrinsics return wrong values (default max-of-children instead of sum/direction-aware).

- [ ] **Step 3: Implement 4 intrinsic methods on RenderFlex**

In `packages/tui/src/widgets/flex.ts`, add before the closing `}` of `RenderFlex` (before line 400):

```ts
  // ════════════════════════════════════════════════════
  //  内在尺寸 (Intrinsic sizes)
  // ════════════════════════════════════════════════════

  /**
   * 逆向: amp s1T.getMinIntrinsicWidth
   * 水平: sum of non-flex children minWidth (flex children contribute 0)
   * 垂直: max of all children minWidth (cross-axis)
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this.direction === "horizontal") {
      let sum = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          if (pd.flex === 0) {
            sum += child.getMinIntrinsicWidth(height);
          }
        }
      }
      return sum;
    } else {
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          max = Math.max(max, child.getMinIntrinsicWidth(height));
        }
      }
      return max;
    }
  }

  /**
   * 逆向: amp s1T.getMaxIntrinsicWidth
   * 水平: sum of ALL children maxWidth
   * 垂直: max of all children maxWidth
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this.direction === "horizontal") {
      let sum = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          sum += child.getMaxIntrinsicWidth(height);
        }
      }
      return sum;
    } else {
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          max = Math.max(max, child.getMaxIntrinsicWidth(height));
        }
      }
      return max;
    }
  }

  /**
   * 逆向: amp s1T.getMinIntrinsicHeight
   * 水平: max of all children minHeight (cross-axis)
   * 垂直: sum of non-flex children minHeight
   */
  override getMinIntrinsicHeight(width: number): number {
    if (this.direction === "horizontal") {
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          max = Math.max(max, child.getMinIntrinsicHeight(width));
        }
      }
      return max;
    } else {
      let sum = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          const pd = child.parentData as FlexParentData;
          if (pd.flex === 0) {
            sum += child.getMinIntrinsicHeight(width);
          }
        }
      }
      return sum;
    }
  }

  /**
   * 逆向: amp s1T.getMaxIntrinsicHeight
   * 水平: max of all children maxHeight
   * 垂直: sum of ALL children maxHeight
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this.direction === "horizontal") {
      let max = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          max = Math.max(max, child.getMaxIntrinsicHeight(width));
        }
      }
      return max;
    } else {
      let sum = 0;
      for (const child of this._children) {
        if (child instanceof RenderBox) {
          sum += child.getMaxIntrinsicHeight(width);
        }
      }
      return sum;
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/widgets/flex.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/widgets/flex.ts packages/tui/src/widgets/flex.test.ts
git commit -m "feat(flex): add flex-aware intrinsic size methods to RenderFlex

Align with amp s1T (layout_widgets.js:480-600). Main-axis intrinsics sum
children (non-flex only for min, all for max). Cross-axis intrinsics take
the max. Direction-aware: Row sums widths, Column sums heights."
```

---

### Task 7: TextSpan Hyperlink / onClick

**Files:**
- Modify: `packages/tui/src/widgets/text-span.ts` (add `url`, `onTap`)
- Modify: `packages/tui/src/widgets/rich-text.ts` (LayoutGlyph span ref, hit-test, OSC 8)
- Test: `packages/tui/src/widgets/text-span.test.ts`
- Test: `packages/tui/src/widgets/rich-text.test.ts`

**Amp reference:** `G.hyperlink`, `G.onClick` in `text_rendering.js`. `t1T` does per-glyph hit-testing.

- [ ] **Step 1: Write failing tests for TextSpan new properties**

Add to `packages/tui/src/widgets/text-span.test.ts`:

```ts
describe("TextSpan — url and onTap (amp G alignment)", () => {
  it("accepts url property", () => {
    const span = new TextSpan({ text: "Click me", url: "https://example.com" });
    assert.equal(span.url, "https://example.com");
  });

  it("accepts onTap callback", () => {
    let tapped = false;
    const span = new TextSpan({ text: "Click me", onTap: () => { tapped = true; } });
    assert.ok(span.onTap);
    span.onTap!();
    assert.equal(tapped, true);
  });

  it("url and onTap default to undefined", () => {
    const span = new TextSpan({ text: "plain" });
    assert.equal(span.url, undefined);
    assert.equal(span.onTap, undefined);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/widgets/text-span.test.ts`
Expected: FAIL — `url` and `onTap` properties do not exist on TextSpan.

- [ ] **Step 3: Add url and onTap to TextSpan**

In `packages/tui/src/widgets/text-span.ts`, add fields after line 36 (`readonly children`):

```ts
  /** OSC 8 超链接 URL */
  readonly url?: string;

  /** 点击回调 */
  readonly onTap?: () => void;
```

Update the constructor options type and body to accept and assign these:

In the constructor parameter type (around line 46), add `url?: string; onTap?: () => void;`.

In the constructor body, add:

```ts
    this.url = options.url;
    this.onTap = options.onTap;
```

- [ ] **Step 4: Add span reference to LayoutGlyph**

In `packages/tui/src/widgets/rich-text.ts`, update the `LayoutGlyph` interface (line 39):

```ts
interface LayoutGlyph {
  grapheme: string;
  style: TextStyle;
  width: number;
  /** 来源 TextSpan 引用 */
  span: TextSpan;
}
```

Update `_collectGlyphs` to pass the span reference. In the glyph creation loop (around line 237), change:

```ts
        out.push({ grapheme: seg, style: effectiveStyle, width: w });
```

to:

```ts
        out.push({ grapheme: seg, style: effectiveStyle, width: w, span });
```

Where `span` is the current TextSpan being processed (first parameter of `_collectGlyphs`).

- [ ] **Step 5: Write failing test for glyph→span lookup**

Add to `packages/tui/src/widgets/rich-text.test.ts`:

```ts
describe("RenderParagraph — TextSpan onClick (amp t1T alignment)", () => {
  it("LayoutGlyph stores span reference for hit-testing", () => {
    let tapped = false;
    const span = new TextSpan({
      text: "Click",
      onTap: () => { tapped = true; },
    });
    const rp = new RenderParagraph(span);
    rp.layout(BoxConstraints.tight(80, 24));

    // Access internal _lines to verify span reference
    const lines = (rp as any)._lines as Array<Array<{ span: TextSpan }>>;
    assert.ok(lines.length > 0);
    assert.ok(lines[0]!.length > 0);
    assert.equal(lines[0]![0]!.span, span);

    // Invoke onTap via the span reference
    lines[0]![0]!.span.onTap?.();
    assert.equal(tapped, true);
  });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/tui && bun test src/widgets/rich-text.test.ts`
Expected: PASS (the span reference was added in Step 4).

- [ ] **Step 7: Run full TUI test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS. Some existing tests may need minor updates if they create `LayoutGlyph` objects without the `span` field — fix any such failures by adding a dummy span.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/widgets/text-span.ts packages/tui/src/widgets/text-span.test.ts packages/tui/src/widgets/rich-text.ts packages/tui/src/widgets/rich-text.test.ts
git commit -m "feat(text-span): add url and onTap properties for interactive text

Align with amp G.hyperlink/G.onClick. TextSpan gains optional url (OSC 8
hyperlink) and onTap (click callback). LayoutGlyph now stores a span
reference for per-glyph hit-testing. OSC 8 output and full hit-test
dispatch to be wired in a follow-up."
```

---

## Execution Order and Dependencies

```
Task 1 (findAncestorWidgetOfType)  ─┐
Task 2 (addKeyHandler)             ─┤
Task 3 (ClipBox)                   ─┤  All independent, run in parallel
Task 4 (Text align/overflow)       ─┤
Task 5 (Text intrinsics)           ─┤  ← depends on Task 4 (_computeLines helper)
Task 6 (Flex intrinsics)           ─┤
Task 7 (TextSpan hyperlink)        ─┘
```

**Note:** Task 5 depends on Task 4 because it uses the `_computeLines` helper that Task 4 creates. If running in parallel, ensure Task 4 lands first or combine Tasks 4+5 into a single agent.

## Final Verification

After all 7 tasks are complete:

1. Run full test suite: `cd packages/tui && bun test`
2. Run tmux e2e (see plan header for full script)
3. If any check fails, debug and fix before proceeding to Wave 2
