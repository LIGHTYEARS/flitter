# Tier 1 Correctness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 8 remaining correctness gaps in Flitter's core framework to align with amp's reversed implementation (vH, O9, d9).

**Architecture:** All changes are surgical fixes to existing files — no new modules. Changes touch 4 files: `render-object.ts`, `render-box.ts`, `pipeline-owner.ts`, `widgets-binding.ts`, and `flex.ts` plus their corresponding test files. Each task is independently testable and committable.

**Tech Stack:** TypeScript, Bun test runner, `node:test` + `node:assert/strict`

**MANDATORY: tmux e2e verification for every task.** After each task's unit tests pass, you MUST verify with the interactive TUI demo via tmux:

```bash
# 1. Start tmux session with the interactive demo
tmux new-session -d -s flitter-e2e -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2

# 2. Capture screenshot — verify layout renders correctly, no ghost artifacts
tmux capture-pane -t flitter-e2e -p

# 3. Simulate mouse click on a button region (column 5, row 8)
#    and capture again — verify click count increments
tmux send-keys -t flitter-e2e -l $'\x1b[<0;5;8M'   # SGR mouse press
tmux send-keys -t flitter-e2e -l $'\x1b[<0;5;8m'   # SGR mouse release
sleep 0.5
tmux capture-pane -t flitter-e2e -p

# 4. For tasks that affect resize (Task 4, 5): resize the tmux pane
#    tmux resize-pane -t flitter-e2e -x 60 -y 20
#    sleep 1
#    tmux capture-pane -t flitter-e2e -p

# 5. Quit and cleanup
tmux send-keys -t flitter-e2e 'q'
sleep 0.5
tmux kill-session -t flitter-e2e 2>/dev/null
```

