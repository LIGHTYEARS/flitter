/**
 * @flitter/llm — 跨 Provider 集成测试
 *
 * 使用 SDK mock clients + constructor injection 进行端到端测试。
 * 验证所有 4 个 Provider 的完整 stream() → StreamDelta 管线。
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as fixtures from "../testing/fixtures";

// Transformers for direct testing
import { AnthropicTransformer, AnthropicToolTransformer } from "./anthropic/transformer";
import { OpenAITransformer, OpenAIToolTransformer } from "./openai/transformer";
import { GeminiTransformer, GeminiToolTransformer } from "./gemini/transformer";
import { CompatTransformer, CompatToolTransformer } from "./openai-compat/transformer";

// Providers
import { AnthropicProvider } from "./anthropic/provider";
import { OpenAIProvider } from "./openai/provider";
import { GeminiProvider } from "./gemini/provider";
import { OpenAICompatProvider } from "./openai-compat/provider";

import { createProvider, getProviderForModel, resolveProvider } from "./registry";
import type { StreamDelta } from "../types";
import type { Message } from "@flitter/schemas";
import type { CompatStreamChunk } from "./openai-compat/transformer";
import { mergeWithDefaults } from "./openai-compat/compat";

// ─── Mock SDK Client Factories ─────────────────────────

/** Create an async iterable from an array of events */
function asyncIter<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < items.length) return { value: items[i++], done: false };
          return { value: undefined as unknown as T, done: true };
        },
      };
    },
  };
}

/**
 * Mock Anthropic SDK client.
 * `client.messages.stream()` returns an async iterable of events.
 */
function mockAnthropicClient(events: fixtures.AnthropicStreamEvent[]): unknown {
  return {
    messages: {
      stream(_body: unknown, _opts?: unknown) {
        return asyncIter(events);
      },
    },
  };
}

/**
 * Mock OpenAI SDK client.
 * `client.responses.create()` returns a promise of an async iterable of events.
 */
function mockOpenAIClient(events: fixtures.OpenAIStreamEvent[]): unknown {
  return {
    responses: {
      async create(_body: unknown) {
        return asyncIter(events);
      },
    },
  };
}

/**
 * Mock Gemini SDK client.
 * `client.models.generateContentStream()` returns a promise of an async iterable of chunks.
 */
function mockGeminiClient(chunks: fixtures.GeminiStreamChunk[]): unknown {
  return {
    models: {
      async generateContentStream(_opts: unknown) {
        return asyncIter(chunks);
      },
    },
  };
}

/**
 * Mock OpenAI SDK client for ChatCompletion (openai-compat).
 * `client.chat.completions.create()` returns a promise of an async iterable of chunks.
 */
function mockCompatClient(chunks: CompatStreamChunk[]): unknown {
  return {
    chat: {
      completions: {
        async create(_body: unknown) {
          return asyncIter(chunks);
        },
      },
    },
  };
}

// ─── Helper: collect all deltas from a provider ────────

async function collectDeltas(gen: AsyncGenerator<StreamDelta>): Promise<StreamDelta[]> {
  const deltas: StreamDelta[] = [];
  for await (const d of gen) {
    deltas.push(d);
  }
  return deltas;
}

// ─── Anthropic 端到端流式测试 ───────────────────────────

describe("Anthropic — end-to-end stream (SDK)", () => {
  it("should stream simple text response", async () => {
    const client = mockAnthropicClient(fixtures.anthropicSimpleText);
    const provider = new AnthropicProvider(client as ConstructorParameters<typeof AnthropicProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "claude-sonnet-4-20250514",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream thinking + text response", async () => {
    const client = mockAnthropicClient(fixtures.anthropicThinkingText);
    const provider = new AnthropicProvider(client as ConstructorParameters<typeof AnthropicProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "claude-sonnet-4-20250514",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "thinking"));
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream tool use response", async () => {
    const client = mockAnthropicClient(fixtures.anthropicToolUse);
    const provider = new AnthropicProvider(client as ConstructorParameters<typeof AnthropicProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "claude-sonnet-4-20250514",
      messages: [],
      systemPrompt: [],
      tools: fixtures.testTools,
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "tool_use" });
    assert.ok(last.content.some((b) => b.type === "tool_use"));
  });

  it("should handle abort signal", async () => {
    const longEvents: fixtures.AnthropicStreamEvent[] = [
      fixtures.anthropicSimpleText[0], // message_start
      fixtures.anthropicSimpleText[1], // content_block_start
      ...Array.from({ length: 50 }, (_, i) => ({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: `chunk${i} ` },
      })),
      fixtures.anthropicSimpleText[4], // content_block_stop
      fixtures.anthropicSimpleText[5], // message_delta
      fixtures.anthropicSimpleText[6], // message_stop
    ];

    const controller = new AbortController();
    const client = mockAnthropicClient(longEvents);
    const provider = new AnthropicProvider(client as ConstructorParameters<typeof AnthropicProvider>[0]);
    const deltas: StreamDelta[] = [];

    for await (const d of provider.stream({
      model: "claude-sonnet-4-20250514",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: controller.signal,
    })) {
      deltas.push(d);
      if (deltas.length >= 5) {
        controller.abort();
        break;
      }
    }

    assert.ok(deltas.length <= 10, `Expected early stop, got ${deltas.length} deltas`);
  });
});

