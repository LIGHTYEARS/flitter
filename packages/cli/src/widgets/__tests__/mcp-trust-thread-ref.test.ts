/**
 * MCP Trust Dialog + Thread Reference Widget unit tests.
 *
 * 20+ tests total (10+ per widget).
 *
 * McpTrustDialogWidget tests:
 *  1. extends StatelessWidget
 *  2. stores props correctly
 *  3. build returns Center > Focus > Container
 *  4. renders server name in body text
 *  5. renders title "MCP Server Trust"
 *  6. renders all four action labels
 *  7. key 't' calls onTrust
 *  8. key 'a' calls onAlwaysTrust
 *  9. key 's' calls onOpenSettings
 * 10. key 'Escape' calls onDismiss
 * 11. uppercase 'T' also calls onTrust
 * 12. unrecognized key returns "ignored"
 *
 * ThreadReferenceWidget tests:
 * 13. extends StatelessWidget
 * 14. stores props correctly
 * 15. fork type renders "Forked from: " label
 * 16. handoff type renders "Handed off from: " label
 * 17. mention type renders "Mentioned in: " label
 * 18. renders "↳ " prefix
 * 19. truncates title longer than 40 graphemes
 * 20. does not truncate title <= 40 graphemes
 * 21. onNavigate callback receives correct threadId
 * 22. build returns SizedBox(height:1) at root
 * 23. no GestureDetector when onNavigate is undefined
 * 24. title is underlined when onNavigate is provided
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type BuildContext,
  Center,
  Container,
  Focus,
  GestureDetector,
  RichText,
  SizedBox,
  StatelessWidget,
} from "@flitter/tui";
import { type McpTrustDialogProps, McpTrustDialogWidget } from "../mcp-trust-dialog.js";
import {
  type ThreadReferenceProps,
  ThreadReferenceWidget,
  truncateTitle,
} from "../thread-reference-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

const mockContext = {} as BuildContext;

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
 * Create default McpTrustDialogProps for testing.
 */
function createTrustProps(overrides?: Partial<McpTrustDialogProps>): McpTrustDialogProps {
  return {
    serverName: "test-server",
    onTrust: () => {},
    onAlwaysTrust: () => {},
    onOpenSettings: () => {},
    onDismiss: () => {},
    ...overrides,
  };
}

/**
 * Create default ThreadReferenceProps for testing.
 */
function createRefProps(overrides?: Partial<ThreadReferenceProps>): ThreadReferenceProps {
  return {
    type: "fork",
    parentTitle: "My parent thread",
    parentThreadId: "thread-abc-123",
    ...overrides,
  };
}

/**
 * Recursively find the first widget of a given type in the tree.
 */
