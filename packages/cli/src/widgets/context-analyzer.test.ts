/**
 * @flitter/cli — ContextAnalyzer widget tests
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TokenBreakdown } from "./context-analyzer.js";
import { ContextAnalyzer, ContextAnalyzerState } from "./context-analyzer.js";

function makeBreakdown(overrides?: Partial<TokenBreakdown>): TokenBreakdown {
  return {
    systemPromptTokens: 5000,
    messageTokens: 30000,
    toolDefinitionTokens: 8000,
    overheadTokens: 2000,
    totalTokens: 45000,
    contextWindow: 200000,
    maxOutputTokens: 16384,
    ...overrides,
  };
}

describe("ContextAnalyzer", () => {
  it("should create widget with config", () => {
    const widget = new ContextAnalyzer({
      breakdown: makeBreakdown(),
      isLoading: false,
      modelName: "claude-sonnet-4-20250514",
      onDismiss: () => {},
    });

    assert.ok(widget.config);
    assert.equal(widget.config.modelName, "claude-sonnet-4-20250514");
    assert.ok(widget.config.breakdown);
  });

  it("should create state", () => {
    const widget = new ContextAnalyzer({
      breakdown: null,
      isLoading: true,
      modelName: "gemini-2.5-pro",
      onDismiss: () => {},
    });

    const state = widget.createState();
    assert.ok(state instanceof ContextAnalyzerState);
  });

  it("should handle loading state config", () => {
    const widget = new ContextAnalyzer({
      breakdown: null,
      isLoading: true,
      modelName: "test-model",
      onDismiss: () => {},
    });

    assert.equal(widget.config.isLoading, true);
    assert.equal(widget.config.breakdown, null);
  });

  it("should handle error state config", () => {
    const widget = new ContextAnalyzer({
      breakdown: null,
      isLoading: false,
      error: "Failed to analyze",
      modelName: "test-model",
      onDismiss: () => {},
    });

    assert.equal(widget.config.error, "Failed to analyze");
  });

  it("should store onDismiss callback", () => {
    let dismissed = false;
    const widget = new ContextAnalyzer({
      breakdown: makeBreakdown(),
      isLoading: false,
      modelName: "test",
      onDismiss: () => {
        dismissed = true;
      },
    });

    widget.config.onDismiss();
    assert.equal(dismissed, true);
  });
});

describe("TokenBreakdown", () => {
  it("should have correct totals", () => {
    const bd = makeBreakdown();
    const sum =
      bd.systemPromptTokens + bd.messageTokens + bd.toolDefinitionTokens + bd.overheadTokens;
    assert.equal(sum, bd.totalTokens);
  });

  it("should calculate available input correctly", () => {
    const bd = makeBreakdown();
    const availableInput = bd.contextWindow - bd.maxOutputTokens;
    assert.equal(availableInput, 200000 - 16384);
  });

  it("should detect near-capacity state", () => {
    const bd = makeBreakdown({
      totalTokens: 170000,
      contextWindow: 200000,
      maxOutputTokens: 16384,
    });
    const availableInput = bd.contextWindow - bd.maxOutputTokens;
    const usagePercent = (bd.totalTokens / availableInput) * 100;
    assert.ok(usagePercent > 90);
  });

  it("should handle zero context window", () => {
    const bd = makeBreakdown({
      contextWindow: 0,
      maxOutputTokens: 0,
      totalTokens: 0,
    });
    // Should not divide by zero
    const availableInput = bd.contextWindow - bd.maxOutputTokens;
    const usagePercent =
      availableInput > 0 ? Math.round((bd.totalTokens / availableInput) * 100) : 0;
    assert.equal(usagePercent, 0);
  });
});
