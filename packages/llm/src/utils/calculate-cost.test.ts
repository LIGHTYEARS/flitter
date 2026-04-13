/**
 * calculateCost — unit tests
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCost } from "./calculate-cost";

describe("calculateCost", () => {
  it("should calculate cost for claude-sonnet-4", () => {
    // cost: { input: 3, output: 15 } per 1M tokens
    const cost = calculateCost("claude-sonnet-4-20250514", 1_000_000, 1_000_000);
    assert.equal(cost, 3 + 15);
  });

  it("should calculate cost for small token counts", () => {
    // 1000 input tokens, 500 output tokens for gpt-4o (input: 2.5, output: 10)
    const cost = calculateCost("gpt-4o", 1000, 500);
    const expected = (1000 / 1_000_000) * 2.5 + (500 / 1_000_000) * 10;
    assert.equal(cost, expected);
  });

  it("should return 0 for unknown model", () => {
    assert.equal(calculateCost("nonexistent-model", 100, 100), 0);
  });

  it("should return 0 for model without cost data", () => {
    // grok-code-fast-1 has no cost field
    assert.equal(calculateCost("grok-code-fast-1", 100, 100), 0);
  });

  it("should handle zero tokens", () => {
    assert.equal(calculateCost("claude-sonnet-4-20250514", 0, 0), 0);
  });

  it("should calculate cost for haiku (cheap model)", () => {
    // cost: { input: 0.8, output: 4 }
    const cost = calculateCost("claude-3-5-haiku-20241022", 500_000, 200_000);
    const expected = (500_000 / 1_000_000) * 0.8 + (200_000 / 1_000_000) * 4;
    assert.equal(cost, expected);
  });

  it("should calculate cost for gemini-2.5-flash (very cheap)", () => {
    // cost: { input: 0.15, output: 0.6 }
    const cost = calculateCost("gemini-2.5-flash", 1_000_000, 1_000_000);
    assert.equal(cost, 0.15 + 0.6);
  });

  it("should calculate cost for opus (expensive model)", () => {
    // cost: { input: 15, output: 75 }
    const cost = calculateCost("claude-opus-4-20250515", 100_000, 32_000);
    const expected = (100_000 / 1_000_000) * 15 + (32_000 / 1_000_000) * 75;
    assert.equal(cost, expected);
  });
});
