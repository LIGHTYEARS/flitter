/**
 * PainterToolWidget unit tests.
 *
 * Validates:
 *  1. Widget extends StatefulWidget
 *  2. Config stored correctly
 *  3. createState returns PainterToolWidgetState
 *  4. Header title is always "Painter"
 *  5. Header status is passed through correctly
 *  6. In-progress state: no body images shown
 *  7. Done + images: image entries are shown with label text
 *  8. Single image: "Generated Image" label (no number)
 *  9. Multiple images: "Image 1", "Image 2", etc. labels
 * 10. Image with alt-text: shows "[Image: <alt>]" fallback
 * 11. Image without alt-text: shows "[Generated Image N]" fallback
 * 12. Error state: error message shown in body
 * 13. Empty error: not shown in body
 * 14. Prompt text: truncated to 80 chars, shown dim
 * 15. Long prompt: truncated with "..." suffix
 * 16. toggleExpanded flips image expand state
 * 17. getImageState lazily creates entries with expanded=true
 * 18. No images when status is "error" even if images array provided
 *
 * Run:
 * ```bash
 * bun test packages/cli/src/widgets/painter-tool-widget.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, RichText, StatefulWidget } from "@flitter/tui";
import { ExpandableToolHeader } from "./expandable-tool-header.js";
import {
  PainterToolWidget,
  type PainterToolWidgetConfig,
  PainterToolWidgetState,
} from "./painter-tool-widget.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

const mockContext = {} as BuildContext;

/**
 * Mount a PainterToolWidgetState without a real element tree.
 */
function mountState(config: PainterToolWidgetConfig): {
  widget: PainterToolWidget;
  state: PainterToolWidgetState;
} {
  const widget = new PainterToolWidget(config);
  const state = widget.createState() as PainterToolWidgetState;
  const mockElement = { markNeedsRebuild: () => {} } as unknown as object;
  (state as unknown as Record<string, unknown>)._widget = widget;
  (state as unknown as Record<string, unknown>)._element = mockElement;
  (state as unknown as Record<string, unknown>)._mounted = true;
  state.initState();
  return { widget, state };
}

/**
 * Build the widget state and return the root widget.
 */