// ─── OpenAI 端到端流式测试 ──────────────────────────────

describe("OpenAI — end-to-end stream (SDK)", () => {
  it("should stream simple text response", async () => {
    const client = mockOpenAIClient(fixtures.openaiSimpleText);
    const provider = new OpenAIProvider(client as ConstructorParameters<typeof OpenAIProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "gpt-4o",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream reasoning + text response", async () => {
    const client = mockOpenAIClient(fixtures.openaiReasoning);
    const provider = new OpenAIProvider(client as ConstructorParameters<typeof OpenAIProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "o3",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "thinking"));
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream tool call response", async () => {
    const client = mockOpenAIClient(fixtures.openaiToolCall);
    const provider = new OpenAIProvider(client as ConstructorParameters<typeof OpenAIProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "gpt-4o",
      messages: [],
      systemPrompt: [],
      tools: fixtures.testTools,
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "tool_use" });
    assert.ok(last.content.some((b) => b.type === "tool_use"));
  });
});

// ─── Gemini 端到端流式测试 ──────────────────────────────

describe("Gemini — end-to-end stream (SDK)", () => {
  it("should stream simple text response", async () => {
    const client = mockGeminiClient(fixtures.geminiSimpleText);
    const provider = new GeminiProvider(client as ConstructorParameters<typeof GeminiProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "gemini-2.5-pro",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream thinking + text response", async () => {
    const client = mockGeminiClient(fixtures.geminiThinking);
    const provider = new GeminiProvider(client as ConstructorParameters<typeof GeminiProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "gemini-2.5-pro",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "thinking"));
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream tool call response", async () => {
    const client = mockGeminiClient(fixtures.geminiToolCall);
    const provider = new GeminiProvider(client as ConstructorParameters<typeof GeminiProvider>[0]);
    const deltas = await collectDeltas(provider.stream({
      model: "gemini-2.5-pro",
      messages: [],
      systemPrompt: [],
      tools: fixtures.testTools,
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.equal(last.state.type, "complete");
    assert.ok(last.content.some((b) => b.type === "tool_use"));
  });
});

// ─── OpenAI-Compat 端到端流式测试 ───────────────────────

describe("OpenAI-Compat — end-to-end stream (SDK)", () => {
  it("should stream simple text response (xAI preset)", async () => {
    const client = mockCompatClient(fixtures.compatSimpleText);
    const provider = new OpenAICompatProvider({
      name: "xai",
      client: client as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
    });
    const deltas = await collectDeltas(provider.stream({
      model: "grok-3",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should stream tool call response (xAI preset)", async () => {
    const client = mockCompatClient(fixtures.compatToolCall);
    const provider = new OpenAICompatProvider({
      name: "xai",
      client: client as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
    });
    const deltas = await collectDeltas(provider.stream({
      model: "grok-3",
      messages: [],
      systemPrompt: [],
      tools: fixtures.testTools,
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "tool_use" });
    assert.ok(last.content.some((b) => b.type === "tool_use"));
  });

  it("should stream multiple tool calls in one response", async () => {
    const multiToolFixture: CompatStreamChunk[] = [
      {
        id: "chatcmpl-mt",
        object: "chat.completion.chunk",
        model: "grok-3",
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 0,
              id: "call_001",
              type: "function",
              function: { name: "bash", arguments: '{"command":"ls"}' },
            }],
          },
          finish_reason: null,
        }],
      },
      {
        id: "chatcmpl-mt",
        object: "chat.completion.chunk",
        model: "grok-3",
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 1,
              id: "call_002",
              type: "function",
              function: { name: "read", arguments: '{"path":"file.txt"}' },
            }],
          },
          finish_reason: null,
        }],
      },
      {
        id: "chatcmpl-mt",
        object: "chat.completion.chunk",
        model: "grok-3",
        choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      },
    ];

    const client = mockCompatClient(multiToolFixture);
    const provider = new OpenAICompatProvider({
      name: "xai",
      client: client as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
    });
    const deltas = await collectDeltas(provider.stream({
      model: "grok-3",
      messages: [],
      systemPrompt: [],
      tools: fixtures.testTools,
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "tool_use" });
    const toolUses = last.content.filter((b) => b.type === "tool_use");
    assert.equal(toolUses.length, 2);
  });

  it("should stream with custom config override", async () => {
    const client = mockCompatClient(fixtures.compatSimpleText);
    const provider = new OpenAICompatProvider({
      name: "custom-provider",
      client: client as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
      config: {
        baseURL: "https://api.custom.ai/v1",
        supportsStore: false,
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
      },
    });

    assert.equal(provider.name, "custom-provider");

    const deltas = await collectDeltas(provider.stream({
      model: "grok-3",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "text"));
  });

  it("should handle reasoning_content field for reasoning providers", async () => {
    const reasoningFixture: CompatStreamChunk[] = [
      {
        id: "chatcmpl-r1",
        object: "chat.completion.chunk",
        model: "deepseek-r1",
        choices: [{
          index: 0,
          delta: { role: "assistant", reasoning_content: "Let me think..." },
          finish_reason: null,
        }],
      },
      {
        id: "chatcmpl-r1",
        object: "chat.completion.chunk",
        model: "deepseek-r1",
        choices: [{
          index: 0,
          delta: { content: "The answer is 42." },
          finish_reason: null,
        }],
      },
      {
        id: "chatcmpl-r1",
        object: "chat.completion.chunk",
        model: "deepseek-r1",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      },
    ];

    const client = mockCompatClient(reasoningFixture);
    const provider = new OpenAICompatProvider({
      name: "deepseek",
      client: client as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
    });
    const deltas = await collectDeltas(provider.stream({
      model: "deepseek-r1",
      messages: [],
      systemPrompt: [],
      tools: [],
      config: fixtures.testConfig,
      signal: AbortSignal.timeout(5000),
    }));

    const last = deltas[deltas.length - 1];
    assert.deepEqual(last.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(last.content.some((b) => b.type === "thinking"), "expected thinking block from reasoning_content");
    assert.ok(last.content.some((b) => b.type === "text"), "expected text block");
  });
});

