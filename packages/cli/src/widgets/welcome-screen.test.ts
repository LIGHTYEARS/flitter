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
import { WelcomeScreen, type WelcomeScreenConfig } from "./welcome-screen.js";
import { StatelessWidget, RichText, Row, Column } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Recursively collect all RichText nodes in the widget tree.
 */
function collectRichTexts(widget: any): any[] {
  const results: any[] = [];
  if (widget instanceof RichText) {
    results.push(widget);
  }
  if (widget.children) {
    for (const child of widget.children) {
      results.push(...collectRichTexts(child));
    }
  }
  if (widget.child) {
    results.push(...collectRichTexts(widget.child));
  }
  return results;
}

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

  it("build() produces multiple Row children (one per orb line)", () => {
    const widget = new WelcomeScreen();
    const built = widget.build({} as any) as Column;
    // Each ORB_LINE becomes a Row
    assert.ok(built.children.length >= 17, `Expected at least 17 rows, got ${built.children.length}`);
    assert.ok(built.children[0] instanceof Row, "Each child should be a Row");
  });
});
