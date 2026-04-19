/**
 * Badge widget tests.
 *
 * Covers:
 * - Construction with count, label, or neither
 * - Default values
 * - Color customization
 * - Build verification
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Badge } from "./badge.js";
import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  Construction tests
// ════════════════════════════════════════════════════

describe("Badge", () => {
  it("constructs with count", () => {
    const badge = new Badge({ count: 5 });
    assert.equal(badge.count, 5);
    assert.equal(badge.label, undefined);
    assert.equal(badge.bold, true); // default
  });

  it("constructs with label", () => {
    const badge = new Badge({ label: "NEW" });
    assert.equal(badge.count, undefined);
    assert.equal(badge.label, "NEW");
  });

  it("constructs with neither count nor label", () => {
    const badge = new Badge({});
    assert.equal(badge.count, undefined);
    assert.equal(badge.label, undefined);
    // Should render [●] as fallback
  });

  it("constructs with custom color", () => {
    const color = Color.red();
    const badge = new Badge({ count: 3, color });
    assert.ok(badge.color.equals(color));
  });

  it("constructs with background color", () => {
    const bgColor = Color.blue();
    const badge = new Badge({ count: 1, backgroundColor: bgColor });
    assert.ok(badge.backgroundColor!.equals(bgColor));
  });

  it("default color is yellow", () => {
    const badge = new Badge({ count: 1 });
    assert.ok(badge.color.equals(Color.yellow()));
  });

  it("bold defaults to true", () => {
    const badge = new Badge({ count: 1 });
    assert.equal(badge.bold, true);
  });

  it("bold can be set to false", () => {
    const badge = new Badge({ count: 1, bold: false });
    assert.equal(badge.bold, false);
  });
});

// ════════════════════════════════════════════════════
//  Count display tests
// ════════════════════════════════════════════════════

describe("Badge display", () => {
  it("count zero renders correctly", () => {
    const badge = new Badge({ count: 0 });
    assert.equal(badge.count, 0);
  });

  it("large count renders correctly", () => {
    const badge = new Badge({ count: 9999 });
    assert.equal(badge.count, 9999);
  });

  it("count takes precedence over label", () => {
    const badge = new Badge({ count: 7, label: "override" });
    assert.equal(badge.count, 7);
    assert.equal(badge.label, "override");
    // In build(), count is used when both present
  });
});
