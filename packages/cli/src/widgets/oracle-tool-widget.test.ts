/**
 * OracleToolWidget unit tests.
 *
 * Validates:
 * - Construction and config storage
 * - Extends StatelessWidget
 * - In-progress state: braille spinner in header, no output
 * - Done state: check icon in header, output rendered
 * - Error state: error icon in header, error text rendered
 * - Cancelled state: cancel icon in header
 * - With/without input text
 * - With/without output text
 * - Progress messages rendered in body
 * - Default toolName is "Oracle"
 * - Custom toolName respected
 * - Empty body sections are not rendered
 *
 * Run:
 * ```bash
 * bun test packages/cli/src/widgets/oracle-tool-widget.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, RichText, StatelessWidget } from "@flitter/tui";
import { ExpandableToolHeader, type ExpandableToolHeaderState } from "./expandable-tool-header.js";
import { OracleToolWidget, type OracleToolWidgetConfig } from "./oracle-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

const mockContext = {} as BuildContext;

/**
 * Build an OracleToolWidget and return its widget tree.
 */
function buildOracle(config: OracleToolWidgetConfig): unknown {
  const widget = new OracleToolWidget(config);
  return widget.build(mockContext);
}

/**
 * Mount an ExpandableToolHeader returned from buildOracle and build its state.
 * This lets us inspect the header's text content.
 */
function mountAndBuildHeader(tree: unknown): unknown {
  const header = tree as ExpandableToolHeader;
  assert.ok(header instanceof ExpandableToolHeader, "root should be ExpandableToolHeader");

  const state = header.createState() as ExpandableToolHeaderState;
  const mockElement = { markNeedsRebuild: () => {} } as unknown as object;
  (state as unknown as Record<string, unknown>)._widget = header;
  (state as unknown as Record<string, unknown>)._element = mockElement;
  (state as unknown as Record<string, unknown>)._mounted = true;
  state.initState();

  const built = state.build(mockContext);
  // Clean up any animation timers
  state.dispose();
  return built;
}

/**
 * Recursively extract all plain text from a Widget tree.
 */
function extractAllText(widget: unknown): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  const w = widget as Record<string, unknown>;
  if (w.data !== undefined) {
    result += w.data as string;
  }
  if (w.children) {
    for (const child of w.children as unknown[]) {
      result += extractAllText(child);
    }
  }
  if (w.child) {
    result += extractAllText(w.child);
  }
  return result;
}

/**
 * Get the child widget stored inside an ExpandableToolHeader config.
 * This is the body widget passed as `child:` to ExpandableToolHeader.
 */
