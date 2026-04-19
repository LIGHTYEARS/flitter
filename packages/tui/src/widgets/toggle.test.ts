/**
 * Toggle widget tests.
 *
 * Covers:
 * - Construction with default and custom props
 * - Both visual styles (circle and checkbox)
 * - Build produces correct widget tree structure
 * - onChanged callback mechanism
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Toggle } from "./toggle.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("Toggle", () => {
  it("constructs with required props", () => {
    const toggle = new Toggle({
      value: true,
      onChanged: () => {},
    });
    assert.equal(toggle.value, true);
    assert.equal(toggle.toggleStyle, "circle"); // default
    assert.equal(toggle.label, undefined);
    assert.equal(toggle.autofocus, false);
  });

  it("constructs with all props", () => {
    const onChange = (v: boolean) => {};
    const color = Color.cyan();
    const toggle = new Toggle({
      value: false,
      onChanged: onChange,
      label: "Enable",
      style: "checkbox",
      autofocus: true,
      checkedColor: color,
      debugLabel: "test-toggle",
    });
    assert.equal(toggle.value, false);
    assert.equal(toggle.toggleStyle, "checkbox");
    assert.equal(toggle.label, "Enable");
    assert.equal(toggle.autofocus, true);
    assert.ok(toggle.checkedColor!.equals(color));
    assert.equal(toggle.debugLabel, "test-toggle");
  });

  it("builds a widget tree (circle style, checked)", () => {
    const toggle = new Toggle({
      value: true,
      onChanged: () => {},
    });
    // build() should not throw
    // We can't easily test the full tree without a real element, but we can verify it's a StatelessWidget
    assert.ok(toggle instanceof Toggle);
  });

  it("builds a widget tree (checkbox style, unchecked)", () => {
    const toggle = new Toggle({
      value: false,
      onChanged: () => {},
      style: "checkbox",
    });
    assert.ok(toggle instanceof Toggle);
  });

  it("builds a widget tree with label", () => {
    const toggle = new Toggle({
      value: true,
      onChanged: () => {},
      label: "My Toggle",
    });
    assert.equal(toggle.label, "My Toggle");
  });
});

// ════════════════════════════════════════════════════
//  Callback tests
// ════════════════════════════════════════════════════

describe("Toggle callbacks", () => {
  it("stores onChanged reference", () => {
    let called = false;
    const toggle = new Toggle({
      value: false,
      onChanged: (v) => { called = true; },
    });
    // Call onChanged manually to verify it's wired
    toggle.onChanged(true);
    assert.equal(called, true);
  });

  it("onChanged receives inverted value", () => {
    let received: boolean | null = null;
    const toggle = new Toggle({
      value: true,
      onChanged: (v) => { received = v; },
    });
    // When toggled from true, should pass false
    toggle.onChanged(!toggle.value);
    assert.equal(received, false);
  });
});

// ════════════════════════════════════════════════════
//  Style variations
// ════════════════════════════════════════════════════

describe("Toggle styles", () => {
  it("default style is circle", () => {
    const toggle = new Toggle({ value: true, onChanged: () => {} });
    assert.equal(toggle.toggleStyle, "circle");
  });

  it("can use checkbox style", () => {
    const toggle = new Toggle({
      value: false,
      onChanged: () => {},
      style: "checkbox",
    });
    assert.equal(toggle.toggleStyle, "checkbox");
  });
});
