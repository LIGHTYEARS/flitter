/**
 * @flitter/llm — 核心类型与转换器基类测试
 *
 * 测试: MODEL_REGISTRY, ProviderError, TransformState, BaseToolTransformer, BaseMessageTransformer
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantContentBlock, Message, Usage } from "@flitter/schemas";
import { BaseMessageTransformer } from "./transformers/message-transformer";
import { BaseToolTransformer } from "./transformers/tool-transformer";
import type { SystemPromptBlock, ToolDefinition } from "./types";
import { MODEL_REGISTRY, ProviderError, TransformState, registerModel } from "./types";

// ─── 辅助: 测试用 concrete 子类 ─────────────────────────

class TestMessageTransformer extends BaseMessageTransformer<unknown, unknown> {
  toProviderMessages(_messages: Message[], _systemPrompt: SystemPromptBlock[]): unknown[] {
    return [];
  }
  fromProviderDelta(
    _chunk: unknown,
    _state: TransformState,
  ): ReturnType<typeof this.createEmptyDelta> {
    return this.createEmptyDelta();
  }
}

class TestToolTransformer extends BaseToolTransformer<unknown> {
  toProviderTools(tools: ToolDefinition[]): unknown[] {
    return tools.map((t) => ({ name: t.name }));
  }
}

// ─── MODEL_REGISTRY 测试 ────────────────────────────────

describe("MODEL_REGISTRY", () => {
  it("should contain Anthropic models", () => {
    const model = MODEL_REGISTRY["claude-sonnet-4-20250514"];
    assert.ok(model);
    assert.equal(model.provider, "anthropic");
    assert.equal(model.supportsThinking, true);
    assert.equal(model.supportsTools, true);
    assert.equal(model.supportsImages, true);
    assert.equal(model.supportsCacheControl, true);
    assert.equal(model.contextWindow, 200_000);
  });

  it("should contain OpenAI models", () => {
    const model = MODEL_REGISTRY["gpt-4o"];
    assert.ok(model);
    assert.equal(model.provider, "openai");
    assert.equal(model.supportsThinking, false);
    assert.equal(model.supportsTools, true);
  });

  it("should contain Gemini models", () => {
    const model = MODEL_REGISTRY["gemini-2.5-pro"];
    assert.ok(model);
    assert.equal(model.provider, "gemini");
    assert.equal(model.contextWindow, 1_048_576);
  });

  it("should contain xAI models (via openai-compat)", () => {
    const model = MODEL_REGISTRY["grok-code-fast-1"];
    assert.ok(model);
    assert.equal(model.provider, "openai-compat");
    assert.equal(model.contextWindow, 256_000);
    assert.equal(model.maxOutputTokens, 32_000);
    assert.equal(model.supportsImages, false);
    assert.equal(model.baseUrl, "https://api.x.ai/v1");
  });

  it("should return undefined for unknown models", () => {
    assert.equal(MODEL_REGISTRY["nonexistent-model"], undefined);
  });
});

// ─── ProviderError 测试 ─────────────────────────────────

describe("ProviderError", () => {
  it("should contain status/provider/retryable fields", () => {
    const err = new ProviderError(429, "anthropic", true, "Rate limited", 2000);
    assert.equal(err.status, 429);
    assert.equal(err.provider, "anthropic");
    assert.equal(err.retryable, true);
    assert.equal(err.retryAfterMs, 2000);
    assert.equal(err.message, "Rate limited");
    assert.equal(err.name, "ProviderError");
  });

  it("should be instanceof Error", () => {
    const err = new ProviderError(500, "openai", true, "Server error");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ProviderError);
  });

  it("should support non-retryable errors", () => {
    const err = new ProviderError(401, "gemini", false, "Unauthorized");
    assert.equal(err.retryable, false);
    assert.equal(err.retryAfterMs, undefined);
  });
});

// ─── TransformState 测试 ────────────────────────────────

describe("TransformState", () => {
  it("should add a text block", () => {
    const state = new TransformState();
    state.addBlock(0, "text", { text: "" });
    const content = state.getContent();
    assert.equal(content.length, 1);
    assert.equal(content[0].type, "text");
    if (content[0].type === "text") {
      assert.equal(content[0].text, "");
    }
  });

  it("should update text block by appending", () => {
    const state = new TransformState();
    state.addBlock(0, "text", { text: "" });
    state.updateBlock(0, { text: "Hello" });
    state.updateBlock(0, { text: " world" });
    const content = state.getContent();
    assert.equal(content.length, 1);
    if (content[0].type === "text") {
      assert.equal(content[0].text, "Hello world");
    }
  });

  it("should update tool_use block by appending JSON", () => {
    const state = new TransformState();
    state.addBlock(0, "tool_use", {
      id: "toolu_123",
      name: "read_file",
      complete: false,
      input: {},
      inputPartialJSON: { json: "" },
    });
    state.updateBlock(0, { inputPartialJSON: { json: '{"path":' } });
    const content = state.getContent();
    assert.equal(content.length, 1);
    if (content[0].type === "tool_use") {
      assert.equal(content[0].id, "toolu_123");
      assert.equal(content[0].name, "read_file");
    }
  });

  it("should complete a block with finalTime", () => {
    const state = new TransformState();
    state.addBlock(0, "text", { text: "done" });
    state.completeBlock(0);
    const block = state.blocks.get(0);
    assert.ok(block);
    assert.ok(block.finalTime !== undefined);
    assert.ok(block.finalTime >= block.startTime);
  });

  it("should return correct content with multiple block types", () => {
    const state = new TransformState();
    state.addBlock(0, "thinking", { thinking: "Let me think", signature: "sig_1" });
    state.addBlock(1, "text", { text: "Here is the answer" });
    state.addBlock(2, "tool_use", {
      id: "toolu_456",
      name: "bash",
      complete: true,
      input: { command: "ls" },
    });

    const content = state.getContent();
    assert.equal(content.length, 3);
    assert.equal(content[0].type, "thinking");
    assert.equal(content[1].type, "text");
    assert.equal(content[2].type, "tool_use");

    if (content[0].type === "thinking") {
      assert.equal(content[0].thinking, "Let me think");
      assert.equal(content[0].signature, "sig_1");
    }
    if (content[1].type === "text") {
      assert.equal(content[1].text, "Here is the answer");
    }
    if (content[2].type === "tool_use") {
      assert.equal(content[2].name, "bash");
      assert.equal(content[2].complete, true);
    }
  });

  it("should handle noop on unknown block index", () => {
    const state = new TransformState();
    // updateBlock/completeBlock on nonexistent index should not throw
    state.updateBlock(99, { text: "noop" });
    state.completeBlock(99);
    assert.equal(state.getContent().length, 0);
  });
});

// ─── BaseToolTransformer 测试 ───────────────────────────

describe("BaseToolTransformer", () => {
  const transformer = new TestToolTransformer();

  it("should validate a valid tool definition", () => {
    assert.doesNotThrow(() => {
      transformer.validateToolDefinition({
        name: "read_file",
        description: "Reads a file",
        inputSchema: { type: "object", properties: { path: { type: "string" } } },
      });
    });
  });

  it("should reject a tool with empty name", () => {
    assert.throws(
      () => {
        transformer.validateToolDefinition({
          name: "",
          description: "test",
          inputSchema: { type: "object" },
        });
      },
      { message: "ToolDefinition.name is required" },
    );
  });

  it("should reject a tool with empty description", () => {
    assert.throws(
      () => {
        transformer.validateToolDefinition({
          name: "test",
          description: "",
          inputSchema: { type: "object" },
        });
      },
      { message: "ToolDefinition.description is required" },
    );
  });

  it("should normalize schema by adding type:object if missing", () => {
    const schema = { properties: { x: { type: "number" } } };
    const normalized = transformer.normalizeInputSchema(schema);
    assert.equal(normalized.type, "object");
    assert.deepEqual(normalized.properties, { x: { type: "number" } });
  });

  it("should not overwrite existing type", () => {
    const schema = { type: "object", properties: {} };
    const normalized = transformer.normalizeInputSchema(schema);
    assert.equal(normalized.type, "object");
  });
});

// ─── BaseMessageTransformer 测试 ────────────────────────

describe("BaseMessageTransformer", () => {
  const transformer = new TestMessageTransformer();

  it("should create empty delta with streaming state", () => {
    const delta = transformer.createEmptyDelta();
    assert.deepEqual(delta.content, []);
    assert.deepEqual(delta.state, { type: "streaming" });
    assert.equal(delta.usage, undefined);
  });

  it("should create empty delta with provided content", () => {
    const content: AssistantContentBlock[] = [{ type: "text", text: "hello" }];
    const delta = transformer.createEmptyDelta(content);
    assert.equal(delta.content.length, 1);
    assert.deepEqual(delta.state, { type: "streaming" });
  });

  it("should create complete delta with usage", () => {
    const content: AssistantContentBlock[] = [{ type: "text", text: "done" }];
    const usage: Usage = {
      model: "claude-sonnet-4-20250514",
      maxInputTokens: 200000,
      inputTokens: 100,
      outputTokens: 50,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      totalInputTokens: 100,
      timestamp: new Date().toISOString(),
    };
    const delta = transformer.createCompleteDelta(content, usage, "end_turn");
    assert.deepEqual(delta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(delta.usage, usage);
  });

  it("should create error delta", () => {
    const delta = transformer.createErrorDelta("Connection failed");
    assert.equal(delta.state.type, "error");
    if (delta.state.type === "error") {
      assert.equal(delta.state.error.message, "Connection failed");
    }
  });

  it("should filter incomplete tool_use blocks", () => {
    const content: AssistantContentBlock[] = [
      { type: "text", text: "hi" },
      { type: "tool_use", id: "1", name: "bash", complete: false, input: {} },
      { type: "tool_use", id: "2", name: "read", complete: true, input: { path: "/a" } },
    ];
    const filtered = transformer.filterToolResults(content);
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].type, "text");
    assert.equal(filtered[1].type, "tool_use");
    if (filtered[1].type === "tool_use") {
      assert.equal(filtered[1].complete, true);
    }
  });

  it("should build cache control object", () => {
    const cc = transformer.buildCacheControl({ type: "ephemeral", ttl: "300s" });
    assert.deepEqual(cc, { type: "ephemeral", ttl: "300s" });
  });

  it("should return undefined for no cache control", () => {
    const cc = transformer.buildCacheControl(undefined);
    assert.equal(cc, undefined);
  });

  it("should create a new TransformState", () => {
    const state = transformer.createState();
    assert.ok(state instanceof TransformState);
    assert.equal(state.getContent().length, 0);
  });
});

// ─── registerModel 测试 ────────────────────────────────

describe("registerModel", () => {
  it("should add custom model to MODEL_REGISTRY", () => {
    const customId = "ep-test-custom-model";
    registerModel({
      id: customId,
      provider: "anthropic",
      contextWindow: 128_000,
      maxOutputTokens: 8_192,
      supportsThinking: false,
      supportsTools: true,
      supportsImages: false,
      supportsCacheControl: false,
    });
    assert.ok(MODEL_REGISTRY[customId]);
    assert.equal(MODEL_REGISTRY[customId].provider, "anthropic");
    assert.equal(MODEL_REGISTRY[customId].contextWindow, 128_000);
    // Cleanup
    delete MODEL_REGISTRY[customId];
  });

  it("should overwrite existing model if ID matches", () => {
    const customId = "ep-test-overwrite-model";
    registerModel({
      id: customId,
      provider: "anthropic",
      contextWindow: 100_000,
      maxOutputTokens: 4_096,
      supportsThinking: false,
      supportsTools: false,
      supportsImages: false,
      supportsCacheControl: false,
    });
    assert.equal(MODEL_REGISTRY[customId].maxOutputTokens, 4_096);

    registerModel({
      id: customId,
      provider: "anthropic",
      contextWindow: 200_000,
      maxOutputTokens: 16_384,
      supportsThinking: true,
      supportsTools: true,
      supportsImages: false,
      supportsCacheControl: false,
    });
    assert.equal(MODEL_REGISTRY[customId].maxOutputTokens, 16_384);
    assert.equal(MODEL_REGISTRY[customId].supportsThinking, true);
    // Cleanup
    delete MODEL_REGISTRY[customId];
  });
});
