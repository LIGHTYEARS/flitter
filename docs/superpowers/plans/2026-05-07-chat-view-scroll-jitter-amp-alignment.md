# Chat View 顶部滚动抖动 Amp 对齐修复 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `chat view` 在最顶部继续使用 `Magic Mouse` 向上滑动时的严重抖动问题，并将滚动状态流调整为与 `amp` 的 render/layout 机制一致。

**Architecture:** 本方案不做表面层的 dead-zone 或 debounce 修补，而是把 `flitter` 的滚动链路收敛为 `delta -> clamp -> controller offset update -> render snapshot -> paint/hitTest`。第一阶段先把用户滚动从 `jumpTo()` 的通用路径剥离，并让 `RenderScrollable` 使用布局期快照的 `_scrollOffset`；第二阶段再收紧 `followMode` 语义，只允许“原本就在底部”的内容增长触发 auto-scroll；只有在完成前两阶段后边界惯性仍会丢失 scroll session，才补充边界事件的消费语义修正。

**Tech Stack:** TypeScript, Bun, Node test, Bun test, Flitter TUI scroll/render tree

---

## Task 1: 拆分用户滚动与 `jumpTo()` 路径

**Files:**
- Modify: `packages/tui/src/scroll/scroll-controller.ts`
- Modify: `packages/tui/src/scroll/scroll-controller.test.ts`
- Modify: `packages/tui/src/scroll/scroll-behavior.ts`
- Modify: `packages/tui/src/scroll/scroll-behavior.test.ts`

**amp 参考:**
- `amp-cli-reversed/chunk-006.js` 中鼠标滚动路径走 `applyBoundaryConditions()` + `updateOffset()`，而不是直接复用 `jumpTo()`。

- [ ] **Step 1: 先补失败测试，锁住“用户滚动不再走 jumpTo() 通用路径”的目标**

```typescript
// packages/tui/src/scroll/scroll-controller.test.ts
describe("updateOffset", () => {
  it("clamps negative offsets to 0", () => {
    controller.updateMaxScrollExtent(100);
    controller.updateOffset(-5);
    expect(controller.offset).toBe(0);
  });

  it("clamps offsets beyond maxScrollExtent", () => {
    controller.updateMaxScrollExtent(100);
    controller.updateOffset(500);
    expect(controller.offset).toBe(100);
  });

  it("does not notify listeners when clamped value is unchanged", () => {
    controller.updateMaxScrollExtent(100);
    let notified = false;
    controller.addListener(() => {
      notified = true;
    });
    controller.updateOffset(0);
    expect(notified).toBe(false);
  });
});

// packages/tui/src/scroll/scroll-behavior.test.ts
it("handleScrollDelta clamps at top via updateOffset without changing jumpTo semantics", () => {
  controller.updateMaxScrollExtent(100);
  controller.jumpTo(0);
  behavior.handleScrollDelta(-3);
  assert.equal(controller.offset, 0);
});

it("handleScrollDelta clamps at bottom via updateOffset", () => {
  controller.updateMaxScrollExtent(10);
  controller.jumpTo(10);
  behavior.handleScrollDelta(3);
  assert.equal(controller.offset, 10);
});
```

- [ ] **Step 2: 运行测试，确认当前实现尚未提供 `updateOffset()`**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scroll-controller.test.ts packages/tui/src/scroll/scroll-behavior.test.ts
```

Expected: FAIL，`ScrollController` 不存在 `updateOffset()`，`handleScrollDelta()` 仍复用旧路径。

- [ ] **Step 3: 在 `ScrollController` 中增加用户滚动专用入口**

```typescript
// packages/tui/src/scroll/scroll-controller.ts
/**
 * 直接更新滚动偏移，供用户输入增量路径使用。
 *
 * 该入口只做 clamp、状态写入与 listener 通知，不复用 jumpTo()
 * 的通用语义，避免用户滚轮事件携带额外副作用。
 *
 * @param offset - 目标滚动偏移
 */
