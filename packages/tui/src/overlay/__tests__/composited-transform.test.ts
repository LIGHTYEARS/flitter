/**
 * CompositedTransformTarget / CompositedTransformFollower tests.
 *
 * 逆向: bZT / pZT / _ZT / AZT (chunk-006.js:12811-12996)
 *
 * Tests cover:
 * - Target registers/unregisters itself with LayerLink on attach/detach
 * - Target link setter clears old and registers on new
 * - Target getGlobalPosition walks parent chain
 * - Target getSize returns size
 * - Target updateGlobalPosition notifies followers on change only
 * - Follower shouldShow logic (linked/unlinked × showWhenUnlinked)
 * - Follower calculatePosition adds offset to target transform
 * - Follower calculatePosition returns null when no target
 * - Follower getParentGlobalOffset walks parent chain
 * - Follower performLayout sets 0x0 when !shouldShow
 * - Follower performLayout sets offset and child size when linked
 * - Follower link setter clears cachedPosition and marks needs layout
 * - Follower showWhenUnlinked setter marks needs layout on change
 * - Follower setFollowerOffset marks needs layout on change
 * - Widget createRenderObject / updateRenderObject
 */

import { describe, expect, it } from "bun:test";
import { BoxConstraints } from "../../tree/constraints.js";
import { RenderBox } from "../../tree/render-box.js";
import { RenderCompositedTransformFollower } from "../composited-transform-follower.js";
import { RenderCompositedTransformTarget } from "../composited-transform-target.js";
import { CompositedTransformFollower, CompositedTransformTarget } from "../index.js";
import { LayerLink } from "../layer-link.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/** Minimal concrete RenderBox for use as a parent or child in tests. */
class StubRenderBox extends RenderBox {
  performLayout(): void {
    const c = this._lastConstraints;
    if (c)
      this.setSize(
        c.maxWidth === Infinity ? 0 : c.maxWidth,
        c.maxHeight === Infinity ? 0 : c.maxHeight,
      );
    else this.setSize(0, 0);
  }
}

/** Make a BoxConstraints with fixed width/height (tight). */
function tight(w: number, h: number) {
  return BoxConstraints.tight(w, h);
}

/**
 * Attach a render box to a mock pipeline so that markNeedsLayout works.
 * We patch _attached and stub markNeedsLayout tracking instead.
 */
function makeAttached<T extends RenderBox>(box: T): T {
  // @ts-expect-error — inject test state
  box._attached = true;
  // @ts-expect-error
  box._needsLayout = false;
  return box;
}

// ════════════════════════════════════════════════════
//  RenderCompositedTransformTarget
// ════════════════════════════════════════════════════

