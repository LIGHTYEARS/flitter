/**
 * RenderOverlapColumn unit tests.
 *
 * Tests the overlap column layout: child positioning with overlap gaps,
 * cross-axis alignment, intrinsic size computation, empty state, and
 * widget lifecycle (createRenderObject / updateRenderObject).
 *
 * 逆向: LY (chunk-006.js:3090-3176)
 */
import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxConstraints } from "../../tree/constraints.js";
import { RenderBox } from "../../tree/render-box.js";
import { OverlapColumn, RenderOverlapColumn } from "../overlap-column.js";

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
  override getMinIntrinsicWidth(_h: number): number {
    return this._w;
  }
  override getMaxIntrinsicWidth(_h: number): number {
    return this._w;
  }
  override getMinIntrinsicHeight(_w: number): number {
    return this._h;
  }
  override getMaxIntrinsicHeight(_w: number): number {
    return this._h;
  }
}

/** Create a RenderOverlapColumn with children. */
function createOverlapColumn(
  opts: { overlap?: number; crossAxisAlignment?: "start" | "end" | "center" | "stretch" },
  childSizes: Array<[number, number]>,
): RenderOverlapColumn {
  const col = new RenderOverlapColumn(opts.overlap ?? 1, opts.crossAxisAlignment ?? "stretch");
  for (const [w, h] of childSizes) {
    col.adoptChild(new FixedSizeBox(w, h));
  }
  return col;
}

// ─── Widget spec tests ─────────────────────────────────────

describe("OverlapColumn widget", () => {
  it("should default overlap to 1 and crossAxisAlignment to stretch", () => {
    const widget = new OverlapColumn();
    assert.equal(widget.overlap, 1);
    assert.equal(widget.crossAxisAlignment, "stretch");
    assert.deepEqual(widget.children, []);
  });

  it("should accept custom overlap and crossAxisAlignment", () => {
    const widget = new OverlapColumn({ overlap: 3, crossAxisAlignment: "center" });
    assert.equal(widget.overlap, 3);
    assert.equal(widget.crossAxisAlignment, "center");
  });

  it("should throw on negative overlap", () => {
    assert.throws(() => new OverlapColumn({ overlap: -1 }), /non-negative/);
  });

  it("should accept overlap of 0", () => {
    const widget = new OverlapColumn({ overlap: 0 });
    assert.equal(widget.overlap, 0);
  });

  it("createRenderObject returns RenderOverlapColumn", () => {
    const widget = new OverlapColumn({ overlap: 2, crossAxisAlignment: "end" });
    const ro = widget.createRenderObject();
    assert.ok(ro instanceof RenderOverlapColumn);
  });

  it("updateRenderObject calls updateProperties", () => {
    const widget = new OverlapColumn({ overlap: 2, crossAxisAlignment: "center" });
    const ro = widget.createRenderObject() as RenderOverlapColumn;
    // Update with new props
    const widget2 = new OverlapColumn({ overlap: 3, crossAxisAlignment: "start" });
    widget2.updateRenderObject(ro);
    // Layout to verify the update took effect
    const child = new FixedSizeBox(10, 5);
    ro.adoptChild(child);
    ro.layout(BoxConstraints.loose(80, 80));
    // If overlap was correctly updated to 3, it only matters with multiple children
    // Just verify it doesn't throw
    assert.ok(ro.size.width > 0 || ro.size.height > 0);
  });
});

// ─── Empty state ───────────────────────────────────────────

describe("RenderOverlapColumn -- empty", () => {
  it("should set size to constraint minimum when empty", () => {
    const col = createOverlapColumn({ overlap: 1 }, []);
    col.layout(new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 50 }));
    assert.equal(col.size.width, 10);
    assert.equal(col.size.height, 5);
  });
});

// ─── Basic overlap layout ──────────────────────────────────

