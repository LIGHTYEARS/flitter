/**
 * SplitPane widget tests.
 *
 * Covers:
 * - Construction
 * - Direction and ratio configuration
 * - RenderObject creation
 * - Layout calculations
 * - Min/max ratio constraints
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SplitPane, SplitPaneRenderObject } from "./split-pane.js";
import { SizedBox } from "./sized-box.js";
import { Color } from "../screen/color.js";
import { BoxConstraints } from "../tree/constraints.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("SplitPane", () => {
  it("constructs with required props", () => {
    const left = new SizedBox({ width: 10, height: 10 });
    const right = new SizedBox({ width: 10, height: 10 });
    const sp = new SplitPane({
      direction: "horizontal",
      children: [left, right],
    });
    assert.equal(sp.direction, "horizontal");
    assert.equal(sp.initialRatio, 0.5);  // default
    assert.equal(sp.minRatio, 0.1);      // default
    assert.equal(sp.maxRatio, 0.9);      // default
  });

  it("constructs with all props", () => {
    const left = new SizedBox();
    const right = new SizedBox();
    let resizeRatio = 0;
    const sp = new SplitPane({
      direction: "vertical",
      initialRatio: 0.3,
      children: [left, right],
      onResize: (r) => { resizeRatio = r; },
      minRatio: 0.2,
      maxRatio: 0.8,
      dividerColor: Color.red(),
    });
    assert.equal(sp.direction, "vertical");
    assert.equal(sp.initialRatio, 0.3);
    assert.equal(sp.minRatio, 0.2);
    assert.equal(sp.maxRatio, 0.8);
  });

  it("exposes children array", () => {
    const a = new SizedBox();
    const b = new SizedBox();
    const sp = new SplitPane({
      direction: "horizontal",
      children: [a, b],
    });
    assert.equal(sp.children.length, 2);
  });

  it("creates a render object", () => {
    const sp = new SplitPane({
      direction: "horizontal",
      children: [new SizedBox(), new SizedBox()],
    });
    const ro = sp.createRenderObject();
    assert.ok(ro instanceof SplitPaneRenderObject);
  });
});

// ════════════════════════════════════════════════════
//  RenderObject tests
// ════════════════════════════════════════════════════

describe("SplitPaneRenderObject", () => {
  it("clamps ratio to min/max", () => {
    const ro = new SplitPaneRenderObject("horizontal", 0.05, 0.1, 0.9, Color.rgb(128, 128, 128));
    assert.equal(ro.ratio, 0.1); // clamped to min

    const ro2 = new SplitPaneRenderObject("horizontal", 0.95, 0.1, 0.9, Color.rgb(128, 128, 128));
    assert.equal(ro2.ratio, 0.9); // clamped to max
  });

  it("accepts valid ratio", () => {
    const ro = new SplitPaneRenderObject("horizontal", 0.5, 0.1, 0.9, Color.rgb(128, 128, 128));
    assert.equal(ro.ratio, 0.5);
  });

  it("update changes ratio", () => {
    const ro = new SplitPaneRenderObject("horizontal", 0.5, 0.1, 0.9, Color.rgb(128, 128, 128));
    assert.equal(ro.ratio, 0.5);
    ro.update("vertical", 0.7, 0.1, 0.9, Color.rgb(128, 128, 128));
    assert.equal(ro.ratio, 0.7);
  });

  it("intrinsic width for horizontal includes divider", () => {
    const ro = new SplitPaneRenderObject("horizontal", 0.5, 0.1, 0.9, Color.rgb(128, 128, 128));
    // With no children, min width = 1 (divider only)
    assert.equal(ro.getMinIntrinsicWidth(10), 1);
  });

  it("intrinsic height for vertical includes divider", () => {
    const ro = new SplitPaneRenderObject("vertical", 0.5, 0.1, 0.9, Color.rgb(128, 128, 128));
    assert.equal(ro.getMinIntrinsicHeight(10), 1);
  });
});