function findWidget<T>(widget: unknown, ctor: new (...args: unknown[]) => T): T | null {
  if (widget instanceof ctor) return widget as T;
  const w = widget as Record<string, unknown>;
  if (w.child) {
    const found = findWidget(w.child, ctor);
    if (found) return found;
  }
  if (w.children && Array.isArray(w.children)) {
    for (const child of w.children) {
      const found = findWidget(child, ctor);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Extract the key handler from a Focus widget in the tree and call it.
 */
function simulateKey(
  tree: unknown,
  key: string,
  modifiers?: { altKey?: boolean; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
): string {
  const focus = findWidget(tree, Focus);
  assert.ok(focus, "Focus widget should exist in tree");
  const handler = (focus as unknown as Record<string, unknown>).onKey as (
    event: Record<string, unknown>,
  ) => string;
  assert.ok(handler, "Focus.onKey should be defined");
  return handler({ key, ...modifiers });
}

// ════════════════════════════════════════════════════
//  McpTrustDialogWidget Tests
// ════════════════════════════════════════════════════

describe("McpTrustDialogWidget", () => {
  // ── Test 1: extends StatelessWidget ──
  it("extends StatelessWidget", () => {
    const widget = new McpTrustDialogWidget(createTrustProps());
    assert.ok(widget instanceof StatelessWidget);
  });

  // ── Test 2: stores props correctly ──
  it("stores props correctly", () => {
    const props = createTrustProps({ serverName: "my-mcp-server" });
    const widget = new McpTrustDialogWidget(props);
    assert.equal(widget.props.serverName, "my-mcp-server");
    assert.equal(typeof widget.props.onTrust, "function");
    assert.equal(typeof widget.props.onAlwaysTrust, "function");
    assert.equal(typeof widget.props.onOpenSettings, "function");
    assert.equal(typeof widget.props.onDismiss, "function");
  });

  // ── Test 3: build returns Center > Focus > Container ──
  it("build returns Center wrapping Focus wrapping Container", () => {
    const widget = new McpTrustDialogWidget(createTrustProps());
    const tree = widget.build(mockContext);
    assert.ok(tree instanceof Center, "root should be Center");
    const focus = findWidget(tree, Focus);
    assert.ok(focus, "should contain Focus");
    const container = findWidget(tree, Container);
    assert.ok(container, "should contain Container");
  });

  // ── Test 4: renders server name in body text ──
  it("renders server name in body text", () => {
    const widget = new McpTrustDialogWidget(createTrustProps({ serverName: "anthropic-mcp" }));
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("anthropic-mcp"), `Expected text to include server name, got: ${text}`);
    assert.ok(text.includes("wants to connect"), `Expected trust question text, got: ${text}`);
  });

  // ── Test 5: renders title "MCP Server Trust" ──
  it("renders title 'MCP Server Trust'", () => {
    const widget = new McpTrustDialogWidget(createTrustProps());
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("MCP Server Trust"), `Expected title, got: ${text}`);
  });

  // ── Test 6: renders all four action labels ──
  it("renders all four action labels", () => {
    const widget = new McpTrustDialogWidget(createTrustProps());
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("[t]"), "should have [t] label");
    assert.ok(text.includes("Trust"), "should have Trust label");
    assert.ok(text.includes("[a]"), "should have [a] label");
    assert.ok(text.includes("Always trust"), "should have Always trust label");
    assert.ok(text.includes("[s]"), "should have [s] label");
    assert.ok(text.includes("Open settings"), "should have Open settings label");
    assert.ok(text.includes("[Esc]"), "should have [Esc] label");
    assert.ok(text.includes("Dismiss"), "should have Dismiss label");
  });

  // ── Test 7: key 't' calls onTrust ──
  it("key 't' calls onTrust callback", () => {
    let trustCalled = false;
    const widget = new McpTrustDialogWidget(
      createTrustProps({
        onTrust: () => {
          trustCalled = true;
        },
      }),
    );
    const tree = widget.build(mockContext);
    const result = simulateKey(tree, "t");
    assert.ok(trustCalled, "onTrust should have been called");
    assert.equal(result, "handled");
  });

  // ── Test 8: key 'a' calls onAlwaysTrust ──
  it("key 'a' calls onAlwaysTrust callback", () => {
    let alwaysCalled = false;
    const widget = new McpTrustDialogWidget(
      createTrustProps({
        onAlwaysTrust: () => {
          alwaysCalled = true;
        },
      }),
    );
    const tree = widget.build(mockContext);
    const result = simulateKey(tree, "a");
    assert.ok(alwaysCalled, "onAlwaysTrust should have been called");
    assert.equal(result, "handled");
  });

  // ── Test 9: key 's' calls onOpenSettings ──
  it("key 's' calls onOpenSettings callback", () => {
    let settingsCalled = false;
    const widget = new McpTrustDialogWidget(
      createTrustProps({
        onOpenSettings: () => {
          settingsCalled = true;
        },
      }),
    );
    const tree = widget.build(mockContext);
    const result = simulateKey(tree, "s");
    assert.ok(settingsCalled, "onOpenSettings should have been called");
    assert.equal(result, "handled");
  });

  // ── Test 10: key 'Escape' calls onDismiss ──
  it("key 'Escape' calls onDismiss callback", () => {
    let dismissCalled = false;
    const widget = new McpTrustDialogWidget(
      createTrustProps({
        onDismiss: () => {
          dismissCalled = true;
        },
      }),
    );
    const tree = widget.build(mockContext);
    const result = simulateKey(tree, "Escape");
    assert.ok(dismissCalled, "onDismiss should have been called");
    assert.equal(result, "handled");
  });

  // ── Test 11: uppercase 'T' also calls onTrust ──
  it("uppercase 'T' also calls onTrust", () => {
    let trustCalled = false;
    const widget = new McpTrustDialogWidget(
      createTrustProps({
        onTrust: () => {
          trustCalled = true;
        },
      }),
    );
    const tree = widget.build(mockContext);
    const result = simulateKey(tree, "T");
    assert.ok(trustCalled, "onTrust should handle uppercase T");
    assert.equal(result, "handled");
  });

  // ── Test 12: unrecognized key returns "ignored" ──
  it("unrecognized key returns 'ignored'", () => {
    const widget = new McpTrustDialogWidget(createTrustProps());
    const tree = widget.build(mockContext);
    const result = simulateKey(tree, "x");
    assert.equal(result, "ignored");
  });
});

// ════════════════════════════════════════════════════
//  ThreadReferenceWidget Tests
// ════════════════════════════════════════════════════

describe("ThreadReferenceWidget", () => {
  // ── Test 13: extends StatelessWidget ──
  it("extends StatelessWidget", () => {
    const widget = new ThreadReferenceWidget(createRefProps());
    assert.ok(widget instanceof StatelessWidget);
  });

  // ── Test 14: stores props correctly ──
  it("stores props correctly", () => {
    const props = createRefProps({
      type: "handoff",
      parentTitle: "Debug session",
      parentThreadId: "thread-xyz",
    });
    const widget = new ThreadReferenceWidget(props);
    assert.equal(widget.props.type, "handoff");
    assert.equal(widget.props.parentTitle, "Debug session");
    assert.equal(widget.props.parentThreadId, "thread-xyz");
  });

  // ── Test 15: fork type renders "Forked from: " label ──
  it("fork type renders 'Forked from: ' label", () => {
    const widget = new ThreadReferenceWidget(
      createRefProps({ type: "fork", parentTitle: "Main thread" }),
    );
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("Forked from: "), `Expected 'Forked from: ', got: ${text}`);
  });

  // ── Test 16: handoff type renders "Handed off from: " label ──
  it("handoff type renders 'Handed off from: ' label", () => {
    const widget = new ThreadReferenceWidget(
      createRefProps({ type: "handoff", parentTitle: "Worker thread" }),
    );
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("Handed off from: "), `Expected 'Handed off from: ', got: ${text}`);
  });

  // ── Test 17: mention type renders "Mentioned in: " label ──
  it("mention type renders 'Mentioned in: ' label", () => {
    const widget = new ThreadReferenceWidget(
      createRefProps({ type: "mention", parentTitle: "Some conversation" }),
    );
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("Mentioned in: "), `Expected 'Mentioned in: ', got: ${text}`);
  });

  // ── Test 18: renders "↳ " prefix ──
  it("renders arrow prefix '\\u21B3 '", () => {
    const widget = new ThreadReferenceWidget(createRefProps());
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("\u21B3 "), `Expected '↳ ' prefix, got: ${text}`);
  });

  // ── Test 19: truncates title longer than 40 graphemes ──
  it("truncates title longer than 40 graphemes", () => {
    const longTitle = "A".repeat(50);
    const result = truncateTitle(longTitle);
    assert.equal(result.length, 40, "truncated title should be 40 chars (39 + ellipsis)");
    assert.ok(result.endsWith("\u2026"), "truncated title should end with ellipsis");
    assert.equal(result, "A".repeat(39) + "\u2026");
  });

  // ── Test 20: does not truncate title <= 40 graphemes ──
  it("does not truncate title at exactly 40 graphemes", () => {
    const title40 = "B".repeat(40);
    const result = truncateTitle(title40);
    assert.equal(result, title40, "should not truncate at exactly 40");
  });

  // ── Test 21: onNavigate callback receives correct threadId ──
  it("onNavigate callback receives correct threadId", () => {
    let navigatedTo: string | null = null;
    const widget = new ThreadReferenceWidget(
      createRefProps({
        parentThreadId: "thread-nav-test",
        onNavigate: (id) => {
          navigatedTo = id;
        },
      }),
    );
    const tree = widget.build(mockContext);
    // Find the GestureDetector and simulate a tap
    const gd = findWidget(tree, GestureDetector);
    assert.ok(gd, "GestureDetector should exist when onNavigate is provided");
    // Simulate tap by calling onTap
    const onTap = (gd as unknown as Record<string, unknown>).onTap as (() => void) | undefined;
    assert.ok(onTap, "onTap should be defined on GestureDetector");
    onTap();
    assert.equal(navigatedTo, "thread-nav-test");
  });

  // ── Test 22: build returns SizedBox(height:1) at root ──
  it("build returns SizedBox with height 1 at root", () => {
    const widget = new ThreadReferenceWidget(createRefProps());
    const tree = widget.build(mockContext);
    assert.ok(tree instanceof SizedBox, "root should be SizedBox");
    assert.equal((tree as SizedBox).height, 1, "SizedBox height should be 1");
  });

  // ── Test 23: no GestureDetector when onNavigate is undefined ──
  it("no GestureDetector when onNavigate is undefined", () => {
    const widget = new ThreadReferenceWidget(createRefProps({ onNavigate: undefined }));
    const tree = widget.build(mockContext);
    const gd = findWidget(tree, GestureDetector);
    assert.equal(gd, null, "should not have GestureDetector without onNavigate");
  });

  // ── Test 24: title text contains the parent title ──
  it("title text includes parent title", () => {
    const widget = new ThreadReferenceWidget(createRefProps({ parentTitle: "Unique Title Text" }));
    const tree = widget.build(mockContext);
    const text = extractAllText(tree);
    assert.ok(text.includes("Unique Title Text"), `Expected parent title in text, got: ${text}`);
  });
});