updateOffset(offset: number): void {
  this._assertNotDisposed();

  const clamped = this._physics.clampOffset(offset, 0, this._maxScrollExtent);
  if (clamped === this._offset) {
    return;
  }

  this._offset = clamped;
  this._notifyListeners();
}
```

- [ ] **Step 4: 将 `ScrollBehavior.handleScrollDelta()` 改为走新入口**

```typescript
// packages/tui/src/scroll/scroll-behavior.ts
/**
 * 处理滚动增量。
 *
 * 用户输入路径只做“当前 offset + delta”，再交给 controller.updateOffset()
 * 做边界收敛，避免复用 jumpTo() 的通用跳转语义。
 *
 * @param delta - 滚动增量，负值向上，正值向下
 */
handleScrollDelta(delta: number): void {
  this._controller.updateOffset(this._controller.offset + delta);
}
```

- [ ] **Step 5: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scroll-controller.test.ts packages/tui/src/scroll/scroll-behavior.test.ts
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/scroll/scroll-controller.ts packages/tui/src/scroll/scroll-controller.test.ts packages/tui/src/scroll/scroll-behavior.ts packages/tui/src/scroll/scroll-behavior.test.ts
git commit -m "fix(tui/scroll): split user delta updates from jumpTo semantics"
```

---

## Task 2: 为 `RenderScrollable` 引入布局期滚动快照

**Files:**
- Modify: `packages/tui/src/scroll/render-scrollable.ts`
- Modify: `packages/tui/src/scroll/render-scrollable.test.ts`

**amp 参考:**
- `amp-cli-reversed/chunk-006.js` 中 `performLayout()` 会在更新 `maxScrollExtent` 和必要的 `jumpTo()` 之后，将 controller 的值同步到 render object 自己的 `_scrollOffset`，后续 `paint()` 使用该快照。

- [ ] **Step 1: 先补失败测试，锁住“同一帧使用同一份 scroll offset 快照”的约束**

```typescript
// packages/tui/src/scroll/render-scrollable.test.ts
it("uses layout snapshot for paint before the next layout", () => {
  const child = new MockChildRenderBox(100);
  const scrollable = new RenderScrollable(controller);
  scrollable.adoptChild(child);

  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 30,
    }),
  );

  controller.jumpTo(10);

  const screen = new Screen(80, 30);
  child.paintCalls.length = 0;
  scrollable.paint(screen, 0, 0);

  expect(child.paintCalls[0]!.offsetY).toBe(0);
});

it("refreshes snapshot after relayout", () => {
  const child = new MockChildRenderBox(100);
  const scrollable = new RenderScrollable(controller);
  scrollable.adoptChild(child);

  const constraints = new BoxConstraints({
    minWidth: 0,
    maxWidth: 80,
    minHeight: 0,
    maxHeight: 30,
  });

  scrollable.layout(constraints);
  controller.jumpTo(10);
  scrollable.layout(constraints);

  const screen = new Screen(80, 30);
  child.paintCalls.length = 0;
  scrollable.paint(screen, 0, 0);

  expect(child.paintCalls[0]!.offsetY).toBe(-10);
});
```

- [ ] **Step 2: 运行测试，确认当前 `paint()` 仍直接读取 controller 实时值**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: FAIL，第一条测试会读到 `-10`，说明 `paint()` 仍直接依赖 controller 当前 offset。

- [ ] **Step 3: 在 `RenderScrollable` 中增加 `_scrollOffset` 快照，并在 `performLayout()` 尾部同步**

