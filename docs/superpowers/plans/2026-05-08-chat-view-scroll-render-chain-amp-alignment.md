# Chat View Scroll Render Chain Amp Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `chat view` 在顶部继续 `Magic Mouse` 上滑时的追帧式抖动，并将 `flitter` 的 scroll render chain 对齐到 `amp` 的“单份可见 offset 真相”模型。

**Architecture:** 现象根因已经从日志确认，不再是 `offset` 本身震荡，也不是外部组件随机触发布局，而是 `RenderScrollable` 把 controller 真实 offset 拆成了 `_pendingScrollOffset` 和 `_committedScrollOffset` 两份状态，并且只在 `paint()` 中提交，导致连续 wheel 输入被 `FrameScheduler` 合并时屏幕长期停留在旧帧。修复方向是删除这层二阶段提交，恢复为与 `amp` 一致的单份 render snapshot：controller 变化后，render object 在同一帧内直接消费当前 scroll snapshot，`paint()` 与 `hitTest()` 读取同一份状态，不再等待 `paint()` 时 commit。

**Tech Stack:** TypeScript, Bun, Flitter TUI render tree, ScrollController, RenderScrollable, Bun test

---

## File Map

- Modify: `packages/tui/src/scroll/render-scrollable.ts`
  - 删除 `pending/committed` 双状态模型，回到单份 `_scrollOffset` / `_bottomAnchorOffset` render snapshot。
- Modify: `packages/tui/src/scroll/render-scrollable.test.ts`
  - 重写测试目标，验证连续 scroll update 在下一次可见帧直接使用最新 snapshot，而不是等 `paint()` 内提交。
- Modify: `packages/tui/src/scroll/scrollable.test.ts`
  - 保留上层 `ScrollableState` 接线行为不变，但补一条回归，防止未来再次把 render state 拆成异步 commit 模型。
- Modify: `packages/tui/src/scroll/scrollable.ts`
  - 仅在必要时删掉与 `committed` 模型绑定的说明或调试日志，不做行为改动。
- Optional Modify: `packages/tui/src/tree/frame-scheduler.test.ts`
  - 如果需要，用现有 scheduler 行为证明“帧可合并，但 render snapshot 仍必须正确”。

---

### Task 1: 先用测试锁住当前根因

**Files:**
- Modify: `packages/tui/src/scroll/render-scrollable.test.ts`
- Test: `packages/tui/src/scroll/render-scrollable.test.ts`

- [ ] **Step 1: 写失败测试，明确“controller 已更新时，下一次 paint 必须直接使用最新 scroll snapshot”**

```typescript
describe("RenderScrollable visible scroll snapshot", () => {
  it("uses the latest controller offset on the next paint without waiting for a paint-time commit", () => {
    const controller = new ScrollController();
    const child = new MockChildRenderBox(120);
    const scrollable = new RenderScrollable(controller);
    scrollable.adoptChild(child);
    scrollable.attach();

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });

    scrollable.layout(constraints);
    child.paintCalls.length = 0;

    controller.jumpTo(5);
    controller.jumpTo(4);
    controller.jumpTo(3);
    scrollable.paint(new Screen(80, 20), 0, 0);

    expect(child.paintCalls.at(-1)?.offsetY).toBe(-3);
  });

  it("keeps hitTest aligned with the same snapshot used by paint", () => {
    const controller = new ScrollController();
    const child = new MockChildRenderBox(120);
    const scrollable = new RenderScrollable(controller);
    scrollable.adoptChild(child);
    scrollable.attach();

    const constraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    });

    scrollable.layout(constraints);
    controller.jumpTo(7);

    const screen = new Screen(80, 20);
    scrollable.paint(screen, 0, 0);

    const result = new HitTestResult();
    scrollable.hitTest(result, { x: 1, y: 1 }, 0, 0);

    expect(result.path.length).toBeGreaterThan(0);
    expect(child.lastHitTestOffsetY).toBe(-7);
  });
});
```