function buildWidget(config: PainterToolWidgetConfig): unknown {
  const { state } = mountState(config);
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

describe("PainterToolWidget", () => {
  // ── Test 1: extends StatefulWidget ──────────────
  it("extends StatefulWidget", () => {
    const widget = new PainterToolWidget({ status: "in-progress" });
    assert.ok(widget instanceof StatefulWidget);
  });

  // ── Test 2: stores config correctly ─────────────
  it("stores config fields correctly", () => {
    const widget = new PainterToolWidget({
      status: "done",
      prompt: "A futuristic city",
      images: [{ url: "file:///tmp/img.png", alt: "city skyline" }],
      error: undefined,
    });
    assert.equal(widget.config.status, "done");
    assert.equal(widget.config.prompt, "A futuristic city");
    assert.equal(widget.config.images?.length, 1);
  });

  // ── Test 3: createState returns PainterToolWidgetState ──
  it("createState returns PainterToolWidgetState", () => {
    const widget = new PainterToolWidget({ status: "done" });
    const state = widget.createState();
    assert.ok(state instanceof PainterToolWidgetState);
  });

  // ── Test 4: header title is always "Painter" ────
  it("header title is 'Painter'", () => {
    const tree = buildWidget({ status: "done" });
    const header = tree as ExpandableToolHeader;
    assert.ok(header instanceof ExpandableToolHeader);
    assert.equal(header.config.title, "Painter");
  });

  // ── Test 5: header status is passed through ─────
  it("passes status to ExpandableToolHeader", () => {
    const tree = buildWidget({ status: "in-progress" });
    const header = tree as ExpandableToolHeader;
    assert.equal(header.config.status, "in-progress");

    const tree2 = buildWidget({ status: "error" });
    const header2 = tree2 as ExpandableToolHeader;
    assert.equal(header2.config.status, "error");
  });

  // ── Test 6: in-progress: no image content ───────
  it("in-progress state: body has no image content", () => {
    const tree = buildWidget({
      status: "in-progress",
      images: [{ alt: "should not show" }],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    // Images only shown when status === "done"
    assert.ok(!text.includes("[Image:"), `should not show image in progress: ${text}`);
    assert.ok(!text.includes("Generated Image"), `should not show image in progress: ${text}`);
  });

  // ── Test 7: done + images shown ─────────────────
  it("done state: image entries are shown", () => {
    const tree = buildWidget({
      status: "done",
      images: [{ alt: "sunset" }],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    // Should have the chevron + label
    assert.ok(text.includes("Generated Image"), `expected image label: ${text}`);
  });

  // ── Test 8: single image label ──────────────────
  it("single image uses 'Generated Image' label (no number)", () => {
    const tree = buildWidget({
      status: "done",
      images: [{ alt: "cat" }],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Generated Image"), `expected 'Generated Image': ${text}`);
    assert.ok(!text.includes("Image 1"), `should not use numbered label: ${text}`);
  });

  // ── Test 9: multiple images use numbered labels ──
  it("multiple images use numbered labels", () => {
    const tree = buildWidget({
      status: "done",
      images: [{ alt: "cat" }, { alt: "dog" }],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Image 1"), `expected 'Image 1': ${text}`);
    assert.ok(text.includes("Image 2"), `expected 'Image 2': ${text}`);
    assert.ok(!text.includes("Generated Image"), `should not use singular label: ${text}`);
  });

  // ── Test 10: image with alt-text shows fallback ──
  it("expanded image with alt shows [Image: <alt>] fallback", () => {
    const tree = buildWidget({
      status: "done",
      images: [{ alt: "mountain vista" }],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("[Image: mountain vista]"), `expected alt fallback: ${text}`);
  });

  // ── Test 11: image without alt shows generic fallback ──
  it("expanded image without alt shows [Generated Image N] fallback", () => {
    const tree = buildWidget({
      status: "done",
      images: [{}],
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("[Generated Image 1]"), `expected generic fallback: ${text}`);
  });

  // ── Test 12: error state shown in body ───────────
  it("error state: error message shown in body", () => {
    const tree = buildWidget({
      status: "error",
      error: "Model refused to generate image",
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("Model refused to generate image"), `expected error text: ${text}`);
  });

  // ── Test 13: empty error not shown ───────────────
  it("empty error string is not rendered", () => {
    const tree = buildWidget({ status: "error", error: "" });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.equal(text.trim(), "", `expected empty body for empty error: ${text}`);
  });

  // ── Test 14: prompt shown dim ────────────────────
  it("prompt is shown in body detail", () => {
    const tree = buildWidget({
      status: "in-progress",
      prompt: "A dragon flying over mountains",
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    assert.ok(text.includes("A dragon flying over mountains"), `expected prompt: ${text}`);
  });

  // ── Test 15: long prompt truncated ───────────────
  it("prompt longer than 80 chars is truncated with '...'", () => {
    const longPrompt = "A".repeat(90);
    const tree = buildWidget({
      status: "in-progress",
      prompt: longPrompt,
    });
    const child = getHeaderChild(tree);
    const text = extractAllText(child);
    // Should be truncated to 77 + "..." = 80 chars
    assert.ok(text.includes("..."), `expected truncation with '...': ${text}`);
    assert.ok(text.length < 120, `truncated text should be shorter: length=${text.length}`);
  });

  // ── Test 16: toggleExpanded flips state ──────────
  it("toggleExpanded flips the image expand state", () => {
    const { state } = mountState({
      status: "done",
      images: [{ alt: "test" }],
    });
    // Initially expanded = true
    assert.equal(state.getImageState(0).expanded, true);
    // Toggle to collapsed
    state.toggleExpanded(0);
    assert.equal(state.getImageState(0).expanded, false);
    // Toggle back to expanded
    state.toggleExpanded(0);
    assert.equal(state.getImageState(0).expanded, true);
  });

  // ── Test 17: getImageState lazy init ─────────────
  it("getImageState lazily creates entries with expanded=true", () => {
    const { state } = mountState({ status: "done" });
    // Access new index
    const imgState = state.getImageState(5);
    assert.equal(imgState.expanded, true);
  });

  // ── Test 18: images not shown for non-done status ──
  it("images array ignored when status is not 'done'", () => {
    for (const status of ["in-progress", "error", "cancelled"] as const) {
      const tree = buildWidget({
        status,
        images: [{ alt: "should not appear" }],
      });
      const child = getHeaderChild(tree);
      const text = extractAllText(child);
      assert.ok(
        !text.includes("[Image: should not appear]"),
        `status=${status}: should not show images: ${text}`,
      );
    }
  });
});
