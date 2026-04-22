/**
 * @flitter/llm — ModelFallbackChain wiring tests
 *
 * Tests the integration/wiring pattern used in container.ts:
 * 1. Routing provider correctly delegates to the right backend per model
 * 2. Context overflow triggers fallback to Gemini model
 * 3. Non-retryable errors are NOT caught by the fallback chain
 * 4. Retryable errors retry same model before falling back
 * 5. Gemini primary model does NOT get a redundant Gemini fallback
 *
 * 逆向: amp-cli-reversed/modules/1063_unknown_f4R.js:33-39
 *   When totalInputTokens >= maxInputTokens, amp falls back to
 *   eP = ya("GEMINI3_FLASH_PREVIEW") (chunk-005.js:106075)
 */

import { describe, expect, it } from "bun:test";
import { ModelFallbackChain } from "./model-fallback";
import type { LLMProvider } from "./provider";
import { resolveProvider } from "./providers/registry";
import type { StreamDelta, StreamParams } from "./types";
import { ProviderError } from "./types";

// ─── Helpers ───────────────────────────────────────────────

const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

function makeDelta(text: string): StreamDelta {
  return {
    content: [{ type: "text", text, startTime: Date.now() }],
    state: "complete",
  };
}

function makeParams(): StreamParams {
  return {
    model: "will-be-overridden",
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

/**
 * Simulate the routing provider + fallback chain pattern used in container.ts.
 * The routing provider delegates to a mock that tracks which model was requested.
 */
function createTestFallbackProvider(
  primaryModel: string,
  mockStream: (params: StreamParams) => AsyncGenerator<StreamDelta>,
): LLMProvider {
  const primaryProvider = resolveProvider(primaryModel);
  const models =
    primaryProvider === "gemini" ? [primaryModel] : [primaryModel, GEMINI_FALLBACK_MODEL];

  const routingProvider: LLMProvider = {
    name: "routing" as LLMProvider["name"],
    stream: mockStream,
  };

  const chain = new ModelFallbackChain({
    models,
    provider: routingProvider,
    maxRetriesPerModel: 2,
    delay: async () => {}, // instant for tests
  });

  return {
    name: routingProvider.name,
    stream: (params) => chain.stream(params),
  };
}

// ─── Tests ─────────────────────────────────────────────────

describe("ModelFallbackChain wiring", () => {
  it("falls back to Gemini on context overflow", async () => {
    const modelsCalled: string[] = [];

    const provider = createTestFallbackProvider(
      "claude-sonnet-4-20250514",
      async function* (params) {
        modelsCalled.push(params.model);
        if (params.model === "claude-sonnet-4-20250514") {
          throw new ProviderError(
            400,
            "anthropic",
            false,
            "prompt is too long: 250000 tokens > 200000 maximum",
          );
        }
        yield makeDelta(`from:${params.model}`);
      },
    );

    const results: StreamDelta[] = [];
    for await (const d of provider.stream(makeParams())) {
      results.push(d);
    }

    expect(results.length).toBe(1);
    expect((results[0].content[0] as { text: string }).text).toBe(`from:${GEMINI_FALLBACK_MODEL}`);
    // Context overflow skips retries — only 1 primary attempt, then fallback
    expect(modelsCalled).toEqual(["claude-sonnet-4-20250514", GEMINI_FALLBACK_MODEL]);
  });

  it("does NOT fall back on non-retryable errors (throws immediately)", async () => {
    const modelsCalled: string[] = [];

    const provider = createTestFallbackProvider(
      "claude-sonnet-4-20250514",
      async function* (params) {
        modelsCalled.push(params.model);
        throw new ProviderError(401, "anthropic", false, "Unauthorized");
      },
    );

    await expect(async () => {
      for await (const _ of provider.stream(makeParams())) {
        /* consume */
      }
    }).toThrow("Unauthorized");

    // Should only try primary model once — no retries, no fallback
    expect(modelsCalled).toEqual(["claude-sonnet-4-20250514"]);
  });

  it("retries same model on retryable errors before falling back", async () => {
    const modelsCalled: string[] = [];

    const provider = createTestFallbackProvider(
      "claude-sonnet-4-20250514",
      async function* (params) {
        modelsCalled.push(params.model);
        if (params.model === "claude-sonnet-4-20250514") {
          throw new ProviderError(529, "anthropic", true, "Overloaded");
        }
        yield makeDelta(`from:${params.model}`);
      },
    );

    const results: StreamDelta[] = [];
    for await (const d of provider.stream(makeParams())) {
      results.push(d);
    }

    expect(results.length).toBe(1);
    expect((results[0].content[0] as { text: string }).text).toBe(`from:${GEMINI_FALLBACK_MODEL}`);
    // maxRetriesPerModel=2: 1 initial + 2 retries = 3 primary attempts, then 1 fallback
    expect(modelsCalled).toEqual([
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-20250514",
      GEMINI_FALLBACK_MODEL,
    ]);
  });

  it("does NOT add Gemini fallback when primary is already Gemini", async () => {
    const modelsCalled: string[] = [];

    const provider = createTestFallbackProvider("gemini-2.5-pro", async function* (params) {
      modelsCalled.push(params.model);
      throw new ProviderError(529, "anthropic", true, "Overloaded");
    });

    // Should exhaust the single model and throw
    await expect(async () => {
      for await (const _ of provider.stream(makeParams())) {
        /* consume */
      }
    }).toThrow("Overloaded");

    // Only gemini-2.5-pro attempts (1 initial + 2 retries), no fallback model
    expect(modelsCalled).toEqual(["gemini-2.5-pro", "gemini-2.5-pro", "gemini-2.5-pro"]);
  });

  it("succeeds on primary model without touching fallback", async () => {
    const modelsCalled: string[] = [];

    const provider = createTestFallbackProvider(
      "claude-sonnet-4-20250514",
      async function* (params) {
        modelsCalled.push(params.model);
        yield makeDelta(`from:${params.model}`);
      },
    );

    const results: StreamDelta[] = [];
    for await (const d of provider.stream(makeParams())) {
      results.push(d);
    }

    expect(results.length).toBe(1);
    expect((results[0].content[0] as { text: string }).text).toBe("from:claude-sonnet-4-20250514");
    expect(modelsCalled).toEqual(["claude-sonnet-4-20250514"]);
  });

  it("routing provider resolves correct provider for each model", () => {
    // Verify that resolveProvider correctly maps models to backends
    expect(resolveProvider("claude-sonnet-4-20250514")).toBe("anthropic");
    expect(resolveProvider("gemini-2.5-flash")).toBe("gemini");
    expect(resolveProvider("gemini-2.5-pro")).toBe("gemini");
    expect(resolveProvider("gpt-4o")).toBe("openai");
  });

  it("handles context overflow with 'maximum context length' message", async () => {
    const modelsCalled: string[] = [];

    const provider = createTestFallbackProvider("gpt-4o", async function* (params) {
      modelsCalled.push(params.model);
      if (params.model === "gpt-4o") {
        throw new ProviderError(
          400,
          "openai",
          false,
          "This model's maximum context length is 128000 tokens",
        );
      }
      yield makeDelta(`from:${params.model}`);
    });

    const results: StreamDelta[] = [];
    for await (const d of provider.stream(makeParams())) {
      results.push(d);
    }

    expect(results.length).toBe(1);
    expect((results[0].content[0] as { text: string }).text).toBe(`from:${GEMINI_FALLBACK_MODEL}`);
    // Context overflow skips retries
    expect(modelsCalled).toEqual(["gpt-4o", GEMINI_FALLBACK_MODEL]);
  });
});
