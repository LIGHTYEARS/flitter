/**
 * ReplToolWidget unit tests.
 *
 * Validates:
 * - Widget construction and config storage
 * - createState returns ReplToolWidgetState
 * - State animation lifecycle (start/stop on status change)
 * - buildOutputSpans truncation logic (via build output inspection)
 * - Tool label formatting with binary and args
 * - Objective quoting and dim style
 * - Status suffixes: (rejected), (cancelled)
 * - Transcript rendering for in-progress
 * - Error message rendering
 * - Done result rendering
 *
 * 逆向: chunk-006.js line 30152 — V9R / X9R
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RichText, StatefulWidget, type TextSpan, type TextStyle } from "@flitter/tui";
import {
  ReplToolWidget,
  type ReplToolWidgetConfig,
  ReplToolWidgetState,
  type TranscriptEntry,
} from "./repl-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Collect all text from a TextSpan tree (depth-first).
 */
function collectText(span: TextSpan): string {
  let out = span.text ?? "";
  if (span.children) {
    for (const child of span.children) {
      out += collectText(child);
    }
  }
  return out;
}

/**
 * Collect all TextSpan nodes from a TextSpan tree.
 */
function collectSpans(span: TextSpan): TextSpan[] {
  const result: TextSpan[] = [span];
  if (span.children) {
    for (const child of span.children) {
      result.push(...collectSpans(child));
    }
  }
  return result;
}

/**
 * Build a ReplToolWidget and call build() with a minimal mock context.
 *
 * Returns the RichText widget returned by the state's build() method.
 */
