/**
 * @flitter/llm — OpenAI-Compatible ChatCompletion API Provider 测试
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantContentBlock, Message } from "@flitter/schemas";
import type { SystemPromptBlock, ToolDefinition } from "../../types";
import { TransformState } from "../../types";
import {
  detectCompatFromURL,
  getKnownConfig,
  KNOWN_COMPAT_CONFIGS,
  mergeWithDefaults,
} from "./compat";
import type { CompatStreamChunk } from "./transformer";
import { CompatToolTransformer, CompatTransformer } from "./transformer";

// ─── Helper ──────────────────────────────────────────────

const DEFAULT_CONFIG = mergeWithDefaults({
  baseURL: "https://api.x.ai/v1",
  supportsDeveloperRole: false,
});

function createUserMessage(content: Message["content"]): Message {
  return { role: "user", content } as Message;
}

function createAssistantMessage(content: AssistantContentBlock[]): Message {
  return { role: "assistant", content } as Message;
}

function createChunk(
  overrides: Partial<CompatStreamChunk> & {
    delta?: CompatStreamChunk["choices"][0]["delta"];
    finish_reason?: CompatStreamChunk["choices"][0]["finish_reason"];
  },
): CompatStreamChunk {
  return {
    id: "chatcmpl-001",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [
      {
        index: 0,
        delta: overrides.delta ?? {},
        finish_reason: overrides.finish_reason ?? null,
      },
    ],
    ...(overrides.usage ? { usage: overrides.usage } : {}),
  };
}

// ─── Compat Config 测试 ──────────────────────────────────

describe("OpenAI-Compat Config", () => {
  it("should have known configs for xai, groq, deepseek, openrouter, cerebras", () => {
    assert.ok(KNOWN_COMPAT_CONFIGS.xai);
    assert.ok(KNOWN_COMPAT_CONFIGS.groq);
    assert.ok(KNOWN_COMPAT_CONFIGS.deepseek);
    assert.ok(KNOWN_COMPAT_CONFIGS.openrouter);
    assert.ok(KNOWN_COMPAT_CONFIGS.cerebras);
  });

  it("should merge defaults correctly", () => {
    const merged = mergeWithDefaults({ baseURL: "https://api.x.ai/v1" });
    assert.equal(merged.baseURL, "https://api.x.ai/v1");
    assert.equal(merged.supportsStore, true);
    assert.equal(merged.maxTokensField, "max_completion_tokens");
  });

  it("should override defaults with user config", () => {
    const merged = mergeWithDefaults({
      baseURL: "https://custom.api/v1",
      supportsStore: false,
      maxTokensField: "max_tokens",
    });
    assert.equal(merged.supportsStore, false);
    assert.equal(merged.maxTokensField, "max_tokens");
  });

  it("should detect xai from URL", () => {
    const config = detectCompatFromURL("https://api.x.ai/v1");
    assert.ok(config);
    assert.equal(config.baseURL, "https://api.x.ai/v1");
  });

  it("should detect groq from URL", () => {
    const config = detectCompatFromURL("https://api.groq.com/openai/v1");
    assert.ok(config);
    assert.equal(config.baseURL, "https://api.groq.com/openai/v1");
  });

  it("should detect openrouter from URL", () => {
    const config = detectCompatFromURL("https://openrouter.ai/api/v1");
    assert.ok(config);
    assert.equal(config.thinkingFormat, "openrouter");
  });

  it("should return undefined for unknown URL", () => {
    const config = detectCompatFromURL("https://custom-llm.example.com/v1");
    assert.equal(config, undefined);
  });

  it("should get known config by name", () => {
    const config = getKnownConfig("xai");
    assert.ok(config);
    assert.equal(config.baseURL, "https://api.x.ai/v1");
    assert.equal(config.supportsStore, false);
  });

  it("should return undefined for unknown name", () => {
    const config = getKnownConfig("nonexistent");
    assert.equal(config, undefined);
  });
});

// ─── toProviderMessages 测试 ─────────────────────────────

describe("CompatTransformer.toProviderMessages", () => {
  const transformer = new CompatTransformer(DEFAULT_CONFIG);
  const emptySystem: SystemPromptBlock[] = [];

  it("should convert system prompt to system role (when supportsDeveloperRole=false)", () => {
    const system: SystemPromptBlock[] = [{ type: "text", text: "You are helpful." }];
    const result = transformer.toProviderMessages([], system);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], { role: "system", content: "You are helpful." });
  });

  it("should convert system prompt to developer role (when supportsDeveloperRole=true)", () => {
    const devConfig = mergeWithDefaults({
      baseURL: "https://api.openai.com/v1",
      supportsDeveloperRole: true,
    });
    const t = new CompatTransformer(devConfig);
    const system: SystemPromptBlock[] = [{ type: "text", text: "You are helpful." }];
    const result = t.toProviderMessages([], system);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], { role: "developer", content: "You are helpful." });
  });

  it("should convert UserMessage text to user role", () => {
    const msg = createUserMessage([{ type: "text", text: "Hello" }]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.equal(result[0].content, "Hello");
  });

  it("should convert ToolResultBlock to tool role with stripped toolu_ prefix", () => {
    const msg = createUserMessage([
      { type: "tool_result", toolUseID: "toolu_abc123", run: { status: "done", result: "output" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "tool");
    if (result[0].role === "tool") {
      assert.equal(result[0].tool_call_id, "abc123");
      assert.equal(result[0].content, "output");
    }
  });

  it("should skip ImageBlock", () => {
    const msg = createUserMessage([
      { type: "text", text: "Look" },
      { type: "image", source: { type: "base64", mediaType: "image/png", data: "abc123" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].content, "Look");
  });

  it("should convert AssistantMessage text to assistant role", () => {
    const msg = createAssistantMessage([{ type: "text", text: "Hi", startTime: Date.now() }]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "assistant");
    if (result[0].role === "assistant") {
      assert.ok(result[0].content);
      assert.deepEqual(result[0].content, [{ type: "text", text: "Hi" }]);
    }
  });

  it("should convert AssistantMessage tool_use to tool_calls", () => {
    const msg = createAssistantMessage([
      {
        type: "tool_use",
        id: "toolu_xyz",
        name: "bash",
        complete: true,
        input: { cmd: "ls" },
        startTime: Date.now(),
      },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "assistant");
    if (result[0].role === "assistant") {
      assert.ok(result[0].tool_calls);
      assert.equal(result[0].tool_calls!.length, 1);
      assert.equal(result[0].tool_calls![0].id, "xyz");
      assert.equal(result[0].tool_calls![0].function.name, "bash");
    }
  });

  it("should skip ThinkingBlock in assistant messages", () => {
    const msg = createAssistantMessage([
      {
        type: "thinking",
        thinking: "hmm...",
        signature: "",
        provider: "anthropic",
        startTime: Date.now(),
      },
      { type: "text", text: "Answer", startTime: Date.now() },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    if (result[0].role === "assistant") {
      assert.deepEqual(result[0].content, [{ type: "text", text: "Answer" }]);
    }
  });

  it("should convert info message summary to assistant role", () => {
    const msg: Message = {
      role: "info",
      content: [{ type: "summary", summary: { type: "message", summary: "Previous summary" } }],
    } as unknown as Message;
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "assistant");
  });

  it("should merge adjacent same-role user messages", () => {
    const msgs: Message[] = [
      createUserMessage([{ type: "text", text: "Hello" }]),
      createUserMessage([{ type: "text", text: "World" }]),
    ];
    const result = transformer.toProviderMessages(msgs, emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.equal(result[0].content, "Hello\nWorld");
  });
});

// ─── fromProviderDelta 测试 ─────────────────────────────

describe("CompatTransformer.fromProviderDelta", () => {
  it("should handle delta.content → text block", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const chunk = createChunk({ delta: { content: "Hello" } });
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "text");
    if (delta.content[0].type === "text") {
      assert.equal(delta.content[0].text, "Hello");
    }
  });

  it("should handle delta.reasoning_content → thinking block", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const chunk = createChunk({ delta: { reasoning_content: "Let me think..." } });
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "thinking");
    if (delta.content[0].type === "thinking") {
      assert.equal(delta.content[0].thinking, "Let me think...");
      assert.equal(delta.content[0].provider, "openai-compat");
    }
  });

  it("should handle delta.reasoning → thinking block (alt field)", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const chunk = createChunk({ delta: { reasoning: "Reasoning..." } });
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "thinking");
  });

  it("should handle delta.reasoning_text → thinking block (alt field)", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const chunk = createChunk({ delta: { reasoning_text: "Thinking..." } });
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "thinking");
  });

  it("should handle delta.tool_calls (new) → tool_use block", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const chunk = createChunk({
      delta: {
        tool_calls: [
          {
            index: 0,
            id: "call_001",
            type: "function",
            function: { name: "bash", arguments: "" },
          },
        ],
      },
    });
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "tool_use");
    if (delta.content[0].type === "tool_use") {
      assert.equal(delta.content[0].id, "call_001");
      assert.equal(delta.content[0].name, "bash");
    }
  });

  it("should handle delta.tool_calls (arguments append)", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();

    transformer.fromProviderDelta(
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "call_001",
              type: "function",
              function: { name: "bash", arguments: "" },
            },
          ],
        },
      }),
      state,
    );

    transformer.fromProviderDelta(
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 0,
              function: { arguments: '{"cmd":' },
            },
          ],
        },
      }),
      state,
    );

    const block = state.blocks.get(0);
    assert.ok(block);
    assert.deepEqual(block.data.inputPartialJSON, { json: '{"cmd":' });
  });

  it("should handle finish_reason 'stop' → end_turn", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    transformer.fromProviderDelta(createChunk({ delta: { content: "Hi" } }), state);
    const delta = transformer.fromProviderDelta(
      createChunk({
        delta: {},
        finish_reason: "stop",
        usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 },
      }),
      state,
    );
    assert.deepEqual(delta.state, { type: "complete", stopReason: "end_turn" });
  });

  it("should handle finish_reason 'tool_calls' → tool_use", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const delta = transformer.fromProviderDelta(
      createChunk({
        delta: {},
        finish_reason: "tool_calls",
      }),
      state,
    );
    assert.deepEqual(delta.state, { type: "complete", stopReason: "tool_use" });
  });

  it("should handle finish_reason 'length' → max_tokens", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const delta = transformer.fromProviderDelta(
      createChunk({
        delta: {},
        finish_reason: "length",
      }),
      state,
    );
    assert.deepEqual(delta.state, { type: "complete", stopReason: "max_tokens" });
  });

  it("should map usage correctly", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const delta = transformer.fromProviderDelta(
      createChunk({
        delta: {},
        finish_reason: "stop",
        usage: { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 },
      }),
      state,
    );
    assert.ok(delta.usage);
    assert.equal(delta.usage!.totalInputTokens, 100);
    assert.equal(delta.usage!.outputTokens, 25);
    assert.equal(delta.usage!.cacheReadInputTokens, null);
    assert.equal(delta.usage!.cacheCreationInputTokens, 100);
  });

  it("should handle usage with cached tokens", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();
    const delta = transformer.fromProviderDelta(
      createChunk({
        delta: {},
        finish_reason: "stop",
        usage: {
          prompt_tokens: 200,
          completion_tokens: 50,
          total_tokens: 250,
          prompt_tokens_details: { cached_tokens: 80 },
        },
      }),
      state,
    );
    assert.ok(delta.usage);
    assert.equal(delta.usage!.cacheReadInputTokens, 80);
    assert.equal(delta.usage!.cacheCreationInputTokens, 120);
  });
});

// ─── Full stream simulation 测试 ─────────────────────────

describe("CompatTransformer — full stream simulation", () => {
  it("should handle simple text response", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();

    const chunks: CompatStreamChunk[] = [
      createChunk({ delta: { role: "assistant", content: "" } }),
      createChunk({ delta: { content: "Hello " } }),
      createChunk({ delta: { content: "world!" } }),
      createChunk({
        delta: {},
        finish_reason: "stop",
        usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 },
      }),
    ];

    let lastDelta = transformer.fromProviderDelta(chunks[0], state);
    for (let i = 1; i < chunks.length; i++) {
      lastDelta = transformer.fromProviderDelta(chunks[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(lastDelta.content.length, 1);
    if (lastDelta.content[0].type === "text") {
      assert.equal(lastDelta.content[0].text, "Hello world!");
    }
  });

  it("should handle reasoning + text response", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();

    const chunks: CompatStreamChunk[] = [
      createChunk({ delta: { reasoning_content: "Let me " } }),
      createChunk({ delta: { reasoning_content: "think..." } }),
      createChunk({ delta: { content: "The answer" } }),
      createChunk({ delta: { content: " is 42." } }),
      createChunk({
        delta: {},
        finish_reason: "stop",
        usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
      }),
    ];

    let lastDelta = transformer.fromProviderDelta(chunks[0], state);
    for (let i = 1; i < chunks.length; i++) {
      lastDelta = transformer.fromProviderDelta(chunks[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(lastDelta.content.length, 2);
    assert.equal(lastDelta.content[0].type, "thinking");
    assert.equal(lastDelta.content[1].type, "text");
    if (lastDelta.content[0].type === "thinking") {
      assert.equal(lastDelta.content[0].thinking, "Let me think...");
    }
    if (lastDelta.content[1].type === "text") {
      assert.equal(lastDelta.content[1].text, "The answer is 42.");
    }
  });

  it("should handle tool call response with JSON accumulation", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();

    const chunks: CompatStreamChunk[] = [
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "call_001",
              type: "function",
              function: { name: "bash", arguments: "" },
            },
          ],
        },
      }),
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 0,
              function: { arguments: '{"command"' },
            },
          ],
        },
      }),
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 0,
              function: { arguments: ':"ls -la"}' },
            },
          ],
        },
      }),
      createChunk({
        delta: {},
        finish_reason: "tool_calls",
        usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 },
      }),
    ];

    let lastDelta = transformer.fromProviderDelta(chunks[0], state);
    for (let i = 1; i < chunks.length; i++) {
      lastDelta = transformer.fromProviderDelta(chunks[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "tool_use" });
    assert.equal(lastDelta.content.length, 1);
    assert.equal(lastDelta.content[0].type, "tool_use");
    if (lastDelta.content[0].type === "tool_use") {
      assert.equal(lastDelta.content[0].name, "bash");
      assert.equal(lastDelta.content[0].id, "call_001");
    }

    const block = state.blocks.get(0);
    assert.ok(block);
    assert.deepEqual(block.data.inputPartialJSON, { json: '{"command":"ls -la"}' });
  });

  it("should handle multiple tool calls in same response", () => {
    const transformer = new CompatTransformer(DEFAULT_CONFIG);
    const state = new TransformState();

    const chunks: CompatStreamChunk[] = [
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "call_001",
              type: "function",
              function: { name: "bash", arguments: '{"cmd":"ls"}' },
            },
          ],
        },
      }),
      createChunk({
        delta: {
          tool_calls: [
            {
              index: 1,
              id: "call_002",
              type: "function",
              function: { name: "read", arguments: '{"path":"file.txt"}' },
            },
          ],
        },
      }),
      createChunk({
        delta: {},
        finish_reason: "tool_calls",
      }),
    ];

    let lastDelta = transformer.fromProviderDelta(chunks[0], state);
    for (let i = 1; i < chunks.length; i++) {
      lastDelta = transformer.fromProviderDelta(chunks[i], state);
    }

    assert.equal(lastDelta.content.length, 2);
    assert.equal(lastDelta.content[0].type, "tool_use");
    assert.equal(lastDelta.content[1].type, "tool_use");
    if (lastDelta.content[0].type === "tool_use" && lastDelta.content[1].type === "tool_use") {
      assert.equal(lastDelta.content[0].name, "bash");
      assert.equal(lastDelta.content[1].name, "read");
    }
  });
});

// ─── Tool transformer 测试 ────────────────────────────────

describe("CompatToolTransformer", () => {
  const toolTransformer = new CompatToolTransformer();

  it("should convert ToolDefinition to ChatCompletion function tool", () => {
    const tools: ToolDefinition[] = [
      {
        name: "bash",
        description: "Run a command",
        inputSchema: { type: "object", properties: { cmd: { type: "string" } }, required: ["cmd"] },
      },
    ];
    const result = toolTransformer.toProviderTools(tools);
    assert.equal(result.length, 1);
    assert.equal(result[0].type, "function");
    assert.equal(result[0].function.name, "bash");
    assert.equal(result[0].function.description, "Run a command");
  });

  it("should return empty array for empty tools", () => {
    const result = toolTransformer.toProviderTools([]);
    assert.equal(result.length, 0);
  });

  it("should deduplicate tools by name", () => {
    const tools: ToolDefinition[] = [
      { name: "bash", description: "First", inputSchema: {} },
      { name: "bash", description: "Second", inputSchema: {} },
    ];
    const result = toolTransformer.toProviderTools(tools);
    assert.equal(result.length, 1);
    assert.equal(result[0].function.description, "First");
  });
});

// ─── Provider identity 测试 ──────────────────────────────

describe("OpenAICompatProvider", () => {
  it("should default name to 'openai-compat'", async () => {
    const { OpenAICompatProvider } = await import("./provider");
    const provider = new OpenAICompatProvider();
    assert.equal(provider.name, "openai-compat");
  });

  it("should accept custom name 'xai'", async () => {
    const { OpenAICompatProvider } = await import("./provider");
    const provider = new OpenAICompatProvider({ name: "xai" });
    assert.equal(provider.name, "xai");
  });

  it("should accept custom name 'groq'", async () => {
    const { OpenAICompatProvider } = await import("./provider");
    const provider = new OpenAICompatProvider({ name: "groq" });
    assert.equal(provider.name, "groq");
  });

  it("should accept custom name 'deepseek'", async () => {
    const { OpenAICompatProvider } = await import("./provider");
    const provider = new OpenAICompatProvider({ name: "deepseek" });
    assert.equal(provider.name, "deepseek");
  });

  it("should accept config override", async () => {
    const { OpenAICompatProvider } = await import("./provider");
    const provider = new OpenAICompatProvider({
      name: "custom",
      config: { baseURL: "https://custom.api/v1" },
    });
    assert.equal(provider.name, "custom");
  });
});
