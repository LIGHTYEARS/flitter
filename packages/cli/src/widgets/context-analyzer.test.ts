/**
 * context-analyzer.test.ts — ContextAnalyzer unit tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeContext,
  ContextAnalyzer,
  estimateTokens,
  formatAnalysis,
  formatThreadLabel,
  type AnalyzableMessage,
} from "./context-analyzer.js";

describe("estimateTokens", () => {
  it("estimates tokens for a plain string", () => {
    const tokens = estimateTokens("hello world"); // 11 chars => ~3 tokens
    assert.ok(tokens > 0);
    assert.equal(tokens, Math.ceil(11 / 4));
  });

  it("estimates tokens for text content blocks", () => {
    const tokens = estimateTokens([
      { type: "text", text: "Hello world, this is a test." },
    ]);
    assert.ok(tokens > 0);
    assert.equal(tokens, Math.ceil(27 / 4));
  });

  it("estimates tokens for tool_use blocks", () => {
    const tokens = estimateTokens([
      {
        type: "tool_use",
        name: "read_file",
        input: { path: "/tmp/test.txt" },
      },
    ]);
    assert.ok(tokens > 0);
  });

  it("estimates tokens for thinking blocks", () => {
    const tokens = estimateTokens([
      { type: "thinking", thinking: "Let me think about this..." },
    ]);
    assert.ok(tokens > 0);
  });

  it("handles empty array", () => {
    assert.equal(estimateTokens([]), 0);
  });

  it("handles null/undefined content", () => {
    const tokens = estimateTokens(null);
    assert.ok(tokens >= 0);
  });
});

describe("analyzeContext", () => {
  it("groups tokens by role", () => {
    const messages: AnalyzableMessage[] = [
      { role: "user", content: [{ type: "text", text: "Hello" }] },
      { role: "assistant", content: [{ type: "text", text: "Hi there, how can I help?" }] },
      { role: "user", content: [{ type: "text", text: "Tell me a joke" }] },
    ];

    const analysis = analyzeContext(messages, 200000);

    assert.ok(analysis.breakdown.length >= 2);

    const userBreakdown = analysis.breakdown.find((b) => b.role === "user");
    const assistantBreakdown = analysis.breakdown.find((b) => b.role === "assistant");
    assert.ok(userBreakdown);
    assert.ok(assistantBreakdown);
    assert.ok(userBreakdown.tokenCount > 0);
    assert.ok(assistantBreakdown.tokenCount > 0);
  });

  it("computes total tokens correctly", () => {
    const messages: AnalyzableMessage[] = [
      { role: "user", content: "aaaa" }, // 1 token
      { role: "assistant", content: "bbbbbbbb" }, // 2 tokens
    ];

    const analysis = analyzeContext(messages, 100);
    assert.equal(analysis.totalTokens, 3); // 1 + 2
  });

  it("computes usage percentage", () => {
    const analysis = analyzeContext([], 200000, {
      user: 50000,
      assistant: 100000,
    });

    assert.equal(analysis.totalTokens, 150000);
    assert.equal(analysis.usagePercentage, 75);
  });

  it("uses pre-computed token counts when provided", () => {
    const analysis = analyzeContext([], 200000, {
      system: 5000,
      user: 10000,
      assistant: 20000,
      tool_use: 3000,
    });

    assert.equal(analysis.totalTokens, 38000);
    assert.equal(analysis.breakdown.length, 4);
  });

  it("sorts breakdown by count descending", () => {
    const analysis = analyzeContext([], 200000, {
      user: 1000,
      assistant: 5000,
      system: 3000,
    });

    assert.equal(analysis.breakdown[0].role, "assistant");
    assert.equal(analysis.breakdown[1].role, "system");
    assert.equal(analysis.breakdown[2].role, "user");
  });

  it("handles empty messages", () => {
    const analysis = analyzeContext([], 200000);
    assert.equal(analysis.totalTokens, 0);
    assert.equal(analysis.usagePercentage, 0);
    assert.equal(analysis.breakdown.length, 0);
  });
});

describe("formatAnalysis", () => {
  it("produces formatted text with header, breakdown, and total", () => {
    const analysis = analyzeContext([], 200000, {
      user: 50000,
      assistant: 100000,
      system: 10000,
    });

    const text = formatAnalysis(analysis);

    assert.ok(text.includes("Context Token Usage"), "should have header");
    assert.ok(text.includes("user"), "should contain user role");
    assert.ok(text.includes("assistant"), "should contain assistant role");
    assert.ok(text.includes("system"), "should contain system role");
    assert.ok(text.includes("Total:"), "should have total line");
    assert.ok(text.includes("200,000"), "should show model limit");
  });

  it("shows warning for high usage", () => {
    const analysis = analyzeContext([], 200000, {
      user: 160000,
    });

    const text = formatAnalysis(analysis);
    assert.ok(text.includes("WARNING") || text.includes("High context usage"));
  });

  it("shows critical warning for >90% usage", () => {
    const analysis = analyzeContext([], 200000, {
      user: 190000,
    });

    const text = formatAnalysis(analysis);
    assert.ok(text.includes("CRITICAL") || text.includes("nearly full"));
  });
});

describe("ContextAnalyzer widget", () => {
  it("creates widget with correct config", () => {
    const widget = new ContextAnalyzer({
      messages: [
        { role: "user", content: "hello" },
      ],
      modelLimit: 200000,
    });

    assert.ok(widget);
    assert.equal(widget.config.modelLimit, 200000);
    assert.equal(widget.config.messages.length, 1);
  });

  it("build() returns a Column widget", () => {
    const widget = new ContextAnalyzer({
      messages: [],
      modelLimit: 200000,
    });

    // build() requires a BuildContext; we test that it returns a Column
    const tree = widget.build({} as any);
    assert.equal(tree.constructor.name, "Column");
  });
});
