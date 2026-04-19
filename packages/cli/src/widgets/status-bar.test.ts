/**
 * StatusBar widget unit tests.
 *
 * Validates:
 * - StatusBar inherits StatelessWidget
 * - build() renders model name, token count, and status message
 * - Uses mutedText color (#565f89) for normal text
 * - Uses warning/danger colors for context threshold messages
 *
 * @module
 */

import { describe, expect, it } from "bun:test";
import type { BuildContext } from "@flitter/tui";
import { Column, Padding, RichText, Row, StatelessWidget } from "@flitter/tui";
import { StatusBar, type StatusBarConfig, type StatusBarState } from "./status-bar.js";

// ════════════════════════════════════════════════════
//  Helper types
// ════════════════════════════════════════════════════

/** Loose widget shape for tree traversal */
interface WidgetNode {
  children?: WidgetNode[];
  child?: WidgetNode;
  text?: {
    style?: { foreground?: { kind: string; r: number; g: number; b: number } };
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
    expect(bar).toBeInstanceOf(StatelessWidget);
  });

  it("stores config.state properties", () => {
    const bar = new StatusBar(defaultConfig);
    expect(bar.config.state.modelName).toBe("claude-3.5-sonnet");
    expect(bar.config.state.tokenUsage.inputTokens).toBe(1000);
    expect(bar.config.state.tokenUsage.outputTokens).toBe(234);
  });

  it("build() renders model name text", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    const hasModelName = texts.some((t) => t.includes("claude-3.5-sonnet"));
    expect(hasModelName).toBe(true);
  });

  it("build() renders total token count (input + output)", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    // 1000 + 234 = 1234
    const hasTokenCount = texts.some((t) => t.includes("1234 tokens"));
    expect(hasTokenCount).toBe(true);
  });

  it("uses mutedText color (#565f89) for model name text", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const richTexts = collectRichTexts(built as unknown as WidgetNode);
    expect(richTexts.length).toBeGreaterThan(0);

    const hasMutedColor = richTexts.some((rt) => {
      const style = (rt as unknown as WidgetNode).text?.style;
      if (!style) return false;
      const fg = style.foreground;
      return fg && fg.kind === "rgb" && fg.r === 0x56 && fg.g === 0x5f && fg.b === 0x89;
    });
    expect(hasMutedColor).toBe(true);
  });

  it("build() returns Column > 3 Row structure (bordered layout)", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    expect(built).toBeInstanceOf(Column);
    const col = built as unknown as WidgetNode;
    expect(col.children).toBeDefined();
    expect(col.children!.length).toBe(3);
    for (const row of col.children!) {
      expect(row).toBeInstanceOf(Row);
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
    expect(hasStatus).toBe(true);
  });

  it("does not render center status text when idle with low usage", () => {
    const bar = new StatusBar(defaultConfig);
    const built = bar.build({} as unknown as BuildContext);
    const texts = extractPlainTexts(built as unknown as WidgetNode);
    // With bordered layout, there are border characters + model name + token count
    // but no status message text like "Streaming..." or "Waiting..."
    const hasStatusMessage = texts.some(
      (t) =>
        t.includes("Streaming") ||
        t.includes("Waiting") ||
        t.includes("Compacting") ||
        t.includes("Running") ||
        t.includes("Cancelled") ||
        t.includes("context"),
    );
    expect(hasStatusMessage).toBe(false);
  });

  it("uses danger color for context near full message", () => {
    const config: StatusBarConfig = {
      state: makeState({
        tokenUsage: { inputTokens: 9500, outputTokens: 50, maxInputTokens: 10000 },
      }),
    };
    const bar = new StatusBar(config);
    const built = bar.build({} as unknown as BuildContext);
    const richTexts = collectRichTexts(built as unknown as WidgetNode);

    // Find the status message RichText with danger color
    const hasDangerColor = richTexts.some((rt) => {
      const style = (rt as unknown as WidgetNode).text?.style;
      if (!style) return false;
      const fg = style.foreground;
      return fg && fg.kind === "rgb" && fg.r === 0xf7 && fg.g === 0x76 && fg.b === 0x8e;
    });
    expect(hasDangerColor).toBe(true);
  });
});
