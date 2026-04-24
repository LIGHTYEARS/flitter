/**
 * StatusBar widget unit tests.
 *
 * Validates:
 * - StatusBar inherits StatelessWidget
 * - build() renders model name, token count, and status message
 * - Uses dim style for normal text
 * - Uses warning/danger colors for context threshold messages
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BuildContext } from "@flitter/tui";
import { Column, RichText, Row, StatelessWidget } from "@flitter/tui";
import { StatusBar, type StatusBarConfig, type StatusBarState } from "./status-bar.js";

// ════════════════════════════════════════════════════
//  Helper types
// ════════════════════════════════════════════════════

/** Loose widget shape for tree traversal */
interface WidgetNode {
  children?: WidgetNode[];
  child?: WidgetNode;
  text?: {
    style?: { foreground?: { kind: string; index?: number }; dim?: boolean };
    toPlainText(): string;
  };
}

// ════════════════════════════════════════════════════
//  Helper functions
// ════════════════════════════════════════════════════

/** Create a default idle StatusBarState */
function makeState(overrides: Partial<StatusBarState> = {}): StatusBarState {
  return {
    modelName: "claude-3.5-sonnet",
    inferenceState: "idle",
    hasStartedStreaming: false,
    tokenUsage: { inputTokens: 1000, outputTokens: 234, maxInputTokens: 10000 },
    compactionState: "idle",
    runningToolCount: 0,
    waitingForApproval: false,
    ...overrides,
  };
}

/** Recursively collect all RichText nodes from a widget tree. */
function collectRichTexts(widget: WidgetNode): RichText[] {
  const results: RichText[] = [];
  if (widget instanceof RichText) {
    results.push(widget);
  }
  if (widget.children) {
    for (const child of widget.children) {
      results.push(...collectRichTexts(child));
    }
  }
  if (widget.child) {
    results.push(...collectRichTexts(widget.child));
  }
  return results;
}

/** Recursively extract all plain text strings from a widget tree. */
function extractPlainTexts(widget: WidgetNode): string[] {
  const results: string[] = [];
  if (widget instanceof RichText) {
    results.push(widget.text.toPlainText());
  }
  if (widget.children) {
    for (const child of widget.children) {
      results.push(...extractPlainTexts(child));
    }
  }
  if (widget.child) {
    results.push(...extractPlainTexts(widget.child));
  }
  return results;
}

// ════════════════════════════════════════════════════
//  StatusBar tests
// ════════════════════════════════════════════════════

describe("StatusBar", () => {
  const defaultConfig: StatusBarConfig = {
    state: makeState(),
  };

  it("inherits StatelessWidget", () => {
    const bar = new StatusBar(defaultConfig);
    assert.ok(bar instanceof StatelessWidget);
  });

  it("stores config.state properties", () => {
    const bar = new StatusBar(defaultConfig);
    assert.equal(bar.config.state.modelName, "claude-3.5-sonnet");
    assert.equal(bar.config.state.tokenUsage.inputTokens, 1000);
    assert.equal(bar.config.state.tokenUsage.outputTokens, 234);
  });

  it("build() renders model name text", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    const hasModelName = texts.some((t) => t.includes("claude-3.5-sonnet"));
    assert.ok(hasModelName, "Should contain model name");
  });

  it("build() renders total token count (input + output)", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    // 1000 + 234 = 1234
    const hasTokenCount = texts.some((t) => t.includes("1234 tokens"));
    assert.ok(hasTokenCount, "Should contain token count");
  });

  it("uses dim style for model name text", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const richTexts = collectRichTexts(built as unknown as WidgetNode);
    assert.ok(richTexts.length > 0, "Should have RichText nodes");

    const hasDimStyle = richTexts.some((rt) => {
      const node = rt as unknown as WidgetNode;
      return node.text?.style?.dim === true;
    });
    assert.ok(hasDimStyle, "Should use dim style for muted text");
  });

  it("build() returns Column > 3 Row structure (bordered layout)", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    assert.ok(built instanceof Column);
    const col = built as unknown as WidgetNode;
    assert.ok(col.children);
    assert.equal(col.children!.length, 3);
    for (const row of col.children!) {
      assert.ok(row instanceof Row);
    }
  });

  it("renders status message when state has active status", () => {
    const config: StatusBarConfig = {
      state: makeState({ inferenceState: "running", hasStartedStreaming: true }),
    };
    const bar = new StatusBar(config);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    const hasStatus = texts.some((t) => t.includes("Streaming response..."));
    assert.ok(hasStatus, "Should render streaming status");
  });

  it("does not render center status text when idle with low usage", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    const hasStatusMessage = texts.some(
      (t) =>
        t.includes("Streaming") ||
        t.includes("Waiting") ||
        t.includes("Compacting") ||
        t.includes("Running") ||
        t.includes("Cancelled") ||
        t.includes("context"),
    );
    assert.equal(hasStatusMessage, false, "Should not render status text when idle");
  });

  it("uses danger color (indexed red) for context near full message", () => {
    const config: StatusBarConfig = {
      state: makeState({
        tokenUsage: { inputTokens: 9500, outputTokens: 50, maxInputTokens: 10000 },
      }),
    };
    const bar = new StatusBar(config);
    const built = bar.build({} as unknown as BuildContext);
    const richTexts = collectRichTexts(built as unknown as WidgetNode);

    const hasDangerColor = richTexts.some((rt) => {
      const node = rt as unknown as WidgetNode;
      const fg = node.text?.style?.foreground;
      return fg && fg.kind === "index" && fg.index === 1;
    });
    assert.ok(hasDangerColor, "Should use danger color (indexed 1 = red) for near-full context");
  });
});
