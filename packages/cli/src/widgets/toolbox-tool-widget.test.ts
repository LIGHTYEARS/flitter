/**
 * ToolboxToolWidget unit tests.
 *
 * Validates:
 * - Widget construction and config storage
 * - createState returns ToolboxToolWidgetState
 * - State animation lifecycle (start/stop on status change)
 * - tb__ prefix stripping from tool name
 * - In-progress: braille spinner prefix
 * - Done: "• " bullet with status color
 * - Non-zero exit: bullet uses toolError color, "(exit code: N)" suffix
 * - Cancelled: "(cancelled)" italic suffix
 * - Rejected: "(rejected)" dim+italic suffix
 * - Args formatted as "key: value" pairs
 * - Error body: "  Error: message"
 * - Done body: output text (no indent unlike h2)
 * - Progress body for in-progress/cancelled
 * - Output truncation at 15 lines
 *
 * 逆向: chunk-006.js line 30251 — Z9R / J9R
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RichText, StatefulWidget, type TextSpan, type TextStyle } from "@flitter/tui";
import {
  ToolboxToolWidget,
  type ToolboxToolWidgetConfig,
  ToolboxToolWidgetState,
} from "./toolbox-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/** Collect all text from a TextSpan tree (depth-first). */
function collectText(span: TextSpan): string {
  let out = span.text ?? "";
  if (span.children) {
    for (const child of span.children) {
      out += collectText(child);
    }
  }
  return out;
}

/** Collect all TextSpan nodes from a TextSpan tree. */
function collectSpans(span: TextSpan): TextSpan[] {
  const result: TextSpan[] = [span];
  if (span.children) {
    for (const child of span.children) {
      result.push(...collectSpans(child));
    }
  }
  return result;
}