function getHeaderChild(tree: unknown): unknown {
  const header = tree as ExpandableToolHeader;
  return header.config.child;
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("OracleToolWidget", () => {
  // ──────────────────────────────────────────────────
  //  Construction
  // ──────────────────────────────────────────────────

  it("extends StatelessWidget", () => {
    const widget = new OracleToolWidget({ status: "done" });
    assert.ok(widget instanceof StatelessWidget);
  });

  it("stores config correctly", () => {
    const widget = new OracleToolWidget({
      toolName: "CustomOracle",
      status: "in-progress",
      input: "Analyze this",
      output: "Result here",
    });
    assert.equal(widget.config.toolName, "CustomOracle");
    assert.equal(widget.config.status, "in-progress");
    assert.equal(widget.config.input, "Analyze this");
    assert.equal(widget.config.output, "Result here");
  });

  it("defaults toolName to 'Oracle'", () => {
    const tree = buildOracle({ status: "done" });
    const header = tree as ExpandableToolHeader;
    assert.ok(header instanceof ExpandableToolHeader);
    assert.equal(header.config.title, "Oracle");
  });

  it("respects custom toolName", () => {
    const tree = buildOracle({ toolName: "SubOracle", status: "done" });
    const header = tree as ExpandableToolHeader;
    assert.equal(header.config.title, "SubOracle");
  });

  // ──────────────────────────────────────────────────
  //  Status → header icon
  // ──────────────────────────────────────────────────

  it("in-progress state: passes in-progress status to header", () => {
    const tree = buildOracle({ status: "in-progress" });
    const header = tree as ExpandableToolHeader;
    assert.equal(header.config.status, "in-progress");
  });

  it("in-progress state: header shows braille spinner", () => {
    const tree = buildOracle({ status: "in-progress" });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    // Braille characters are in U+2800-U+28FF range
    const hasBraille = /[\u2800-\u28FF]/.test(text);
    assert.ok(hasBraille, `expected braille spinner in: ${JSON.stringify(text)}`);
  });

  it("done state: header shows check icon ✓", () => {
    const tree = buildOracle({ status: "done", output: "All good." });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    assert.ok(text.includes("\u2713"), `expected ✓ in: ${JSON.stringify(text)}`);
  });

  it("error state: header shows error icon ✕", () => {
    const tree = buildOracle({ status: "error", error: "Something went wrong." });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    assert.ok(text.includes("\u2715"), `expected ✕ in: ${JSON.stringify(text)}`);
  });

  it("cancelled state: header shows cancel icon ✕", () => {
    const tree = buildOracle({ status: "cancelled" });
    const built = mountAndBuildHeader(tree);
    const text = extractAllText(built);
    assert.ok(text.includes("\u2715"), `expected ✕ for cancelled in: ${JSON.stringify(text)}`);
  });

  // ──────────────────────────────────────────────────
  //  Input section
  // ──────────────────────────────────────────────────

  it("with input: body child contains input text", () => {
    const tree = buildOracle({ status: "done", input: "Analyze the logs" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Analyze the logs"), `expected input in body: ${JSON.stringify(text)}`);
  });

  it("without input: body child does not contain input placeholder", () => {
    const tree = buildOracle({ status: "done" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    // Should not have any task text
    assert.ok(!text.includes("Analyze"), "should not have stray input text");
  });

  it("empty input string is not rendered", () => {
    const tree = buildOracle({ status: "done", input: "   " });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    // Whitespace-only input should produce empty body
    assert.equal(
      text.trim(),
      "",
      `expected empty body for whitespace input, got: ${JSON.stringify(text)}`,
    );
  });

  // ──────────────────────────────────────────────────
  //  Output section
  // ──────────────────────────────────────────────────

  it("with output: body child contains output text", () => {
    const tree = buildOracle({ status: "done", output: "The answer is 42" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(
      text.includes("The answer is 42"),
      `expected output in body: ${JSON.stringify(text)}`,
    );
  });

  it("without output: body is empty (only shrink)", () => {
    const tree = buildOracle({ status: "done" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body without output: ${JSON.stringify(text)}`);
  });

  it("in-progress without output: no output section rendered", () => {
    const tree = buildOracle({ status: "in-progress", input: "Running..." });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Running..."), "should have input");
    // No output text present
    assert.ok(!text.includes("undefined"), "should not have undefined in output");
  });

  // ──────────────────────────────────────────────────
  //  Error section
  // ──────────────────────────────────────────────────

  it("with error: body child contains error text", () => {
    const tree = buildOracle({ status: "error", error: "Connection timeout" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(
      text.includes("Connection timeout"),
      `expected error in body: ${JSON.stringify(text)}`,
    );
  });

  it("empty error string is not rendered", () => {
    const tree = buildOracle({ status: "error", error: "" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body for empty error: ${JSON.stringify(text)}`);
  });

  // ──────────────────────────────────────────────────
  //  Progress messages
  // ──────────────────────────────────────────────────

  it("progress messages are rendered in body", () => {
    const tree = buildOracle({
      status: "in-progress",
      progress: ["Searching files...", "Analyzing results..."],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Searching files..."), "should include first progress message");
    assert.ok(text.includes("Analyzing results..."), "should include second progress message");
  });

  it("empty progress messages are skipped", () => {
    const tree = buildOracle({
      status: "in-progress",
      progress: ["", "  ", "Valid message"],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Valid message"), "should include valid progress message");
    // The total text should only have one non-whitespace chunk
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    assert.equal(lines.length, 1, `expected 1 non-empty line, got: ${JSON.stringify(lines)}`);
  });

  // ──────────────────────────────────────────────────
  //  Combined sections
  // ──────────────────────────────────────────────────

  it("input + output + progress all rendered", () => {
    const tree = buildOracle({
      status: "done",
      input: "Task: analyze",
      output: "Analysis complete",
      progress: ["Processing..."],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Task: analyze"), "should include input");
    assert.ok(text.includes("Processing..."), "should include progress");
    assert.ok(text.includes("Analysis complete"), "should include output");
  });

  // ──────────────────────────────────────────────────
  //  Widget structure
  // ──────────────────────────────────────────────────

  it("build() returns an ExpandableToolHeader", () => {
    const tree = buildOracle({ status: "done" });
    assert.ok(tree instanceof ExpandableToolHeader, "root widget should be ExpandableToolHeader");
  });

  it("header title is 'Oracle' by default", () => {
    const tree = buildOracle({ status: "done" });
    const header = tree as ExpandableToolHeader;
    assert.equal(header.config.title, "Oracle");
  });
});
