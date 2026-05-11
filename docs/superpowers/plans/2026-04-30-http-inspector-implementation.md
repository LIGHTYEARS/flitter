# HTTP Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire flitter's existing WidgetTreeDebugger and WidgetREPLServer into the runtime lifecycle, add `sendDebugData` to Widget/RenderObject base classes (matching amp), and enable activation via `FLITTER_INSPECTOR=1`.

**Architecture:** Add `_debugData`/`sendDebugData`/`debugData` to Widget and RenderObject base classes (amp pattern). Wire inspector startup into `WidgetsBinding.runApp()` gated by env var. Add keystroke recording into the key event pipeline. The existing `WidgetTreeDebugger` HTTP server and serialization are already complete — this plan connects the plumbing.

**Tech Stack:** TypeScript, node:test + node:assert/strict (tree tests), bun:test (debug tests), Bun runtime

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `packages/tui/src/tree/widget.ts` | Widget base class | Modify: add `_debugData`, `sendDebugData()`, `get debugData()` |
| `packages/tui/src/tree/render-object.ts` | RenderObject base class | Modify: add `_debugData`, `sendDebugData()`, `get debugData()` |
| `packages/tui/src/tree/render-box.ts` | RenderBox (extends RenderObject) | Modify: remove no-op `sendDebugData` stub |
| `packages/tui/src/widgets/rich-text.ts` | RichText widget | Modify: add `sendDebugData` call in constructor |
| `packages/tui/src/widgets/padding.ts` | RenderPadding | Modify: add `sendDebugData` call in `performLayout` |
| `packages/tui/src/binding/widgets-binding.ts` | App lifecycle orchestrator | Modify: start inspector/REPL, add keystroke recording |
| `packages/tui/src/tree/widget.test.ts` | Widget unit tests | Modify: add debugData tests |
| `packages/tui/src/tree/render-object.test.ts` | RenderObject unit tests | Modify: add debugData tests |
| `packages/tui/src/debug/widget-tree-debugger.test.ts` | Inspector integration tests | Modify: add debugData integration test |

---

### Task 1: Add `sendDebugData` to Widget base class

**Files:**
- Modify: `packages/tui/src/tree/widget.ts:112-162`
- Test: `packages/tui/src/tree/widget.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/tui/src/tree/widget.test.ts`:

```typescript
describe("Widget — debugData", () => {
  it("初始 debugData 为空对象", () => {
    const w = new WidgetA();
    assert.deepStrictEqual(w.debugData, {});
  });

  it("sendDebugData 合并数据", () => {
    const w = new WidgetA();
    w.sendDebugData({ text: "hello" });
    assert.deepStrictEqual(w.debugData, { text: "hello" });
  });

  it("多次 sendDebugData 累积合并", () => {
    const w = new WidgetA();
    w.sendDebugData({ a: 1 });
    w.sendDebugData({ b: 2 });
    assert.deepStrictEqual(w.debugData, { a: 1, b: 2 });
  });

  it("sendDebugData 覆盖同名 key", () => {
    const w = new WidgetA();
    w.sendDebugData({ x: "old" });
    w.sendDebugData({ x: "new" });
    assert.deepStrictEqual(w.debugData, { x: "new" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && npx tsx --test src/tree/widget.test.ts`

Expected: FAIL — `w.debugData` is not defined, `w.sendDebugData` is not a function.

- [ ] **Step 3: Write implementation**

In `packages/tui/src/tree/widget.ts`, add three members to the `Widget` class body (after the `key` declaration, before `constructor`):

```typescript
export abstract class Widget {
  /** 可选标识键，用于协调算法中的同一性判断。 */
  readonly key: Key | undefined;

  /**
   * 调试数据存储。
   *
   * 逆向: modules/0536_unknown_Mn.js:3 — _debugData = {}
   */
  _debugData: Record<string, unknown> = {};

  /**
   * 合并调试数据。
   *
   * 逆向: modules/0536_unknown_Mn.js:10-14 — sendDebugData(T)
   */
  sendDebugData(data: Record<string, unknown>): void {
    this._debugData = { ...this._debugData, ...data };
  }

  /**
   * 获取调试数据。
   *
   * 逆向: modules/0536_unknown_Mn.js:15-17 — get debugData()
   */
  get debugData(): Record<string, unknown> {
    return this._debugData;
  }

  // ... rest of class unchanged
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && npx tsx --test src/tree/widget.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tree/widget.ts packages/tui/src/tree/widget.test.ts
git commit -m "feat(tui): add sendDebugData/debugData to Widget base class

逆向: modules/0536_unknown_Mn.js:3-18 — Widget._debugData pattern"
```