// ─── 跨 Provider 一致性测试 ─────────────────────────────

describe("Cross-provider consistency (SDK)", () => {
  it("all providers' text responses should end with complete/end_turn", async () => {
    const providers = [
      {
        name: "anthropic",
        provider: new AnthropicProvider(mockAnthropicClient(fixtures.anthropicSimpleText) as ConstructorParameters<typeof AnthropicProvider>[0]),
        model: "claude-sonnet-4-20250514",
      },
      {
        name: "openai",
        provider: new OpenAIProvider(mockOpenAIClient(fixtures.openaiSimpleText) as ConstructorParameters<typeof OpenAIProvider>[0]),
        model: "gpt-4o",
      },
      {
        name: "gemini",
        provider: new GeminiProvider(mockGeminiClient(fixtures.geminiSimpleText) as ConstructorParameters<typeof GeminiProvider>[0]),
        model: "gemini-2.5-pro",
      },
      {
        name: "xai",
        provider: new OpenAICompatProvider({
          name: "xai",
          client: mockCompatClient(fixtures.compatSimpleText) as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
        }),
        model: "grok-3",
      },
    ];

    for (const { name, provider, model } of providers) {
      const deltas = await collectDeltas(provider.stream({
        model,
        messages: [],
        systemPrompt: [],
        tools: [],
        config: fixtures.testConfig,
        signal: AbortSignal.timeout(5000),
      }));
      const last = deltas[deltas.length - 1];
      assert.equal(last.state.type, "complete", `${name}: expected complete state`);
      if (last.state.type === "complete") {
        assert.equal(last.state.stopReason, "end_turn", `${name}: expected end_turn stop reason`);
      }
    }
  });

  it("all providers' tool responses should have tool_use blocks", async () => {
    const providers = [
      {
        name: "anthropic",
        provider: new AnthropicProvider(mockAnthropicClient(fixtures.anthropicToolUse) as ConstructorParameters<typeof AnthropicProvider>[0]),
        model: "claude-sonnet-4-20250514",
      },
      {
        name: "openai",
        provider: new OpenAIProvider(mockOpenAIClient(fixtures.openaiToolCall) as ConstructorParameters<typeof OpenAIProvider>[0]),
        model: "gpt-4o",
      },
      {
        name: "gemini",
        provider: new GeminiProvider(mockGeminiClient(fixtures.geminiToolCall) as ConstructorParameters<typeof GeminiProvider>[0]),
        model: "gemini-2.5-pro",
      },
      {
        name: "xai",
        provider: new OpenAICompatProvider({
          name: "xai",
          client: mockCompatClient(fixtures.compatToolCall) as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
        }),
        model: "grok-3",
      },
    ];

    for (const { name, provider, model } of providers) {
      const deltas = await collectDeltas(provider.stream({
        model,
        messages: [],
        systemPrompt: [],
        tools: fixtures.testTools,
        config: fixtures.testConfig,
        signal: AbortSignal.timeout(5000),
      }));
      const last = deltas[deltas.length - 1];
      assert.ok(
        last.content.some((b) => b.type === "tool_use"),
        `${name}: expected tool_use block in content`,
      );
    }
  });

  it("all providers' text responses should include usage", async () => {
    const providers = [
      {
        name: "anthropic",
        provider: new AnthropicProvider(mockAnthropicClient(fixtures.anthropicSimpleText) as ConstructorParameters<typeof AnthropicProvider>[0]),
        model: "claude-sonnet-4-20250514",
      },
      {
        name: "openai",
        provider: new OpenAIProvider(mockOpenAIClient(fixtures.openaiSimpleText) as ConstructorParameters<typeof OpenAIProvider>[0]),
        model: "gpt-4o",
      },
      {
        name: "gemini",
        provider: new GeminiProvider(mockGeminiClient(fixtures.geminiSimpleText) as ConstructorParameters<typeof GeminiProvider>[0]),
        model: "gemini-2.5-pro",
      },
      {
        name: "xai",
        provider: new OpenAICompatProvider({
          name: "xai",
          client: mockCompatClient(fixtures.compatSimpleText) as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
        }),
        model: "grok-3",
      },
    ];

    for (const { name, provider, model } of providers) {
      const deltas = await collectDeltas(provider.stream({
        model,
        messages: [],
        systemPrompt: [],
        tools: [],
        config: fixtures.testConfig,
        signal: AbortSignal.timeout(5000),
      }));
      const last = deltas[deltas.length - 1];
      assert.ok(last.usage, `${name}: expected usage in final delta`);
      assert.ok(typeof last.usage!.totalInputTokens === "number", `${name}: expected totalInputTokens`);
      assert.ok(typeof last.usage!.outputTokens === "number", `${name}: expected outputTokens`);
    }
  });
});

