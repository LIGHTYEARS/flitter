/**
 * WelcomeScreen unit tests.
 *
 * Validates:
 * - WelcomeScreen extends StatelessWidget
 * - build() returns a Column with centered orb ASCII art rows
 * - Default productName is "Flitter"
 * - Custom productName replaces the default in the welcome text
 * - Help text lines are present in the widget tree
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Column, RichText, Row, StatelessWidget } from "@flitter/tui";
import { WelcomeScreen } from "./welcome-screen.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Recursively extract all plain text content from a widget tree.
 */
function extractPlainTexts(widget: any): string[] {
  const results: string[] = [];
  if (widget instanceof RichText) {
    results.push(widget.text.toPlainText());
  }
  if (widget.children) {
    for (const child of widget.children) {
      results.push(...extractPlainTexts(child));
    }
  }
  if (widget.child) {
    results.push(...extractPlainTexts(widget.child));
  }
  return results;
}

// ════════════════════════════════════════════════════
//  WelcomeScreen Tests
// ════════════════════════════════════════════════════

describe("WelcomeScreen", () => {
  it("extends StatelessWidget", () => {
    const widget = new WelcomeScreen();
    assert.ok(widget instanceof StatelessWidget);
  });

  it("can be constructed without config (defaults)", () => {
    const widget = new WelcomeScreen();
    assert.ok(widget);
    assert.equal(widget.config.productName, undefined);
  });

  it("can be constructed with custom productName", () => {
    const widget = new WelcomeScreen({ productName: "MyApp" });
    assert.equal(widget.config.productName, "MyApp");
  });

  it("build() returns a Column (vertically centered layout)", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any);
    assert.ok(built instanceof Column, "Top-level widget should be a Column");
  });

  it("build() uses mainAxisAlignment: center for vertical centering", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any) as Column;
    assert.equal(built.mainAxisAlignment, "center");
  });

  it('build() includes "Welcome to Flitter" by default', () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any);
    const texts = extractPlainTexts(built);
    const hasWelcome = texts.some((t) => t.includes("Welcome to Flitter"));
    assert.ok(hasWelcome, `Expected "Welcome to Flitter" in ${JSON.stringify(texts)}`);
  });

  it('build() uses custom product name in "Welcome to" text', () => {
    const widget = new WelcomeScreen({ productName: "MyTool" });
    const built = widget.build({} as any);
    const texts = extractPlainTexts(built);
    const hasCustomName = texts.some((t) => t.includes("Welcome to MyTool"));
    assert.ok(hasCustomName, `Expected "Welcome to MyTool" in ${JSON.stringify(texts)}`);
  });

  it('build() includes "Ctrl+O" help hint', () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any);
    const texts = extractPlainTexts(built);
    const hasCtrlO = texts.some((t) => t.includes("Ctrl+O"));
    assert.ok(hasCtrlO, `Expected "Ctrl+O" in ${JSON.stringify(texts)}`);
  });

  it("build() includes Tab/Shift+Tab navigation hint", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any);
    const texts = extractPlainTexts(built);
    const hasTabHint = texts.some((t) => t.includes("Tab/Shift+Tab"));
    assert.ok(hasTabHint, `Expected "Tab/Shift+Tab" in ${JSON.stringify(texts)}`);
  });

  it("build() contains ASCII art orb characters", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any);
    const texts = extractPlainTexts(built);
    // The orb art should contain density characters like * + = - : .
    const hasOrbChars = texts.some((t) => t.includes("***") || t.includes("+++"));
    assert.ok(hasOrbChars, `Expected ASCII art orb characters in output`);
  });

  it("build() produces a single centered Row containing orb and text columns", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any) as Column;
    assert.equal(built.children.length, 1, "Should have exactly 1 child (the Row)");
    assert.ok(built.children[0] instanceof Row, "Child should be a Row");
  });

  describe("layout structure", () => {
    it("has outer Column > single Row > [orbColumn, gap, textColumn] structure", () => {
      const widget = new WelcomeScreen({ productName: "Flitter" });
      const tree = widget.build({} as any);

      // Outer: Column with mainAxisAlignment: "center"
      assert.ok(tree instanceof Column, "Root should be Column");
      const outerColumn = tree as any;
      assert.equal(outerColumn.mainAxisAlignment, "center");

      // Single child: Row with mainAxisSize: "min"
      const outerChildren = outerColumn.children;
      assert.equal(outerChildren.length, 1, "Outer Column should have exactly 1 child (the Row)");
      const mainRow = outerChildren[0];
      assert.ok(mainRow instanceof Row, "Single child should be Row");
      assert.equal((mainRow as any).mainAxisSize, "min");

      // Row children: [Column(orb), SizedBox, Column(text)]
      const rowChildren = (mainRow as any).children;
      assert.equal(rowChildren.length, 3, "Row should have 3 children: orbColumn, gap, textColumn");
      assert.ok(rowChildren[0] instanceof Column, "First child should be Column (orb lines)");
      assert.ok(rowChildren[2] instanceof Column, "Third child should be Column (help texts)");
    });

    it("orb column has all 17 orb lines left-aligned", () => {
      const widget = new WelcomeScreen({ productName: "Flitter" });
      const tree = widget.build({} as any);
      const mainRow = (tree as any).children[0];
      const orbColumn = (mainRow as any).children[0];
      const orbChildren = orbColumn.children;
      assert.equal(orbChildren.length, 17, "Orb column should have 17 lines");
      assert.equal(
        orbColumn.crossAxisAlignment ?? "start",
        "start",
        "Orb column should left-align its children",
      );
    });
  });
});