- [ ] **Step 2: 跑测试，确认当前双状态模型会暴露旧帧滞留**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/render-scrollable.test.ts -t "RenderScrollable visible scroll snapshot"
```

Expected: FAIL，当前实现会暴露 `_pendingScrollOffset` 与 `_committedScrollOffset` 不一致造成的旧 offset 可见窗口。

- [ ] **Step 3: 再补一条日志驱动回归测试，锁住“连续更新不应要求中间 commit”**

```typescript
it("does not require an intermediate commit step between controller updates and visible paint", () => {
  const controller = new ScrollController();
  const child = new MockChildRenderBox(120);
  const scrollable = new RenderScrollable(controller);
  scrollable.adoptChild(child);
  scrollable.attach();

  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    }),
  );

  controller.jumpTo(5);
  controller.jumpTo(0);
  scrollable.paint(new Screen(80, 20), 0, 0);

  expect(child.paintCalls.at(-1)?.offsetY).toBe(0);
});
```

- [ ] **Step 4: 再次运行测试，确认失败模式稳定**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: FAIL，失败点集中在“paint 使用旧 committed 值”而不是别的随机行为。

- [ ] **Step 5: Commit 测试基线**

```bash
git add packages/tui/src/scroll/render-scrollable.test.ts
git commit -m "test(tui/scroll): lock visible scroll snapshot regression"
```

---

### Task 2: 删除 `pending/committed` 双状态，回到单份 render snapshot

**Files:**
- Modify: `packages/tui/src/scroll/render-scrollable.ts`
- Test: `packages/tui/src/scroll/render-scrollable.test.ts`

- [ ] **Step 1: 删掉双状态字段，定义单份 render snapshot**

```typescript
// packages/tui/src/scroll/render-scrollable.ts
/** 当前 render object 使用的滚动偏移快照。 */
private _scrollOffset: number = 0;

/** 当前 render object 使用的 bottom-anchor 偏移快照。 */
private _bottomAnchorOffset: number = 0;
```

- [ ] **Step 2: 删除仅为二阶段提交服务的方法**

```typescript
// packages/tui/src/scroll/render-scrollable.ts
// 删除以下方法：
// - _syncPendingScrollOffsetFromController()
// - _syncPendingBottomAnchorOffset()
// - _primeCommittedFrameStateIfNeeded()
// - _commitPendingFrameState()
```

- [ ] **Step 3: 改写 `attach()`，controller 变化时直接更新 `_scrollOffset` 并请求重绘**

```typescript
override attach(): void {
  super.attach();
  this._onScrollChange = () => {
    const nextOffset = this._scrollController.offset;
    if (this._scrollOffset === nextOffset) {
      return;
    }

    log.debug("syncScrollOffset", {
      reason: "listener",
      from: this._scrollOffset,
      to: nextOffset,
      position: this._position,
    });
    this._scrollOffset = nextOffset;
    this.markNeedsPaint();
  };
  this._scrollController.addListener(this._onScrollChange);
}
```

- [ ] **Step 4: 改写 `performLayout()`，在布局收敛后直接同步单份 snapshot**

```typescript
performLayout(): void {
  const constraints = this._constraints!;

  if (this.child) {
    this.child.layout(
      new BoxConstraints({
        minWidth: constraints.minWidth,
        maxWidth: constraints.maxWidth,
        minHeight: 0,
        maxHeight: Infinity,
      }),
    );
  }

  this._size = {
    width: constraints.maxWidth,
    height: constraints.maxHeight,
  };

  const childHeight = Math.min(this.child?.size.height ?? 0, MAX_CHILD_HEIGHT);
  const viewportHeight = this._size.height;
  const oldExtent = this._scrollController.maxScrollExtent;
  const newExtent = Math.max(0, childHeight - viewportHeight);
  const wasAtBottom = oldExtent > 0 && this._scrollController.atBottom;

  this._scrollController.updateViewportDimension(viewportHeight);
  this._scrollController.updateMaxScrollExtent(newExtent);

  const shouldAutoScroll =
    this._scrollController.followMode &&
    wasAtBottom &&
    newExtent > oldExtent;

  if (shouldAutoScroll) {
    this._scrollController.jumpTo(newExtent);
  } else if (this._scrollController.offset > newExtent) {
    this._scrollController.jumpTo(newExtent);
  }

  this._scrollOffset = this._scrollController.offset;
  this._bottomAnchorOffset =
    this._position === "bottom" && childHeight <= viewportHeight
      ? viewportHeight - childHeight
      : 0;
}
```

- [ ] **Step 5: 改写 `hitTest()` 和 `paint()`，统一只读单份 snapshot**

```typescript
override hitTest(
  result: HitTestResult,
  position: { x: number; y: number },
  offsetX = 0,
  offsetY = 0,
): boolean {
  const absX = offsetX + this._offset.x;
  const absY = offsetY + this._offset.y;

  const inX = position.x >= absX && position.x < absX + this._size.width;
  const inY = position.y >= absY && position.y < absY + this._size.height;
  if (!inX || !inY) return false;

  result.add({
    target: this,
    localPosition: { x: position.x - absX, y: position.y - absY },
  });

  if (!this.child) return true;

  const scrollOffset = Math.floor(this._scrollOffset);
  this.child.hitTest(result, position, absX, absY - scrollOffset + this._bottomAnchorOffset);
  return true;
}

