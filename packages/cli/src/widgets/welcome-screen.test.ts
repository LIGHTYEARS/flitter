/**
 * WelcomeScreen unit tests.
 *
 * Validates:
 * - WelcomeScreen extends StatelessWidget
 * - build() returns a Center with an animated orb + help text
 * - Default productName is "Flitter"
 * - Custom productName replaces the default in the welcome text
 * - Help text lines are present in the widget tree
 * - AnimatedOrb is used instead of static ASCII art
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Center, Column, RichText, Row, SizedBox, StatelessWidget } from "@flitter/tui";
import { AnimatedOrb } from "./animated-orb.js";
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

  it("build() returns a Center (fills parent and centers content)", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any);
    assert.ok(built instanceof Center, "Top-level widget should be a Center");
  });

  it("build() Center wraps a Row containing orb and text", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any) as any;
    assert.ok(built.child instanceof Row, "Center's child should be a Row");
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

  it("build() uses AnimatedOrb instead of static ASCII art", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any) as any;
    const row = built.child;
    assert.ok(row instanceof Row, "Center's child should be a Row");
    const firstChild = row.children[0];
    assert.ok(firstChild instanceof AnimatedOrb, "First Row child should be AnimatedOrb");
  });

  describe("layout structure", () => {
    it("has Center > Row > [AnimatedOrb, SizedBox(gap), SizedBox(textColumn)] structure", () => {
      const widget = new WelcomeScreen({ productName: "Flitter" });
      const tree = widget.build({} as any);

      // Outer: Center (RenderPositionedBox fills parent, centers child)
      assert.ok(tree instanceof Center, "Root should be Center");

      // Single child: Row with mainAxisSize: "min"
      const mainRow = (tree as any).child;
      assert.ok(mainRow instanceof Row, "Center's child should be Row");
      assert.equal((mainRow as any).mainAxisSize, "min");

      // Row children: [AnimatedOrb, SizedBox(gap), SizedBox(textColumn)]
      const rowChildren = (mainRow as any).children;
      assert.equal(rowChildren.length, 3, "Row should have 3 children: orb, gap, textColumn");
      assert.ok(rowChildren[0] instanceof AnimatedOrb, "First child should be AnimatedOrb");
      assert.ok(rowChildren[1] instanceof SizedBox, "Second child should be SizedBox (gap)");
      assert.ok(
        rowChildren[2] instanceof SizedBox,
        "Third child should be SizedBox (text wrapper)",
      );
    });

    it("AnimatedOrb has default 40x40 dimensions", () => {
      const widget = new WelcomeScreen();
      const tree = widget.build({} as any);
      const mainRow = (tree as any).child;
      const orb = mainRow.children[0] as AnimatedOrb;
      assert.equal(orb.width, 40, "Orb width should be 40");
      assert.equal(orb.height, 40, "Orb height should be 40");
    });

    it("gap between orb and text is 2 columns wide", () => {
      const widget = new WelcomeScreen();
      const tree = widget.build({} as any);
      const mainRow = (tree as any).child;
      const gap = mainRow.children[1] as SizedBox;
      assert.equal((gap as any).width, 2, "Gap should be 2 columns wide");
    });

    it("text column is wrapped in SizedBox(width: 50)", () => {
      const widget = new WelcomeScreen();
      const tree = widget.build({} as any);
      const mainRow = (tree as any).child;
      const textWrapper = mainRow.children[2] as SizedBox;
      assert.equal((textWrapper as any).width, 50, "Text wrapper should be 50 columns wide");
      assert.ok((textWrapper as any).child instanceof Column, "SizedBox should wrap a Column");
    });
  });
});