// ─── 消息転換 roundtrip 测试 ────────────────────────────

describe("Message conversion roundtrip", () => {
  const testMessages: Message[] = [
    { role: "user", content: [{ type: "text", text: "Hello, how are you?" }] } as Message,
    {
      role: "assistant",
      content: [{ type: "text", text: "I'm doing well!", startTime: Date.now() }],
    } as Message,
    { role: "user", content: [{ type: "text", text: "Tell me a joke." }] } as Message,
  ];
  const systemPrompt = [{ type: "text" as const, text: "You are helpful." }];

  it("all providers should convert messages without errors", () => {
    const transformers = [
      { name: "anthropic", transformer: new AnthropicTransformer() },
      { name: "openai", transformer: new OpenAITransformer() },
      { name: "gemini", transformer: new GeminiTransformer() },
      { name: "compat", transformer: new CompatTransformer(mergeWithDefaults({})) },
    ];

    for (const { name, transformer } of transformers) {
      const result = transformer.toProviderMessages(testMessages, systemPrompt);
      assert.ok(Array.isArray(result), `${name}: expected array output`);
      assert.ok(result.length > 0, `${name}: expected non-empty output`);
    }
  });

  it("all providers' tool transformers should convert tools correctly", () => {
    const toolTransformers = [
      { name: "anthropic", transformer: new AnthropicToolTransformer() },
      { name: "openai", transformer: new OpenAIToolTransformer() },
      { name: "gemini", transformer: new GeminiToolTransformer() },
      { name: "compat", transformer: new CompatToolTransformer() },
    ];

    for (const { name, transformer } of toolTransformers) {
      const result = transformer.toProviderTools(fixtures.testTools);
      assert.ok(Array.isArray(result), `${name}: expected array output`);
      if (name === "gemini") {
        assert.equal(result.length, 1, `${name}: expected 1 tool config wrapper`);
        const decls = (result[0] as { functionDeclarations: unknown[] }).functionDeclarations;
        assert.equal(decls.length, fixtures.testTools.length, `${name}: expected ${fixtures.testTools.length} function declarations`);
      } else {
        assert.equal(result.length, fixtures.testTools.length, `${name}: expected ${fixtures.testTools.length} tools`);
      }
    }
  });
});