describe("RenderCompositedTransformTarget", () => {
  it("setTarget is called in attach() and clearTarget in detach()", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);

    expect(link.target).toBeNull();

    target.attach();
    expect(link.target).toBe(target);

    target.detach();
    expect(link.target).toBeNull();
  });

  it("link setter clears old link and sets new link", () => {
    const link1 = new LayerLink();
    const link2 = new LayerLink();
    const target = new RenderCompositedTransformTarget(link1);

    // Simulate attached state so setTarget notifies (not strictly needed, but realistic)
    target.attach();
    expect(link1.target).toBe(target);

    target.link = link2;
    // Old link should be cleared
    expect(link1.target).toBeNull();
    // New link should be set
    expect(link2.target).toBe(target);

    target.detach();
  });

  it("link setter is a no-op when same link is assigned", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    target.attach();

    const _originalSetTarget = link.setTarget.bind(link);
    const _setCalled = 0;
    // Spy via attach/detach counting — simply confirm target remains registered
    target.link = link; // same link
    expect(link.target).toBe(target);

    target.detach();
  });

  it("getGlobalPosition sums own offset and parent chain offsets", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);

    // Build a parent chain: grandParent → parent → target
    const grandParent = new StubRenderBox();
    const parent = new StubRenderBox();

    // @ts-expect-error — inject parent chain manually
    grandParent._offset = { x: 5, y: 3 };
    // @ts-expect-error
    parent._offset = { x: 10, y: 2 };
    // @ts-expect-error
    target._offset = { x: 1, y: 1 };

    // @ts-expect-error
    parent._parent = grandParent;
    // @ts-expect-error
    target._parent = parent;

    const pos = target.getGlobalPosition();
    expect(pos.x).toBe(1 + 10 + 5); // 16
    expect(pos.y).toBe(1 + 2 + 3); // 6
  });

  it("getGlobalPosition with no parent returns own offset", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    // @ts-expect-error
    target._offset = { x: 7, y: 4 };
    const pos = target.getGlobalPosition();
    expect(pos.x).toBe(7);
    expect(pos.y).toBe(4);
  });

  it("getSize returns current size", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    // @ts-expect-error
    target._size = { width: 40, height: 5 };
    const s = target.getSize();
    expect(s.width).toBe(40);
    expect(s.height).toBe(5);
  });

  it("updateGlobalPosition notifies followers when position changes", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    // @ts-expect-error
    target._offset = { x: 0, y: 0 };

    let notified = 0;
    link.addFollower(() => {
      notified++;
    });

    // First call — starts at 0,0, getGlobalPosition also returns 0,0 → no change
    target.updateGlobalPosition();
    expect(notified).toBe(0);

    // Move the target
    // @ts-expect-error
    target._offset = { x: 5, y: 3 };
    target.updateGlobalPosition();
    expect(notified).toBe(1);
  });

  it("updateGlobalPosition does NOT notify when position is unchanged", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    // @ts-expect-error
    target._offset = { x: 5, y: 3 };

    let notified = 0;
    link.addFollower(() => {
      notified++;
    });

    // First call — changes from cached 0,0 to 5,3 → notifies
    target.updateGlobalPosition();
    expect(notified).toBe(1);

    // Second call — same position
    target.updateGlobalPosition();
    expect(notified).toBe(1);
  });

  it("performLayout with no child sets 0x0 and calls updateGlobalPosition", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    // @ts-expect-error
    target._lastConstraints = tight(80, 24);

    let notified = 0;
    link.addFollower(() => {
      notified++;
    });

    // Set initial global position to non-zero so any update triggers notify
    // @ts-expect-error
    target._globalPosition = { x: 5, y: 2 };
    // But getGlobalPosition returns 0,0 (no parent, offset=0,0)

    target.performLayout();
    const s = target.size;
    expect(s.width).toBe(0);
    expect(s.height).toBe(0);
    // updateGlobalPosition was called: moved from 5,2 → 0,0 → notify
    expect(notified).toBe(1);
  });

  it("performLayout with a child takes child's size", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    // @ts-expect-error
    target._lastConstraints = tight(80, 24);

    const child = new StubRenderBox();
    // @ts-expect-error
    target._children = [child];
    // @ts-expect-error
    child._parent = target;

    target.performLayout();
    // StubRenderBox.performLayout uses maxWidth/maxHeight from constraints
    const s = target.size;
    expect(s.width).toBe(80);
    expect(s.height).toBe(24);
  });
});

// ════════════════════════════════════════════════════
//  RenderCompositedTransformFollower
// ════════════════════════════════════════════════════

