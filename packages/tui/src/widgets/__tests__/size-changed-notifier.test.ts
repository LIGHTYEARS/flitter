/**
 * SizeChangedNotifier unit tests.
 *
 * Tests the size-change notification widget: transparent layout pass-through,
 * callback scheduling on size change, deduplication of rapid changes, no-child
 * behavior, and widget lifecycle (createRenderObject / updateRenderObject).
 *
 * 逆向: NM (misc_utils.js:781-800) — widget class
 * 逆向: N1T (misc_utils.js:801-843) — render object
 */
import * as assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { WidgetsBinding } from "../../binding/widgets-binding.js";
import type { Size } from "../../tree/constraints.js";
import { BoxConstraints } from "../../tree/constraints.js";
import { RenderBox } from "../../tree/render-box.js";
import { RenderSizeChangedNotifier, SizeChangedNotifier } from "../size-changed-notifier.js";

// ─── Test helper: fixed-size render box ────────────────────

class FixedSizeBox extends RenderBox {
  private _w: number;
  private _h: number;
  constructor(w: number, h: number) {
    super();
    this._w = w;
    this._h = h;
  }
  performLayout(): void {
    this.size = this._constraints!.constrain(this._w, this._h);
  }
  setFixedSize(w: number, h: number): void {
    this._w = w;
    this._h = h;
  }
}

// ─── Test helper: simple call tracker ──────────────────────

/** Tracks callback invocations with their arguments. */
function createTracker(): {
  callback: (size: Size) => void;
  calls: Size[];
} {
  const calls: Size[] = [];
  return {
    callback: (size: Size) => calls.push({ ...size }),
    calls,
  };
}

// ─── Helpers ──────────────────────────────────────────

/**
 * Create a RenderSizeChangedNotifier with an optional child.
 */
function createNotifier(
  callback: (size: Size) => void,
  childSize?: [number, number],
): { notifier: RenderSizeChangedNotifier; child?: FixedSizeBox } {
  const notifier = new RenderSizeChangedNotifier(callback);
  let child: FixedSizeBox | undefined;
  if (childSize) {
    child = new FixedSizeBox(childSize[0], childSize[1]);
    notifier.adoptChild(child);
  }
  return { notifier, child };
}

/**
 * Flush any pending post-frame callbacks by executing a frame.
 */
function flushPostFrameCallbacks(): void {
  const binding = WidgetsBinding.instance;
  binding.frameScheduler.executeFrame();
}

// ─── Setup ──────────────────────────────────────────────

beforeEach(() => {
  // Ensure WidgetsBinding singleton is available; disable frame pacing for tests.
  const binding = WidgetsBinding.instance;
  binding.frameScheduler.disableFramePacing();
});

// ─── Render object tests ──────────────────────────────