```typescript
// packages/tui/src/scroll/render-scrollable.ts
/** 布局阶段冻结的滚动偏移，供同一帧的 paint/hitTest 使用。 */
private _scrollOffset: number = 0;

override performLayout(): void {
  // 现有 child layout / extent 计算逻辑保留

  const newMaxScrollExtent = Math.max(0, childHeight - viewportHeight);
  this._scrollController.updateMaxScrollExtent(newMaxScrollExtent);

  if (shouldAutoScroll) {
    this._scrollController.jumpTo(newMaxScrollExtent);
  } else if (this._scrollController.offset > newMaxScrollExtent) {
    this._scrollController.jumpTo(newMaxScrollExtent);
  }

  this._scrollOffset = this._scrollController.offset;
}
```

- [ ] **Step 4: 让 `paint()` 和 `hitTest()` 只消费 `_scrollOffset`**

```typescript
// packages/tui/src/scroll/render-scrollable.ts
override hitTest(
  result: HitTestResult,
  position: { x: number; y: number },
  absX: number,
  absY: number,
): void {
  if (!this.child) {
    return;
  }

  const adjustedY = absY + this._scrollOffset - this._computeBottomAnchorOffset();
  this.child.hitTest(result, position, absX, adjustedY);
}

override paint(screen: Screen, offsetX: number, offsetY: number): void {
  if (!this.child) {
    return;
  }

  const childOffsetY = offsetY - this._scrollOffset + this._computeBottomAnchorOffset();
  this.child.paint(screen, offsetX, childOffsetY);
}
```

- [ ] **Step 5: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/scroll/render-scrollable.ts packages/tui/src/scroll/render-scrollable.test.ts
git commit -m "fix(tui/scroll): snapshot render scroll offset during layout"
```

---

## Task 3: 收紧 `followMode` 语义，只在“原本就在底部”时跟随

**Files:**
- Modify: `packages/tui/src/scroll/scrollable.ts`
- Modify: `packages/tui/src/scroll/render-scrollable.ts`
- Modify: `packages/tui/src/scroll/scrollable.test.ts`
- Modify: `packages/tui/src/scroll/render-scrollable.test.ts`

**amp 参考:**
- `amp` 的 bottom-position 不是“永远 follow”；布局阶段只在 `followMode && wasAtBottom` 成立时把 offset 拉到新底部。

- [ ] **Step 1: 先补失败测试，锁住底部跟随生命周期**

```typescript
// packages/tui/src/scroll/scrollable.test.ts
it("initializes followMode for bottom-positioned views only once", () => {
  const controller = new ScrollController();
  const scrollable = new Scrollable({
    controller,
    position: "bottom",
    viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
  });

  const element = scrollable.createElement();
  element.mount(undefined);

  const state = (element as unknown as { _state: ScrollableState })._state;
  expect(state.controller.followMode).toBe(true);

  state.controller.disableFollowMode();
  state.build(element as unknown as BuildContext);

  expect(state.controller.followMode).toBe(false);
  controller.dispose();
});

// packages/tui/src/scroll/render-scrollable.test.ts
it("auto-scrolls only when the viewport was already at bottom", () => {
  const child = new MockChildRenderBox(40);
  const scrollable = new RenderScrollable(controller);
  scrollable.adoptChild(child);

  controller.enableFollowMode();
  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 10,
    }),
  );

  controller.jumpTo(controller.maxScrollExtent);
  child.setDesiredHeight(60);
  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 10,
    }),
  );

  expect(controller.offset).toBe(controller.maxScrollExtent);
});

it("does not auto-scroll when the user has left the bottom", () => {
  const child = new MockChildRenderBox(40);
  const scrollable = new RenderScrollable(controller);
  scrollable.adoptChild(child);

  controller.enableFollowMode();
  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 10,
    }),
  );

  controller.jumpTo(5);
  controller.disableFollowMode();
  child.setDesiredHeight(60);
  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 10,
    }),
  );

  expect(controller.offset).toBe(5);
});
```

- [ ] **Step 2: 运行测试，确认当前 `_configureController()` 会反复把 `position === "bottom"` 写回 `followMode`**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scrollable.test.ts packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: FAIL，`build()` / 更新流程会重新把 `followMode` 覆盖回 `true`，且底部跟随与用户手动脱离底部的状态没有拆开。

- [ ] **Step 3: 将 `_configureController()` 改为“只负责初始化默认 followMode”**

```typescript
// packages/tui/src/scroll/scrollable.ts
/**
 * 根据 widget.position 初始化 controller 的默认跟随模式。
 *
 * 该方法只在 state 初始化时生效；用户后续一旦手动离开底部，
 * followMode 必须保留运行时状态，不能在 build 过程中被重新写回。
 */