describe("RenderCompositedTransformFollower", () => {
  it("shouldShow returns true when target is set", () => {
    const link = new LayerLink();
    const target = new RenderCompositedTransformTarget(link);
    target.attach();

    const follower = new RenderCompositedTransformFollower(link, false, { x: 0, y: 0 });
    expect(follower.shouldShow()).toBe(true);

    target.detach();
  });

  it("shouldShow returns false when no target and showWhenUnlinked=false", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, false, { x: 0, y: 0 });
    expect(link.target).toBeNull();
    expect(follower.shouldShow()).toBe(false);
  });

  it("shouldShow returns true when no target but showWhenUnlinked=true", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 });
    expect(follower.shouldShow()).toBe(true);
  });

  it("calculatePosition returns null when link has no target", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, true, { x: 5, y: 3 });
    expect(follower.calculatePosition()).toBeNull();
  });

  it("calculatePosition adds follower offset to target position", () => {
    const link = new LayerLink();

    // Register a mock target
    const mockTarget = {
      getGlobalPosition: () => ({ x: 10, y: 20 }),
      getSize: () => ({ width: 40, height: 5 }),
    };
    link.setTarget(mockTarget);

    const follower = new RenderCompositedTransformFollower(link, true, { x: 3, y: -2 });
    const pos = follower.calculatePosition();
    expect(pos).not.toBeNull();
    expect(pos!.x).toBe(13); // 10 + 3
    expect(pos!.y).toBe(18); // 20 + (-2)
  });

  it("calculatePosition with zero offset returns target position", () => {
    const link = new LayerLink();
    link.setTarget({
      getGlobalPosition: () => ({ x: 5, y: 7 }),
      getSize: () => ({ width: 10, height: 1 }),
    });
    const follower = new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 });
    const pos = follower.calculatePosition();
    expect(pos!.x).toBe(5);
    expect(pos!.y).toBe(7);
  });

  it("getParentGlobalOffset sums parent chain offsets", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 });

    const grandParent = new StubRenderBox();
    const parent = new StubRenderBox();

    // @ts-expect-error
    grandParent._offset = { x: 3, y: 1 };
    // @ts-expect-error
    parent._offset = { x: 7, y: 2 };
    // @ts-expect-error
    parent._parent = grandParent;
    // @ts-expect-error
    follower._parent = parent;

    const off = follower.getParentGlobalOffset();
    expect(off.x).toBe(10); // 7 + 3
    expect(off.y).toBe(3); // 2 + 1
  });

  it("performLayout sets 0x0 when shouldShow is false", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, false, { x: 0, y: 0 });
    // @ts-expect-error
    follower._lastConstraints = tight(80, 24);
    // No target, showWhenUnlinked=false → shouldShow() = false
    follower.performLayout();
    expect(follower.size.width).toBe(0);
    expect(follower.size.height).toBe(0);
  });

  it("performLayout sets offset relative to parent when linked", () => {
    const link = new LayerLink();
    link.setTarget({
      getGlobalPosition: () => ({ x: 20, y: 10 }),
      getSize: () => ({ width: 40, height: 5 }),
    });

    const follower = new RenderCompositedTransformFollower(link, true, { x: 2, y: 1 });
    // @ts-expect-error
    follower._lastConstraints = tight(80, 24);

    // Stub parent with global offset 5, 3
    const parent = new StubRenderBox();
    // @ts-expect-error
    parent._offset = { x: 5, y: 3 };
    // @ts-expect-error
    follower._parent = parent;

    const child = new StubRenderBox();
    // @ts-expect-error
    follower._children = [child];
    // @ts-expect-error
    child._parent = follower;

    follower.performLayout();

    // Position = target(20,10) + offset(2,1) = (22, 11)
    // Parent global offset = (5, 3)
    // setOffset called with (22-5, 11-3) = (17, 8)
    expect(follower.offset.x).toBe(17);
    expect(follower.offset.y).toBe(8);

    // cachedPosition stores the global position (22, 11)
    expect(follower._cachedPosition?.x).toBe(22);
    expect(follower._cachedPosition?.y).toBe(11);

    // Size = child size (tight 80x24)
    expect(follower.size.width).toBe(80);
    expect(follower.size.height).toBe(24);
  });

  it("performLayout with no child sets 0x0 size", () => {
    const link = new LayerLink();
    link.setTarget({
      getGlobalPosition: () => ({ x: 10, y: 5 }),
      getSize: () => ({ width: 10, height: 1 }),
    });
    const follower = new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 });
    // @ts-expect-error
    follower._lastConstraints = tight(80, 24);
    follower.performLayout();
    expect(follower.size.width).toBe(0);
    expect(follower.size.height).toBe(0);
  });

  it("performLayout showWhenUnlinked=true with no target shows at 0,0 with child size", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 });
    // @ts-expect-error
    follower._lastConstraints = tight(80, 24);

    const child = new StubRenderBox();
    // @ts-expect-error
    follower._children = [child];
    // @ts-expect-error
    child._parent = follower;

    // shouldShow = true (showWhenUnlinked), calculatePosition = null (no target)
    // → pos is null, no setOffset call, size = child size
    follower.performLayout();
    expect(follower._cachedPosition).toBeNull();
    expect(follower.size.width).toBe(80);
    expect(follower.size.height).toBe(24);
  });

  // ── Setters trigger markNeedsLayout ──────────────

  it("link setter clears cachedPosition and marks needs layout", () => {
    const link1 = new LayerLink();
    const link2 = new LayerLink();
    const follower = makeAttached(
      new RenderCompositedTransformFollower(link1, true, { x: 0, y: 0 }),
    );

    // Inject a fake cached position
    follower._cachedPosition = { x: 5, y: 5 };

    // patch markNeedsLayout
    let markCalled = 0;
    const _orig = follower.markNeedsLayout.bind(follower);
    // @ts-expect-error
    follower.markNeedsLayout = () => {
      markCalled++;
    };

    follower.link = link2;

    expect(follower._cachedPosition).toBeNull();
    expect(markCalled).toBeGreaterThan(0);
  });

  it("showWhenUnlinked setter marks needs layout on change", () => {
    const link = new LayerLink();
    const follower = makeAttached(
      new RenderCompositedTransformFollower(link, false, { x: 0, y: 0 }),
    );

    let markCalled = 0;
    // @ts-expect-error
    follower.markNeedsLayout = () => {
      markCalled++;
    };

    follower.showWhenUnlinked = true; // change → should mark
    expect(markCalled).toBe(1);

    follower.showWhenUnlinked = true; // same → no mark
    expect(markCalled).toBe(1);
  });

  it("setFollowerOffset marks needs layout on change", () => {
    const link = new LayerLink();
    const follower = makeAttached(
      new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 }),
    );

    let markCalled = 0;
    // @ts-expect-error
    follower.markNeedsLayout = () => {
      markCalled++;
    };

    follower.setFollowerOffset({ x: 5, y: 3 });
    expect(markCalled).toBe(1);

    follower.setFollowerOffset({ x: 5, y: 3 }); // same → no mark
    expect(markCalled).toBe(1);

    follower.setFollowerOffset({ x: 5, y: 4 }); // changed
    expect(markCalled).toBe(2);
  });

  it("getCurrentPosition returns _cachedPosition", () => {
    const link = new LayerLink();
    const follower = new RenderCompositedTransformFollower(link, true, { x: 0, y: 0 });
    expect(follower.getCurrentPosition()).toBeNull();
    // @ts-expect-error
    follower._cachedPosition = { x: 10, y: 20 };
    expect(follower.getCurrentPosition()).toEqual({ x: 10, y: 20 });
  });
});