---

### Task 2: Add `sendDebugData` to RenderObject base class

**Files:**
- Modify: `packages/tui/src/tree/render-object.ts:23-408`
- Test: `packages/tui/src/tree/render-object.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/tui/src/tree/render-object.test.ts`:

```typescript
describe("RenderObject — debugData", () => {
  it("初始 debugData 为空对象", () => {
    const ro = new TestRenderObject();
    assert.deepStrictEqual(ro.debugData, {});
  });

  it("sendDebugData 合并数据", () => {
    const ro = new TestRenderObject();
    ro.sendDebugData({ padding: { top: 1 } });
    assert.deepStrictEqual(ro.debugData, { padding: { top: 1 } });
  });

  it("多次 sendDebugData 累积合并", () => {
    const ro = new TestRenderObject();
    ro.sendDebugData({ margin: null });
    ro.sendDebugData({ padding: { left: 2 } });
    assert.deepStrictEqual(ro.debugData, { margin: null, padding: { left: 2 } });
  });

  it("sendDebugData 覆盖同名 key", () => {
    const ro = new TestRenderObject();
    ro.sendDebugData({ width: 10 });
    ro.sendDebugData({ width: 20 });
    assert.deepStrictEqual(ro.debugData, { width: 20 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && npx tsx --test src/tree/render-object.test.ts`

Expected: FAIL — `ro.debugData` is not defined, `ro.sendDebugData` is not a function.

- [ ] **Step 3: Write implementation**

In `packages/tui/src/tree/render-object.ts`, add three members to the `RenderObject` class body (after `allowHitTestOutsideBounds`, before the readonly property accessors section):

```typescript
export abstract class RenderObject {
  // ... existing fields ...

  allowHitTestOutsideBounds = false;

  /**
   * 调试数据存储。
   *
   * 逆向: modules/0533_unknown_vH.js:8 — _debugData = {}
   */
  _debugData: Record<string, unknown> = {};

  /**
   * 合并调试数据。
   *
   * 逆向: modules/0533_unknown_vH.js:12-16 — sendDebugData(T)
   */
  sendDebugData(data: Record<string, unknown>): void {
    this._debugData = { ...this._debugData, ...data };
  }

  /**
   * 获取调试数据。
   *
   * 逆向: modules/0533_unknown_vH.js:17-19 — get debugData()
   */
  get debugData(): Record<string, unknown> {
    return this._debugData;
  }

  // ════════════════════════════════════════════════════
  //  只读属性访问器
  // ════════════════════════════════════════════════════
  // ... rest unchanged
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && npx tsx --test src/tree/render-object.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/tree/render-object.ts packages/tui/src/tree/render-object.test.ts
git commit -m "feat(tui): add sendDebugData/debugData to RenderObject base class

逆向: modules/0533_unknown_vH.js:8-19 — RenderObject._debugData pattern"
```

---

### Task 3: Remove RenderBox no-op stub

**Files:**
- Modify: `packages/tui/src/tree/render-box.ts:252-261`

- [ ] **Step 1: Remove the no-op `sendDebugData` method**

In `packages/tui/src/tree/render-box.ts`, delete lines 252-261 (the entire debug section with the no-op):

```typescript
// DELETE THIS ENTIRE SECTION:
  // ════════════════════════════════════════════════════
  //  调试
  // ════════════════════════════════════════════════════

  /**
   * 发送调试数据（空操作，可被调试工具覆盖）。
   *
   * 逆向: O9 中 qw.performLayout 调用的 sendDebugData
   */
  sendDebugData(_data: Record<string, unknown>): void {}
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd packages/tui && npx tsx --test src/tree/render-box.test.ts`

Expected: All existing tests PASS. The base class `RenderObject.sendDebugData` now handles the call from Container's `performLayout`.

