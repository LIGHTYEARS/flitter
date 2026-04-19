/**
 * model-fallback.test.ts — ModelFallbackChain unit tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOverloadedError,
  ModelFallbackChain,
} from "./model-fallback.js";
import type { LLMProvider } from "./provider";
import type { StreamDelta, StreamParams } from "./types";
import { ProviderError } from "./types";

// ─── Helper: create a mock provider ──────────────────────

function createMockProvider(
  name: string,
  behavior: "success" | "overloaded" | "auth-error" = "success",
): LLMProvider {
  return {
    name,
    async *stream(_params: StreamParams): AsyncGenerator<StreamDelta> {
      if (behavior === "overloaded") {
        throw new ProviderError(529, name, true, "Model is overloaded");
      }
      if (behavior === "auth-error") {
        throw new ProviderError(401, name, false, "Unauthorized");
      }
      yield {
        content: [{ type: "text", text: `response from ${name}`, startTime: Date.now() }],
        state: "complete",
      } as unknown as StreamDelta;
    },
  };
}

function createStreamParams(model: string): StreamParams {
  return {
    model,
    messages: [],
    systemPrompt: [],
    tools: [],
    config: {
      settings: {},
      secrets: { getToken: async () => "test-key" },
    } as unknown as StreamParams["config"],
    signal: new AbortController().signal,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("ModelFallbackChain", () => {
  describe("resolveModel", () => {
    it("returns candidates list for configured chain", () => {
      const chain = new ModelFallbackChain({
        chains: {
          "claude-opus-4-6": {
            primary: "claude-opus-4-20250515",
            fallbacks: ["claude-sonnet-4-20250514"],
          },
        },
      });

      const result = chain.resolveModel("claude-opus-4-6");
      assert.equal(result.requested, "claude-opus-4-6");
      assert.deepEqual(result.candidates, [
        "claude-opus-4-20250515",
        "claude-sonnet-4-20250514",
      ]);
    });

    it("returns single-element array for unconfigured model", () => {
      const chain = new ModelFallbackChain({ chains: {} });
      const result = chain.resolveModel("gpt-4o");
      assert.equal(result.requested, "gpt-4o");
      assert.deepEqual(result.candidates, ["gpt-4o"]);
    });

    it("handles chain with multiple fallbacks", () => {
      const chain = new ModelFallbackChain({
        chains: {
          "opus": {
            primary: "claude-opus-4-20250515",
            fallbacks: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
          },
        },
      });

      const result = chain.resolveModel("opus");
      assert.equal(result.candidates.length, 3);
      assert.equal(result.candidates[0], "claude-opus-4-20250515");
      assert.equal(result.candidates[2], "claude-3-5-haiku-20241022");
    });

    it("handles chain with empty fallbacks", () => {
      const chain = new ModelFallbackChain({
        chains: {
          "solo": { primary: "gpt-4o", fallbacks: [] },
        },
      });

      const result = chain.resolveModel("solo");
      assert.deepEqual(result.candidates, ["gpt-4o"]);
    });
  });

  describe("streamWithFallback", () => {
    it("uses primary model when it succeeds", async () => {
      const chain = new ModelFallbackChain({
        chains: {
          "test-model": {
            primary: "model-a",
            fallbacks: ["model-b"],
          },
        },
      });

      const providers: Record<string, LLMProvider> = {
        "model-a": createMockProvider("model-a", "success"),
        "model-b": createMockProvider("model-b", "success"),
      };

      const params = createStreamParams("test-model");
      const deltas: StreamDelta[] = [];

      for await (const delta of chain.streamWithFallback(params, (m) => providers[m])) {
        deltas.push(delta);
      }

      assert.equal(deltas.length, 1);
      assert.ok(
        (deltas[0].content[0] as { text: string }).text.includes("model-a"),
        "Should use primary model",
      );
    });

    it("falls back when primary is overloaded", async () => {
      const chain = new ModelFallbackChain({
        chains: {
          "test-model": {
            primary: "model-a",
            fallbacks: ["model-b"],
          },
        },
      });

      const providers: Record<string, LLMProvider> = {
        "model-a": createMockProvider("model-a", "overloaded"),
        "model-b": createMockProvider("model-b", "success"),
      };

      const params = createStreamParams("test-model");
      const deltas: StreamDelta[] = [];

      for await (const delta of chain.streamWithFallback(params, (m) => providers[m])) {
        deltas.push(delta);
      }

      assert.equal(deltas.length, 1);
      assert.ok(
        (deltas[0].content[0] as { text: string }).text.includes("model-b"),
        "Should fall back to model-b",
      );
    });

    it("throws non-overload errors immediately (no fallback)", async () => {
      const chain = new ModelFallbackChain({
        chains: {
          "test-model": {
            primary: "model-a",
            fallbacks: ["model-b"],
          },
        },
      });

      const providers: Record<string, LLMProvider> = {
        "model-a": createMockProvider("model-a", "auth-error"),
        "model-b": createMockProvider("model-b", "success"),
      };

      const params = createStreamParams("test-model");

      await assert.rejects(
        async () => {
          for await (const _delta of chain.streamWithFallback(params, (m) => providers[m])) {
            // consume
          }
        },
        (err: unknown) => {
          assert.ok(err instanceof ProviderError);
          assert.equal(err.status, 401);
          return true;
        },
      );
    });

    it("throws last error when all candidates are overloaded", async () => {
      const chain = new ModelFallbackChain({
        chains: {
          "test-model": {
            primary: "model-a",
            fallbacks: ["model-b"],
          },
        },
      });

      const providers: Record<string, LLMProvider> = {
        "model-a": createMockProvider("model-a", "overloaded"),
        "model-b": createMockProvider("model-b", "overloaded"),
      };

      const params = createStreamParams("test-model");

      await assert.rejects(
        async () => {
          for await (const _delta of chain.streamWithFallback(params, (m) => providers[m])) {
            // consume
          }
        },
        (err: unknown) => {
          assert.ok(err instanceof ProviderError);
          assert.equal(err.status, 529);
          return true;
        },
      );
    });

    it("works with unconfigured model (passthrough)", async () => {
      const chain = new ModelFallbackChain({ chains: {} });

      const providers: Record<string, LLMProvider> = {
        "gpt-4o": createMockProvider("gpt-4o", "success"),
      };

      const params = createStreamParams("gpt-4o");
      const deltas: StreamDelta[] = [];

      for await (const delta of chain.streamWithFallback(params, (m) => providers[m])) {
        deltas.push(delta);
      }

      assert.equal(deltas.length, 1);
    });
  });
});

describe("isOverloadedError", () => {
  it("returns true for ProviderError with status 529", () => {
    assert.ok(isOverloadedError(new ProviderError(529, "anthropic", true, "overloaded")));
  });

  it("returns true for ProviderError with status 503", () => {
    assert.ok(isOverloadedError(new ProviderError(503, "anthropic", true, "unavailable")));
  });

  it("returns true for ProviderError with status 429", () => {
    assert.ok(isOverloadedError(new ProviderError(429, "anthropic", true, "rate limited")));
  });

  it("returns false for ProviderError with status 401", () => {
    assert.ok(!isOverloadedError(new ProviderError(401, "anthropic", false, "unauthorized")));
  });

  it("returns true for Error with 'overloaded' in message", () => {
    assert.ok(isOverloadedError(new Error("Model is overloaded")));
  });

  it("returns true for Error with 'resource_exhausted' in message", () => {
    assert.ok(isOverloadedError(new Error("resource_exhausted")));
  });

  it("returns true for Error with 'rate limit' in message", () => {
    assert.ok(isOverloadedError(new Error("Rate limit exceeded")));
  });

  it("returns false for regular Error", () => {
    assert.ok(!isOverloadedError(new Error("Something else")));
  });

  it("returns false for non-Error", () => {
    assert.ok(!isOverloadedError("string error"));
    assert.ok(!isOverloadedError(null));
    assert.ok(!isOverloadedError(undefined));
  });
});
