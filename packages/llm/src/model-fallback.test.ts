/**
 * @flitter/llm — ModelFallbackChain tests
 *
 * Tests: error classification, backoff calculation, retry logic, model fallback
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StreamDelta, StreamParams } from "./types";
import { ProviderError } from "./types";
import {
  calculateBackoffMs,
  isContextOverflowError,
  isInvalidModelOutput,
  isNetworkError,
  isOverloaded,
  isResponseIncomplete,
  isRetryableError,
  isStreamStalled,
  ModelFallbackChain,
  shouldRetryStatus,
} from "./model-fallback";
import type { LLMProvider } from "./provider";

// ─── Error Classification ────────────────────────────────

describe("isOverloaded", () => {
  it("should detect 529 overloaded status", () => {
    const err = new ProviderError(529, "anthropic", true, "Overloaded");
    assert.equal(isOverloaded(err), true);
  });

  it("should detect overloaded keyword in message", () => {
    const err = new ProviderError(529, "anthropic", true, "The server is overloaded right now");
    assert.equal(isOverloaded(err), true);
  });

  it("should detect overload keyword in message", () => {
    const err = new ProviderError(503, "anthropic", true, "Service overload detected");
    assert.equal(isOverloaded(err), true);
  });

  it("should not match unrelated errors", () => {
    const err = new ProviderError(400, "anthropic", false, "Invalid request");
    assert.equal(isOverloaded(err), false);
  });
});

describe("isNetworkError", () => {
  it("should detect fetch failed", () => {
    assert.equal(isNetworkError(new Error("fetch failed")), true);
  });

  it("should detect ECONNREFUSED", () => {
    assert.equal(isNetworkError(new Error("connect ECONNREFUSED 127.0.0.1:443")), true);
  });

  it("should detect ETIMEDOUT", () => {
    assert.equal(isNetworkError(new Error("ETIMEDOUT")), true);
  });

  it("should detect DNS lookup failed", () => {
    assert.equal(isNetworkError(new Error("dns lookup failed")), true);
  });

  it("should detect socket hang up", () => {
    assert.equal(isNetworkError(new Error("socket hang up")), true);
  });

  it("should not match non-Error values", () => {
    assert.equal(isNetworkError("string error"), false);
    assert.equal(isNetworkError(null), false);
  });

  it("should not match unrelated errors", () => {
    assert.equal(isNetworkError(new Error("Invalid JSON")), false);
  });
});

describe("isStreamStalled", () => {
  it("should detect stream stalled", () => {
    const err = new ProviderError(408, "anthropic", true, "Stream stalled");
    assert.equal(isStreamStalled(err), true);
  });

  it("should detect no data received", () => {
    const err = new ProviderError(408, "anthropic", true, "No data received for 30s");
    assert.equal(isStreamStalled(err), true);
  });

  it("should not match unrelated messages", () => {
    const err = new ProviderError(400, "anthropic", false, "Bad request");
    assert.equal(isStreamStalled(err), false);
  });
});

describe("isResponseIncomplete", () => {
  it("should detect response incomplete", () => {
    const err = new ProviderError(500, "anthropic", true, "Response incomplete");
    assert.equal(isResponseIncomplete(err), true);
  });

  it("should detect stream ended unexpectedly", () => {
    const err = new ProviderError(500, "anthropic", true, "Stream ended unexpectedly");
    assert.equal(isResponseIncomplete(err), true);
  });

  it("should detect stream closed before", () => {
    const err = new ProviderError(500, "anthropic", true, "Stream closed before completion");
    assert.equal(isResponseIncomplete(err), true);
  });
});

describe("isInvalidModelOutput", () => {
  it("should detect InvalidModelOutputError by message prefix", () => {
    const err = new ProviderError(400, "anthropic", false, "InvalidModelOutputError: unexpected token");
    assert.equal(isInvalidModelOutput(err), true);
  });

  it("should detect bare InvalidModelOutputError message", () => {
    const err = new ProviderError(400, "anthropic", false, "InvalidModelOutputError");
    assert.equal(isInvalidModelOutput(err), true);
  });

  it("should not match message that merely contains InvalidModelOutputError", () => {
    const err = new ProviderError(400, "anthropic", false, "Caused by InvalidModelOutputError");
    assert.equal(isInvalidModelOutput(err), false);
  });

  it("should not match unrelated error messages", () => {
    const err = new ProviderError(400, "anthropic", false, "Bad request");
    assert.equal(isInvalidModelOutput(err), false);
  });
});

describe("isRetryableError", () => {
  it("should retry InvalidModelOutputError", () => {
    const err = new ProviderError(400, "anthropic", false, "InvalidModelOutputError: unexpected token");
    assert.equal(isRetryableError(err), true);
  });

  it("should NOT retry successful ProviderError with status 200", () => {
    const err = new ProviderError(200, "anthropic", false, "Success");
    assert.equal(isRetryableError(err), false);
  });

  it("should retry 429 rate limit", () => {
    const err = new ProviderError(429, "anthropic", true, "Rate limited");
    assert.equal(isRetryableError(err), true);
  });

  it("should retry 503 service unavailable", () => {
    const err = new ProviderError(503, "anthropic", true, "Service unavailable");
    assert.equal(isRetryableError(err), true);
  });

  it("should retry 529 overloaded", () => {
    const err = new ProviderError(529, "anthropic", true, "Overloaded");
    assert.equal(isRetryableError(err), true);
  });

  it("should retry 500 server error", () => {
    const err = new ProviderError(500, "anthropic", true, "Internal server error");
    assert.equal(isRetryableError(err), true);
  });

  it("should retry 502 bad gateway", () => {
    const err = new ProviderError(502, "openai", true, "Bad gateway");
    assert.equal(isRetryableError(err), true);
  });

  it("should retry network errors", () => {
    assert.equal(isRetryableError(new Error("fetch failed")), true);
    assert.equal(isRetryableError(new Error("ECONNRESET")), true);
  });

  it("should NOT retry 400 bad request", () => {
    const err = new ProviderError(400, "anthropic", false, "Invalid request");
    assert.equal(isRetryableError(err), false);
  });

  it("should NOT retry 401 unauthorized", () => {
    const err = new ProviderError(401, "anthropic", false, "Unauthorized");
    assert.equal(isRetryableError(err), false);
  });

  it("should NOT retry 403 forbidden", () => {
    const err = new ProviderError(403, "anthropic", false, "Forbidden");
    assert.equal(isRetryableError(err), false);
  });

  it("should NOT retry 404 not found", () => {
    const err = new ProviderError(404, "anthropic", false, "Model not found");
    assert.equal(isRetryableError(err), false);
  });

  it("should respect retryable flag even for 4xx", () => {
    // A 422 that the provider marks as retryable
    const err = new ProviderError(422, "anthropic", true, "Temporary issue");
    assert.equal(isRetryableError(err), true);
  });
});

// ─── isContextOverflowError ─────────────────────────────

describe("isContextOverflowError", () => {
  it("should detect prompt too long error", () => {
    const err = new ProviderError(400, "anthropic", false, "prompt is too long: 250000 tokens > 200000 maximum");
    assert.equal(isContextOverflowError(err), true);
  });

  it("should detect context length exceeded", () => {
    const err = new ProviderError(400, "openai", false, "maximum context length exceeded");
    assert.equal(isContextOverflowError(err), true);
  });

  it("should NOT match unrelated 400 errors", () => {
    const err = new ProviderError(400, "anthropic", false, "Invalid request");
    assert.equal(isContextOverflowError(err), false);
  });

  it("should NOT match non-ProviderError", () => {
    assert.equal(isContextOverflowError(new Error("prompt is too long")), false);
  });
});

// ─── shouldRetryStatus ───────────────────────────────────

describe("shouldRetryStatus", () => {
  it("should respect x-should-retry header true", () => {
    assert.equal(shouldRetryStatus(400, "true"), true);
  });

  it("should respect x-should-retry header false", () => {
    assert.equal(shouldRetryStatus(500, "false"), false);
  });

  it("should retry 408 timeout", () => {
    assert.equal(shouldRetryStatus(408), true);
  });

  it("should retry 409 conflict", () => {
    assert.equal(shouldRetryStatus(409), true);
  });

  it("should retry 429 rate limit", () => {
    assert.equal(shouldRetryStatus(429), true);
  });

  it("should retry 500+", () => {
    assert.equal(shouldRetryStatus(500), true);
    assert.equal(shouldRetryStatus(502), true);
    assert.equal(shouldRetryStatus(503), true);
    assert.equal(shouldRetryStatus(529), true);
  });

  it("should NOT retry 400", () => {
    assert.equal(shouldRetryStatus(400), false);
  });

  it("should NOT retry 401", () => {
    assert.equal(shouldRetryStatus(401), false);
  });
});

// ─── Backoff Calculation ─────────────────────────────────

describe("calculateBackoffMs", () => {
  it("should use retryAfterMs if within sane range", () => {
    const ms = calculateBackoffMs(1, 2, 3000);
    assert.equal(ms, 3000);
  });

  it("should ignore retryAfterMs >= 60s", () => {
    const ms = calculateBackoffMs(1, 2, 60_000);
    // Should fall through to exponential backoff
    assert.ok(ms > 0 && ms < 60_000);
  });

  it("should ignore negative retryAfterMs", () => {
    const ms = calculateBackoffMs(1, 2, -1000);
    assert.ok(ms > 0);
  });

  it("should produce increasing delays for successive attempts", () => {
    // attempt 0 → base 0.5s, attempt 1 → base 1s, attempt 2 → base 2s
    // With jitter 0.75-1.0, these should be distinguishable on average
    const delays: number[] = [];
    for (let i = 3; i >= 0; i--) {
      // Collect multiple samples to average out jitter
      let sum = 0;
      for (let j = 0; j < 100; j++) {
        sum += calculateBackoffMs(i, 3);
      }
      delays.push(sum / 100);
    }
    // Each successive attempt should have higher average delay
    for (let i = 1; i < delays.length; i++) {
      assert.ok(delays[i] >= delays[i - 1] * 0.5, `delay[${i}] should be >= delay[${i - 1}]*0.5`);
    }
  });

  it("should cap at 8 seconds base", () => {
    // Even with many attempts, base should not exceed 8s
    const ms = calculateBackoffMs(0, 10);
    assert.ok(ms <= 8000);
  });
});

// ─── ModelFallbackChain ──────────────────────────────────

describe("ModelFallbackChain", () => {
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

  it("should yield deltas from primary model on success", async () => {
    const provider: LLMProvider = {
      name: "test",
      async *stream(params) {
        yield makeDelta(`from:${params.model}`);
      },
    };

    const chain = new ModelFallbackChain({
      models: ["primary", "fallback"],
      provider,
      delay: async () => {},
    });

    const results: StreamDelta[] = [];
    for await (const d of chain.stream(makeParams())) {
      results.push(d);
    }

    assert.equal(results.length, 1);
    assert.equal((results[0].content[0] as { type: "text"; text: string }).text, "from:primary");
  });

  it("should fallback to next model on retryable error after retries exhausted", async () => {
    let callCount = 0;
    const provider: LLMProvider = {
      name: "test",
      async *stream(params) {
        callCount++;
        if (params.model === "primary") {
          throw new ProviderError(529, "anthropic", true, "Overloaded");
        }
        yield makeDelta(`from:${params.model}`);
      },
    };

    const chain = new ModelFallbackChain({
      models: ["primary", "fallback"],
      provider,
      maxRetriesPerModel: 1,
      delay: async () => {},
    });

    const results: StreamDelta[] = [];
    for await (const d of chain.stream(makeParams())) {
      results.push(d);
    }

    assert.equal(results.length, 1);
    assert.equal((results[0].content[0] as { type: "text"; text: string }).text, "from:fallback");
    // primary called 1 (initial) + 1 (retry) = 2 times, then fallback once
    assert.equal(callCount, 3);
  });

  it("should throw immediately on non-retryable error", async () => {
    const provider: LLMProvider = {
      name: "test",
      async *stream() {
        throw new ProviderError(401, "anthropic", false, "Unauthorized");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["primary", "fallback"],
      provider,
      delay: async () => {},
    });

    await assert.rejects(
      async () => {
        for await (const _ of chain.stream(makeParams())) {
          /* consume */
        }
      },
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.status, 401);
        return true;
      },
    );
  });

  it("should retry 429 rate limit with fallback", async () => {
    let attempts = 0;
    const provider: LLMProvider = {
      name: "test",
      async *stream(params) {
        attempts++;
        if (params.model === "model-a") {
          throw new ProviderError(429, "anthropic", true, "Rate limited", 100);
        }
        yield makeDelta("ok");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["model-a", "model-b"],
      provider,
      maxRetriesPerModel: 0,
      delay: async () => {},
    });

    const results: StreamDelta[] = [];
    for await (const d of chain.stream(makeParams())) {
      results.push(d);
    }

    assert.equal(results.length, 1);
    // model-a called once (no retries since maxRetriesPerModel=0), model-b once
    assert.equal(attempts, 2);
  });

  it("should retry 503 service unavailable", async () => {
    let attempts = 0;
    const provider: LLMProvider = {
      name: "test",
      async *stream() {
        attempts++;
        if (attempts <= 2) {
          throw new ProviderError(503, "gemini", true, "Service unavailable");
        }
        yield makeDelta("recovered");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["model"],
      provider,
      maxRetriesPerModel: 2,
      delay: async () => {},
    });

    const results: StreamDelta[] = [];
    for await (const d of chain.stream(makeParams())) {
      results.push(d);
    }

    assert.equal(results.length, 1);
    assert.equal(attempts, 3); // 2 failures + 1 success
  });

  it("should throw last error when all models exhausted", async () => {
    const provider: LLMProvider = {
      name: "test",
      async *stream() {
        throw new ProviderError(529, "anthropic", true, "Overloaded");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["model-a", "model-b"],
      provider,
      maxRetriesPerModel: 0,
      delay: async () => {},
    });

    await assert.rejects(
      async () => {
        for await (const _ of chain.stream(makeParams())) {
          /* consume */
        }
      },
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.status, 529);
        return true;
      },
    );
  });

  it("should handle network errors as retryable", async () => {
    let attempts = 0;
    const provider: LLMProvider = {
      name: "test",
      async *stream(params) {
        attempts++;
        if (params.model === "primary") {
          throw new Error("fetch failed");
        }
        yield makeDelta("from-fallback");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["primary", "fallback"],
      provider,
      maxRetriesPerModel: 0,
      delay: async () => {},
    });

    const results: StreamDelta[] = [];
    for await (const d of chain.stream(makeParams())) {
      results.push(d);
    }

    assert.equal(results.length, 1);
    assert.equal(attempts, 2);
  });

  it("should call delay between retries", async () => {
    const delays: number[] = [];
    let callCount = 0;

    const provider: LLMProvider = {
      name: "test",
      async *stream() {
        callCount++;
        if (callCount <= 2) {
          throw new ProviderError(500, "anthropic", true, "Server error");
        }
        yield makeDelta("ok");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["model"],
      provider,
      maxRetriesPerModel: 2,
      delay: async (ms) => {
        delays.push(ms);
      },
    });

    for await (const _ of chain.stream(makeParams())) {
      /* consume */
    }

    assert.equal(delays.length, 2);
    assert.ok(delays.every((d) => d > 0));
  });
});