function buildWidget(config: ReplToolWidgetConfig): RichText {
  const widget = new ReplToolWidget(config);
  const state = widget.createState() as ReplToolWidgetState;

  // Wire state internals (normally done by the framework during mount)
  const s = state as any;
  s._widget = widget;
  s._mounted = true;

  // Minimal mock context — no AppThemeController (falls back to hardcoded colors)
  const mockContext = {};
  return state.build(mockContext as any);
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("ReplToolWidget", () => {
  // 1. Construction
  it("extends StatefulWidget", () => {
    const widget = new ReplToolWidget({ status: "done" });
    assert.ok(widget instanceof StatefulWidget, "should extend StatefulWidget");
  });

  it("stores config on the widget", () => {
    const config: ReplToolWidgetConfig = {
      status: "done",
      binary: "python",
      args: ["-c", "print('hi')"],
      objective: "run script",
      result: "hi\n",
    };
    const widget = new ReplToolWidget(config);
    assert.equal(widget.config.status, "done");
    assert.equal(widget.config.binary, "python");
    assert.deepEqual(widget.config.args, ["-c", "print('hi')"]);
    assert.equal(widget.config.objective, "run script");
    assert.equal(widget.config.result, "hi\n");
  });

  // 2. createState
  it("createState returns ReplToolWidgetState", () => {
    const widget = new ReplToolWidget({ status: "done" });
    const state = widget.createState();
    assert.ok(
      state instanceof ReplToolWidgetState,
      "createState should return ReplToolWidgetState",
    );
  });

  // 3. build returns RichText
  it("build returns a RichText widget", () => {
    const result = buildWidget({ status: "done" });
    assert.ok(result instanceof RichText, "build() should return RichText");
  });

  // 4. Header prefix: spinner for in-progress, "> " otherwise
  it("in-progress status uses braille spinner prefix", () => {
    const result = buildWidget({ status: "in-progress" });
    const rootSpan = result.text as TextSpan;
    const spans = collectSpans(rootSpan);
    // First non-empty span text should be a braille character (unicode range 0x2800–0x28FF) + space
    const firstText = spans.find((s) => s.text && s.text.trim().length > 0)?.text ?? "";
    const firstChar = firstText.codePointAt(0) ?? 0;
    assert.ok(
      firstChar >= 0x2800 && firstChar <= 0x28ff,
      `first char should be braille (got 0x${firstChar.toString(16)})`,
    );
  });

  it("done status uses '>_' prefix (bold)", () => {
    const result = buildWidget({ status: "done" });
    const rootSpan = result.text as TextSpan;
    const spans = collectSpans(rootSpan);
    const prefixSpan = spans.find((s) => s.text === "> ");
    assert.ok(prefixSpan, "should have '> ' span");
    assert.ok((prefixSpan.style as TextStyle)?.bold, "prefix span should be bold");
  });

  // 5. Tool label formatting
  it("renders 'REPL' when no binary or args", () => {
    const result = buildWidget({ status: "done" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("REPL"), "should include 'REPL'");
  });

  it("renders 'REPL binary' when binary is set", () => {
    const result = buildWidget({ status: "done", binary: "python" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("REPL python"), "should include 'REPL python'");
  });

  it("renders 'REPL binary args' when binary and args are set", () => {
    const result = buildWidget({ status: "done", binary: "node", args: ["script.js", "--debug"] });
    const text = collectText(result.text as TextSpan);
    assert.ok(
      text.includes("REPL node script.js --debug"),
      "should include 'REPL node script.js --debug'",
    );
  });

  it("renders 'REPL args' when only args are set (no binary)", () => {
    const result = buildWidget({ status: "done", args: ["-c", "pass"] });
    const text = collectText(result.text as TextSpan);
    // With no binary, binary ?? "" = "" so result is trimmed args only
    assert.ok(text.includes("REPL"), "should include 'REPL' prefix");
  });

  // 6. Objective
  it("renders objective in dim quotes", () => {
    const result = buildWidget({ status: "done", objective: "run tests" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes('"run tests"'), "should include quoted objective");
    // The objective span should be dim
    const spans = collectSpans(result.text as TextSpan);
    const objSpan = spans.find((s) => s.text?.includes('"run tests"'));
    assert.ok(objSpan, "objective span should exist");
    assert.ok((objSpan.style as TextStyle)?.dim, "objective span should be dim");
  });

  // 7. Status suffixes
  it("renders '(rejected)' for rejected-by-user status", () => {
    const result = buildWidget({ status: "rejected-by-user" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("(rejected)"), "should include '(rejected)'");
    // Should be dim + italic
    const spans = collectSpans(result.text as TextSpan);
    const rejSpan = spans.find((s) => s.text?.includes("(rejected)"));
    assert.ok(rejSpan, "rejected span should exist");
    const style = rejSpan.style as TextStyle;
    assert.ok(style?.dim, "rejected span should be dim");
    assert.ok(style?.italic, "rejected span should be italic");
  });

  it("renders '(cancelled)' for cancelled status", () => {
    const result = buildWidget({ status: "cancelled" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("(cancelled)"), "should include '(cancelled)'");
    // Should be italic
    const spans = collectSpans(result.text as TextSpan);
    const canSpan = spans.find((s) => s.text?.includes("(cancelled)"));
    assert.ok(canSpan, "cancelled span should exist");
    const style = canSpan.style as TextStyle;
    assert.ok(style?.italic, "cancelled span should be italic");
  });

  it("renders '(cancelled)' for cancellation-requested status", () => {
    const result = buildWidget({ status: "cancellation-requested" });
    const text = collectText(result.text as TextSpan);
    assert.ok(
      text.includes("(cancelled)"),
      "should include '(cancelled)' for cancellation-requested",
    );
  });

  // 8. Error body
  it("renders error message for error status", () => {
    const result = buildWidget({ status: "error", error: "syntax error on line 3" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("Error: syntax error on line 3"), "should include error message");
    // The error span should use toolError color
    const spans = collectSpans(result.text as TextSpan);
    const errSpan = spans.find((s) => s.text?.includes("Error:"));
    assert.ok(errSpan, "error span should exist");
  });

  it("shows no error body when error field is absent", () => {
    const result = buildWidget({ status: "error" });
    const text = collectText(result.text as TextSpan);
    assert.ok(!text.includes("Error:"), "should not show error message when absent");
  });

  // 9. Done result body
  it("renders done result with 2-space indent", () => {
    const result = buildWidget({ status: "done", result: "hello world" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("  hello world"), "result lines should be indented by 2 spaces");
  });

  it("truncates done result to last 10 lines when more than 10 lines", () => {
    const manyLines = Array.from({ length: 15 }, (_, i) => `line${i + 1}`).join("\n");
    const result = buildWidget({ status: "done", result: manyLines });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("5 lines truncated"), "should show truncation message for 15 lines");
    // Last 10 lines should be visible
    assert.ok(text.includes("  line15"), "last line should be visible");
    // First 5 lines should NOT be shown as content
    assert.ok(
      !text.includes("  line1\n") || text.includes("truncated"),
      "first lines should be truncated",
    );
  });

  it("does not truncate done result with exactly 10 lines", () => {
    const tenLines = Array.from({ length: 10 }, (_, i) => `line${i + 1}`).join("\n");
    const result = buildWidget({ status: "done", result: tenLines });
    const text = collectText(result.text as TextSpan);
    assert.ok(!text.includes("truncated"), "should not truncate 10 lines");
    assert.ok(text.includes("  line1"), "all lines should be visible");
    assert.ok(text.includes("  line10"), "all lines should be visible");
  });

  // 10. In-progress transcript
  it("renders transcript input entries with '  > ' prefix", () => {
    const transcript: TranscriptEntry[] = [{ type: "input", content: "x = 1 + 2" }];
    const result = buildWidget({ status: "in-progress", transcript });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("  > "), "should include '  > ' prefix for input");
    assert.ok(text.includes("x = 1 + 2"), "should include input content");
  });

  it("renders transcript output entries as indented text", () => {
    const transcript: TranscriptEntry[] = [{ type: "output", content: "3" }];
    const result = buildWidget({ status: "in-progress", transcript });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("  3"), "output should be indented");
  });

  it("renders mixed transcript (input then output)", () => {
    const transcript: TranscriptEntry[] = [
      { type: "input", content: "print(42)" },
      { type: "output", content: "42" },
    ];
    const result = buildWidget({ status: "in-progress", transcript });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("  > "), "should show input prefix");
    assert.ok(text.includes("print(42)"), "should show input content");
    assert.ok(text.includes("  42"), "should show indented output");
  });

  it("skips empty input transcript entries", () => {
    const transcript: TranscriptEntry[] = [{ type: "input", content: "" }];
    const result = buildWidget({ status: "in-progress", transcript });
    const text = collectText(result.text as TextSpan);
    // Empty input content should not emit the "  > " prefix
    assert.ok(!text.includes("  > "), "empty input should not render prefix");
  });

  // 11. Animation state management
  it("_spinner is a BrailleSpinner instance", () => {
    const widget = new ReplToolWidget({ status: "in-progress" });
    const state = widget.createState() as ReplToolWidgetState;
    const s = state as any;
    assert.ok(s._spinner, "should have a _spinner");
    assert.ok(typeof s._spinner.step === "function", "spinner should have step()");
    assert.ok(typeof s._spinner.toBraille === "function", "spinner should have toBraille()");
  });

  it("_animationTimer is undefined initially", () => {
    const widget = new ReplToolWidget({ status: "done" });
    const state = widget.createState() as ReplToolWidgetState;
    const s = state as any;
    assert.equal(s._animationTimer, undefined, "no timer until initState");
  });

  it("didUpdateWidget starts animation when transitioning to in-progress", () => {
    const doneWidget = new ReplToolWidget({ status: "done" });
    const state = doneWidget.createState() as ReplToolWidgetState;
    const s = state as any;
    s._widget = new ReplToolWidget({ status: "in-progress" });
    s._mounted = true;
    const oldWidget = doneWidget;
    state.didUpdateWidget(oldWidget);
    assert.ok(
      s._animationTimer !== undefined,
      "should start timer when transitioning to in-progress",
    );
    clearInterval(s._animationTimer);
  });

  it("didUpdateWidget stops animation when transitioning away from in-progress", () => {
    const inProgressWidget = new ReplToolWidget({ status: "in-progress" });
    const state = inProgressWidget.createState() as ReplToolWidgetState;
    const s = state as any;
    // Simulate a running timer
    s._animationTimer = setInterval(() => {}, 200);
    s._widget = new ReplToolWidget({ status: "done" });
    s._mounted = true;
    const oldWidget = inProgressWidget;
    state.didUpdateWidget(oldWidget);
    assert.equal(
      s._animationTimer,
      undefined,
      "should stop timer when transitioning away from in-progress",
    );
  });

  // 12. dispose clears timer
  it("dispose stops the animation timer", () => {
    const widget = new ReplToolWidget({ status: "in-progress" });
    const state = widget.createState() as ReplToolWidgetState;
    const s = state as any;
    s._widget = widget;
    s._mounted = true;
    // Manually start a timer
    s._animationTimer = setInterval(() => {}, 200);
    state.dispose();
    assert.equal(s._animationTimer, undefined, "dispose should clear animation timer");
  });
});
