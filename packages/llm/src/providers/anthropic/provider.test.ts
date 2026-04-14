/**
 * @flitter/llm — Anthropic Provider 测试
 *
 * 测试: AnthropicTransformer (toProviderMessages, fromProviderDelta),
 *       AnthropicToolTransformer, AnthropicProvider 配置
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantContentBlock, Message } from "@flitter/schemas";
import type { SystemPromptBlock } from "../../types";
import { TransformState } from "../../types";
import type { AnthropicSSEEvent } from "./transformer";
import { AnthropicToolTransformer, AnthropicTransformer } from "./transformer";

// ─── 辅助函数 ──────────────────────────────────────────

function makeUserMsg(content: Message["content"] extends infer C ? C : never, id = 1): Message {
  return {
    role: "user" as const,
    messageId: id,
    content: content as Message["content"],
  } as Message;
}

function makeAssistantMsg(content: AssistantContentBlock[], id = 2): Message {
  return {
    role: "assistant" as const,
    messageId: id,
    content,
    state: { type: "complete" as const, stopReason: "end_turn" as const },
  } as Message;
}

const systemPrompt: SystemPromptBlock[] = [{ type: "text", text: "You are a helpful assistant." }];

// ─── AnthropicTransformer.toProviderMessages 测试 ──────

describe("AnthropicTransformer.toProviderMessages", () => {
  const transformer = new AnthropicTransformer();

  it("should convert UserMessage text to Anthropic text block", () => {
    const msgs: Message[] = [makeUserMsg([{ type: "text", text: "Hello" }])];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.equal(result[0].content.length, 1);
    assert.equal(result[0].content[0].type, "text");
    if (result[0].content[0].type === "text") {
      assert.equal(result[0].content[0].text, "Hello");
    }
  });

  it("should convert UserMessage image (base64) to Anthropic image block", () => {
    const msgs: Message[] = [
      makeUserMsg([
        {
          type: "image",
          source: { type: "base64", mediaType: "image/png", data: "abc123" },
        },
      ]),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    assert.equal(result.length, 1);
    const block = result[0].content[0];
    assert.equal(block.type, "image");
    if (block.type === "image") {
      assert.equal(block.source.type, "base64");
      if (block.source.type === "base64") {
        assert.equal(block.source.media_type, "image/png");
        assert.equal(block.source.data, "abc123");
      }
    }
  });

  it("should convert AssistantMessage tool_use to Anthropic tool_use block", () => {
    const msgs: Message[] = [
      makeUserMsg([{ type: "text", text: "Use a tool" }]),
      makeAssistantMsg([
        {
          type: "tool_use",
          id: "toolu_1",
          name: "bash",
          complete: true,
          input: { command: "ls" },
        },
      ]),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    assert.equal(result.length, 2);
    const block = result[1].content[0];
    assert.equal(block.type, "tool_use");
    if (block.type === "tool_use") {
      assert.equal(block.id, "toolu_1");
      assert.equal(block.name, "bash");
    }
  });

  it("should convert AssistantMessage thinking to Anthropic thinking block (anthropic provider only)", () => {
    const msgs: Message[] = [
      makeUserMsg([{ type: "text", text: "Think" }]),
      makeAssistantMsg([
        {
          type: "thinking",
          thinking: "Let me think...",
          signature: "sig_1",
          provider: "anthropic",
        },
        { type: "text", text: "Answer" },
      ]),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    const assistantBlocks = result[1].content;
    assert.equal(assistantBlocks[0].type, "thinking");
    assert.equal(assistantBlocks[1].type, "text");
  });

  it("should filter out thinking blocks from non-anthropic providers", () => {
    const msgs: Message[] = [
      makeUserMsg([{ type: "text", text: "Think" }]),
      makeAssistantMsg([
        { type: "thinking", thinking: "OpenAI thinking", signature: "sig_2", provider: "openai" },
        { type: "text", text: "Answer" },
      ]),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    const assistantBlocks = result[1].content;
    assert.equal(assistantBlocks.length, 1);
    assert.equal(assistantBlocks[0].type, "text");
  });

  it("should convert ToolResultBlock to Anthropic tool_result", () => {
    const msgs: Message[] = [
      makeUserMsg([
        {
          type: "tool_result",
          toolUseID: "toolu_1",
          run: { status: "done", result: "file contents here" },
        },
      ]),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    assert.equal(result.length, 1);
    const block = result[0].content[0];
    assert.equal(block.type, "tool_result");
    if (block.type === "tool_result") {
      assert.equal(block.tool_use_id, "toolu_1");
      assert.equal(block.content, "file contents here");
    }
  });

  it("should convert system prompt with cache_control", () => {
    const system: SystemPromptBlock[] = [
      { type: "text", text: "System prompt", cache_control: { type: "ephemeral", ttl: "300s" } },
    ];
    const result = transformer.toSystemBlocks(system);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "System prompt");
    assert.deepEqual(result[0].cache_control, { type: "ephemeral" });
  });

  it("should merge adjacent same-role messages", () => {
    const msgs: Message[] = [
      makeUserMsg([{ type: "text", text: "First" }], 1),
      makeUserMsg([{ type: "text", text: "Second" }], 2),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.equal(result[0].content.length, 2);
  });

  it("should skip incomplete tool_use blocks in assistant messages", () => {
    const msgs: Message[] = [
      makeUserMsg([{ type: "text", text: "Hi" }]),
      makeAssistantMsg([
        { type: "tool_use", id: "t1", name: "read", complete: false, input: {} },
        { type: "text", text: "text" },
      ]),
    ];
    const result = transformer.toProviderMessages(msgs, systemPrompt);
    // The incomplete tool_use should be filtered out
    const assistantBlocks = result[1].content;
    assert.equal(assistantBlocks.length, 1);
    assert.equal(assistantBlocks[0].type, "text");
  });
});

// ─── AnthropicTransformer.fromProviderDelta 测试 ───────

describe("AnthropicTransformer.fromProviderDelta", () => {
  it("should handle message_start", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    const event: AnthropicSSEEvent = {
      type: "message_start",
      message: {
        id: "msg_1",
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 100, output_tokens: 0 },
      },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.state.type, "streaming");
  });

  it("should handle content_block_start (text)", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    const event: AnthropicSSEEvent = {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.state.type, "streaming");
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "text");
  });

  it("should handle content_block_delta (text_delta) - append text", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    state.addBlock(0, "text", { text: "" });
    const event: AnthropicSSEEvent = {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Hello" },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.content[0].type, "text");
    if (delta.content[0].type === "text") {
      assert.equal(delta.content[0].text, "Hello");
    }
  });

  it("should handle content_block_delta (input_json_delta)", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    state.addBlock(0, "tool_use", {
      id: "toolu_1",
      name: "bash",
      complete: false,
      input: {},
      inputPartialJSON: { json: "" },
    });
    const event: AnthropicSSEEvent = {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: '{"cmd":' },
    };
    transformer.fromProviderDelta(event, state);
    const block = state.blocks.get(0)!;
    // inputPartialJSON is replaced, not appended (objects)
    assert.deepEqual(block.data.inputPartialJSON, { json: '{"cmd":' });
  });

  it("should handle content_block_delta (thinking_delta)", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    state.addBlock(0, "thinking", { thinking: "", signature: "", provider: "anthropic" });
    const event: AnthropicSSEEvent = {
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: "Let me think" },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.content[0].type, "thinking");
    if (delta.content[0].type === "thinking") {
      assert.equal(delta.content[0].thinking, "Let me think");
    }
  });

  it("should handle content_block_stop", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    state.addBlock(0, "text", { text: "done" });
    const event: AnthropicSSEEvent = { type: "content_block_stop", index: 0 };
    transformer.fromProviderDelta(event, state);
    const block = state.blocks.get(0)!;
    assert.ok(block.finalTime !== undefined);
  });

  it("should handle message_delta with stop_reason", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    const event: AnthropicSSEEvent = {
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 50 },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.state.type, "streaming");
  });

  it("should handle message_stop → complete delta with usage", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();

    // Setup: run through message lifecycle
    transformer.fromProviderDelta(
      {
        type: "message_start",
        message: {
          id: "msg_1",
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 100, output_tokens: 0 },
        },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hello world" },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "content_block_stop",
        index: 0,
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 5 },
      },
      state,
    );

    const delta = transformer.fromProviderDelta({ type: "message_stop" }, state);
    assert.equal(delta.state.type, "complete");
    if (delta.state.type === "complete") {
      assert.equal(delta.state.stopReason, "end_turn");
    }
    assert.ok(delta.usage);
    assert.equal(delta.usage!.model, "claude-sonnet-4-20250514");
    assert.equal(delta.usage!.inputTokens, 100);
    assert.equal(delta.usage!.outputTokens, 5);
  });
});

// ─── Complete stream simulation 测试 ───────────────────

describe("AnthropicTransformer — full stream simulation", () => {
  it("should handle simple text response stream", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();

    const events: AnthropicSSEEvent[] = [
      {
        type: "message_start",
        message: {
          id: "msg_1",
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 50, output_tokens: 0 },
        },
      },
      { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello " } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "world!" } },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } },
      { type: "message_stop" },
    ];

    let lastDelta: StreamDelta | undefined;
    for (const event of events) {
      lastDelta = transformer.fromProviderDelta(event, state);
    }

    assert.ok(lastDelta);
    assert.equal(lastDelta!.state.type, "complete");
    assert.equal(lastDelta!.content.length, 1);
    assert.equal(lastDelta!.content[0].type, "text");
    if (lastDelta!.content[0].type === "text") {
      assert.equal(lastDelta!.content[0].text, "Hello world!");
    }
  });

  it("should handle tool_use response with JSON accumulation", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();

    const events: AnthropicSSEEvent[] = [
      {
        type: "message_start",
        message: {
          id: "msg_2",
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 100, output_tokens: 0 },
        },
      },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use", id: "toolu_1", name: "bash", input: {} },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: '{"command"' },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: ':"ls -la"}' },
      },
      { type: "content_block_stop", index: 0 },
      { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 10 } },
      { type: "message_stop" },
    ];

    let lastDelta: StreamDelta | undefined;
    for (const event of events) {
      lastDelta = transformer.fromProviderDelta(event, state);
    }

    assert.ok(lastDelta);
    if (lastDelta!.state.type === "complete") {
      assert.equal(lastDelta!.state.stopReason, "tool_use");
    }
    const toolBlock = lastDelta!.content[0];
    assert.equal(toolBlock.type, "tool_use");
    if (toolBlock.type === "tool_use") {
      assert.equal(toolBlock.name, "bash");
      assert.equal(toolBlock.complete, true);
      assert.deepEqual(toolBlock.input, { command: "ls -la" });
    }
  });

  it("should handle thinking + text interleaved stream", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();

    const events: AnthropicSSEEvent[] = [
      {
        type: "message_start",
        message: {
          id: "msg_3",
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 80, output_tokens: 0 },
        },
      },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "thinking", thinking: "", signature: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: "Let me analyze" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "signature_delta", signature: "sig_abc" },
      },
      { type: "content_block_stop", index: 0 },
      { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
      {
        type: "content_block_delta",
        index: 1,
        delta: { type: "text_delta", text: "The answer is 42." },
      },
      { type: "content_block_stop", index: 1 },
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 20 } },
      { type: "message_stop" },
    ];

    let lastDelta: StreamDelta | undefined;
    for (const event of events) {
      lastDelta = transformer.fromProviderDelta(event, state);
    }

    assert.ok(lastDelta);
    assert.equal(lastDelta!.content.length, 2);
    assert.equal(lastDelta!.content[0].type, "thinking");
    assert.equal(lastDelta!.content[1].type, "text");
    if (lastDelta!.content[0].type === "thinking") {
      assert.equal(lastDelta!.content[0].thinking, "Let me analyze");
      assert.equal(lastDelta!.content[0].signature, "sig_abc");
    }
    if (lastDelta!.content[1].type === "text") {
      assert.equal(lastDelta!.content[1].text, "The answer is 42.");
    }
  });

  it("should handle multi-block interleaved: thinking → text → tool_use", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();

    const events: AnthropicSSEEvent[] = [
      {
        type: "message_start",
        message: {
          id: "msg_4",
          model: "claude-sonnet-4-20250514",
          usage: { input_tokens: 90, output_tokens: 0 },
        },
      },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "thinking", thinking: "", signature: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "thinking_delta", thinking: "I should use a tool" },
      },
      { type: "content_block_stop", index: 0 },
      { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
      {
        type: "content_block_delta",
        index: 1,
        delta: { type: "text_delta", text: "Let me check" },
      },
      { type: "content_block_stop", index: 1 },
      {
        type: "content_block_start",
        index: 2,
        content_block: { type: "tool_use", id: "toolu_2", name: "read_file", input: {} },
      },
      {
        type: "content_block_delta",
        index: 2,
        delta: { type: "input_json_delta", partial_json: '{"path":"/etc/hosts"}' },
      },
      { type: "content_block_stop", index: 2 },
      { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 30 } },
      { type: "message_stop" },
    ];

    let lastDelta: StreamDelta | undefined;
    for (const event of events) {
      lastDelta = transformer.fromProviderDelta(event, state);
    }

    assert.ok(lastDelta);
    assert.equal(lastDelta!.content.length, 3);
    assert.equal(lastDelta!.content[0].type, "thinking");
    assert.equal(lastDelta!.content[1].type, "text");
    assert.equal(lastDelta!.content[2].type, "tool_use");
  });
});

// ─── AnthropicToolTransformer 测试 ─────────────────────

describe("AnthropicToolTransformer", () => {
  const transformer = new AnthropicToolTransformer();

  it("should convert ToolDefinition to AnthropicTool format", () => {
    const tools = transformer.toProviderTools([
      {
        name: "bash",
        description: "Run commands",
        inputSchema: { type: "object", properties: { cmd: { type: "string" } } },
      },
    ]);
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "bash");
    assert.equal(tools[0].description, "Run commands");
    assert.equal(tools[0].input_schema.type, "object");
  });

  it("should return empty array for empty tools", () => {
    const tools = transformer.toProviderTools([]);
    assert.equal(tools.length, 0);
  });

  it("should deduplicate tools by name", () => {
    const tools = transformer.toProviderTools([
      { name: "bash", description: "Run commands", inputSchema: { type: "object" } },
      { name: "bash", description: "Run commands v2", inputSchema: { type: "object" } },
    ]);
    assert.equal(tools.length, 1);
    assert.equal(tools[0].description, "Run commands");
  });
});

// ─── Ping event handling ────────────────────────────────

describe("AnthropicTransformer — ping handling", () => {
  it("should return streaming delta for ping events", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();
    const event: AnthropicSSEEvent = { type: "ping" };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.state.type, "streaming");
    assert.equal(delta.content.length, 0);
  });
});

// ─── Usage with cache tokens ────────────────────────────

describe("AnthropicTransformer — cache usage", () => {
  it("should include cache tokens in usage", () => {
    const transformer = new AnthropicTransformer();
    const state = new TransformState();

    transformer.fromProviderDelta(
      {
        type: "message_start",
        message: {
          id: "msg_cache",
          model: "claude-sonnet-4-20250514",
          usage: {
            input_tokens: 100,
            output_tokens: 0,
            cache_creation_input_tokens: 50,
            cache_read_input_tokens: 30,
          },
        },
      },
      state,
    );

    transformer.fromProviderDelta(
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 10 },
      },
      state,
    );

    const delta = transformer.fromProviderDelta({ type: "message_stop" }, state);
    assert.ok(delta.usage);
    assert.equal(delta.usage!.cacheCreationInputTokens, 50);
    assert.equal(delta.usage!.cacheReadInputTokens, 30);
    assert.equal(delta.usage!.totalInputTokens, 180); // 100 + 50 + 30
  });
});
