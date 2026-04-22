/**
 * StatusBar token limit — resolveModel coverage.
 *
 * Validates that resolveModel() handles both direct and "provider/model" format,
 * ensuring the status bar token display works for all model name formats.
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveModel } from "@flitter/llm";

describe("StatusBar token limit — resolveModel coverage", () => {
  it("resolves direct model ID", () => {
    const info = resolveModel("claude-sonnet-4-6");
    assert.ok(info, "should find claude-sonnet-4-6");
    assert.equal(info.contextWindow, 1_000_000);
  });

  it("resolves provider/model format", () => {
    const info = resolveModel("anthropic/claude-sonnet-4-6");
    assert.ok(info, "should resolve provider/model format");
    assert.equal(info.contextWindow, 1_000_000);
  });

  it("returns undefined for unknown model", () => {
    const info = resolveModel("unknown-model-xyz");
    assert.equal(info, undefined);
  });
});
