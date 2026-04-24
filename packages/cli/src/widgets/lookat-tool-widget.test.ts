/**
 * LookAtToolWidget unit tests.
 *
 * Validates:
 *  1. Widget extends StatelessWidget
 *  2. Config stored correctly
 *  3. Header title is always "Look At"
 *  4. Header status is passed through correctly
 *  5. Path shown as underlined text in body
 *  6. Path absent: not shown
 *  7. Objective text shown in body
 *  8. Objective absent: not shown
 *  9. Single compare file: "comparing to: <file>" row
 * 10. Multiple compare files: "comparing to:" header + "  - <file>" rows
 * 11. No compare files: compare section absent
 * 12. Error state: error message shown in body
 * 13. Empty error: not shown
 * 14. Build returns ExpandableToolHeader
 * 15. All sections combined: path + objective + compare files
 * 16. Empty path string is not rendered
 *
 * Run:
 * ```bash
 * bun test packages/cli/src/widgets/lookat-tool-widget.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, RichText, StatelessWidget } from "@flitter/tui";
import { ExpandableToolHeader } from "./expandable-tool-header.js";
import { LookAtToolWidget, type LookAtToolWidgetConfig } from "./lookat-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

const mockContext = {} as BuildContext;

/**
 * Build a LookAtToolWidget and return its widget tree.
 */
function buildWidget(config: LookAtToolWidgetConfig): unknown {
  const widget = new LookAtToolWidget(config);
  return widget.build(mockContext);
}

/**
 * Recursively collect all plain text from a widget tree.
 */
function extractAllText(widget: unknown): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  const w = widget as Record<string, unknown>;
  if (w.data !== undefined) result += String(w.data);
  if (w.children) {
    for (const child of w.children as unknown[]) result += extractAllText(child);
  }
  if (w.child) result += extractAllText(w.child);
  return result;
}

/**
 * Get the child widget stored inside the ExpandableToolHeader config.
 */
function getHeaderChild(tree: unknown): unknown {
  const header = tree as ExpandableToolHeader;
  assert.ok(header instanceof ExpandableToolHeader, "root should be ExpandableToolHeader");
  return header.config.child;
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("LookAtToolWidget", () => {
  // ── Test 1: extends StatelessWidget ─────────────
  it("extends StatelessWidget", () => {
    const widget = new LookAtToolWidget({ status: "done" });
    assert.ok(widget instanceof StatelessWidget);
  });

  // ── Test 2: stores config correctly ─────────────
  it("stores config fields correctly", () => {
    const widget = new LookAtToolWidget({
      status: "in-progress",
      path: "/src/index.ts",
      objective: "Check for bugs",
      compareFiles: ["/src/other.ts"],
    });
    assert.equal(widget.config.status, "in-progress");
    assert.equal(widget.config.path, "/src/index.ts");
    assert.equal(widget.config.objective, "Check for bugs");
    assert.deepEqual(widget.config.compareFiles, ["/src/other.ts"]);
  });

  // ── Test 3: header title is always "Look At" ────
  it("header title is 'Look At'", () => {
    const tree = buildWidget({ status: "done" });
    const header = tree as ExpandableToolHeader;
    assert.ok(header instanceof ExpandableToolHeader);
    assert.equal(header.config.title, "Look At");
  });

  // ── Test 4: header status is passed through ─────
  it("passes status to ExpandableToolHeader", () => {
    for (const status of ["done", "in-progress", "error", "cancelled"] as const) {
      const tree = buildWidget({ status });
      const header = tree as ExpandableToolHeader;
      assert.equal(header.config.status, status, `status=${status} should be forwarded`);
    }
  });

  // ── Test 5: path shown in body ───────────────────
  it("path is shown in the body", () => {
    const tree = buildWidget({ status: "done", path: "/home/user/project/src/main.ts" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("/home/user/project/src/main.ts"), `expected path in body: ${text}`);
  });

  // ── Test 6: path absent when not provided ────────
  it("body is empty when no path, objective, or compareFiles", () => {
    const tree = buildWidget({ status: "done" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body: ${text}`);
  });

  // ── Test 7: objective text shown ─────────────────
  it("objective is shown in the body", () => {
    const tree = buildWidget({ status: "in-progress", objective: "Find all TODO comments" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Find all TODO comments"), `expected objective: ${text}`);
  });

  // ── Test 8: objective absent when not provided ───
  it("body does not contain objective text when absent", () => {
    const tree = buildWidget({ status: "done", path: "/tmp/file.ts" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(!text.includes("Find all"), `should not have stray objective: ${text}`);
  });

  // ── Test 9: single compare file row ──────────────
  it("single compareFile shows 'comparing to: <file>' row", () => {
    const tree = buildWidget({
      status: "done",
      compareFiles: ["/src/baseline.ts"],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("comparing to:"), `expected 'comparing to:' label: ${text}`);
    assert.ok(text.includes("/src/baseline.ts"), `expected compare file: ${text}`);
    // Single file should NOT have "  - " prefix
    assert.ok(!text.includes("  - "), `single file should not use list prefix: ${text}`);
  });

  // ── Test 10: multiple compare files ──────────────
  it("multiple compareFiles shows header + '  - <file>' rows", () => {
    const tree = buildWidget({
      status: "done",
      compareFiles: ["/src/a.ts", "/src/b.ts"],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("comparing to:"), `expected 'comparing to:' header: ${text}`);
    assert.ok(text.includes("/src/a.ts"), `expected first file: ${text}`);
    assert.ok(text.includes("/src/b.ts"), `expected second file: ${text}`);
    assert.ok(text.includes("  - "), `expected '  - ' prefix: ${text}`);
  });

  // ── Test 11: no compare files: section absent ────
  it("no compareFiles: compare section not rendered", () => {
    const tree = buildWidget({ status: "done", path: "/src/main.ts" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(!text.includes("comparing to:"), `should not have compare section: ${text}`);
  });

  // ── Test 12: error state shows error text ────────
  it("error state: error message shown in body", () => {
    const tree = buildWidget({
      status: "error",
      error: "File not found",
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("File not found"), `expected error text: ${text}`);
  });

  // ── Test 13: empty error not rendered ────────────
  it("empty error string is not rendered", () => {
    const tree = buildWidget({ status: "error", error: "" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body for empty error: ${text}`);
  });

  // ── Test 14: build returns ExpandableToolHeader ──
  it("build() returns an ExpandableToolHeader", () => {
    const tree = buildWidget({ status: "done" });
    assert.ok(tree instanceof ExpandableToolHeader, "root widget should be ExpandableToolHeader");
  });

  // ── Test 15: all sections combined ───────────────
  it("path + objective + compareFiles all rendered", () => {
    const tree = buildWidget({
      status: "done",
      path: "/src/app.ts",
      objective: "Review the export",
      compareFiles: ["/src/old.ts", "/src/new.ts"],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("/src/app.ts"), "should include path");
    assert.ok(text.includes("Review the export"), "should include objective");
    assert.ok(text.includes("comparing to:"), "should include compare header");
    assert.ok(text.includes("/src/old.ts"), "should include first compare file");
    assert.ok(text.includes("/src/new.ts"), "should include second compare file");
  });

  // ── Test 16: empty path string not rendered ──────
  it("whitespace-only path is not rendered", () => {
    const tree = buildWidget({ status: "done", path: "   " });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body for whitespace path: ${text}`);
  });
});