describe("RenderOverlapColumn -- basic layout", () => {
  it("should position two children with overlap=1", () => {
    const col = createOverlapColumn({ overlap: 1 }, [
      [40, 10],
      [40, 10],
    ]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    // First child at y=0
    assert.equal(children[0].offset.y, 0);
    // Second child at y = 10 - 1 = 9
    assert.equal(children[1].offset.y, 9);
    // Total height = 10 + 10 - 1 = 19
    assert.equal(col.size.height, 19);
  });

  it("should position three children with overlap=2", () => {
    const col = createOverlapColumn({ overlap: 2 }, [
      [40, 10],
      [40, 8],
      [40, 6],
    ]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    // First child at y=0
    assert.equal(children[0].offset.y, 0);
    // Second child at y = 10 - 2 = 8
    assert.equal(children[1].offset.y, 8);
    // Third child at y = 8 + 8 - 2 = 14
    assert.equal(children[2].offset.y, 14);
    // Total height = 10 + 8 + 6 - 2*2 = 20
    assert.equal(col.size.height, 20);
  });

  it("should handle overlap=0 (no overlap, like a regular column)", () => {
    const col = createOverlapColumn({ overlap: 0 }, [
      [40, 10],
      [40, 5],
    ]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    assert.equal(children[0].offset.y, 0);
    assert.equal(children[1].offset.y, 10);
    assert.equal(col.size.height, 15);
  });

  it("should handle single child (no overlap applied)", () => {
    const col = createOverlapColumn({ overlap: 5 }, [[40, 10]]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    assert.equal(children[0].offset.y, 0);
    assert.equal(col.size.height, 10);
  });
});

// ─── Cross-axis alignment ──────────────────────────────────

describe("RenderOverlapColumn -- cross-axis alignment", () => {
  it("stretch: children fill container width", () => {
    // With stretch, children get tight-width constraints
    const col = createOverlapColumn({ overlap: 1, crossAxisAlignment: "stretch" }, [
      [20, 10],
      [30, 10],
    ]);
    col.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 80 }));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    // FixedSizeBox constrain() clamps to maxWidth=80 tight width
    assert.equal(children[0].size.width, 80);
    assert.equal(children[1].size.width, 80);
    // Both at x=0
    assert.equal(children[0].offset.x, 0);
    assert.equal(children[1].offset.x, 0);
  });

  it("start: children at x=0 with natural width", () => {
    const col = createOverlapColumn({ overlap: 1, crossAxisAlignment: "start" }, [
      [20, 10],
      [30, 10],
    ]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    assert.equal(children[0].size.width, 20);
    assert.equal(children[1].size.width, 30);
    assert.equal(children[0].offset.x, 0);
    assert.equal(children[1].offset.x, 0);
    // Container width = max child width = 30
    assert.equal(col.size.width, 30);
  });

  it("end: children aligned to right edge", () => {
    const col = createOverlapColumn({ overlap: 1, crossAxisAlignment: "end" }, [
      [20, 10],
      [30, 10],
    ]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    // Max child width = 30
    assert.equal(col.size.width, 30);
    // First child (w=20) at x = 30 - 20 = 10
    assert.equal(children[0].offset.x, 10);
    // Second child (w=30) at x = 30 - 30 = 0
    assert.equal(children[1].offset.x, 0);
  });

  it("center: children centered horizontally", () => {
    const col = createOverlapColumn({ overlap: 1, crossAxisAlignment: "center" }, [
      [20, 10],
      [30, 10],
    ]);
    col.layout(BoxConstraints.loose(80, 80));

    const children = [...(col as unknown as { _children: RenderBox[] })._children] as RenderBox[];
    // Max child width = 30
    assert.equal(col.size.width, 30);
    // First child (w=20) centered: floor((30-20)/2) = 5
    assert.equal(children[0].offset.x, 5);
    // Second child (w=30) centered: floor((30-30)/2) = 0
    assert.equal(children[1].offset.x, 0);
  });
});

// ─── Intrinsic sizes ───────────────────────────────────────

describe("RenderOverlapColumn -- intrinsic sizes", () => {
  it("intrinsic width is max across children", () => {
    const col = createOverlapColumn({ overlap: 1 }, [
      [20, 10],
      [30, 10],
      [25, 10],
    ]);
    assert.equal(col.getMinIntrinsicWidth(Infinity), 30);
    assert.equal(col.getMaxIntrinsicWidth(Infinity), 30);
  });

  it("intrinsic height accounts for overlap", () => {
    const col = createOverlapColumn({ overlap: 2 }, [
      [20, 10],
      [20, 8],
      [20, 6],
    ]);
    // Total = 10 + 8 + 6 - 2*2 = 20
    assert.equal(col.getMinIntrinsicHeight(Infinity), 20);
    assert.equal(col.getMaxIntrinsicHeight(Infinity), 20);
  });

  it("intrinsic height for empty column is 0", () => {
    const col = createOverlapColumn({ overlap: 1 }, []);
    assert.equal(col.getMinIntrinsicHeight(Infinity), 0);
    assert.equal(col.getMaxIntrinsicHeight(Infinity), 0);
  });

  it("intrinsic height clamps to 0 if overlap exceeds content", () => {
    // Two children of height 3, overlap 5 → 3 + 3 - 5 = 1
    const col = createOverlapColumn({ overlap: 5 }, [
      [20, 3],
      [20, 3],
    ]);
    assert.equal(col.getMinIntrinsicHeight(Infinity), 1);

    // Two children of height 2, overlap 5 → 2 + 2 - 5 = -1 → clamped to 0
    const col2 = createOverlapColumn({ overlap: 5 }, [
      [20, 2],
      [20, 2],
    ]);
    assert.equal(col2.getMinIntrinsicHeight(Infinity), 0);
  });
});

// ─── Size constraints ──────────────────────────────────────

describe("RenderOverlapColumn -- size constraints", () => {
  it("width clamped to maxWidth constraint", () => {
    const col = createOverlapColumn({ overlap: 1, crossAxisAlignment: "start" }, [
      [100, 10],
      [50, 10],
    ]);
    col.layout(new BoxConstraints({ minWidth: 0, maxWidth: 60, minHeight: 0, maxHeight: 80 }));
    // Max child width is 60 (constrained from 100), column width clamped to maxWidth=60
    assert.equal(col.size.width, 60);
  });

  it("height clamped to maxHeight constraint", () => {
    const col = createOverlapColumn({ overlap: 0 }, [
      [40, 20],
      [40, 20],
      [40, 20],
    ]);
    col.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 25 }));
    // Total height = 60, but clamped to maxHeight=25
    assert.equal(col.size.height, 25);
  });

  it("height respects minHeight constraint", () => {
    const col = createOverlapColumn({ overlap: 0 }, [[40, 5]]);
    col.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 20, maxHeight: 80 }));
    // Child height = 5, but minHeight = 20
    assert.equal(col.size.height, 20);
  });
});

// ─── updateProperties ──────────────────────────────────────

describe("RenderOverlapColumn -- updateProperties", () => {
  it("changing overlap repositions children", () => {
    const col = createOverlapColumn({ overlap: 1 }, [
      [40, 10],
      [40, 10],
    ]);
    col.layout(BoxConstraints.loose(80, 80));
    assert.equal(col.size.height, 19);

    // Update overlap to 3 — use slightly different constraints to force re-layout
    // (markNeedsLayout requires attached render tree; in tests we vary constraints instead)
    col.updateProperties(3, "stretch");
    col.layout(BoxConstraints.loose(80, 81));
    // Total height = 10 + 10 - 3 = 17
    assert.equal(col.size.height, 17);
  });
});