override paint(screen: Screen, offsetX: number, offsetY: number): void {
  this._needsPaint = false;
  if (!this.child) return;

  const scrollOffset = Math.floor(this._scrollOffset);
  const clipScreen = new ClipScreen(
    screen,
    offsetX,
    offsetY,
    this._size.width,
    this._size.height,
  );

  this.child.paint(
    clipScreen as unknown as Screen,
    offsetX,
    offsetY - scrollOffset + this._bottomAnchorOffset,
  );
}
```

- [ ] **Step 6: 运行测试，验证 render snapshot 与 amp 的单份模型一致**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/scroll/render-scrollable.ts packages/tui/src/scroll/render-scrollable.test.ts
git commit -m "fix(tui/scroll): collapse render scroll state to single snapshot"
```

---

### Task 3: 清理 `Scrollable` 层与旧 commit 模型耦合的语义

**Files:**
- Modify: `packages/tui/src/scroll/scrollable.ts`
- Modify: `packages/tui/src/scroll/scrollable.test.ts`
- Test: `packages/tui/src/scroll/scrollable.test.ts`

- [ ] **Step 1: 写回归测试，锁住“上层滚轮接线不依赖 paint-time commit”**

```typescript
it("reports movement based on controller offset changes only", () => {
  const controller = new ScrollController();
  controller.updateMaxScrollExtent(20);
  controller.jumpTo(5);

  const scrollable = new Scrollable({
    controller,
    viewportBuilder: (_context, ctrl) =>
      new ScrollViewport({
        controller: ctrl,
        child: new LeafWidget(),
      }),
  });

  const element = scrollable.createElement();
  element.mount(undefined);

  const state = (element as unknown as { _state: ScrollableState })._state;
  const handled = state.handleMouseScrollEvent({
    direction: "up",
    modifiers: {},
  } as MouseEvent);

  expect(handled).toBe(true);
  expect(controller.offset).toBe(4);
});
```

- [ ] **Step 2: 清理 `Scrollable` 中只用于解释 committed/pending 的日志或注释，不改行为**

```typescript
/**
 * 返回值与 amp 保持一致：仅当本次滚轮实际推动 controller.offset 变化时返回 true。
 *
 * RenderScrollable 会直接消费当前 scroll snapshot；这里不承担任何“可见帧提交”职责。
 */
handleMouseScrollEvent = (event: MouseEvent): boolean => {
  // 现有逻辑保持不变
};
```

- [ ] **Step 3: 运行 `Scrollable` 层测试，确认行为未回归**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/scrollable.test.ts
```

Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/scroll/scrollable.ts packages/tui/src/scroll/scrollable.test.ts
git commit -m "test(tui/scroll): preserve scrollable input semantics after snapshot collapse"
```

---

### Task 4: 验证调度器可继续合并帧，但不再导致可见旧帧滞留

**Files:**
- Modify: `packages/tui/src/tree/frame-scheduler.test.ts`
- Modify: `packages/tui/src/scroll/render-scrollable.test.ts`
- Test: `packages/tui/src/tree/frame-scheduler.test.ts`
- Test: `packages/tui/src/scroll/render-scrollable.test.ts`

- [ ] **Step 1: 写一条 scheduler 旁证测试，确认我们不需要为这个 bug 改调度器策略**

```typescript
it("coalesces multiple requests into one scheduled frame", async () => {
  const scheduler = new FrameScheduler();
  let frameCount = 0;

  scheduler.onFrame = () => {
    frameCount += 1;
  };

  scheduler.requestFrame();
  scheduler.requestFrame();
  scheduler.requestFrame();

  await scheduler.flushForTest();

  expect(frameCount).toBe(1);
});
```

- [ ] **Step 2: 写回归测试，证明即使多次 offset 更新被合并，最终可见 paint 也直接使用最新值**