- [ ] **Step 3: Also run container-related tests**

Run: `cd packages/tui && npx tsx --test src/tree/render-object.test.ts && npx tsx --test src/tree/widget.test.ts`

Expected: All PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/tree/render-box.ts
git commit -m "refactor(tui): remove RenderBox.sendDebugData no-op stub

Base class RenderObject now provides the real implementation."
```

---

### Task 4: Add `sendDebugData` call to RichText widget

**Files:**
- Modify: `packages/tui/src/widgets/rich-text.ts:777-784`
- Test: `packages/tui/src/debug/widget-tree-debugger.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/tui/src/debug/widget-tree-debugger.test.ts`:

```typescript
test("RichText widget stores text in debugData", () => {
  // Import RichText and TextSpan
  // Since we're testing the Widget's debugData, create one directly
  const { RichText } = require("../widgets/rich-text.js");
  const { TextSpan } = require("../widgets/text-span.js");

  const span = new TextSpan({ text: "hello world" });
  const widget = new RichText({ text: span });

  expect(widget.debugData).toBeDefined();
  expect(widget.debugData.text).toBe("hello world");
});
```

Alternatively, use the existing widget.test.ts pattern with `node:test`:

Add a new file `packages/tui/src/widgets/rich-text-debug.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { RichText } from "./rich-text.js";
import { TextSpan } from "./text-span.js";