private _configureController(): void {
  if (this.widget.position === "bottom") {
    this.controller.enableFollowMode();
  } else {
    this.controller.disableFollowMode();
  }
}
```

- [ ] **Step 4: 在用户主动滚动离开底部时关闭 `followMode`**

```typescript
// packages/tui/src/scroll/scrollable.ts
/**
 * 处理鼠标滚动事件。
 *
 * 当底部定位视图收到“离开底部”的用户滚动时，立即关闭 followMode，
 * 避免后续 layout 因内容增长把用户重新拉回底部。
 */
handleMouseScrollEvent(event: MouseEvent): boolean {
  const previousOffset = this.controller.offset;
  const handled = this._behavior.handleMouseScrollEvent(event);

  if (handled && this.widget.position === "bottom" && this.controller.offset < this.controller.maxScrollExtent) {
    this.controller.disableFollowMode();
  }

  if (handled && this.controller.offset === this.controller.maxScrollExtent) {
    this.controller.enableFollowMode();
  }

  return previousOffset !== this.controller.offset;
}
```

- [ ] **Step 5: 保持 `RenderScrollable.performLayout()` 只在 `followMode && wasAtBottom` 时 auto-scroll**

```typescript
// packages/tui/src/scroll/render-scrollable.ts
const previousMaxScrollExtent = this._scrollController.maxScrollExtent;
const wasAtBottom = this._scrollController.offset >= previousMaxScrollExtent;

this._scrollController.updateMaxScrollExtent(newMaxScrollExtent);

const shouldAutoScroll =
  this._scrollController.followMode &&
  previousMaxScrollExtent > 0 &&
  newMaxScrollExtent > previousMaxScrollExtent &&
  wasAtBottom;

if (shouldAutoScroll) {
  this._scrollController.jumpTo(newMaxScrollExtent);
}
```

- [ ] **Step 6: 运行测试验证通过**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scrollable.test.ts packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/scroll/scrollable.ts packages/tui/src/scroll/scrollable.test.ts packages/tui/src/scroll/render-scrollable.ts packages/tui/src/scroll/render-scrollable.test.ts
git commit -m "fix(tui/scroll): align bottom followMode lifecycle with amp"
```

---

## Task 4: 验证边界滚轮会话；仅在仍抖动时补 `scroll session` 语义

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.test.ts`
- Modify: `packages/tui/src/scroll/scrollable.test.ts`
- Modify: `packages/tui/src/scroll/scrollable.ts`

**Why staged:** 这一步不是第一优先级。先完成 Task 1-3 后，如果顶部持续 `wheel_up` 仍然会出现抖动，再用这一任务修正边界事件的消费语义，避免 `Magic Mouse` 惯性阶段反复掉回全局 hit-test。

- [ ] **Step 1: 先补边界回归测试，观察 Task 1-3 后是否还会掉失 session**

```typescript
// packages/tui/src/scroll/scrollable.test.ts
it("keeps reporting handled wheel events at the top during inertial wheel_up bursts", () => {
  const controller = new ScrollController();
  controller.disableFollowMode();
  controller.updateMaxScrollExtent(10);
  controller.jumpTo(0);

  const scrollable = new Scrollable({
    controller,
    viewportBuilder: (_ctx, _ctrl) => new LeafWidget(),
  });

  const element = scrollable.createElement();
  element.mount(undefined);
  const state = (element as unknown as { _state: ScrollableState })._state;

  expect(state.handleMouseScrollEvent({ type: "mouse", kind: "wheel_up" } as any)).toBe(true);
  expect(state.handleMouseScrollEvent({ type: "mouse", kind: "wheel_up" } as any)).toBe(true);

  controller.dispose();
});
```

- [ ] **Step 2: 运行边界回归测试**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scrollable.test.ts packages/tui/src/gestures/mouse-manager.test.ts
```

