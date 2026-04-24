/**
 * ExpandableToolHeader unit tests.
 *
 * Validates:
 * - Construction and config storage
 * - createState returns ExpandableToolHeaderState
 * - Uncontrolled mode: starts collapsed, toggle flips state
 * - Controlled mode: respects isExpanded prop, calls onToggle
 * - Status icon rendering (done → ✓, error → ✕, in-progress → braille)
 * - Chevron indicator (▶ collapsed, ▼ expanded)
 * - Child is hidden when collapsed, shown when expanded
 * - Trailing widget renders when provided
 *
 * Run:
 * ```bash
 * npx tsx --test packages/cli/src/widgets/expandable-tool-header.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, Column, RichText, StatefulWidget, Text } from "@flitter/tui";
import {
  ExpandableToolHeader,
  type ExpandableToolHeaderConfig,
  ExpandableToolHeaderState,
} from "./expandable-tool-header.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/**
 * Create an ExpandableToolHeaderState and simulate mounting.
 * Mirrors the pattern from conversation-view.test.ts.
 */
function mountHeader(config: ExpandableToolHeaderConfig): {
  widget: ExpandableToolHeader;
  state: ExpandableToolHeaderState;
} {
  const widget = new ExpandableToolHeader(config);
  const state = widget.createState() as ExpandableToolHeaderState;
  const mockElement = { markNeedsRebuild: () => {} } as unknown as object;
  (state as unknown as Record<string, unknown>)._widget = widget;
  (state as unknown as Record<string, unknown>)._element = mockElement;
  (state as unknown as Record<string, unknown>)._mounted = true;
  state.initState();
  return { widget, state };
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
    // Text widget
    result += w.data;
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
 * Build the widget tree from a mounted state.
 */
function buildWidget(state: ExpandableToolHeaderState): unknown {
  const mockContext = {} as BuildContext;
  return state.build(mockContext);
}

// ════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════

describe("ExpandableToolHeader", () => {
  const childWidget = new Text({
    data: "child content",
  }) as unknown as import("@flitter/tui").Widget;

  it("extends StatefulWidget", () => {
    const widget = new ExpandableToolHeader({
      title: "Read",
      child: childWidget,
    });
    assert.ok(widget instanceof StatefulWidget);
  });

  it("stores config correctly", () => {
    const widget = new ExpandableToolHeader({
      title: "Read",
      child: childWidget,
    });
    assert.equal(widget.config.title, "Read");
    assert.equal(widget.config.child, childWidget);
    assert.equal(widget.config.isExpanded, undefined);
    assert.equal(widget.config.onToggle, undefined);
  });

  it("createState returns ExpandableToolHeaderState", () => {
    const widget = new ExpandableToolHeader({
      title: "Read",
      child: childWidget,
    });
    const state = widget.createState();
    assert.ok(state instanceof ExpandableToolHeaderState);
  });

  describe("uncontrolled mode", () => {
    it("starts collapsed by default", () => {
      const { state } = mountHeader({
        title: "Read",
        child: childWidget,
      });
      const tree = buildWidget(state);
      const text = extractAllText(tree);

      // Should show collapsed chevron ▶, title, but NOT child content
      assert.ok(text.includes("Read"), "should contain title");
      assert.ok(text.includes("\u25B6"), "should show collapsed chevron ▶");
      assert.ok(!text.includes("child content"), "should not show child when collapsed");
    });

    it("toggles to expanded on tap", () => {
      const { state } = mountHeader({
        title: "Read",
        child: childWidget,
      });

      // Simulate toggle (access private method via cast)
      (state as unknown as Record<string, () => void>)._toggle();

      const tree = buildWidget(state);
      const text = extractAllText(tree);

      // Should show expanded chevron ▼ and child content
      assert.ok(text.includes("\u25BC"), "should show expanded chevron ▼");
      assert.ok(text.includes("child content"), "should show child when expanded");
    });

    it("calls onToggle callback even in uncontrolled mode", () => {
      let toggleValue: boolean | null = null;
      const { state } = mountHeader({
        title: "Read",
        child: childWidget,
        onToggle: (expanded) => {
          toggleValue = expanded;
        },
      });

      (state as unknown as Record<string, () => void>)._toggle();
      assert.equal(toggleValue, true, "onToggle should be called with true when expanding");
    });
  });

  describe("controlled mode", () => {
    it("respects isExpanded=false", () => {
      const { state } = mountHeader({
        title: "Read",
        isExpanded: false,
        child: childWidget,
      });
      const tree = buildWidget(state);
      const text = extractAllText(tree);

      assert.ok(text.includes("\u25B6"), "collapsed chevron when isExpanded=false");
      assert.ok(!text.includes("child content"), "child hidden when isExpanded=false");
    });

    it("respects isExpanded=true", () => {
      const { state } = mountHeader({
        title: "Read",
        isExpanded: true,
        child: childWidget,
      });
      const tree = buildWidget(state);
      const text = extractAllText(tree);

      assert.ok(text.includes("\u25BC"), "expanded chevron when isExpanded=true");
      assert.ok(text.includes("child content"), "child shown when isExpanded=true");
    });

    it("calls onToggle with new value on click", () => {
      let toggleValue: boolean | null = null;
      const { state } = mountHeader({
        title: "Read",
        isExpanded: false,
        onToggle: (expanded) => {
          toggleValue = expanded;
        },
        child: childWidget,
      });

      (state as unknown as Record<string, () => void>)._toggle();
      assert.equal(toggleValue, true, "onToggle called with true when collapsed→expanding");
    });
  });

  describe("status icon", () => {
    it("shows ✓ for done status", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "done",
        child: childWidget,
      });
      const text = extractAllText(buildWidget(state));
      assert.ok(text.includes("\u2713"), "should show ✓ for done");
    });

    it("shows ✕ for error status", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "error",
        child: childWidget,
      });
      const text = extractAllText(buildWidget(state));
      assert.ok(text.includes("\u2715"), "should show ✕ for error");
    });

    it("shows ✕ for cancelled status", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "cancelled",
        child: childWidget,
      });
      const text = extractAllText(buildWidget(state));
      assert.ok(text.includes("\u2715"), "should show ✕ for cancelled");
    });

    it("shows braille spinner for in-progress status", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "in-progress",
        child: childWidget,
      });
      const text = extractAllText(buildWidget(state));
      // The first frame of the braille spinner should be present
      // Braille characters are in the range U+2800-U+28FF
      const hasBraille = /[\u2800-\u28FF]/.test(text);
      assert.ok(hasBraille, "should show braille spinner for in-progress");

      // Clean up animation timer
      state.dispose();
    });

    it("does not show status icon when no status provided", () => {
      const { state } = mountHeader({
        title: "Read",
        child: childWidget,
      });
      const text = extractAllText(buildWidget(state));
      // Should only have title + chevron, no status icon
      assert.ok(!text.includes("\u2713"), "no done icon");
      assert.ok(!text.includes("\u2715"), "no error icon");
      assert.ok(!text.includes("\u22EF"), "no in-progress icon");
    });
  });

  describe("trailing widget", () => {
    it("renders trailing content when provided", () => {
      const trailingWidget = new Text({
        data: "src/index.ts",
      }) as unknown as import("@flitter/tui").Widget;
      const { state } = mountHeader({
        title: "Read",
        trailing: trailingWidget,
        child: childWidget,
      });
      const text = extractAllText(buildWidget(state));
      assert.ok(text.includes("src/index.ts"), "trailing content should be rendered");
    });
  });

  describe("expanded structure", () => {
    it("returns Column when expanded", () => {
      const { state } = mountHeader({
        title: "Read",
        isExpanded: true,
        child: childWidget,
      });
      const tree = buildWidget(state);
      assert.ok(tree instanceof Column, "expanded tree should be a Column");
    });

    it("returns non-Column (GestureDetector) when collapsed", () => {
      const { state } = mountHeader({
        title: "Read",
        isExpanded: false,
        child: childWidget,
      });
      const tree = buildWidget(state);
      // When collapsed, should NOT be a Column (it's just the header row)
      assert.ok(!(tree instanceof Column), "collapsed tree should not be a Column");
    });
  });

  describe("animation lifecycle", () => {
    it("starts animation timer for in-progress status", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "in-progress",
        child: childWidget,
      });

      // The private _animationTimer should be set
      const timer = (state as unknown as Record<string, unknown>)._animationTimer;
      assert.ok(timer !== undefined, "animation timer should be started");

      state.dispose();
    });

    it("does not start animation timer for done status", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "done",
        child: childWidget,
      });

      const timer = (state as unknown as Record<string, unknown>)._animationTimer;
      assert.equal(timer, undefined, "animation timer should not be started for done");
    });

    it("cleans up timer on dispose", () => {
      const { state } = mountHeader({
        title: "Read",
        status: "in-progress",
        child: childWidget,
      });

      state.dispose();

      const timer = (state as unknown as Record<string, unknown>)._animationTimer;
      assert.equal(timer, undefined, "animation timer should be cleared on dispose");
    });
  });
});