describe("RichText debugData", () => {
  test("constructor calls sendDebugData with text content", () => {
    const span = new TextSpan({ text: "hello world" });
    const widget = new RichText({ text: span });

    expect(widget.debugData.text).toBe("hello world");
  });

  test("nested TextSpan serializes full text", () => {
    const span = new TextSpan({
      text: "hello ",
      children: [new TextSpan({ text: "world" })],
    });
    const widget = new RichText({ text: span });

    expect(widget.debugData.text).toBe("hello world");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/widgets/rich-text-debug.test.ts`

Expected: FAIL — `widget.debugData.text` is undefined (sendDebugData not called yet).

- [ ] **Step 3: Write implementation**

In `packages/tui/src/widgets/rich-text.ts`, add a `sendDebugData` call at the end of the RichText constructor (line 783, after `this.selectable = ...`):

```typescript
  constructor(args: RichTextArgs) {
    super({ key: args.key });
    this.text = args.text;
    this.textAlign = args.textAlign ?? "left";
    this.overflow = args.overflow ?? "clip";
    this.maxLines = args.maxLines;
    this.selectable = args.selectable ?? false;

    // 逆向: amp Text widget constructor calls sendDebugData({ text })
    this.sendDebugData({ text: this.text.toPlainText() });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/widgets/rich-text-debug.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/widgets/rich-text.ts packages/tui/src/widgets/rich-text-debug.test.ts
git commit -m "feat(tui): RichText.sendDebugData({text}) in constructor

逆向: amp Text widget constructor calls sendDebugData({ text })
matching the 3 call sites pattern from the amp reference."
```

---

### Task 5: Add `sendDebugData` call to RenderPadding

**Files:**
- Modify: `packages/tui/src/widgets/padding.ts:200-223`
- Test: `packages/tui/src/widgets/padding-debug.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `packages/tui/src/widgets/padding-debug.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { EdgeInsets } from "./edge-insets.js";
import { Padding } from "./padding.js";
import { BoxConstraints } from "../tree/constraints.js";

describe("RenderPadding debugData", () => {
  test("performLayout calls sendDebugData with padding", () => {
    const padding = EdgeInsets.all(8);
    const widget = new Padding({ padding });
    const ro = widget.createRenderObject();

    // Layout the render object so performLayout runs
    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 24,
    });
    (ro as any).layout(constraints);

    expect(ro.debugData).toBeDefined();
    expect(ro.debugData.padding).toEqual(padding);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/widgets/padding-debug.test.ts`

Expected: FAIL — `ro.debugData.padding` is undefined (sendDebugData not called in performLayout).

- [ ] **Step 3: Write implementation**

In `packages/tui/src/widgets/padding.ts`, add a `sendDebugData` call at the beginning of `RenderPadding.performLayout()` (after getting `padding`):

```typescript
  performLayout(): void {
    const constraints = this._constraints!;
    const padding = this._padding;

    // 逆向: amp Padding RO performLayout calls sendDebugData({ padding })
    this.sendDebugData({ padding });

    // 收缩约束
    const deflatedConstraints = new BoxConstraints({
      // ... rest unchanged
    });
    // ... rest unchanged
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/tui && bun test src/widgets/padding-debug.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/widgets/padding.ts packages/tui/src/widgets/padding-debug.test.ts
git commit -m "feat(tui): RenderPadding.sendDebugData({padding}) in performLayout

逆向: amp Padding RO performLayout — third call site for sendDebugData."
```

---

### Task 6: Wire inspector into WidgetsBinding lifecycle

**Files:**
- Modify: `packages/tui/src/binding/widgets-binding.ts`

- [ ] **Step 1: Add imports**

At the top of `packages/tui/src/binding/widgets-binding.ts`, add imports for the debugger and REPL:

```typescript
import { WidgetTreeDebugger } from "../debug/widget-tree-debugger.js";
import { WidgetREPLServer } from "../debug/widget-repl-server.js";
```

- [ ] **Step 2: Add inspector fields to the class**

Add private fields to the `WidgetsBinding` class:

```typescript
  /** Widget tree debugger (HTTP inspector). */
  private _inspector: WidgetTreeDebugger | null = null;

  /** Widget REPL server. */
  private _replServer: WidgetREPLServer | null = null;
```

- [ ] **Step 3: Start inspector in `runApp()` after rootElement mount**

In `runApp()`, after the `this.requestForcedPaintFrame();` line (line 316) and before `await this.waitForExit();` (line 318), add:

```typescript
      // 逆向: chunk-004:30211-30212 — inspector activation
      const inspectorEnabled = process.env.FLITTER_INSPECTOR === "1";
      const inspectorPort = parseInt(process.env.FLITTER_INSPECTOR_PORT || "9876", 10);
      this._inspector = new WidgetTreeDebugger(inspectorEnabled, 1000, inspectorPort);
      this._inspector.start(this.rootElement!);

      if (inspectorEnabled) {
        this._replServer = new WidgetREPLServer(this.rootElement!);
        this._replServer.start();
      }
```

- [ ] **Step 4: Stop inspector in `cleanup()`**

In the `cleanup()` method (line 964), add before `await this.tui.deinit();`:

```typescript
    // Stop inspector/REPL
    if (this._inspector) {
      this._inspector.stop();
      this._inspector = null;
    }
    if (this._replServer) {
      this._replServer.stop();
      this._replServer = null;
    }
```

- [ ] **Step 5: Run existing tests to verify no regression**

Run: `cd packages/tui && npx tsx --test src/tree/render-object.test.ts && npx tsx --test src/tree/widget.test.ts`

Expected: All PASS. (The lifecycle change can't be unit-tested easily — integration test is in Task 8.)

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/binding/widgets-binding.ts
git commit -m "feat(tui): wire WidgetTreeDebugger + WidgetREPLServer into runApp lifecycle

逆向: chunk-004:30211-30212 — inspector gated by FLITTER_INSPECTOR=1 env var.
Creates WidgetTreeDebugger after rootElement mount, starts REPL if enabled.
Both cleaned up in WidgetsBinding.cleanup()."
```

---

### Task 7: Add keystroke recording to handleKeyEvent

**Files:**
- Modify: `packages/tui/src/binding/widgets-binding.ts:614-638`

- [ ] **Step 1: Add `_getFocusPath` helper method**

Add a private method to `WidgetsBinding`:

```typescript
  /**
   * 提取当前焦点路径（从 primaryFocus 到根节点的 debugLabel 列表）。
   *
   * 逆向: amp handleKeyEvent 传递 focusPath 给 recordKeystroke
   */
  private _getFocusPath(): string[] {
    const path: string[] = [];
    let node = this.focusManager.primaryFocus;
    while (node) {
      path.unshift(node.debugLabel ?? node.constructor.name);
      node = node.parent;
    }
    return path;
  }
```

- [ ] **Step 2: Add `recordKeystroke` call at the end of `handleKeyEvent`**

Modify `handleKeyEvent` to record the keystroke after all processing. The method currently has three exit points (interceptor handled, focus handled, global handled). Add recording at the end, after `this.performanceTracker.recordKeyEvent(...)`:

```typescript
  private handleKeyEvent(event: KeyEvent): void {
    const keyStart = performance.now();

    // 0. 原始事件回调 (on('key') subscribers)
    for (const cb of this.eventCallbacks.key) cb(event);

    // 1. 拦截器 (command palette 等)
    for (const interceptor of this.keyInterceptors) {
      if (interceptor(event)) {
        this.performanceTracker.recordKeyEvent(performance.now() - keyStart);
        WidgetTreeDebugger.recordKeystroke(event.key, this._getFocusPath(), true);
        return;
      }
    }

    // 2. 焦点管理器 (冒泡路由)
    if (this.focusManager.handleKeyEvent(event)) {
      this.performanceTracker.recordKeyEvent(performance.now() - keyStart);
      WidgetTreeDebugger.recordKeystroke(event.key, this._getFocusPath(), true);
      return;
    }

    // 3. 全局键盘事件
    this.handleGlobalKeyEvent(event);
    this.performanceTracker.recordKeyEvent(performance.now() - keyStart);
    WidgetTreeDebugger.recordKeystroke(event.key, this._getFocusPath(), false);
  }
```

- [ ] **Step 3: Run full test suite to verify no regression**

Run: `cd packages/tui && bun test src/debug/widget-tree-debugger.test.ts`

Expected: All PASS (recordKeystroke already handles `null` instance gracefully).

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/binding/widgets-binding.ts
git commit -m "feat(tui): record keystrokes into WidgetTreeDebugger from handleKeyEvent

逆向: amp handleKeyEvent calls aA.recordKeystroke after event processing.
Records key name, focus path, and whether the event was handled."
```

---

### Task 8: Integration verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Run full test suite**

```bash
cd packages/tui && npx tsx --test src/tree/widget.test.ts && npx tsx --test src/tree/render-object.test.ts && npx tsx --test src/tree/render-box.test.ts && bun test src/debug/widget-tree-debugger.test.ts && bun test src/widgets/rich-text-debug.test.ts && bun test src/widgets/padding-debug.test.ts
```

Expected: All tests PASS.

- [ ] **Step 2: Verify inspector starts with env var**

```bash
cd packages/cli && FLITTER_INSPECTOR=1 timeout 5 bun run src/main.ts 2>/tmp/inspector-test.log || true
grep -i "Widget Tree Debugger running" /tmp/inspector-test.log
```

Expected: Log contains "Widget Tree Debugger running on http://localhost:9876"

- [ ] **Step 3: Verify inspector does NOT start without env var**

```bash
cd packages/cli && timeout 3 bun run src/main.ts 2>/tmp/no-inspector-test.log || true
grep -i "Widget Tree Debugger" /tmp/no-inspector-test.log
```

Expected: No output (inspector not mentioned in logs).

- [ ] **Step 4: Test HTTP endpoints with curl (if inspector starts)**

```bash
cd packages/cli && FLITTER_INSPECTOR=1 bun run src/main.ts 2>/dev/null &
APP_PID=$!
sleep 3

# Health check
curl -sf http://localhost:9876/health | python3 -m json.tool

# Widget tree
curl -sf http://localhost:9876/widget-tree | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert 'timestamp' in data, 'missing timestamp'
assert 'rootWidget' in data, 'missing rootWidget'
print('OK: widget-tree has required fields')
# Check debugData is present somewhere in the tree
tree_str = json.dumps(data)
assert 'debugData' in tree_str, 'no debugData found in tree'
print('OK: debugData found in tree')
# Check recentKeystrokes field exists (Scenario 3)
assert 'recentKeystrokes' in data, 'missing recentKeystrokes'
print('OK: recentKeystrokes present')
"

# Focus tree
curl -sf http://localhost:9876/focus-tree | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert 'rootScope' in data, 'missing rootScope'
print('OK: focus-tree has rootScope')
"

kill $APP_PID 2>/dev/null
```

Expected: All assertions pass.

- [ ] **Step 5: Commit final verification**

No code changes needed. If all checks pass, the implementation is complete.

```bash
git log --oneline -7
```

Verify the commit log shows the implementation chain.
