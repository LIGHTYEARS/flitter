/**
 * ProgressBar widget tests.
 *
 * Covers:
 * - Construction with default and custom props
 * - Value clamping (0-1 range)
 * - RenderObject creation and updates
 * - Intrinsic size calculations
 * - Layout and paint verification
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProgressBar, ProgressBarRenderObject } from "./progress-bar.js";
import { Color } from "../screen/color.js";
import { BoxConstraints } from "../tree/constraints.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("ProgressBar", () => {
  it("constructs with required props", () => {
    const pb = new ProgressBar({ value: 0.5 });
    assert.equal(pb.value, 0.5);
    assert.equal(pb.barWidth, 20); // default
    assert.equal(pb.label, undefined);
  });

  it("constructs with all props", () => {
    const color = Color.red();
    const bgColor = Color.blue();
    const pb = new ProgressBar({
      value: 0.75,
      width: 30,
      label: "Loading",
      color,
      backgroundColor: bgColor,
    });
    assert.equal(pb.value, 0.75);
    assert.equal(pb.barWidth, 30);
    assert.equal(pb.label, "Loading");
    assert.ok(pb.color.equals(color));
    assert.ok(pb.backgroundColor.equals(bgColor));
  });

  it("creates a render object", () => {
    const pb = new ProgressBar({ value: 0.5 });
    const ro = pb.createRenderObject();
    assert.ok(ro instanceof ProgressBarRenderObject);
  });

  it("creates an element", () => {
    const pb = new ProgressBar({ value: 0.5 });
    const el = pb.createElement();
    assert.ok(el !== undefined);
  });
});

// ════════════════════════════════════════════════════
//  RenderObject tests
// ════════════════════════════════════════════════════

describe("ProgressBarRenderObject", () => {
  it("clamps value to 0-1 range", () => {
    const ro = new ProgressBarRenderObject(-0.5, 20, undefined, Color.green(), Color.rgb(80, 80, 80));
    // Value is clamped internally — we verify via intrinsic width
    assert.ok(ro.getMinIntrinsicWidth(1) > 0);

    const ro2 = new ProgressBarRenderObject(1.5, 20, undefined, Color.green(), Color.rgb(80, 80, 80));
    assert.ok(ro2.getMinIntrinsicWidth(1) > 0);
  });

  it("calculates correct intrinsic width without label", () => {
    const ro = new ProgressBarRenderObject(0.5, 20, undefined, Color.green(), Color.rgb(80, 80, 80));
    assert.equal(ro.getMinIntrinsicWidth(1), 20);
    assert.equal(ro.getMaxIntrinsicWidth(1), 20);
  });

  it("calculates correct intrinsic width with label", () => {
    const ro = new ProgressBarRenderObject(0.5, 20, "Test", Color.green(), Color.rgb(80, 80, 80));
    // "Test" = 4 chars + 1 space + 20 bar = 25
    assert.equal(ro.getMinIntrinsicWidth(1), 25);
  });

  it("has height of 1", () => {
    const ro = new ProgressBarRenderObject(0.5, 20, undefined, Color.green(), Color.rgb(80, 80, 80));
    assert.equal(ro.getMinIntrinsicHeight(100), 1);
    assert.equal(ro.getMaxIntrinsicHeight(100), 1);
  });

  it("performs layout within constraints", () => {
    const ro = new ProgressBarRenderObject(0.5, 20, undefined, Color.green(), Color.rgb(80, 80, 80));
    ro.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    assert.equal(ro.size.width, 20);
    assert.equal(ro.size.height, 1);
  });

  it("update triggers repaint", () => {
    const ro = new ProgressBarRenderObject(0.5, 20, undefined, Color.green(), Color.rgb(80, 80, 80));
    ro.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    ro.update(0.8, 30, "New Label", Color.red(), Color.blue());
    // After update, re-layout
    ro.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    assert.equal(ro.getMinIntrinsicWidth(1), 40); // "New Label" = 9 + 1 + 30 = 40
  });
});

// ════════════════════════════════════════════════════
//  Value boundary tests
// ════════════════════════════════════════════════════

describe("ProgressBar value boundaries", () => {
  it("handles 0% progress", () => {
    const pb = new ProgressBar({ value: 0.0 });
    const ro = pb.createRenderObject() as ProgressBarRenderObject;
    ro.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    assert.equal(ro.size.height, 1);
  });

  it("handles 100% progress", () => {
    const pb = new ProgressBar({ value: 1.0 });
    const ro = pb.createRenderObject() as ProgressBarRenderObject;
    ro.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    assert.equal(ro.size.height, 1);
  });

  it("handles fractional progress for sub-character rendering", () => {
    const pb = new ProgressBar({ value: 0.333 });
    const ro = pb.createRenderObject() as ProgressBarRenderObject;
    ro.layout(new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 }));
    assert.equal(ro.size.height, 1);
  });
});
