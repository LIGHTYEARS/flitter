/**
 * ToolboxListWidget unit tests.
 *
 * Validates:
 * - Widget construction and config storage
 * - Empty state: "No toolboxes found."
 * - Summary line: "N toolbox(es) with K/M tool(s) registered"
 * - Pluralization: toolbox/toolboxes, tool/tools
 * - Discovering toolbox: "◌ " icon + "discovering N/M..." text
 * - Ready toolbox: "● " icon + tool count
 * - Error toolbox: "● " bullet with error color
 * - No-tools fallback: "└─ No tools available"
 * - Tool status icons: ◌ (pending), ✓ (ready), ✗ (error)
 * - Tool description truncation at 50 chars
 * - Tool error truncation at 40 chars
 * - Pending tool: "discovering..." suffix
 *
 * 逆向: chunk-006.js — R0R / a0R
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RichText, StatelessWidget, type TextSpan } from "@flitter/tui";
import {
  type ToolboxEntry,
  ToolboxListWidget,
  type ToolboxListWidgetConfig,
} from "./toolbox-list-widget.js";

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

/** Build a ToolboxListWidget and call build() with a minimal mock context. */
function buildWidget(config: ToolboxListWidgetConfig): RichText {
  const widget = new ToolboxListWidget(config);
  const mockContext = {};
  return widget.build(mockContext as Parameters<typeof widget.build>[0]);
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("ToolboxListWidget", () => {
  // 1. Construction
  it("extends StatelessWidget", () => {
    const widget = new ToolboxListWidget({ toolboxes: [] });
    assert.ok(widget instanceof StatelessWidget, "should extend StatelessWidget");
  });

  it("stores config on the widget", () => {
    const config: ToolboxListWidgetConfig = {
      toolboxes: [{ path: "/tools", status: "ready", tools: [] }],
    };
    const widget = new ToolboxListWidget(config);
    assert.equal(widget.config.toolboxes.length, 1);
    assert.equal(widget.config.toolboxes[0].path, "/tools");
  });

  // 2. build returns RichText
  it("build returns a RichText widget", () => {
    const result = buildWidget({ toolboxes: [] });
    assert.ok(result instanceof RichText, "build() should return RichText");
  });

  // 3. Empty state
  it("shows 'No toolboxes found.' when toolboxes is empty", () => {
    const result = buildWidget({ toolboxes: [] });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("No toolboxes found."), "should show empty state message");
  });

  // 4. Summary line
  it("shows correct summary for one toolbox with one ready tool", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/my/toolbox",
        status: "ready",
        tools: [{ name: "tb__search", status: "ready", description: "search files" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("1 toolbox"), "should say '1 toolbox'");
    assert.ok(text.includes("1/1 tool"), "should say '1/1 tool'");
    assert.ok(text.includes("registered"), "should say 'registered'");
  });

  it("shows plural 'toolboxes' and 'tools' for multiple", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb1",
        status: "ready",
        tools: [
          { name: "tb__a", status: "ready" },
          { name: "tb__b", status: "ready" },
        ],
      },
      {
        path: "/tb2",
        status: "ready",
        tools: [{ name: "tb__c", status: "error" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("2 toolboxes"), "should say '2 toolboxes'");
    assert.ok(text.includes("2/3 tools"), "should say '2/3 tools' (2 ready, 3 total)");
  });

  it("counts only 'ready' tools as registered in summary", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [
          { name: "a", status: "ready" },
          { name: "b", status: "error" },
          { name: "c", status: "pending" },
        ],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("1/3"), "should count 1 ready tool out of 3 total");
  });

  // 5. Toolbox status rendering
  it("shows '◌ ' icon and 'discovering' text for discovering toolbox", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/discovering/tb",
        status: "discovering",
        tools: [{ name: "tb__a", status: "pending" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("\u25CC "), "should include '◌ ' icon for discovering");
    assert.ok(text.includes("discovering"), "should include 'discovering' text");
    assert.ok(text.includes("/discovering/tb"), "should include toolbox path");
  });

  it("shows '● ' icon for ready toolbox", () => {
    const toolboxes: ToolboxEntry[] = [{ path: "/ready/tb", status: "ready", tools: [] }];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("\u25CF "), "should include '● ' icon for ready toolbox");
  });

  it("shows no tool count for toolbox with no tools", () => {
    const toolboxes: ToolboxEntry[] = [{ path: "/empty/tb", status: "ready", tools: [] }];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(
      text.includes("└─ No tools available"),
      "should show 'No tools available' for empty toolbox",
    );
  });

  // 6. Tool status icons
  it("shows '✓ ' icon for ready tools", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [{ name: "tb__search", status: "ready", description: "find files" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("\u2713 "), "should include '✓ ' icon for ready tool");
  });

  it("shows '✗ ' icon for error tools", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [{ name: "tb__broken", status: "error", error: "load failed" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("\u2717 "), "should include '✗ ' icon for error tool");
  });

  it("shows '◌ ' icon for pending tools", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "discovering",
        tools: [{ name: "tb__pending", status: "pending" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("\u25CC "), "should include '◌ ' icon for pending tool");
  });

  // 7. Tool description
  it("shows tool description when present", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [{ name: "tb__search", status: "ready", description: "search for files" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("search for files"), "should include tool description");
  });

  it("truncates tool description to 50 chars", () => {
    const longDesc = "a".repeat(60);
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [{ name: "tb__x", status: "ready", description: longDesc }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("..."), "should truncate long description with '...'");
    // The truncated text should be at most 50 chars
    // Find the description content by looking for 'a' sequences followed by '...'
    assert.ok(!text.includes(longDesc), "should not include full long description");
  });

  // 8. Tool error
  it("shows tool error when present", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [{ name: "tb__broken", status: "error", error: "import failed" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("import failed"), "should include tool error");
  });

  it("truncates tool error to 40 chars", () => {
    const longError = "e".repeat(50);
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "ready",
        tools: [{ name: "tb__broken", status: "error", error: longError }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("..."), "should truncate long error with '...'");
    assert.ok(!text.includes(longError), "should not include full long error");
  });

  // 9. Pending tool: "discovering..." suffix
  it("shows 'discovering...' suffix for pending tools", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "discovering",
        tools: [{ name: "tb__pending_tool", status: "pending" }],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    assert.ok(text.includes("discovering..."), "should show 'discovering...' for pending tool");
  });

  // 10. Multiple toolboxes render in order
  it("renders multiple toolboxes in order", () => {
    const toolboxes: ToolboxEntry[] = [
      { path: "/first/tb", status: "ready", tools: [] },
      { path: "/second/tb", status: "ready", tools: [] },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    const firstIdx = text.indexOf("/first/tb");
    const secondIdx = text.indexOf("/second/tb");
    assert.ok(firstIdx >= 0, "should include first toolbox path");
    assert.ok(secondIdx >= 0, "should include second toolbox path");
    assert.ok(firstIdx < secondIdx, "first toolbox should appear before second");
  });

  // 11. Blank line after each toolbox
  it("has a trailing newline after each toolbox block", () => {
    const toolboxes: ToolboxEntry[] = [
      { path: "/tb1", status: "ready", tools: [{ name: "tb__a", status: "ready" }] },
    ];
    const result = buildWidget({ toolboxes });
    const spans = collectSpans(result.text as TextSpan);
    // Last span in tools block should be "\n" (blank separator)
    const newlines = spans.filter((s) => s.text === "\n");
    assert.ok(newlines.length > 0, "should have trailing blank line newlines");
  });

  // 12. Discovering toolbox shows correct discovery progress
  it("discovering toolbox shows N/M where N is non-pending tools count", () => {
    const toolboxes: ToolboxEntry[] = [
      {
        path: "/tb",
        status: "discovering",
        tools: [
          { name: "tb__a", status: "ready" }, // discovered
          { name: "tb__b", status: "pending" }, // not yet
          { name: "tb__c", status: "pending" }, // not yet
        ],
      },
    ];
    const result = buildWidget({ toolboxes });
    const text = collectText(result.text as TextSpan);
    // N=1 discovered (ready), total=3
    assert.ok(
      text.includes("discovering 1/3"),
      "should show '1/3' discovered for 1 ready out of 3 total",
    );
  });
});
