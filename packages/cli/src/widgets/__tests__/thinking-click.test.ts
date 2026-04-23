/**
 * thinking-click.test.ts — Thinking block click-to-expand tests
 *
 * Tests that _buildThinkingWidget wraps the header in a GestureDetector
 * only when the block is complete (not streaming) and has content.
 *
 * 逆向: fJT.build() chunk-006.js:17009-17019
 *   G0 (GestureDetector) wraps header only when `c` (hasContent) is true
 *   AND the block is complete (isComplete = !isStreaming).
 *   Streaming blocks always show content regardless of expand state.
 */
import { describe, expect, it } from "bun:test";
import { ConversationView, type ConversationViewState } from "../conversation-view.js";
import type { ThinkingItem } from "../display-items.js";

/** Helper: call the private _buildThinkingWidget method */
function buildThinkingWidget(item: ThinkingItem, itemIndex = 0) {
  const view = new ConversationView({ items: [] });
  const state = view.createState() as ConversationViewState;
  state._widget = view;
  state.initState();
  const fn = (state as unknown as Record<string, (item: ThinkingItem, idx: number) => unknown>)
    ._buildThinkingWidget;
  return fn.call(state, item, itemIndex);
}

/** Walk a widget tree and return true if any node has constructor name `name` */
function hasWidgetType(widget: unknown, name: string): boolean {
  if (!widget || typeof widget !== "object") return false;
  if ((widget as { constructor: { name: string } }).constructor.name === name) return true;
  const obj = widget as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (Array.isArray(val)) {
      for (const child of val) {
        if (hasWidgetType(child, name)) return true;
      }
    } else if (val && typeof val === "object" && hasWidgetType(val, name)) {
      return true;
    }
  }
  return false;
}

describe("_buildThinkingWidget click-to-expand", () => {
  it("complete thinking with content — widget tree contains GestureDetector", () => {
    // 逆向: fJT.build() line 17009 — G0 wraps header when `c` (hasContent) is true
    const item: ThinkingItem = {
      type: "thinking",
      text: "I am thinking about this problem.",
      isStreaming: false,
      isCancelled: false,
    };
    const widget = buildThinkingWidget(item, 0);
    expect(hasWidgetType(widget, "GestureDetector")).toBe(true);
  });

  it("streaming thinking — NO GestureDetector (content always visible)", () => {
    // 逆向: fJT.build() — streaming blocks always show content; no click handler
    // amp line 16964: `if (this.isComplete && !this.expanded) return;`
    // means streaming blocks never hide content, no reason to wrap in clickable
    const item: ThinkingItem = {
      type: "thinking",
      text: "Still thinking...",
      isStreaming: true,
      isCancelled: false,
    };
    const widget = buildThinkingWidget(item, 0);
    expect(hasWidgetType(widget, "GestureDetector")).toBe(false);
  });

  it("complete thinking with empty content — NO GestureDetector", () => {
    // 逆向: fJT.build() line 16909 — `c = i.trim().length > 0`
    // Only attach GestureDetector when hasContent
    const item: ThinkingItem = {
      type: "thinking",
      text: "",
      isStreaming: false,
      isCancelled: false,
    };
    const widget = buildThinkingWidget(item, 0);
    expect(hasWidgetType(widget, "GestureDetector")).toBe(false);
  });

  it("cancelled thinking with content — HAS GestureDetector", () => {
    // 逆向: amp wraps in G0 when `c` (hasContent) is true regardless of cancelled state
    // amp line 17009: condition is just `c ? new G0(...) : new xR(...)`
    // Cancelled blocks with content should still be expandable
    const item: ThinkingItem = {
      type: "thinking",
      text: "I was thinking about this before being cancelled.",
      isStreaming: false,
      isCancelled: true,
    };
    const widget = buildThinkingWidget(item, 0);
    expect(hasWidgetType(widget, "GestureDetector")).toBe(true);
  });

  it("streaming thinking always shows content (Column with content visible)", () => {
    // 逆向: fJT.build() line 16964-16965:
    //   `if (this.isComplete && !this.expanded) return;` — streaming ALWAYS shows content
    const item: ThinkingItem = {
      type: "thinking",
      text: "Streaming thought content here.",
      isStreaming: true,
      isCancelled: false,
    };
    const widget = buildThinkingWidget(item, 0);
    // Should be a Column (header + content), not just a single RichText
    expect((widget as { constructor: { name: string } }).constructor.name).toBe("Column");
  });

  it("complete unexpanded thinking hides content (only header row)", () => {
    // 逆向: fJT.build() line 16964-16965 — complete + not expanded → returns undefined for content
    const item: ThinkingItem = {
      type: "thinking",
      text: "Hidden content.",
      isStreaming: false,
      isCancelled: false,
    };
    // itemIndex=99 → not in _expandedThinking → collapsed
    const widget = buildThinkingWidget(item, 99);
    // Widget should just be a GestureDetector wrapping the header (no Column with content)
    const widgetName = (widget as { constructor: { name: string } }).constructor.name;
    expect(widgetName).toBe("GestureDetector");
  });
});