describe("RenderSizeChangedNotifier", () => {
  describe("performLayout", () => {
    it("should size itself to child constrained by parent constraints", () => {
      const tracker = createTracker();
      // Loose constraints: child can be up to 20x10
      const { notifier } = createNotifier(tracker.callback, [10, 5]);
      const constraints = BoxConstraints.loose(20, 10);

      notifier.layout(constraints);

      assert.deepEqual(notifier.size, { width: 10, height: 5 });
    });

    it("should set child offset to (0, 0)", () => {
      const tracker = createTracker();
      const { notifier, child } = createNotifier(tracker.callback, [10, 5]);
      const constraints = BoxConstraints.loose(20, 10);

      notifier.layout(constraints);

      assert.deepEqual(child!.offset, { x: 0, y: 0 });
    });

    it("should constrain size to parent constraints when child exceeds them", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback, [100, 50]);
      // Tight constraints will clamp child size
      const constraints = BoxConstraints.tight(20, 10);

      notifier.layout(constraints);

      assert.deepEqual(notifier.size, { width: 20, height: 10 });
    });

    it("should handle no child — constrain(0, 0)", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback);
      // Loose constraints: constrain(0, 0) → clamps to (0, 0)
      const constraints = BoxConstraints.loose(20, 10);

      notifier.layout(constraints);

      assert.deepEqual(notifier.size, { width: 0, height: 0 });
    });

    it("should respect min constraints with no child", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback);
      // Min constraints: constrain(0, 0) → clamps to (5, 3)
      const constraints = new BoxConstraints({
        minWidth: 5,
        maxWidth: 20,
        minHeight: 3,
        maxHeight: 10,
      });

      notifier.layout(constraints);

      assert.deepEqual(notifier.size, { width: 5, height: 3 });
    });

    it("should not call callback when no constraints", () => {
      const tracker = createTracker();
      const notifier = new RenderSizeChangedNotifier(tracker.callback);
      // Call performLayout directly without layout() setting constraints
      notifier.performLayout();

      flushPostFrameCallbacks();
      assert.equal(tracker.calls.length, 0);
    });
  });

  describe("size change callback", () => {
    it("should fire onSizeChange after layout when size differs from last reported", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback, [10, 5]);
      // Mark as attached so the post-frame callback doesn't bail
      (notifier as any)._attached = true;
      const constraints = BoxConstraints.loose(20, 10);

      notifier.layout(constraints);
      flushPostFrameCallbacks();

      assert.equal(tracker.calls.length, 1);
      assert.deepEqual(tracker.calls[0], { width: 10, height: 5 });
    });

    it("should not fire callback when size has not changed", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback, [10, 5]);
      (notifier as any)._attached = true;
      const constraints = BoxConstraints.loose(20, 10);

      // First layout — triggers callback
      notifier.layout(constraints);
      flushPostFrameCallbacks();
      assert.equal(tracker.calls.length, 1);

      // Force needsLayout so layout runs again
      notifier.markNeedsLayout();
      // Second layout with same size — should NOT trigger
      notifier.layout(constraints);
      flushPostFrameCallbacks();
      assert.equal(tracker.calls.length, 1);
    });

    it("should fire callback when size changes on subsequent layout", () => {
      const tracker = createTracker();
      const { notifier, child } = createNotifier(tracker.callback, [10, 5]);
      (notifier as any)._attached = true;

      notifier.layout(BoxConstraints.loose(20, 10));
      flushPostFrameCallbacks();
      assert.equal(tracker.calls.length, 1);

      // Change child size and force re-layout with different constraints
      child!.setFixedSize(15, 8);
      // Use slightly different constraints to force constraintsChanged=true
      // which triggers full re-layout including child
      notifier.layout(BoxConstraints.loose(30, 15));
      flushPostFrameCallbacks();

      assert.equal(tracker.calls.length, 2);
      assert.deepEqual(tracker.calls[1], { width: 15, height: 8 });
    });

    it("should not fire callback when not attached", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback, [10, 5]);
      // _attached is false by default
      const constraints = BoxConstraints.loose(20, 10);

      notifier.layout(constraints);
      flushPostFrameCallbacks();

      assert.equal(tracker.calls.length, 0);
    });

    it("should deduplicate rapid size changes within a frame", () => {
      const tracker = createTracker();
      const { notifier, child } = createNotifier(tracker.callback, [10, 5]);
      (notifier as any)._attached = true;

      // Simulate being inside a frame by using a frame callback.
      // In a real app, layout happens during a frame, so addPostFrameCallback
      // from _scheduleSizeReport would defer to the next frame, not fire immediately.
      const binding = WidgetsBinding.instance;
      binding.frameScheduler.addFrameCallback(
        "test-layout",
        () => {
          // First layout schedules a post-frame callback for size (10, 5)
          notifier.layout(BoxConstraints.loose(20, 10));

          // Change size and re-layout before the frame ends.
          // The deduplication guard (_reportScheduled) prevents a second callback.
          child!.setFixedSize(12, 7);
          notifier.layout(BoxConstraints.loose(30, 15));
        },
        "layout",
      );

      // Execute the frame: layout phase runs our callback, then post-frame runs the size report
      binding.frameScheduler.executeFrame();

      // Remove test callback
      binding.frameScheduler.removeFrameCallback("test-layout");

      // Should get exactly one callback with the latest (deduplicated) size
      assert.equal(tracker.calls.length, 1);
      assert.deepEqual(tracker.calls[0], { width: 12, height: 7 });
    });
  });

  describe("updateCallback", () => {
    it("should update the callback reference", () => {
      const tracker1 = createTracker();
      const tracker2 = createTracker();
      const { notifier } = createNotifier(tracker1.callback, [10, 5]);
      (notifier as any)._attached = true;

      // Update callback before layout
      notifier.updateCallback(tracker2.callback);

      notifier.layout(BoxConstraints.loose(20, 10));
      flushPostFrameCallbacks();

      assert.equal(tracker1.calls.length, 0);
      assert.equal(tracker2.calls.length, 1);
    });
  });

  describe("no-child layout", () => {
    it("should not schedule size report when there is no child", () => {
      const tracker = createTracker();
      const { notifier } = createNotifier(tracker.callback);
      (notifier as any)._attached = true;

      notifier.layout(BoxConstraints.loose(20, 10));
      flushPostFrameCallbacks();

      // No child → constrain(0,0) = (0,0) — no size report because there was
      // no child branch (returns early before _scheduleSizeReport)
      assert.equal(tracker.calls.length, 0);
    });
  });
});

// ─── Widget tests ──────────────────────────────────────

describe("SizeChangedNotifier widget", () => {
  it("should store onSizeChange callback", () => {
    const cb = (_s: Size) => {};
    const widget = new SizeChangedNotifier({ onSizeChange: cb });
    assert.equal(widget.onSizeChange, cb);
    assert.equal(widget.child, undefined);
  });

  it("createRenderObject returns RenderSizeChangedNotifier", () => {
    const cb = (_s: Size) => {};
    const widget = new SizeChangedNotifier({ onSizeChange: cb });
    const ro = widget.createRenderObject();
    assert.ok(ro instanceof RenderSizeChangedNotifier);
  });

  it("updateRenderObject updates the callback", () => {
    const tracker1 = createTracker();
    const tracker2 = createTracker();

    const widget1 = new SizeChangedNotifier({ onSizeChange: tracker1.callback });
    const ro = widget1.createRenderObject() as RenderSizeChangedNotifier;

    const widget2 = new SizeChangedNotifier({ onSizeChange: tracker2.callback });
    widget2.updateRenderObject(ro);

    // Verify by triggering: layout + flush
    (ro as any)._attached = true;
    const child = new FixedSizeBox(10, 5);
    ro.adoptChild(child);
    ro.layout(BoxConstraints.loose(20, 10));
    flushPostFrameCallbacks();

    assert.equal(tracker1.calls.length, 0);
    assert.equal(tracker2.calls.length, 1);
  });

  it("createElement returns a SingleChildRenderObjectElement", () => {
    const cb = (_s: Size) => {};
    const widget = new SizeChangedNotifier({ onSizeChange: cb });
    const element = widget.createElement();
    assert.ok(element != null);
  });
});