// ─── Registry + Provider 集成测试 ────────────────────────

describe("Registry integration", () => {
  it("createProvider should return working providers for all names", () => {
    const names = ["anthropic", "openai", "gemini", "xai", "openai-compat"] as const;
    for (const name of names) {
      const provider = createProvider(name);
      if (name === "xai") {
        assert.equal(provider.name, "xai");
      } else {
        assert.equal(provider.name, name);
      }
      assert.ok(typeof provider.stream === "function");
    }
  });

  it("getProviderForModel should work for known models", () => {
    const models = [
      { model: "claude-sonnet-4-20250514", expected: "anthropic" },
      { model: "gpt-4o", expected: "openai" },
      { model: "gemini-2.5-pro", expected: "gemini" },
      { model: "grok-3", expected: "openai-compat" },
    ];

    for (const { model, expected } of models) {
      const provider = getProviderForModel(model);
      assert.equal(provider.name, expected, `${model}: expected ${expected}`);
    }
  });

  it("resolveProvider should work for prefix-based resolution", () => {
    assert.equal(resolveProvider("claude-future-model"), "anthropic");
    assert.equal(resolveProvider("gpt-future-model"), "openai");
    assert.equal(resolveProvider("gemini-future-model"), "gemini");
    assert.equal(resolveProvider("grok-future-model"), "xai");
  });

  it("createProvider('xai') should return OpenAICompatProvider", () => {
    const provider = createProvider("xai");
    assert.equal(provider.name, "xai");
    assert.ok(provider instanceof OpenAICompatProvider);
  });
});

// ─── Error handling tests ───────────────────────────────

describe("Error handling — missing API key", () => {
  const noKeyConfig = {
    settings: {} as Record<string, unknown>,
    secrets: {
      getToken: async (_key: string) => "",
      isSet: (_key: string) => false,
    },
  };

  it("Anthropic should throw ProviderError on missing key", async () => {
    const client = mockAnthropicClient(fixtures.anthropicSimpleText);
    const provider = new AnthropicProvider(client as ConstructorParameters<typeof AnthropicProvider>[0]);
    await assert.rejects(
      async () => {
        for await (const _ of provider.stream({
          model: "claude-sonnet-4-20250514",
          messages: [],
          systemPrompt: [],
          tools: [],
          config: noKeyConfig,
          signal: AbortSignal.timeout(5000),
        })) { /* consume */ }
      },
      (err: Error) => {
        assert.ok(err.message.includes("API key"));
        return true;
      },
    );
  });

  it("OpenAI should throw ProviderError on missing key", async () => {
    const client = mockOpenAIClient(fixtures.openaiSimpleText);
    const provider = new OpenAIProvider(client as ConstructorParameters<typeof OpenAIProvider>[0]);
    await assert.rejects(
      async () => {
        for await (const _ of provider.stream({
          model: "gpt-4o",
          messages: [],
          systemPrompt: [],
          tools: [],
          config: noKeyConfig,
          signal: AbortSignal.timeout(5000),
        })) { /* consume */ }
      },
      (err: Error) => {
        assert.ok(err.message.includes("API key"));
        return true;
      },
    );
  });

  it("Gemini should throw ProviderError on missing key", async () => {
    const client = mockGeminiClient(fixtures.geminiSimpleText);
    const provider = new GeminiProvider(client as ConstructorParameters<typeof GeminiProvider>[0]);
    await assert.rejects(
      async () => {
        for await (const _ of provider.stream({
          model: "gemini-2.5-pro",
          messages: [],
          systemPrompt: [],
          tools: [],
          config: noKeyConfig,
          signal: AbortSignal.timeout(5000),
        })) { /* consume */ }
      },
      (err: Error) => {
        assert.ok(err.message.includes("API key"));
        return true;
      },
    );
  });

  it("OpenAI-Compat should throw ProviderError on missing key", async () => {
    const client = mockCompatClient(fixtures.compatSimpleText);
    const provider = new OpenAICompatProvider({
      name: "xai",
      client: client as ConstructorParameters<typeof OpenAICompatProvider>[0]["client"],
    });
    await assert.rejects(
      async () => {
        for await (const _ of provider.stream({
          model: "grok-3",
          messages: [],
          systemPrompt: [],
          tools: [],
          config: noKeyConfig,
          signal: AbortSignal.timeout(5000),
        })) { /* consume */ }
      },
      (err: Error) => {
        assert.ok(err.message.includes("API key"));
        return true;
      },
    );
  });
});