The tmux e2e test is NOT optional. Unit tests with mocks verify code structure; only real terminal execution verifies behavior (per CLAUDE.md rule #2). If the demo crashes, produces visual artifacts, or mouse events stop working, the task is NOT complete — debug and fix before committing.

**Amp References:**
- `vH` = RenderObject base: `amp-cli-reversed/modules/0533_unknown_vH.js`
- `O9` = RenderBox: `amp-cli-reversed/chunk-005.js:157645-157761`
- `d9` = WidgetsBinding/AppRunner: `amp-cli-reversed/modules/2120_ForExit_d9.js`
- `s1T` = RenderFlex: `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js`

---

### Task 1: RenderObject `markNeedsLayout` / `markNeedsPaint` early-exit guards

**Files:**
- Modify: `packages/tui/src/tree/render-object.ts:232-247`
- Test: `packages/tui/src/tree/render-object.test.ts`

**Amp reference:** `vH.markNeedsLayout` (0533_unknown_vH.js:79-83) — guards `if (this._needsLayout) return;` then `if (!this._attached) return;`. Same pattern for `markNeedsPaint` (lines 84-88).

- [ ] **Step 1: Write failing tests for markNeedsLayout guards**

Add these tests to the existing `render-object.test.ts` inside a new `describe` block:

```ts
describe("RenderObject — markNeedsLayout guards (amp vH alignment)", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("markNeedsLayout short-circuits when already dirty", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();
    parent.adoptChild(child);
    parent.attach();

    // First call sets dirty
    mockOwner.layoutRequests = [];
    child.markNeedsLayout();
    const firstCallCount = mockOwner.layoutRequests.length;

    // Second call should short-circuit — no additional requests
    mockOwner.layoutRequests = [];
    child.markNeedsLayout();
    assert.equal(mockOwner.layoutRequests.length, 0, "should not propagate when already dirty");
  });

  it("markNeedsLayout is no-op when not attached", () => {
    const node = new TestRenderObject();
    // node is NOT attached
    mockOwner.layoutRequests = [];
    node.markNeedsLayout();
    assert.equal(mockOwner.layoutRequests.length, 0, "should not request layout when detached");
  });
});
```

- [ ] **Step 2: Write failing tests for markNeedsPaint guards**

```ts
describe("RenderObject — markNeedsPaint guards (amp vH alignment)", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("markNeedsPaint short-circuits when already dirty", () => {
    const node = new TestRenderObject();
    node.attach();
    node.markNeedsPaint();
    mockOwner.paintRequests = [];

    node.markNeedsPaint();
    assert.equal(mockOwner.paintRequests.length, 0, "should not request paint when already dirty");
  });

  it("markNeedsPaint is no-op when not attached", () => {
    const node = new TestRenderObject();
    // NOT attached
    mockOwner.paintRequests = [];
    node.markNeedsPaint();
    assert.equal(mockOwner.paintRequests.length, 0, "should not request paint when detached");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: The 4 new tests FAIL — `markNeedsLayout` propagates even when dirty, `markNeedsPaint` fires even when dirty/detached.

- [ ] **Step 4: Implement the guards**

In `packages/tui/src/tree/render-object.ts`, replace the `markNeedsLayout` method (lines 232-239):

```ts
  markNeedsLayout(): void {
    if (this._needsLayout) return;
    if (!this._attached) return;
    this._needsLayout = true;
    if (this._parent != null) {
      this._parent.markNeedsLayout();
    } else {
      getPipelineOwner()?.requestLayout(this);
    }
  }
```

Replace the `markNeedsPaint` method (lines 245-247):

```ts
  markNeedsPaint(): void {
    if (this._needsPaint) return;
    if (!this._attached) return;
    this._needsPaint = true;
    getPipelineOwner()?.requestPaint(this);
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: All tests PASS including the 4 new ones.

- [ ] **Step 6: Run full test suite to check for regressions**

Run: `cd packages/tui && bun test`
Expected: All ~1223 tests PASS.

Note: The guards change the behavior of `markNeedsLayout` — it no longer unconditionally sets `_needsLayout = true`. Code that calls `markNeedsLayout` before `attach()` (e.g., in `adoptChild`) now has `_needsLayout` remain at its default `true` value. Since `_needsLayout` defaults to `true` on construction, this is safe — newly created nodes already need layout.

- [ ] **Step 7: tmux e2e verification**

Run the tmux e2e sequence from the plan header. Verify the interactive demo launches, renders correctly, responds to mouse clicks, and quits cleanly. If anything breaks, this task introduced a regression — fix before committing.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/tree/render-object.ts packages/tui/src/tree/render-object.test.ts
git commit -m "fix(render-object): add early-exit guards to markNeedsLayout/markNeedsPaint

Align with amp vH.markNeedsLayout (0533_unknown_vH.js:79-83) and
vH.markNeedsPaint (lines 84-88). Both methods now short-circuit when
the node is already dirty or not attached to the render tree, preventing
O(depth) re-propagation and potential pipeline requests on detached nodes."
```

---

### Task 2: RenderObject `attach` / `detach` idempotency guards

**Files:**
- Modify: `packages/tui/src/tree/render-object.ts:207-223`
- Test: `packages/tui/src/tree/render-object.test.ts`

**Amp reference:** `vH.attach` (0533_unknown_vH.js:69-73) — `if (this._attached) return;`. `vH.detach` (lines 74-78) — `if (!this._attached) return;`.

- [ ] **Step 1: Write failing tests**

```ts
describe("RenderObject — attach/detach idempotency (amp vH alignment)", () => {
  it("attach is idempotent — second call does not recurse children", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();
    parent.adoptChild(child);

    let childAttachCount = 0;
    const origAttach = child.attach.bind(child);
    child.attach = () => { childAttachCount++; origAttach(); };

    parent.attach(); // first attach
    const afterFirst = childAttachCount;

    parent.attach(); // second attach — should be no-op
    assert.equal(childAttachCount, afterFirst, "second attach should not recurse into children");
  });

  it("detach is idempotent — second call does not recurse children", () => {
    const parent = new TestRenderObject();
    const child = new TestRenderObject();
    parent.adoptChild(child);
    parent.attach();

    let childDetachCount = 0;
    const origDetach = child.detach.bind(child);
    child.detach = () => { childDetachCount++; origDetach(); };

    parent.detach(); // first detach
    const afterFirst = childDetachCount;

    parent.detach(); // second detach — should be no-op
    assert.equal(childDetachCount, afterFirst, "second detach should not recurse into children");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: Both tests FAIL — `attach`/`detach` recurse on second call.

- [ ] **Step 3: Implement the guards**

In `packages/tui/src/tree/render-object.ts`, replace `attach()` (lines 207-212):

```ts
  attach(): void {
    if (this._attached) return;
    this._attached = true;
    for (const child of this._children) {
      child.attach();
    }
  }
```

Replace `detach()` (lines 218-223):

```ts
  detach(): void {
    if (!this._attached) return;
    this._attached = false;
    for (const child of this._children) {
      child.detach();
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 6: tmux e2e verification**

Run the tmux e2e sequence from the plan header. Verify the interactive demo renders correctly and responds to mouse clicks.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/tree/render-object.ts packages/tui/src/tree/render-object.test.ts
git commit -m "fix(render-object): add idempotency guards to attach/detach

Align with amp vH.attach (0533_unknown_vH.js:69-73) and vH.detach
(lines 74-78). Both methods now return immediately if the node is
already in the target state, preventing unnecessary recursive walks."
```

---

### Task 3: RenderObject `dispose` calls `removeFromQueues`

**Files:**
- Modify: `packages/tui/src/tree/render-object.ts:353-355`
- Test: `packages/tui/src/tree/render-object.test.ts`

**Amp reference:** `vH.dispose` (0533_unknown_vH.js:102-104) — `uF().removeFromQueues(this)`.

- [ ] **Step 1: Write failing test**

```ts
describe("RenderObject — dispose cleanup (amp vH alignment)", () => {
  let mockOwner: MockPipelineOwner;

  beforeEach(() => {
    mockOwner = new MockPipelineOwner();
    setPipelineOwner(mockOwner);
  });

  afterEach(() => {
    setPipelineOwner(undefined);
  });

  it("dispose calls removeFromQueues to evict from pipeline", () => {
    const node = new TestRenderObject();
    node.attach();
    node.markNeedsPaint(); // enqueue into paint queue

    let removedNode: unknown = null;
    mockOwner.removeFromQueues = (n: unknown) => { removedNode = n; };

    node.dispose();
    assert.equal(removedNode, node, "dispose should call removeFromQueues(this)");
  });
});
```

Note: Ensure `MockPipelineOwner` has `removeFromQueues` as a method. If it doesn't exist yet in the test file, add it:

```ts
class MockPipelineOwner implements PipelineOwnerLike {
  // ... existing fields ...
  removeFromQueues(_node: unknown): void {}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: FAIL — `removedNode` is `null`.

- [ ] **Step 3: Implement the fix**

In `packages/tui/src/tree/render-object.ts`, replace `dispose()` (lines 353-355):

```ts
  dispose(): void {
    getPipelineOwner()?.removeFromQueues(this);
    this.removeAllChildren();
  }
```

- [ ] **Step 4: Verify the `PipelineOwnerLike` interface has `removeFromQueues`**

Check `packages/tui/src/tree/types.ts`. The `PipelineOwnerLike` interface must include `removeFromQueues`. If it doesn't, add it:

```ts
export interface PipelineOwnerLike {
  requestLayout(node: unknown): void;
  requestPaint(node: unknown): void;
  removeFromQueues(node: unknown): void;
}
```

The actual `PipelineOwner` class already has this method (pipeline-owner.ts:120).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 7: tmux e2e verification**

Run the tmux e2e sequence from the plan header. Verify the interactive demo renders correctly and responds to mouse clicks.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/tree/render-object.ts packages/tui/src/tree/render-object.test.ts packages/tui/src/tree/types.ts
git commit -m "fix(render-object): dispose evicts node from pipeline queues

Align with amp vH.dispose (0533_unknown_vH.js:102-104). Disposed render
objects are now removed from the PipelineOwner's layout/paint queues,
preventing the pipeline from operating on stale nodes."
```

---

### Task 4: PipelineOwner `hasNodesNeedingLayout` + WidgetsBinding `beginFrame` fix

**Files:**
- Modify: `packages/tui/src/tree/pipeline-owner.ts`
- Modify: `packages/tui/src/binding/widgets-binding.ts:559-566`
- Test: `packages/tui/src/tree/pipeline-owner.test.ts` (may need to create)
- Test: `packages/tui/src/binding/widgets-binding.test.ts`

**Amp reference:** `d9.beginFrame` (2120_ForExit_d9.js:139-141) — checks 5 conditions including `pipelineOwner.hasNodesNeedingLayout`.

- [ ] **Step 1: Add layout queue tracking to PipelineOwner**

In `packages/tui/src/tree/pipeline-owner.ts`, add a `_nodesNeedingLayout` set and expose `hasNodesNeedingLayout`:

After line 25 (`private _nodesNeedingPaint`), add:

```ts
  /** 需要重新布局的节点集合 */
  private _nodesNeedingLayout: Set<RenderObject> = new Set();
```

After line 43 (`get hasNodesNeedingPaint`), add:

```ts
  /**
   * 当前是否存在需要重新布局的节点。
   *
   * 逆向: amp d9.beginFrame checks pipelineOwner.hasNodesNeedingLayout
   */
  get hasNodesNeedingLayout(): boolean {
    return this._nodesNeedingLayout.size > 0;
  }
```

Modify `requestLayout` (line 99-101) to track the node:

```ts
  requestLayout(node: unknown): void {
    this._nodesNeedingLayout.add(node as RenderObject);
    this._onNeedFrame?.();
  }
```

Modify `flushLayout` (line 132-141) to clear the layout queue after layout:

```ts
  flushLayout(): boolean {
    if (!this._rootRenderObject || !this._rootConstraints) {
      return false;
    }
    if (this._rootRenderObject instanceof RenderBox) {
      (this._rootRenderObject as RenderBox).layout(this._rootConstraints);
      this._nodesNeedingLayout.clear();
      return true;
    }
    return false;
  }
```

Modify `removeFromQueues` (line 120-122) to also clear from layout queue:

```ts
  removeFromQueues(node: unknown): void {
    this._nodesNeedingPaint.delete(node as RenderObject);
    this._nodesNeedingLayout.delete(node as RenderObject);
  }
```

Modify `dispose` (line 159-161) to also clear layout queue:

```ts
  dispose(): void {
    this._nodesNeedingPaint.clear();
    this._nodesNeedingLayout.clear();
  }
```

- [ ] **Step 2: Update `beginFrame` in WidgetsBinding**

In `packages/tui/src/binding/widgets-binding.ts`, replace lines 559-566:

```ts
  private beginFrame(): void {
    this.shouldPaintCurrentFrame =
      this.forcePaintOnNextFrame ||
      this.buildOwner.hasDirtyElements ||
      this.pipelineOwner.hasNodesNeedingLayout ||
      this.pipelineOwner.hasNodesNeedingPaint;
    this.didPaintCurrentFrame = false;
    this.forcePaintOnNextFrame = false;
  }
```

- [ ] **Step 3: Write test for hasNodesNeedingLayout**

Add to the widgets-binding test or create a new pipeline-owner test:

```ts
describe("PipelineOwner — layout queue tracking", () => {
  it("hasNodesNeedingLayout is true after requestLayout", () => {
    const owner = new PipelineOwner();
    assert.equal(owner.hasNodesNeedingLayout, false);

    const node = new TestRenderBox();
    owner.requestLayout(node);
    assert.equal(owner.hasNodesNeedingLayout, true);
  });

  it("flushLayout clears layout queue", () => {
    const owner = new PipelineOwner();
    const root = new TestRenderBox();
    owner.setRootRenderObject(root);
    owner.updateRootConstraints({ width: 80, height: 24 });
    owner.requestLayout(root);

    assert.equal(owner.hasNodesNeedingLayout, true);
    owner.flushLayout();
    assert.equal(owner.hasNodesNeedingLayout, false);
  });

  it("removeFromQueues removes from layout queue", () => {
    const owner = new PipelineOwner();
    const node = new TestRenderBox();
    owner.requestLayout(node);
    assert.equal(owner.hasNodesNeedingLayout, true);

    owner.removeFromQueues(node);
    assert.equal(owner.hasNodesNeedingLayout, false);
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 5: tmux e2e verification**

Run the tmux e2e sequence from the plan header. Verify the interactive demo renders correctly and responds to mouse clicks.

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/tree/pipeline-owner.ts packages/tui/src/binding/widgets-binding.ts packages/tui/src/tree/pipeline-owner.test.ts
git commit -m "fix(pipeline): add layout queue tracking and beginFrame layout check

Add _nodesNeedingLayout set to PipelineOwner with hasNodesNeedingLayout
getter. beginFrame now checks this condition, preventing frames from
being skipped when layout is dirty but paint hasn't been flagged yet.
Aligns with amp d9.beginFrame (2120_ForExit_d9.js:139-141)."
```

---

### Task 5: WidgetsBinding `processResizeIfPending` — propagate via `rootElement.update()`

**Files:**
- Modify: `packages/tui/src/binding/widgets-binding.ts:513-550`
- Test: `packages/tui/src/binding/widgets-binding.test.ts`

**Amp reference:** `d9.processResizeIfPending` (2120_ForExit_d9.js:116-138) — creates new `I9` (MediaQuery) widget with updated data, calls `rootElement.update(newWidget)`.

- [ ] **Step 1: Write failing test**

```ts
describe("WidgetsBinding — resize propagation (amp d9 alignment)", () => {
  it("processResizeIfPending calls rootElement.update with new MediaQuery widget", async () => {
    WidgetsBinding.resetForTesting();
    const binding = WidgetsBinding.instance;

    // Stub TUI to prevent real terminal access
    const origInit = binding.tui.init.bind(binding.tui);
    binding.tui.init = async () => {};
    binding.tui.enterAltScreen = () => {};
    binding.tui.waitForCapabilities = async () => {};
    binding.tui.getSize = () => ({ width: 80, height: 24 });
    binding.tui.getCapabilities = () => null;
    binding.tui.deinit = async () => {};

    // Track update calls on root element
    let updateCalledWith: unknown = null;

    // Create a minimal widget
    const dummyWidget = {
      key: undefined,
      canUpdate: () => true,
      createElement: () => ({
        _widget: dummyWidget,
        _parent: undefined,
        _children: [],
        _dirty: true,
        _mounted: false,
        _depth: 0,
        _inheritedDependencies: new Set(),
        widget: dummyWidget,
        parent: undefined,
        children: [],
        dirty: true,
        mounted: false,
        depth: 0,
        renderObject: undefined,
        mount: function(p: unknown) { this._mounted = true; },
        unmount: function() { this._mounted = false; },
        update: function(w: unknown) { updateCalledWith = w; this._widget = w as any; },
        addChild: function() {},
        removeChild: function() {},
        findRenderObject: function() { return undefined; },
        markNeedsRebuild: function() {},
        performRebuild: function() {},
        dependOnInheritedWidgetOfExactType: function() { return null; },
        findAncestorElementOfType: function() { return null; },
        removeAllChildren: function() {},
      }),
    };

    // We need to test the resize path — simulate pending resize
    binding._simulateResizeForTesting(100, 50);

    // The processResizeIfPending is called during frame callbacks
    // but we need a rootElement first. Since we can't easily do full runApp,
    // we verify the method logic indirectly.
    // This test validates that after the fix, rootElement.update IS called.

    WidgetsBinding.resetForTesting();
  });
});
```

Note: Due to WidgetsBinding's tightly coupled lifecycle, the most pragmatic approach is to verify the code change by reading the implementation and running the interactive demo after the fix. The test above is a skeleton — adapt it to the existing test patterns in `widgets-binding.test.ts`.

- [ ] **Step 2: Implement the fix**

In `packages/tui/src/binding/widgets-binding.ts`, replace the body of `processResizeIfPending()` (lines 513-550):

```ts
  private processResizeIfPending(): void {
    if (!this.pendingResizeEvent) return;
    const { width, height } = this.pendingResizeEvent;
    this.pendingResizeEvent = null;

    if (!this.rootElement) return;

    const size = { width, height };
    const capabilities = this.tui.getCapabilities?.() ?? null;
    const newMediaQueryData = new MediaQueryData(size, capabilities);
    this.currentMediaQueryData = newMediaQueryData;

    // Amp d9.processResizeIfPending: create new MediaQuery widget and call
    // rootElement.update() to propagate new data into the widget tree.
    // 逆向: d9 lines 127-132
    const rootWidget = this.rootElement.widget;
    if (rootWidget instanceof MediaQuery) {
      const newRootWidget = new MediaQuery({
        data: newMediaQueryData,
        child: (rootWidget as MediaQuery).child,
      });
      this.rootElement.update(newRootWidget as unknown as import("../tree/element.js").Widget);
    }

    this.mouseManager.clearHoverState();
    this.updateRootConstraints(width, height);
    this.rootElement.markNeedsRebuild();
    this.forcePaintOnNextFrame = true;

    this.frameScheduler.addPostFrameCallback(() => {
      this.mouseManager.reestablishHoverState();
    });
  }
```

- [ ] **Step 3: Verify MediaQuery class has `child` accessor**

Check that `MediaQuery` widget exposes a `child` property. Read `packages/tui/src/widgets/media-query.ts` and verify. If `child` is not public, expose it.

- [ ] **Step 4: Run full test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 5: tmux e2e verification with resize**

This task specifically affects resize behavior, so the tmux e2e MUST include resize testing:

```bash
tmux new-session -d -s flitter-resize -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2

# Verify initial render
tmux capture-pane -t flitter-resize -p

# Click a button before resize
tmux send-keys -t flitter-resize -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-resize -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-resize -p
# Expected: Click registered

# Resize terminal
tmux resize-pane -t flitter-resize -x 60 -y 20
sleep 1
tmux capture-pane -t flitter-resize -p
# Expected: UI redraws at new size, no ghost artifacts, no crash

# Click after resize — verify mouse still works
tmux send-keys -t flitter-resize -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-resize -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-resize -p
# Expected: Click count increments

# Quit
tmux send-keys -t flitter-resize 'q'
sleep 0.5
tmux kill-session -t flitter-resize 2>/dev/null
```

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/binding/widgets-binding.ts
git commit -m "fix(widgets-binding): propagate resize via rootElement.update()

Align with amp d9.processResizeIfPending (2120_ForExit_d9.js:116-138).
On resize, create a new MediaQuery widget with updated data and call
rootElement.update() to push the new size/capabilities into the widget
tree, instead of only calling markNeedsRebuild() which left the tree
holding stale MediaQueryData."
```

---

### Task 6: RenderObject depth tracking — lazy cached with `_invalidateDepth`

**Files:**
- Modify: `packages/tui/src/tree/render-object.ts`
- Modify: `packages/tui/src/tree/element.ts`
- Test: `packages/tui/src/tree/render-object.test.ts`

**Amp reference:** `vH._invalidateDepth` (0533_unknown_vH.js:34-37) — clears `_cachedDepth`, recurses children. Called from `adoptChild` and `dropChild`.

- [ ] **Step 1: Write failing test for stale depth**

```ts
describe("RenderObject — depth invalidation (amp vH alignment)", () => {
  it("depth updates correctly when subtree is re-parented", () => {
    const root = new TestRenderObject();
    const middle = new TestRenderObject();
    const leaf = new TestRenderObject();

    root.adoptChild(middle);
    middle.adoptChild(leaf);
    root.attach();

    assert.equal(root.depth, 0);
    assert.equal(middle.depth, 1);
    assert.equal(leaf.depth, 2);

    // Re-parent: move middle (with leaf) from root to a new parent at depth 5
    root.dropChild(middle);
    const deepParent = new TestRenderObject();
    // Simulate deep parent by manually nesting
    let current: TestRenderObject = root;
    for (let i = 0; i < 4; i++) {
      const next = new TestRenderObject();
      current.adoptChild(next);
      current = next;
    }
    // current is at depth 4
    current.adoptChild(middle);

    assert.equal(middle.depth, 5, "middle depth should update after re-parenting");
    assert.equal(leaf.depth, 6, "leaf depth should cascade after re-parenting");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: FAIL — `leaf.depth` is stale (still 2, not 6).

- [ ] **Step 3: Implement lazy depth with `_invalidateDepth`**

In `packages/tui/src/tree/render-object.ts`:

1. Change the `_depth` field to `_cachedDepth`:

Replace line 43:
```ts
  /** 在渲染树中的深度（缓存值，undefined 表示需要重新计算） */
  private _cachedDepth: number | undefined = undefined;
```

2. Replace the `depth` getter (lines 98-100):

```ts
  get depth(): number {
    if (this._cachedDepth === undefined) {
      this._cachedDepth = this._parent ? this._parent.depth + 1 : 0;
    }
    return this._cachedDepth;
  }
```

3. Add `_invalidateDepth` method (after the depth getter):

```ts
  /**
   * 递归清除深度缓存。
   *
   * 逆向: vH._invalidateDepth (0533_unknown_vH.js:34-37)
   * 当节点被重新收养时调用，确保子树深度在下次访问时重新计算。
   */
  protected _invalidateDepth(): void {
    this._cachedDepth = undefined;
    for (const child of this._children) {
      child._invalidateDepth();
    }
  }
```

4. Update `adoptChild` to call `_invalidateDepth` instead of eager assignment:

Replace lines 124-133:
```ts
  adoptChild(child: RenderObject): void {
    child._parent = this;
    child._invalidateDepth();
    this.setupParentData(child);
    this._children.push(child);
    if (this._attached) {
      child.attach();
    }
    this.markNeedsLayout();
  }
```

5. Update `dropChild` to call `_invalidateDepth`:

After `child._parent = null;` (line 152), add:
```ts
    child._invalidateDepth();
```

6. Remove the old `protected _depth: number = 0;` field declaration (line 43). The `_cachedDepth` field replaces it.

- [ ] **Step 4: Update Element.ts depth to match**

In `packages/tui/src/tree/element.ts`, apply the same pattern:

Replace line 70:
```ts
  /** 在元素树中的深度（缓存值） */
  private _cachedDepth: number | undefined = undefined;
```

Replace the `depth` getter (lines 110-112):
```ts
  get depth(): number {
    if (this._cachedDepth === undefined) {
      this._cachedDepth = this._parent ? this._parent.depth + 1 : 0;
    }
    return this._cachedDepth;
  }
```

Update `addChild` (line 145) — replace `child._depth = this._depth + 1;` with:
```ts
    child._cachedDepth = undefined; // invalidate — will recompute lazily
```

Update `mount` (line 189) — replace `this._depth = parent ? parent.depth + 1 : 0;` with:
```ts
    this._cachedDepth = undefined; // will compute lazily from parent
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/tree/render-object.test.ts`
Expected: All tests PASS including the re-parenting depth test.

- [ ] **Step 6: Run full test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 7: tmux e2e verification**

Run the tmux e2e sequence from the plan header. Depth changes affect build queue ordering, which can cause subtle rendering issues — verify the demo renders all widgets correctly.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/tree/render-object.ts packages/tui/src/tree/element.ts packages/tui/src/tree/render-object.test.ts
git commit -m "fix(tree): switch to lazy cached depth with _invalidateDepth cascade

Align with amp vH._invalidateDepth (0533_unknown_vH.js:34-37). Depth is
now computed lazily on access and cached. adoptChild/dropChild invalidate
the cache recursively, ensuring correct depth after subtree re-parenting.
Same pattern applied to Element tree."
```

---

### Task 7: Flex space allocation — `Math.floor` for integer terminal positions

**Files:**
- Modify: `packages/tui/src/widgets/flex.ts:236-258`
- Test: `packages/tui/src/widgets/flex.test.ts`

**Amp reference:** `s1T` (layout_widgets.js line 402) — `Math.floor(m * P)` for all flex children except the last, which gets the remainder.

- [ ] **Step 1: Write failing test**

```ts
describe("RenderFlex — integer space allocation (amp s1T alignment)", () => {
  it("flex children get integer main-axis sizes, last child gets remainder", () => {
    const flex = new RenderFlex({ direction: "horizontal", mainAxisSize: "max" });

    // Create 3 flex children each with flex=1
    const child1 = new TestFlexChild();
    const child2 = new TestFlexChild();
    const child3 = new TestFlexChild();

    flex.adoptChild(child1);
    flex.adoptChild(child2);
    flex.adoptChild(child3);

    (child1.parentData as FlexParentData).flex = 1;
    (child1.parentData as FlexParentData).fit = "tight";
    (child2.parentData as FlexParentData).flex = 1;
    (child2.parentData as FlexParentData).fit = "tight";
    (child3.parentData as FlexParentData).flex = 1;
    (child3.parentData as FlexParentData).fit = "tight";

    // Layout with width=100 — 100/3 = 33.333... per child
    // Expected: 33, 33, 34 (last gets remainder)
    const constraints = BoxConstraints.tight(100, 10);
    flex.layout(constraints);

    const w1 = child1.size.width;
    const w2 = child2.size.width;
    const w3 = child3.size.width;

    assert.equal(Number.isInteger(w1), true, `child1 width should be integer, got ${w1}`);
    assert.equal(Number.isInteger(w2), true, `child2 width should be integer, got ${w2}`);
    assert.equal(Number.isInteger(w3), true, `child3 width should be integer, got ${w3}`);
    assert.equal(w1 + w2 + w3, 100, "total should equal container width");
  });
});
```

Note: `TestFlexChild` is a concrete `RenderBox` subclass that respects constraints in `performLayout`:

```ts
class TestFlexChild extends RenderBox {
  performLayout(): void {
    const c = this._lastConstraints!;
    this.setSize(c.maxWidth, c.maxHeight);
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/widgets/flex.test.ts`
Expected: FAIL — child widths are 33.333... (not integers).

- [ ] **Step 3: Implement `Math.floor` allocation**

In `packages/tui/src/widgets/flex.ts`, replace the flex child allocation loop (lines 239-258):

```ts
    // ── Pass 2: 布局弹性子节点 ─────────────────────
    // 逆向: amp s1T line 402 — Math.floor for intermediate, remainder for last
    let allocatedFlexSpace = 0;
    const flexChildren: RenderBox[] = [];
    for (const child of this._children) {
      const pd = child.parentData as FlexParentData;
      if (pd.flex > 0) {
        flexChildren.push(child as RenderBox);
      }
    }

    for (let i = 0; i < flexChildren.length; i++) {
      const child = flexChildren[i]!;
      const pd = child.parentData as FlexParentData;
      const flex = pd.flex;

      let childMainAxis: number;
      if (i < flexChildren.length - 1) {
        // Intermediate children: floor to integer
        childMainAxis = Math.floor(spacePerFlex * flex);
      } else {
        // Last child: gets the remainder to avoid drift
        childMainAxis = freeMainAxis - allocatedFlexSpace;
      }
      allocatedFlexSpace += childMainAxis;

      const isTight = pd.fit === "tight";
      const childConstraints = this._buildChildConstraints(
        isTight ? childMainAxis : 0,
        childMainAxis,
        maxCross,
        isTight,
      );
      child.layout(childConstraints);
      const childSize = child.size;
      allocatedMainAxis += this._getMainAxisSize(childSize);
      crossAxisExtent = Math.max(crossAxisExtent, this._getCrossAxisSize(childSize));
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/tui && bun test src/widgets/flex.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 6: tmux e2e verification**

Run the tmux e2e sequence from the plan header. Flex space changes affect button layout — verify buttons render with correct widths, no fractional-position artifacts, and spacing looks clean.

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/widgets/flex.ts packages/tui/src/widgets/flex.test.ts
git commit -m "fix(flex): use Math.floor for integer terminal positions

Align with amp s1T (layout_widgets.js:402). Intermediate flex children
get floored main-axis space; the last child receives the remainder.
Prevents fractional character positions on the terminal grid."
```

---

### Task 8: RenderBox `paint` offset convention — align with amp O9

**Files:**
- Modify: `packages/tui/src/tree/render-box.ts:317-340`
- Modify: `packages/tui/src/widgets/container.ts` (performPaint uses offsetX/Y)
- Modify: `packages/tui/src/widgets/viewport.ts` (performPaint uses offsetX/Y)
- Modify: `packages/tui/src/widgets/rich-text.ts` (performPaint uses offsetX/Y)
- Modify: `packages/tui/src/widgets/align.ts` (if it has performPaint)
- Test: `packages/tui/src/tree/render-box.test.ts`

**Amp reference:** `O9.paint` (chunk-005.js:157710-157740) — passes `R + this.offset.x` as parent-accumulated offset to children; each node adds its own offset for absolute position in `performPaint`.

This is the **riskiest task** because it changes the paint contract for all render objects.

**Key convention change:**
- **Before (Flitter):** `paint(screen, absoluteX, absoluteY)` — offsetX/Y is the node's absolute screen position
- **After (amp):** `paint(screen, parentOffsetX, parentOffsetY)` — offsetX/Y is the parent's accumulated offset; the node computes its own absolute position as `parentOffsetX + this.offset.x`

- [ ] **Step 1: Write failing test for new convention**

```ts
describe("RenderBox — paint offset convention (amp O9 alignment)", () => {
  it("performPaint receives absolute position computed from parent offset + own offset", () => {
    let paintedAt: { x: number; y: number } | null = null;

    class TrackedBox extends RenderBox {
      performLayout(): void {
        this.setSize(10, 5);
      }
      override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
        paintedAt = { x: offsetX, y: offsetY };
      }
    }

    const parent = new TrackedBox();
    const child = new TrackedBox();
    parent.adoptChild(child);

    parent.setOffset(3, 4);
    child.setOffset(10, 20);

    const constraints = BoxConstraints.tight(80, 24);
    parent.layout(constraints);

    const mockScreen = createMockScreen(80, 24);
    // Root paint call with parent offset 0,0
    parent.paint(mockScreen, 0, 0);

    // Under amp convention:
    // parent.performPaint gets (0 + 3, 0 + 4) = (3, 4)
    // child.performPaint gets (3 + 10, 4 + 20) = (13, 24)
    assert.deepEqual(paintedAt, { x: 13, y: 24 }, "child should paint at parent_offset + own_offset");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/tui && bun test src/tree/render-box.test.ts`
Expected: FAIL — under current convention, child gets `(0 + 10, 0 + 20) = (10, 20)` because parent offset is not accumulated.

- [ ] **Step 3: Implement the new paint convention in RenderBox**

In `packages/tui/src/tree/render-box.ts`, replace `paint()` (lines 317-340):

```ts
  /**
   * 绘制当前节点及其子树。
   *
   * 逆向: O9.paint — parent passes accumulated offset; node adds own offset
   * for absolute position.
   *
   * Convention: offsetX/Y is the parent's accumulated screen offset.
   * This node's absolute position = offsetX + this._offset.x, offsetY + this._offset.y.
   * performPaint receives the absolute position.
   * Children receive this node's absolute position as their parent offset.
   *
   * @param screen - 目标屏幕
   * @param offsetX - 父节点累积的 X 偏移
   * @param offsetY - 父节点累积的 Y 偏移
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;

    // This node's absolute position
    const absX = offsetX + this._offset.x;
    const absY = offsetY + this._offset.y;

    // performPaint gets absolute position for drawing
    this.performPaint(screen, absX, absY);

    const screenWidth = screen.width;
    const screenHeight = screen.height;

    for (const child of this._children) {
      if (child instanceof RenderBox) {
        // Cull check: child absolute position
        const cx = absX + child._offset.x;
        const cy = absY + child._offset.y;
        const cr = cx + child._size.width;
        const cb = cy + child._size.height;

        if (cx >= screenWidth || cy >= screenHeight || cr <= 0 || cb <= 0) {
          continue;
        }
        // Pass THIS node's absolute position as the parent offset for the child
        child.paint(screen, absX, absY);
      } else {
        child.paint(screen, absX, absY);
      }
    }
  }
```

- [ ] **Step 4: Update the root paint call in WidgetsBinding**

In `packages/tui/src/binding/widgets-binding.ts`, the `renderRenderObject` method calls `rootRO.paint(screen, 0, 0)`. Under the new convention, this means "the root's parent offset is (0,0)", so the root will compute its absolute position as `0 + root.offset.x`. Since the root's offset is typically (0,0), this is correct. **No change needed here.**

- [ ] **Step 5: Audit and update all `performPaint` overrides**

Each `performPaint` already receives `(offsetX, offsetY)` as the node's absolute position — this hasn't changed. The difference is only in how `paint()` computes that value. **Most `performPaint` implementations should work without changes** since they already use offsetX/Y as absolute coordinates.

However, any render object that **overrides `paint()` instead of `performPaint()`** needs updating. Search for `override paint(` in the codebase:

- `RenderMouseRegion.paint` — inherits from `RenderBox`, uses default `paint()`. Check if it overrides paint. (It doesn't — uses `performLayout` only.)
- `RenderViewport.paint` / `RenderViewportWithPosition.paint` — these override `paint()` directly. They must be updated to add `this._offset` to the incoming parent offset.
- `RenderScrollable.paint` — if it overrides `paint()`, update similarly.

For each override found, apply the same pattern: compute `absX = offsetX + this._offset.x` before any drawing or child delegation.

- [ ] **Step 6: Run tests to verify**

Run: `cd packages/tui && bun test`
Expected: All tests PASS.

- [ ] **Step 7: tmux e2e verification (CRITICAL for this task)**

This task changes the paint contract for ALL render objects — thorough e2e is essential:

```bash
tmux new-session -d -s flitter-paint -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2

# Verify initial render — all widgets at correct positions
tmux capture-pane -t flitter-paint -p
# Expected: Title bar at top, buttons in correct row, GestureDetector area visible, footer at bottom

# Test click on first button
tmux send-keys -t flitter-paint -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-paint -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-paint -p
# Expected: "Last event: Clicked ..." — hit-test coordinates must still work under new offset convention

# Test hover enter/exit by moving mouse across a button boundary
tmux send-keys -t flitter-paint -l $'\x1b[<35;5;8M'   # SGR move
sleep 0.2
tmux send-keys -t flitter-paint -l $'\x1b[<35;30;8M'  # SGR move to different area
sleep 0.5
tmux capture-pane -t flitter-paint -p
# Expected: Event log shows enter/exit events

# Quit
tmux send-keys -t flitter-paint 'q'
sleep 0.5
tmux kill-session -t flitter-paint 2>/dev/null
```

If buttons render at wrong positions, clicks don't register, or hover events fire on wrong regions, the offset convention change has a bug. Fix before committing.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/tree/render-box.ts packages/tui/src/widgets/viewport.ts packages/tui/src/tree/render-box.test.ts
git commit -m "fix(render-box): align paint offset convention with amp O9

Change paint() to pass parent-accumulated offset instead of absolute
child position. Each node now computes its own absolute position as
parentOffset + this.offset in paint(), matching amp O9.paint
(chunk-005.js:157710-157740). performPaint still receives the node's
absolute position for drawing."
```

---

## Execution Order and Dependencies

```
Task 1 (markNeedsLayout/markNeedsPaint guards)
  ↓
Task 2 (attach/detach guards)
  ↓
Task 3 (dispose removeFromQueues)
  ↓
Task 4 (PipelineOwner layout queue + beginFrame)   ← depends on Task 1 (guards change markNeedsLayout behavior)
  ↓
Task 5 (resize propagation)                        ← independent but test after pipeline fixes
  ↓
Task 6 (depth invalidation)                        ← independent
  ↓
Task 7 (flex Math.floor)                           ← independent
  ↓
Task 8 (paint offset convention)                   ← do LAST — highest risk, touches many files
```

Tasks 1-3 are tightly coupled (all in render-object.ts) and should be done in order. Tasks 4-7 are mostly independent. Task 8 should always be last because it changes the paint contract across all render objects.

## Final Verification

After all 8 tasks are complete:

1. Run full test suite: `cd packages/tui && bun test`
2. **MANDATORY tmux e2e test** — run the full sequence described in the plan header:

```bash
# Full e2e regression: launch, screenshot, click, resize, quit
tmux new-session -d -s flitter-final -x 100 -y 30 'bun run examples/tui-interactive-demo.ts'
sleep 2

# Verify initial render
tmux capture-pane -t flitter-final -p
# Expected: Title bar, event log, 4 buttons with borders, GestureDetector tap area, footer

# Test click on first button (approx column 5, row 8)
tmux send-keys -t flitter-final -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-final -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-final -p
# Expected: "Last event: Clicked ..." and button shows "(1)"

# Test resize
tmux resize-pane -t flitter-final -x 60 -y 20
sleep 1
tmux capture-pane -t flitter-final -p
# Expected: UI redraws at new size, no ghost artifacts, no crash

# Test click still works after resize
tmux send-keys -t flitter-final -l $'\x1b[<0;5;8M'
tmux send-keys -t flitter-final -l $'\x1b[<0;5;8m'
sleep 0.5
tmux capture-pane -t flitter-final -p
# Expected: Click count increments, event log updates

# Quit
tmux send-keys -t flitter-final 'q'
sleep 0.5
tmux kill-session -t flitter-final 2>/dev/null
```

3. If ANY of the above checks fail, the plan is NOT complete — investigate and fix.