// ─── ModelFallbackChain — context overflow fallback ─────

describe("ModelFallbackChain — context overflow fallback", () => {
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

  it("should skip to fallback model on context overflow without retrying", async () => {
    let callCount = 0;
    const provider: LLMProvider = {
      name: "test",
      async *stream(params) {
        callCount++;
        if (params.model === "claude-sonnet-4-20250514") {
          throw new ProviderError(400, "anthropic", false, "prompt is too long: 250000 tokens > 200000 maximum");
        }
        yield makeDelta(`from:${params.model}`);
      },
    };

    const chain = new ModelFallbackChain({
      models: ["claude-sonnet-4-20250514", "gemini-3-flash-preview"],
      provider,
      maxRetriesPerModel: 2,
      delay: async () => {},
    });

    const results: StreamDelta[] = [];
    for await (const d of chain.stream(makeParams())) {
      results.push(d);
    }

    assert.equal(results.length, 1);
    assert.equal((results[0].content[0] as { type: "text"; text: string }).text, "from:gemini-3-flash-preview");
    // 1 primary fail + 1 fallback success (no retries on overflow)
    assert.equal(callCount, 2);
  });

  it("should throw if context overflow hits all models", async () => {
    const provider: LLMProvider = {
      name: "test",
      async *stream() {
        throw new ProviderError(400, "anthropic", false, "prompt is too long");
      },
    };

    const chain = new ModelFallbackChain({
      models: ["model-a", "model-b"],
      provider,
      maxRetriesPerModel: 2,
      delay: async () => {},
    });

    await assert.rejects(async () => {
      for await (const _ of chain.stream(makeParams())) {
        /* consume */
      }
    });
  });
});