Expected: 如果 Task 1-3 已足够稳定，测试可能已经 PASS；如果仍 FAIL，说明边界事件消费语义仍与 `Magic Mouse` 惯性期不兼容。

- [ ] **Step 3: 仅在 Step 2 仍失败时，修改 `handleMouseScrollEvent()` 的返回语义**

```typescript
// packages/tui/src/scroll/scrollable.ts
/**
 * 返回值表达“当前 scrollable 是否消费该滚轮事件”，而不是“offset 是否发生变化”。
 *
 * 在顶部/底部边界，Magic Mouse 仍会持续发送惯性滚轮事件。即使 clamp 后 offset
 * 没变，只要事件方向属于当前 scrollable 可处理的轴向，就应返回 true，保证
 * MouseManager 持续维持同一个 scroll session。
 */
handleMouseScrollEvent(event: MouseEvent): boolean {
  const shouldHandle =
    this.widget.direction === "vertical"
      ? event.kind === "wheel_up" || event.kind === "wheel_down"
      : event.kind === "wheel_left" || event.kind === "wheel_right";

  if (!shouldHandle) {
    return false;
  }

  this._behavior.handleMouseScrollEvent(event);

  if (this.widget.position === "bottom" && this.controller.offset < this.controller.maxScrollExtent) {
    this.controller.disableFollowMode();
  }

  if (this.controller.offset === this.controller.maxScrollExtent) {
    this.controller.enableFollowMode();
  }

  return true;
}
```

- [ ] **Step 4: 重新运行边界回归测试**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scrollable.test.ts packages/tui/src/gestures/mouse-manager.test.ts
```

Expected: All PASS，边界惯性事件会持续绑定到同一 scroll target，不再因为 offset 未变化而丢掉 session。

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/scroll/scrollable.ts packages/tui/src/scroll/scrollable.test.ts packages/tui/src/gestures/mouse-manager.test.ts
git commit -m "fix(tui/mouse): keep scroll session sticky during boundary wheel inertia"
```

---

## Task 5: 端到端验证与日志验收

**Files:**
- No code changes required unless a regression is found

- [ ] **Step 1: 运行滚动相关测试全集**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/*.test.ts packages/tui/src/gestures/mouse-manager.test.ts
```

Expected: All PASS

- [ ] **Step 2: 启动 flitter，打开 debug 日志，复现 Magic Mouse 顶部惯性场景**

```bash
cd /Users/bytedance/workspace/flitter && FLITTER_LOG_LEVEL=debug bun run packages/cli/src/index.ts 2>/tmp/scroll-debug.log
```

Expected: 在 `chat view` 顶部持续向上滑动时，不再出现明显的视觉回弹。

- [ ] **Step 3: 验证日志中不再出现边界抖动特征**

```bash
rg -n "jumpTo:noop|performLayout:autoScroll|offset.*0.*1.*0" /tmp/scroll-debug.log
```

Expected: 不再出现可对应“顶部继续上滑后 offset 反复震荡”的日志序列；允许存在零散 `jumpTo:noop`，但不应伴随可见回弹。

- [ ] **Step 4: 记录最终验收结论**

```text
通过标准：
1. 顶部持续 wheel_up 时 offset 长时间稳定在 0。
2. paint() 和 hitTest() 同帧读取同一份 scroll offset 快照。
3. 内容增长时，只有“原本就在底部”的视图才会 auto-scroll。
4. 若执行了 Task 4，边界惯性滚轮会持续绑定到同一 scroll session。
```