```typescript
it("renders the latest scroll snapshot even when updates are coalesced before paint", () => {
  const controller = new ScrollController();
  const child = new MockChildRenderBox(120);
  const scrollable = new RenderScrollable(controller);
  scrollable.adoptChild(child);
  scrollable.attach();

  scrollable.layout(
    new BoxConstraints({
      minWidth: 0,
      maxWidth: 80,
      minHeight: 0,
      maxHeight: 20,
    }),
  );

  controller.jumpTo(5);
  controller.jumpTo(4);
  controller.jumpTo(3);
  controller.jumpTo(2);
  controller.jumpTo(1);
  controller.jumpTo(0);

  scrollable.paint(new Screen(80, 20), 0, 0);

  expect(child.paintCalls.at(-1)?.offsetY).toBe(0);
});
```

- [ ] **Step 3: 跑测试，确认问题已经被限制在 render snapshot 层**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/tree/frame-scheduler.test.ts packages/tui/src/scroll/render-scrollable.test.ts
```

Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/tree/frame-scheduler.test.ts packages/tui/src/scroll/render-scrollable.test.ts
git commit -m "test(tui/frame): prove frame coalescing no longer causes stale scroll paint"
```

---

### Task 5: 端到端验收并移除临时定位日志

**Files:**
- Modify: `packages/tui/src/tree/render-object.ts`
- Modify: `packages/tui/src/tree/render-box.ts`
- Modify: `packages/tui/src/tree/pipeline-owner.ts`
- Modify: `packages/tui/src/tree/frame-scheduler.ts`
- Modify: `packages/tui/src/binding/widgets-binding.ts`
- Modify: `packages/tui/src/tree/element.ts`
- Modify: `packages/tui/src/tree/stateful-widget.ts`

- [ ] **Step 1: 移除本轮排障引入的高频临时日志，只保留正常调试所需内容**

```typescript
// 删除或回退以下排障专用日志：
// - [render.invalidate] markNeedsLayout / markNeedsPaint 详细 parent chain
// - [build] performRebuild / scheduleBuildFor 扩展字段
// - [pipeline] requestPaint / flushPaint 详细队列日志
// - [frame] requestFrame / phaseStart / phaseEnd 高频日志
// - [paint] beginFrame / paint:start / paint:end 高频日志
// - [state] setState 高频日志
```

- [ ] **Step 2: 跑 scroll 相关测试全集**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/scroll/*.test.ts packages/tui/src/gestures/mouse-manager.test.ts packages/tui/src/tree/frame-scheduler.test.ts
```

Expected: All PASS

- [ ] **Step 3: 运行 CLI，重新复现顶部继续上滑**

```bash
cd /Users/bytedance/workspace/flitter && FLITTER_LOG_LEVEL=debug bun run packages/cli/src/index.ts 2>/tmp/scroll-debug.log
```

Expected: 顶部继续 `wheel_up` 时不再出现“旧画面停留后再跳到新 offset”的视觉抖动。

- [ ] **Step 4: 用日志验收“逻辑 offset 与可见 offset 不再分叉”**

```bash
rg -n "syncPendingScrollOffset|commitFrameState|updateOffset:noop|handleMouseScroll:result|paint" /tmp/scroll-debug.log
```

Expected:
- 不再出现 `syncPendingScrollOffset` / `commitFrameState` 双阶段日志
- 顶部 `updateOffset:noop` 期间不再伴随旧 `committed` 值追帧
- `paint` 读取到的 scroll offset 与 controller 最新值一致

- [ ] **Step 5: 记录最终验收结论**

```text
通过标准：
1. 连续 wheel 输入期间，RenderScrollable 只有一份 scroll snapshot 真相。
2. FrameScheduler 可以继续合并帧，但可见内容不会滞留在旧 offset。
3. 顶部持续上滑时，controller.offset 与屏幕所见 offset 不再出现 5->0 但画面仍停在 5 的分叉。
4. amp / flitter 在 scroll render chain 上重新对齐为“单份 snapshot + 异步帧调度”。
```

## Self-Review

- Spec coverage:
  - 已覆盖根因修复：删除 `RenderScrollable` 的 `pending -> committed` 双状态。
  - 已覆盖兼容性验证：保留 `Scrollable` 输入语义与 `FrameScheduler` 合帧行为。
  - 已覆盖端到端验收：CLI 手工复现与日志检查。
- Placeholder scan:
  - 未使用 `TODO`、`TBD` 或“自行处理”类占位描述。
  - 每个代码步骤都给出明确修改方向与示例代码。
- Type consistency:
  - 统一使用 `_scrollOffset` / `_bottomAnchorOffset` 单份 render snapshot 命名。
  - 未再混用 `_pendingScrollOffset` / `_committedScrollOffset` 旧模型名。