/** Build a ToolboxToolWidget and call build() with a minimal mock context. */
function buildWidget(config: ToolboxToolWidgetConfig): RichText {
  const widget = new ToolboxToolWidget(config);
  const state = widget.createState() as ToolboxToolWidgetState;

  // Wire state internals (normally done by the framework during mount)
  const s = state as unknown as Record<string, unknown>;
  s._widget = widget;
  s._mounted = true;

  // Minimal mock context — no AppThemeController (falls back to hardcoded colors)
  const mockContext = {};
  return state.build(mockContext as Parameters<typeof state.build>[0]);
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("ToolboxToolWidget", () => {
  // 1. Construction
  it("extends StatefulWidget", () => {
    const widget = new ToolboxToolWidget({ toolName: "tb__my_tool", status: "done" });
    assert.ok(widget instanceof StatefulWidget, "should extend StatefulWidget");
  });

  it("stores config on the widget", () => {
    const config: ToolboxToolWidgetConfig = {
      toolName: "tb__search",
      status: "done",
      args: { query: "hello" },
      result: "found 3 results",
      exitCode: 0,
    };
    const widget = new ToolboxToolWidget(config);
    assert.equal(widget.config.toolName, "tb__search");
    assert.equal(widget.config.status, "done");
    assert.deepEqual(widget.config.args, { query: "hello" });
  });

  // 2. createState
  it("createState returns ToolboxToolWidgetState", () => {
    const widget = new ToolboxToolWidget({ toolName: "tb__x", status: "done" });
    const state = widget.createState();
    assert.ok(
      state instanceof ToolboxToolWidgetState,
      "createState should return ToolboxToolWidgetState",
    );
  });

  // 3. build returns RichText
  it("build returns a RichText widget", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done" });
    assert.ok(result instanceof RichText, "build() should return RichText");
  });

  // 4. tb__ prefix stripping
  it("strips tb__ prefix from tool name in display", () => {
    const result = buildWidget({ toolName: "tb__search_files", status: "done" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("search_files"), "should display name without tb__ prefix");
    assert.ok(!text.includes("tb__"), "should NOT display tb__ prefix");
  });

  it("leaves name unchanged when no tb__ prefix", () => {
    const result = buildWidget({ toolName: "my_tool", status: "done" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("my_tool"), "should display name as-is when no tb__ prefix");
  });

  // 5. In-progress: braille spinner
  it("in-progress status uses braille spinner prefix", () => {
    const result = buildWidget({ toolName: "tb__x", status: "in-progress" });
    const spans = collectSpans(result.text as TextSpan);
    const firstText = spans.find((s) => s.text && s.text.trim().length > 0)?.text ?? "";
    const firstChar = firstText.codePointAt(0) ?? 0;
    assert.ok(
      firstChar >= 0x2800 && firstChar <= 0x28ff,
      `first char should be braille (got 0x${firstChar.toString(16)})`,
    );
  });

  // 6. Done: bullet prefix
  it("done status uses '• ' bullet prefix", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("\u2022 "), "should include '• ' bullet");
  });

  it("bullet is bold for done status", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done" });
    const spans = collectSpans(result.text as TextSpan);
    const bulletSpan = spans.find((s) => s.text === "\u2022 ");
    assert.ok(bulletSpan, "should have bullet span");
    assert.ok((bulletSpan.style as TextStyle)?.bold, "bullet should be bold");
  });

  // 7. Non-zero exit code
  it("shows exit code suffix when exitCode is non-zero", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done", exitCode: 1 });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("exit code:"), "should include 'exit code:' suffix");
    assert.ok(text.includes("1"), "should include exit code value");
  });

  it("does NOT show exit code suffix when exitCode is 0", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done", exitCode: 0 });
    const text = collectText(result.text as TextSpan);
    assert.ok(!text.includes("exit code:"), "should NOT show exit code for 0");
  });

  it("does NOT show exit code suffix when status is not done", () => {
    const result = buildWidget({ toolName: "tb__x", status: "in-progress", exitCode: 1 });
    const text = collectText(result.text as TextSpan);
    assert.ok(!text.includes("exit code:"), "should NOT show exit code when not done");
  });

  // 8. Cancelled/rejected suffixes
  it("renders '(cancelled)' for cancelled status", () => {
    const result = buildWidget({ toolName: "tb__x", status: "cancelled" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("(cancelled)"), "should include '(cancelled)'");
    const spans = collectSpans(result.text as TextSpan);
    const span = spans.find((s) => s.text?.includes("(cancelled)"));
    assert.ok(span, "cancelled span should exist");
    assert.ok((span.style as TextStyle)?.italic, "cancelled span should be italic");
  });

  it("renders '(cancelled)' for cancellation-requested status", () => {
    const result = buildWidget({ toolName: "tb__x", status: "cancellation-requested" });
    const text = collectText(result.text as TextSpan);
    assert.ok(
      text.includes("(cancelled)"),
      "should include '(cancelled)' for cancellation-requested",
    );
  });

  it("renders '(rejected)' for rejected-by-user status", () => {
    const result = buildWidget({ toolName: "tb__x", status: "rejected-by-user" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("(rejected)"), "should include '(rejected)'");
    const spans = collectSpans(result.text as TextSpan);
    const span = spans.find((s) => s.text?.includes("(rejected)"));
    assert.ok(span, "rejected span should exist");
    const style = span.style as TextStyle;
    assert.ok(style?.italic, "rejected span should be italic");
    assert.ok(style?.dim, "rejected span should be dim");
  });

  // 9. Args formatting
  it("formats args as 'key: value' pairs joined with ', '", () => {
    const result = buildWidget({
      toolName: "tb__x",
      status: "done",
      args: { path: "/tmp/file", limit: 10 },
    });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes('path: "/tmp/file"'), "should include path arg");
    assert.ok(text.includes("limit: 10"), "should include limit arg");
  });

  it("shows no args text when args is empty", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done", args: {} });
    // Only the tool name and header prefix, no extra args text
    const spans = collectSpans(result.text as TextSpan);
    // There should not be a dim span with ': ' pattern
    const hasArgsSpan = spans.some((s) => (s.style as TextStyle)?.dim && s.text?.includes(": "));
    assert.ok(!hasArgsSpan, "should not show args text for empty args");
  });

  // 10. Error body
  it("renders error message for error status", () => {
    const result = buildWidget({ toolName: "tb__x", status: "error", error: "connection refused" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("Error: connection refused"), "should include error message");
  });

  it("does not render error body when error field is absent", () => {
    const result = buildWidget({ toolName: "tb__x", status: "error" });
    const text = collectText(result.text as TextSpan);
    assert.ok(!text.includes("Error:"), "should not show error body when absent");
  });

  // 11. Done result body
  it("renders done result output", () => {
    const result = buildWidget({ toolName: "tb__x", status: "done", result: "output line" });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("output line"), "should include result output");
  });

  it("truncates result to last 15 lines when more than 15 lines", () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join("\n");
    const result = buildWidget({ toolName: "tb__x", status: "done", result: manyLines });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("5 lines truncated"), "should show truncation message for 20 lines");
    assert.ok(text.includes("line20"), "last line should be visible");
  });

  it("does not truncate result with exactly 15 lines", () => {
    const fifteenLines = Array.from({ length: 15 }, (_, i) => `line${i + 1}`).join("\n");
    const result = buildWidget({ toolName: "tb__x", status: "done", result: fifteenLines });
    const text = collectText(result.text as TextSpan);
    assert.ok(!text.includes("truncated"), "should not truncate exactly 15 lines");
    assert.ok(text.includes("line1"), "first line should be visible");
    assert.ok(text.includes("line15"), "last line should be visible");
  });

  // 12. Progress body (in-progress)
  it("renders progress content for in-progress status", () => {
    const result = buildWidget({
      toolName: "tb__x",
      status: "in-progress",
      progress: { content: "scanning files..." },
    });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("scanning files..."), "should show progress content");
  });

  it("renders progress content for cancelled status", () => {
    const result = buildWidget({
      toolName: "tb__x",
      status: "cancelled",
      progress: { content: "partial output" },
    });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("partial output"), "should show progress content for cancelled");
  });

  // 13. Animation state management
  it("_spinner is a BrailleSpinner instance", () => {
    const widget = new ToolboxToolWidget({ toolName: "tb__x", status: "in-progress" });
    const state = widget.createState() as ToolboxToolWidgetState;
    const s = state as unknown as Record<string, unknown>;
    assert.ok(s._spinner, "should have a _spinner");
    assert.ok(
      typeof (s._spinner as { step?: unknown }).step === "function",
      "spinner should have step()",
    );
  });

  it("_animationTimer is undefined initially", () => {
    const widget = new ToolboxToolWidget({ toolName: "tb__x", status: "done" });
    const state = widget.createState() as ToolboxToolWidgetState;
    const s = state as unknown as Record<string, unknown>;
    assert.equal(s._animationTimer, undefined, "no timer until initState");
  });

  it("didUpdateWidget starts animation when transitioning to in-progress", () => {
    const doneWidget = new ToolboxToolWidget({ toolName: "tb__x", status: "done" });
    const state = doneWidget.createState() as ToolboxToolWidgetState;
    const s = state as unknown as Record<string, unknown>;
    s._widget = new ToolboxToolWidget({ toolName: "tb__x", status: "in-progress" });
    s._mounted = true;
    state.didUpdateWidget(doneWidget);
    assert.ok(
      s._animationTimer !== undefined,
      "should start timer when transitioning to in-progress",
    );
    clearInterval(s._animationTimer as ReturnType<typeof setInterval>);
  });

  it("didUpdateWidget stops animation when transitioning away from in-progress", () => {
    const inProgressWidget = new ToolboxToolWidget({ toolName: "tb__x", status: "in-progress" });
    const state = inProgressWidget.createState() as ToolboxToolWidgetState;
    const s = state as unknown as Record<string, unknown>;
    s._animationTimer = setInterval(() => {}, 200);
    s._widget = new ToolboxToolWidget({ toolName: "tb__x", status: "done" });
    s._mounted = true;
    state.didUpdateWidget(inProgressWidget);
    assert.equal(
      s._animationTimer,
      undefined,
      "should stop timer when transitioning away from in-progress",
    );
  });

  it("dispose stops the animation timer", () => {
    const widget = new ToolboxToolWidget({ toolName: "tb__x", status: "in-progress" });
    const state = widget.createState() as ToolboxToolWidgetState;
    const s = state as unknown as Record<string, unknown>;
    s._widget = widget;
    s._mounted = true;
    s._animationTimer = setInterval(() => {}, 200);
    state.dispose();
    assert.equal(s._animationTimer, undefined, "dispose should clear animation timer");
  });
});
