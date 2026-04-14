/**
 * @flitter/llm — Provider Registry 测试
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MODEL_REGISTRY, ProviderError } from "../types";
import { createProvider, getProviderForModel, resolveModel, resolveProvider } from "./registry";

// ─── createProvider 测试 ─────────────────────────────────

describe("createProvider", () => {
  it("should create AnthropicProvider with name='anthropic'", () => {
    const provider = createProvider("anthropic");
    assert.equal(provider.name, "anthropic");
  });

  it("should create OpenAIProvider with name='openai'", () => {
    const provider = createProvider("openai");
    assert.equal(provider.name, "openai");
  });

  it("should create GeminiProvider with name='gemini'", () => {
    const provider = createProvider("gemini");
    assert.equal(provider.name, "gemini");
  });

  it("should create OpenAICompatProvider with name='xai'", () => {
    const provider = createProvider("xai");
    assert.equal(provider.name, "xai");
  });

  it("should throw ProviderError for unknown provider", () => {
    assert.throws(
      () => createProvider("unknown" as never),
      (err: unknown) => err instanceof ProviderError && err.status === 404,
    );
  });

  it("should return same instance (singleton cache)", () => {
    const a = createProvider("anthropic");
    const b = createProvider("anthropic");
    assert.strictEqual(a, b);
  });
});

// ─── resolveModel 测试 ──────────────────────────────────

describe("resolveModel", () => {
  it("should resolve Anthropic model by direct ID", () => {
    const info = resolveModel("claude-sonnet-4-20250514");
    assert.ok(info);
    assert.equal(info.id, "claude-sonnet-4-20250514");
    assert.equal(info.provider, "anthropic");
  });

  it("should resolve OpenAI model by direct ID", () => {
    const info = resolveModel("gpt-4o");
    assert.ok(info);
    assert.equal(info.id, "gpt-4o");
    assert.equal(info.provider, "openai");
  });

  it("should resolve Gemini model by direct ID", () => {
    const info = resolveModel("gemini-2.5-pro");
    assert.ok(info);
    assert.equal(info.id, "gemini-2.5-pro");
    assert.equal(info.provider, "gemini");
  });

  it("should resolve xAI model by direct ID (openai-compat)", () => {
    const info = resolveModel("grok-3");
    assert.ok(info);
    assert.equal(info.id, "grok-3");
    assert.equal(info.provider, "openai-compat");
  });

  it("should return undefined for nonexistent model", () => {
    const info = resolveModel("nonexistent-model");
    assert.equal(info, undefined);
  });

  it("should resolve 'provider/model' format", () => {
    const info = resolveModel("anthropic/claude-sonnet-4-20250514");
    assert.ok(info);
    assert.equal(info.id, "claude-sonnet-4-20250514");
    assert.equal(info.provider, "anthropic");
  });

  it("should return undefined for 'provider/unknown-model' format", () => {
    const info = resolveModel("anthropic/unknown-model");
    assert.equal(info, undefined);
  });
});

// ─── resolveProvider 测试 ────────────────────────────────

describe("resolveProvider", () => {
  it("should resolve from MODEL_REGISTRY (Anthropic)", () => {
    assert.equal(resolveProvider("claude-sonnet-4-20250514"), "anthropic");
  });

  it("should resolve from MODEL_REGISTRY (OpenAI)", () => {
    assert.equal(resolveProvider("gpt-4o"), "openai");
  });

  it("should resolve from MODEL_REGISTRY (Gemini)", () => {
    assert.equal(resolveProvider("gemini-2.5-pro"), "gemini");
  });

  it("should resolve from MODEL_REGISTRY (xAI → openai-compat)", () => {
    assert.equal(resolveProvider("grok-3"), "openai-compat");
  });

  it("should fallback to prefix: claude-* → anthropic", () => {
    assert.equal(resolveProvider("claude-unknown-model"), "anthropic");
  });

  it("should fallback to prefix: gpt-* → openai", () => {
    assert.equal(resolveProvider("gpt-future"), "openai");
  });

  it("should fallback to prefix: o3* → openai", () => {
    assert.equal(resolveProvider("o3-turbo"), "openai");
  });

  it("should fallback to prefix: o4* → openai", () => {
    assert.equal(resolveProvider("o4-future"), "openai");
  });

  it("should fallback to prefix: codex-* → openai", () => {
    assert.equal(resolveProvider("codex-future"), "openai");
  });

  it("should fallback to prefix: gemini-* → gemini", () => {
    assert.equal(resolveProvider("gemini-future"), "gemini");
  });

  it("should fallback to prefix: grok-* → xai", () => {
    assert.equal(resolveProvider("grok-future"), "xai");
  });

  it("should resolve 'anthropic/claude-custom' → anthropic", () => {
    assert.equal(resolveProvider("anthropic/claude-custom"), "anthropic");
  });

  it("should resolve 'openai/gpt-custom' → openai", () => {
    assert.equal(resolveProvider("openai/gpt-custom"), "openai");
  });

  it("should resolve 'vertexai/gemini-custom' → gemini", () => {
    assert.equal(resolveProvider("vertexai/gemini-custom"), "gemini");
  });

  it("should resolve 'xai/grok-custom' → xai", () => {
    assert.equal(resolveProvider("xai/grok-custom"), "xai");
  });

  it("should throw ProviderError for totally unknown model", () => {
    assert.throws(
      () => resolveProvider("totally-unknown"),
      (err: unknown) => err instanceof ProviderError && err.status === 404,
    );
  });
});

// ─── getProviderForModel 测试 ────────────────────────────

describe("getProviderForModel", () => {
  it("should return AnthropicProvider for claude model", () => {
    const provider = getProviderForModel("claude-sonnet-4-20250514");
    assert.equal(provider.name, "anthropic");
  });

  it("should return OpenAIProvider for gpt model", () => {
    const provider = getProviderForModel("gpt-4o");
    assert.equal(provider.name, "openai");
  });

  it("should return GeminiProvider for gemini model", () => {
    const provider = getProviderForModel("gemini-2.5-pro");
    assert.equal(provider.name, "gemini");
  });

  it("should return provider for grok model (openai-compat)", () => {
    const provider = getProviderForModel("grok-3");
    assert.equal(provider.name, "openai-compat"); // OpenAICompatProvider via MODEL_REGISTRY
  });

  it("should throw ProviderError for unknown model", () => {
    assert.throws(
      () => getProviderForModel("unknown-model"),
      (err: unknown) => err instanceof ProviderError,
    );
  });
});

// ─── ModelInfo 内容验证 ──────────────────────────────────

describe("MODEL_REGISTRY content validation", () => {
  it("Anthropic models should support thinking", () => {
    const model = MODEL_REGISTRY["claude-sonnet-4-20250514"];
    assert.ok(model);
    assert.equal(model.supportsThinking, true);
    assert.equal(model.supportsCacheControl, true);
  });

  it("OpenAI o3 should support thinking, gpt-4o should not", () => {
    const o3 = MODEL_REGISTRY.o3;
    const gpt4o = MODEL_REGISTRY["gpt-4o"];
    assert.ok(o3);
    assert.ok(gpt4o);
    assert.equal(o3.supportsThinking, true);
    assert.equal(gpt4o.supportsThinking, false);
  });

  it("xAI grok-code-fast-1 should have contextWindow=256000", () => {
    const model = MODEL_REGISTRY["grok-code-fast-1"];
    assert.ok(model);
    assert.equal(model.contextWindow, 256_000);
    assert.equal(model.maxOutputTokens, 32_000);
  });

  it("Gemini models should have large context windows", () => {
    const model = MODEL_REGISTRY["gemini-2.5-pro"];
    assert.ok(model);
    assert.equal(model.contextWindow, 1_048_576);
  });
});
