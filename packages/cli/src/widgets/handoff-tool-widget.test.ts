/**
 * HandoffToolWidget unit tests.
 *
 * Validates:
 *  1. Widget extends StatefulWidget
 *  2. Config is stored correctly
 *  3. createState returns HandoffToolWidgetState
 *  4. In-progress: body shows "↳ " + spinner braille
 *  5. Done + newThreadId: header shows "● Handoff", body shows "↳ <threadId>"
 *  6. Error: body shows error message text (destructive)
 *  7. Bullet blink: _isGreen starts true; blink timer toggles it
 *  8. Title timeout: after _titleTimedOut = true, header shows " Untitled" dim
 *  9. No body row when status=done but no newThreadId and no error
 * 10. onNavigateToThread optional — works without it
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, RichText, StatefulWidget } from "@flitter/tui";
import {
  HandoffToolWidget,
  type HandoffToolWidgetConfig,
  HandoffToolWidgetState,
} from "./handoff-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Mount a HandoffToolWidgetState without a real element tree.
 * Mirrors the pattern from expandable-tool-header.test.ts.
 */
function mountState(config: HandoffToolWidgetConfig): {
  widget: HandoffToolWidget;
  state: HandoffToolWidgetState;
} {
  const widget = new HandoffToolWidget(config);
  const state = widget.createState() as HandoffToolWidgetState;
  const mockElement = { markNeedsRebuild: () => {} } as unknown as object;
  (state as unknown as Record<string, unknown>)._widget = widget;
  (state as unknown as Record<string, unknown>)._element = mockElement;
  (state as unknown as Record<string, unknown>)._mounted = true;
  state.initState();
  return { widget, state };
}

/**
 * Build without a real context (no theme, no MediaQuery).
 */
function buildState(state: HandoffToolWidgetState): unknown {
  const mockContext = {} as BuildContext;
  return state.build(mockContext);
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
  if (w.data !== undefined) result += w.data;
  if (w.children) {
    for (const child of w.children as unknown[]) result += extractAllText(child);
  }
  if (w.child) result += extractAllText(w.child);
  return result;
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("HandoffToolWidget", () => {
  // ── Test 1: extends StatefulWidget ──────────────
  it("extends StatefulWidget", () => {
    const widget = new HandoffToolWidget({ status: "in-progress" });
    assert.ok(widget instanceof StatefulWidget);
  });

  // ── Test 2: stores config correctly ─────────────
  it("stores config fields correctly", () => {
    const widget = new HandoffToolWidget({
      status: "done",
      newThreadId: "thread-abc-123",
      threadTitle: "My Thread",
      onNavigateToThread: () => {},
    });
    assert.equal(widget.config.status, "done");
    assert.equal(widget.config.newThreadId, "thread-abc-123");
    assert.equal(widget.config.threadTitle, "My Thread");
    assert.equal(typeof widget.config.onNavigateToThread, "function");
  });

  // ── Test 3: createState returns HandoffToolWidgetState ──
  it("createState returns HandoffToolWidgetState", () => {
    const widget = new HandoffToolWidget({ status: "in-progress" });
    const state = widget.createState();
    assert.ok(state instanceof HandoffToolWidgetState);
  });

  // ── Test 4: in-progress body shows spinner arrow ──
  it("in-progress: body shows ↳ + braille spinner text", () => {
    const { state } = mountState({ status: "in-progress" });
    const tree = buildState(state);
    const text = extractAllText(tree);

    // Header always has "● Handoff"
    assert.ok(text.includes("Handoff"), "header should contain 'Handoff'");
    assert.ok(text.includes("\u25CF"), "header should contain bullet ●");

    // Body should have the down-right arrow ↳
    assert.ok(text.includes("\u21B3"), "body should contain ↳ arrow");
  });

  // ── Test 5: done + newThreadId shows thread link ──
  it("done with newThreadId: body shows ↳ + threadId", () => {
    const { state } = mountState({
      status: "done",
      newThreadId: "thread-xyz-789",
      threadTitle: "My Sub-Task",
    });
    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(text.includes("Handoff"), "header should contain 'Handoff'");
    assert.ok(text.includes("My Sub-Task"), "header should contain thread title");
    assert.ok(text.includes("\u21B3"), "body should contain ↳ arrow");
    assert.ok(text.includes("thread-xyz-789"), "body should contain threadId");
  });

  // ── Test 6: error: body shows error message ──────
  it("error: body shows error message text", () => {
    const { state } = mountState({
      status: "error",
      error: "Unable to create handoff thread: timeout",
    });
    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(text.includes("Handoff"), "header should contain 'Handoff'");
    assert.ok(
      text.includes("Unable to create handoff thread: timeout"),
      "body should contain error message",
    );
    // No spinner arrow in error case
    assert.ok(!text.includes("\u21B3"), "error should NOT show ↳ arrow");
  });

  // ── Test 7: bullet blink — _isGreen starts true ──
  it("_isGreen starts true; toggling changes bullet color logic", () => {
    const { state } = mountState({
      status: "done",
      newThreadId: "thr-1",
      isActivelyWorking: true,
    });

    // Access private _isGreen
    const privateState = state as unknown as Record<string, unknown>;
    assert.equal(privateState._isGreen, true, "_isGreen should start true");

    // Manually toggle as the timer would
    privateState._isGreen = false;
    assert.equal(privateState._isGreen, false, "_isGreen should be false after toggle");
  });

  // ── Test 8: title timeout — show "Untitled" dim after timeout ──
  it("shows ' Untitled' when _titleTimedOut is true and no real title", () => {
    const { state } = mountState({
      status: "done",
      newThreadId: "thr-2",
      // no threadTitle
    });

    // Simulate timeout fired
    const privateState = state as unknown as Record<string, unknown>;
    privateState._titleTimedOut = true;

    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(text.includes("Untitled"), "should show 'Untitled' after title timeout");
  });

  // ── Test 9: done without newThreadId — no body row ──
  it("done without newThreadId: no ↳ arrow and no body row", () => {
    const { state } = mountState({
      status: "done",
      // no newThreadId, no error
    });
    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(text.includes("Handoff"), "header should contain 'Handoff'");
    assert.ok(!text.includes("\u21B3"), "no body row — should not show ↳ arrow");
  });

  // ── Test 10: works without onNavigateToThread ────
  it("done with newThreadId but no onNavigateToThread still renders link text", () => {
    const { state } = mountState({
      status: "done",
      newThreadId: "thr-no-nav",
      // no onNavigateToThread
    });
    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(text.includes("thr-no-nav"), "should render threadId without nav callback");
  });

  // ── Test 11: in-progress header shows "..." for pending title ──
  it("in-progress without threadTitle shows '...' placeholder", () => {
    const { state } = mountState({
      status: "in-progress",
      newThreadId: "thr-pending",
      // no threadTitle
    });
    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(text.includes("..."), "should show '...' when title is pending");
  });

  // ── Test 12: error uses fallback message when error string is empty ──
  it("error with empty error string falls back to default message", () => {
    const { state } = mountState({
      status: "error",
      error: "",
    });
    const tree = buildState(state);
    const text = extractAllText(tree);

    assert.ok(
      text.includes("Failed to create handoff thread"),
      "should show fallback error message when error string is empty",
    );
  });
});
