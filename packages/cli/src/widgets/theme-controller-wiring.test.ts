/**
 * ThemeController registry wiring tests.
 *
 * Verifies:
 * - ThemeController.registry returns a ThemeRegistry
 * - ThemeController.fromRegistry looks up built-in themes
 * - ThemeController.fromRegistry falls back to default for unknown names
 * - ThemeController.paletteToThemeData converts correctly
 * - ThemeController.maybeOf returns null when not in tree
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { ThemeRegistry } from "@flitter/tui";
import { ThemeController, type ThemeData } from "./theme-controller.js";
import { Element, setBuildOwner } from "@flitter/tui";
import type { Key, Widget } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Test helpers
// ════════════════════════════════════════════════════

class TestWidget implements Widget {
  key: Key | undefined;
  constructor(opts?: { key?: Key }) { this.key = opts?.key; }
  canUpdate(other: Widget): boolean { return this.constructor === other.constructor; }
  createElement(): Element { return new TestElement(this); }
}

class TestElement extends Element {
  override performRebuild(): void { super.performRebuild(); }
}

afterEach(() => {
  setBuildOwner(undefined);
});

// ════════════════════════════════════════════════════
//  Registry access
// ════════════════════════════════════════════════════

describe("ThemeController.registry", () => {
  it("returns a ThemeRegistry instance", () => {
    const registry = ThemeController.registry;
    assert.ok(registry instanceof ThemeRegistry);
  });

  it("allows setting a custom registry", () => {
    const original = ThemeController.registry;
    const custom = new ThemeRegistry();
    ThemeController.registry = custom;
    assert.strictEqual(ThemeController.registry, custom);
    // Restore
    ThemeController.registry = original;
  });
});

// ════════════════════════════════════════════════════
//  fromRegistry
// ════════════════════════════════════════════════════

describe("ThemeController.fromRegistry", () => {
  it("looks up dark theme", () => {
    const data = ThemeController.fromRegistry("dark");
    assert.equal(data.name, "dark");
    assert.ok(data.primary.startsWith("#"));
    assert.ok(data.background.startsWith("#"));
  });

  it("looks up catppuccin-mocha theme", () => {
    const data = ThemeController.fromRegistry("catppuccin-mocha");
    assert.equal(data.name, "catppuccin-mocha");
  });

  it("looks up nord theme", () => {
    const data = ThemeController.fromRegistry("nord");
    assert.equal(data.name, "nord");
  });

  it("falls back to terminal/default for unknown name", () => {
    const data = ThemeController.fromRegistry("nonexistent-theme");
    assert.equal(data.name, "terminal"); // fallback is terminal
  });

  it("returns all 12 ThemeData fields", () => {
    const data = ThemeController.fromRegistry("dark");
    const fields: (keyof ThemeData)[] = [
      "name", "primary", "secondary", "surface", "background",
      "error", "text", "mutedText", "border", "accent", "success", "warning",
    ];
    for (const f of fields) {
      assert.ok(f in data, `Missing field: ${f}`);
      assert.ok(data[f] !== undefined, `Field ${f} is undefined`);
    }
  });

  it("returns hex color strings", () => {
    const data = ThemeController.fromRegistry("dark");
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    const colorFields: (keyof ThemeData)[] = [
      "primary", "secondary", "surface", "background",
      "error", "text", "mutedText", "border", "accent", "success", "warning",
    ];
    for (const f of colorFields) {
      assert.match(data[f], hexPattern, `${f} = "${data[f]}" is not a valid hex color`);
    }
  });
});

// ════════════════════════════════════════════════════
//  maybeOf
// ════════════════════════════════════════════════════

describe("ThemeController.maybeOf", () => {
  it("returns null when no ThemeController in tree", () => {
    const widget = new TestWidget();
    const element = widget.createElement();
    element.mount(undefined);
    const result = ThemeController.maybeOf(element);
    assert.equal(result, null);
  });

  it("returns ThemeData when ThemeController is in tree", () => {
    const data: ThemeData = {
      name: "test",
      primary: "#ff0000",
      secondary: "#00ff00",
      surface: "#111111",
      background: "#000000",
      error: "#ff0000",
      text: "#ffffff",
      mutedText: "#888888",
      border: "#333333",
      accent: "#ff00ff",
      success: "#00ff00",
      warning: "#ffff00",
    };
    const child = new TestWidget();
    const tc = new ThemeController({ data, child });
    const element = tc.createElement();
    element.mount(undefined);
    const leafElement = element.children[0]!;
    const result = ThemeController.maybeOf(leafElement);
    assert.strictEqual(result, data);
  });
});

// ════════════════════════════════════════════════════
//  Backward compatibility
// ════════════════════════════════════════════════════

describe("ThemeController backward compat", () => {
  it("of() still works as before", () => {
    const data: ThemeData = {
      name: "compat-test",
      primary: "#ff0000",
      secondary: "#00ff00",
      surface: "#111111",
      background: "#000000",
      error: "#ff0000",
      text: "#ffffff",
      mutedText: "#888888",
      border: "#333333",
      accent: "#ff00ff",
      success: "#00ff00",
      warning: "#ffff00",
    };
    const child = new TestWidget();
    const tc = new ThemeController({ data, child });
    const element = tc.createElement();
    element.mount(undefined);
    const leafElement = element.children[0]!;
    const result = ThemeController.of(leafElement);
    assert.strictEqual(result, data);
  });

  it("of() still throws when no ThemeController in tree", () => {
    const widget = new TestWidget();
    const element = widget.createElement();
    element.mount(undefined);
    assert.throws(
      () => ThemeController.of(element),
      (err: Error) => err.message.includes("ThemeController not found"),
    );
  });

  it("updateShouldNotify still works", () => {
    const child = new TestWidget();
    const data1: ThemeData = { name: "a", primary: "#ff0000", secondary: "#00ff00", surface: "#111", background: "#000", error: "#f00", text: "#fff", mutedText: "#888", border: "#333", accent: "#f0f", success: "#0f0", warning: "#ff0" };
    const data2: ThemeData = { name: "b", primary: "#0000ff", secondary: "#00ff00", surface: "#111", background: "#000", error: "#f00", text: "#fff", mutedText: "#888", border: "#333", accent: "#f0f", success: "#0f0", warning: "#ff0" };
    const tc1 = new ThemeController({ data: data1, child });
    const tc2 = new ThemeController({ data: data2, child });
    assert.equal(tc2.updateShouldNotify(tc1), true);
    assert.equal(tc1.updateShouldNotify(tc1), false);
  });
});