// ════════════════════════════════════════════════════
//  Widgets: createRenderObject / updateRenderObject
// ════════════════════════════════════════════════════

describe("CompositedTransformTarget Widget", () => {
  it("createRenderObject returns RenderCompositedTransformTarget with link", () => {
    const link = new LayerLink();
    const widget = new CompositedTransformTarget({ link });
    const ro = widget.createRenderObject();
    expect(ro).toBeInstanceOf(RenderCompositedTransformTarget);
    expect((ro as RenderCompositedTransformTarget).link).toBe(link);
  });

  it("updateRenderObject updates the link", () => {
    const link1 = new LayerLink();
    const link2 = new LayerLink();
    const widget = new CompositedTransformTarget({ link: link2 });
    const ro = new RenderCompositedTransformTarget(link1);
    ro.attach();

    widget.updateRenderObject(ro);
    expect(ro.link).toBe(link2);
    ro.detach();
  });

  it("createElement returns element whose widget is the target", () => {
    const link = new LayerLink();
    const widget = new CompositedTransformTarget({ link });
    const element = widget.createElement();
    expect(element.widget).toBe(widget);
  });
});

describe("CompositedTransformFollower Widget", () => {
  it("createRenderObject returns RenderCompositedTransformFollower with correct props", () => {
    const link = new LayerLink();
    const offset = { x: 3, y: -1 };
    const widget = new CompositedTransformFollower({ link, showWhenUnlinked: false, offset });
    const ro = widget.createRenderObject();
    expect(ro).toBeInstanceOf(RenderCompositedTransformFollower);
    const f = ro as RenderCompositedTransformFollower;
    expect(f.link).toBe(link);
    expect(f.showWhenUnlinked).toBe(false);
    // Verify offset is applied via calculatePosition
    link.setTarget({
      getGlobalPosition: () => ({ x: 0, y: 0 }),
      getSize: () => ({ width: 10, height: 1 }),
    });
    const pos = f.calculatePosition();
    expect(pos?.x).toBe(3);
    expect(pos?.y).toBe(-1);
  });

  it("showWhenUnlinked defaults to true", () => {
    const link = new LayerLink();
    const widget = new CompositedTransformFollower({ link });
    const ro = widget.createRenderObject() as RenderCompositedTransformFollower;
    expect(ro.showWhenUnlinked).toBe(true);
  });

  it("updateRenderObject updates link, showWhenUnlinked, and followerOffset", () => {
    const link1 = new LayerLink();
    const link2 = new LayerLink();
    const widget = new CompositedTransformFollower({
      link: link2,
      showWhenUnlinked: false,
      offset: { x: 5, y: 2 },
    });

    const ro = makeAttached(new RenderCompositedTransformFollower(link1, true, { x: 0, y: 0 }));
    // Suppress markNeedsLayout side effects in tests
    // @ts-expect-error
    ro.markNeedsLayout = () => {};

    widget.updateRenderObject(ro);
    expect(ro.link).toBe(link2);
    expect(ro.showWhenUnlinked).toBe(false);

    // Verify offset updated via calculatePosition
    link2.setTarget({
      getGlobalPosition: () => ({ x: 0, y: 0 }),
      getSize: () => ({ width: 10, height: 1 }),
    });
    const pos = ro.calculatePosition();
    expect(pos?.x).toBe(5);
    expect(pos?.y).toBe(2);
  });

  it("createElement returns element whose widget is the follower", () => {
    const link = new LayerLink();
    const widget = new CompositedTransformFollower({ link });
    const element = widget.createElement();
    expect(element.widget).toBe(widget);
  });
});
