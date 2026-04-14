/**
 * @flitter/llm — OpenAI Responses API Provider 测试
 *
 * 测试: OpenAITransformer, OpenAIToolTransformer, fromProviderDelta, 完整流模拟
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantContentBlock, Message } from "@flitter/schemas";
import type { SystemPromptBlock, ToolDefinition } from "../../types";
import { TransformState } from "../../types";
import type { OpenAIResponse, OpenAISSEEvent } from "./transformer";
import { OpenAIToolTransformer, OpenAITransformer } from "./transformer";

// ─── Helper ──────────────────────────────────────────────

function createUserMessage(content: Message["content"]): Message {
  return { role: "user", content } as Message;
}

function createAssistantMessage(content: AssistantContentBlock[]): Message {
  return { role: "assistant", content } as Message;
}

// ─── toProviderMessages 测试 ─────────────────────────────

describe("OpenAITransformer.toProviderMessages", () => {
  const transformer = new OpenAITransformer();
  const emptySystem: SystemPromptBlock[] = [];

  it("should convert system prompt to system role", () => {
    const system: SystemPromptBlock[] = [
      { type: "text", text: "You are helpful." },
      { type: "text", text: "Be concise." },
    ];
    const result = transformer.toProviderMessages([], system);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], { role: "system", content: "You are helpful.\n\nBe concise." });
  });

  it("should convert UserMessage text to input_text", () => {
    const msg = createUserMessage([{ type: "text", text: "Hello" }]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], { role: "user", content: "Hello" });
  });

  it("should convert UserMessage image (base64) to input_image", () => {
    const msg = createUserMessage([
      { type: "image", source: { type: "base64", mediaType: "image/png", data: "abc123" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      role: "user",
      content: [
        {
          type: "input_image",
          image_url: { url: "data:image/png;base64,abc123" },
        },
      ],
    });
  });

  it("should convert UserMessage image (url) to input_image", () => {
    const msg = createUserMessage([
      { type: "image", source: { type: "url", url: "https://example.com/img.png" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      role: "user",
      content: [
        {
          type: "input_image",
          image_url: { url: "https://example.com/img.png" },
        },
      ],
    });
  });

  it("should convert ToolResultBlock to tool role", () => {
    const msg = createUserMessage([
      { type: "tool_result", toolUseID: "call_123", run: { status: "done", result: "42" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      role: "tool",
      tool_call_id: "call_123",
      content: "42",
    });
  });

  it("should convert AssistantMessage text to assistant role", () => {
    const msg = createAssistantMessage([{ type: "text", text: "Hi there", startTime: Date.now() }]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "assistant");
    assert.equal(result[0].content, "Hi there");
  });

  it("should convert info message summary to assistant role", () => {
    const msg: Message = {
      role: "info",
      content: [
        { type: "summary", summary: { type: "message", summary: "Previous conversation summary" } },
      ],
    } as unknown as Message;
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "assistant");
    assert.equal(result[0].content, "Previous conversation summary");
  });

  it("should handle text + image mixed content", () => {
    const msg = createUserMessage([
      { type: "text", text: "Look at this" },
      { type: "image", source: { type: "url", url: "https://example.com/img.png" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.ok(Array.isArray(result[0].content));
    const content = result[0].content as unknown[];
    assert.equal(content.length, 2);
  });
});

// ─── fromProviderDelta 测试 ─────────────────────────────

describe("OpenAITransformer.fromProviderDelta", () => {
  it("should handle response.created", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    const event: OpenAISSEEvent = {
      type: "response.created",
      response: {
        id: "resp_001",
        model: "gpt-4o",
        status: "in_progress",
        output: [],
      },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.deepEqual(delta.state, { type: "streaming" });
  });

  it("should handle response.output_item.added (message)", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    // First create response
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );

    const event: OpenAISSEEvent = {
      type: "response.output_item.added",
      output_index: 0,
      item: { type: "message", content: [{ type: "output_text", text: "" }] },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "text");
  });

  it("should handle response.output_item.added (reasoning)", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "o3", status: "in_progress", output: [] },
      },
      state,
    );

    const event: OpenAISSEEvent = {
      type: "response.output_item.added",
      output_index: 0,
      item: { type: "reasoning", content: [] },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "thinking");
    if (delta.content[0].type === "thinking") {
      assert.equal(delta.content[0].provider, "openai");
    }
  });

  it("should handle response.output_item.added (function_call)", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );

    const event: OpenAISSEEvent = {
      type: "response.output_item.added",
      output_index: 0,
      item: {
        type: "function_call",
        id: "fc_001",
        name: "bash",
        arguments: "",
        call_id: "call_001",
      },
    };
    const delta = transformer.fromProviderDelta(event, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "tool_use");
    if (delta.content[0].type === "tool_use") {
      assert.equal(delta.content[0].id, "call_001");
      assert.equal(delta.content[0].name, "bash");
      assert.equal(delta.content[0].complete, false);
    }
  });

  it("should handle response.output_text.delta — append text", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "message", content: [] },
      },
      state,
    );

    transformer.fromProviderDelta(
      {
        type: "response.output_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "Hello ",
      },
      state,
    );
    const delta = transformer.fromProviderDelta(
      {
        type: "response.output_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "world!",
      },
      state,
    );

    assert.equal(delta.content.length, 1);
    if (delta.content[0].type === "text") {
      assert.equal(delta.content[0].text, "Hello world!");
    }
  });

  it("should handle response.reasoning.delta — append thinking", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "o3", status: "in_progress", output: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "reasoning", content: [] },
      },
      state,
    );

    transformer.fromProviderDelta(
      {
        type: "response.reasoning_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "Let me ",
      },
      state,
    );
    const delta = transformer.fromProviderDelta(
      {
        type: "response.reasoning_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "think...",
      },
      state,
    );

    assert.equal(delta.content.length, 1);
    if (delta.content[0].type === "thinking") {
      assert.equal(delta.content[0].thinking, "Let me think...");
    }
  });

  it("should handle response.function_call_arguments.delta — accumulate JSON", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_item.added",
        output_index: 0,
        item: {
          type: "function_call",
          id: "fc_001",
          name: "bash",
          arguments: "",
          call_id: "call_001",
        },
      },
      state,
    );

    transformer.fromProviderDelta(
      {
        type: "response.function_call_arguments.delta",
        output_index: 0,
        delta: '{"cmd":',
      },
      state,
    );

    // Check inputPartialJSON was set
    const block = state.blocks.get(0);
    assert.ok(block);
    assert.deepEqual(block.data.inputPartialJSON, { json: '{"cmd":' });
  });

  it("should handle response.output_item.done", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "message", content: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "Hello",
      },
      state,
    );

    const _delta = transformer.fromProviderDelta(
      {
        type: "response.output_item.done",
        output_index: 0,
        item: { type: "message", content: [{ type: "output_text", text: "Hello" }] },
      },
      state,
    );

    const block = state.blocks.get(0);
    assert.ok(block?.finalTime);
  });

  it("should handle response.completed → complete delta with usage", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "message", content: [] },
      },
      state,
    );
    transformer.fromProviderDelta(
      {
        type: "response.output_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "Hi",
      },
      state,
    );

    const response: OpenAIResponse = {
      id: "resp_001",
      model: "gpt-4o",
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "Hi" }] }],
      usage: {
        input_tokens: 100,
        output_tokens: 10,
        input_tokens_details: { cached_tokens: 30 },
      },
    };

    const delta = transformer.fromProviderDelta(
      {
        type: "response.completed",
        response,
      },
      state,
    );

    assert.deepEqual(delta.state, { type: "complete", stopReason: "end_turn" });
    assert.ok(delta.usage);
    assert.equal(delta.usage!.model, "gpt-4o");
    assert.equal(delta.usage!.outputTokens, 10);
    assert.equal(delta.usage!.totalInputTokens, 100);
    assert.equal(delta.usage!.cacheReadInputTokens, 30);
    assert.equal(delta.usage!.cacheCreationInputTokens, 70);
  });

  it("should handle response.failed → error delta", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    const delta = transformer.fromProviderDelta(
      {
        type: "response.failed",
        response: { id: "resp_001", model: "gpt-4o", status: "failed", output: [] },
        error: { message: "Rate limit exceeded" },
      },
      state,
    );

    assert.deepEqual(delta.state, { type: "error", error: { message: "Rate limit exceeded" } });
  });

  it("should handle keepalive events", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();
    const delta = transformer.fromProviderDelta({ type: "keepalive" }, state);
    assert.deepEqual(delta.state, { type: "streaming" });
  });
});

// ─── Full stream simulation 测试 ─────────────────────────

describe("OpenAITransformer — full stream simulation", () => {
  it("should handle simple text response stream", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    const events: OpenAISSEEvent[] = [
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "message", content: [] },
      },
      {
        type: "response.output_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "Hello ",
      },
      {
        type: "response.output_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "world!",
      },
      {
        type: "response.output_item.done",
        output_index: 0,
        item: { type: "message", content: [{ type: "output_text", text: "Hello world!" }] },
      },
      {
        type: "response.completed",
        response: {
          id: "resp_001",
          model: "gpt-4o",
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: "Hello world!" }] }],
          usage: { input_tokens: 50, output_tokens: 5 },
        },
      },
    ];

    let lastDelta = transformer.fromProviderDelta(events[0], state);
    for (let i = 1; i < events.length; i++) {
      lastDelta = transformer.fromProviderDelta(events[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(lastDelta.content.length, 1);
    if (lastDelta.content[0].type === "text") {
      assert.equal(lastDelta.content[0].text, "Hello world!");
    }
    assert.ok(lastDelta.usage);
    assert.equal(lastDelta.usage!.outputTokens, 5);
  });

  it("should handle tool_use response with JSON accumulation", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    const events: OpenAISSEEvent[] = [
      {
        type: "response.created",
        response: { id: "resp_002", model: "gpt-4o", status: "in_progress", output: [] },
      },
      {
        type: "response.output_item.added",
        output_index: 0,
        item: {
          type: "function_call",
          id: "fc_001",
          name: "bash",
          arguments: "",
          call_id: "call_001",
        },
      },
      {
        type: "response.function_call_arguments.delta",
        output_index: 0,
        delta: '{"command"',
      },
      {
        type: "response.function_call_arguments.delta",
        output_index: 0,
        delta: ':"ls -la"}',
      },
      {
        type: "response.function_call_arguments.done",
        output_index: 0,
        name: "bash",
        arguments: '{"command":"ls -la"}',
      },
      {
        type: "response.output_item.done",
        output_index: 0,
        item: {
          type: "function_call",
          id: "fc_001",
          name: "bash",
          arguments: '{"command":"ls -la"}',
          call_id: "call_001",
        },
      },
      {
        type: "response.completed",
        response: {
          id: "resp_002",
          model: "gpt-4o",
          status: "completed",
          output: [
            {
              type: "function_call",
              id: "fc_001",
              name: "bash",
              arguments: '{"command":"ls -la"}',
              call_id: "call_001",
            },
          ],
          usage: { input_tokens: 80, output_tokens: 20 },
        },
      },
    ];

    let lastDelta = transformer.fromProviderDelta(events[0], state);
    for (let i = 1; i < events.length; i++) {
      lastDelta = transformer.fromProviderDelta(events[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "tool_use" });
    assert.equal(lastDelta.content.length, 1);
    if (lastDelta.content[0].type === "tool_use") {
      assert.equal(lastDelta.content[0].name, "bash");
      assert.equal(lastDelta.content[0].id, "call_001");
      assert.deepEqual(lastDelta.content[0].input, { command: "ls -la" });
      assert.equal(lastDelta.content[0].complete, true);
    }
  });

  it("should handle reasoning + text interleaved stream", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    const events: OpenAISSEEvent[] = [
      {
        type: "response.created",
        response: { id: "resp_003", model: "o3", status: "in_progress", output: [] },
      },
      // Reasoning block
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "reasoning", content: [] },
      },
      {
        type: "response.reasoning_text.delta",
        output_index: 0,
        content_index: 0,
        delta: "Let me think about this...",
      },
      {
        type: "response.output_item.done",
        output_index: 0,
        item: {
          type: "reasoning",
          id: "rs_001",
          content: [{ type: "reasoning_text", text: "Let me think about this..." }],
          encrypted_content: "enc_abc123",
        },
      },
      // Message block
      {
        type: "response.output_item.added",
        output_index: 1,
        item: { type: "message", content: [] },
      },
      {
        type: "response.output_text.delta",
        output_index: 1,
        content_index: 0,
        delta: "The answer is 42.",
      },
      {
        type: "response.output_item.done",
        output_index: 1,
        item: { type: "message", content: [{ type: "output_text", text: "The answer is 42." }] },
      },
      {
        type: "response.completed",
        response: {
          id: "resp_003",
          model: "o3",
          status: "completed",
          output: [
            {
              type: "reasoning",
              id: "rs_001",
              content: [{ type: "reasoning_text", text: "Let me think about this..." }],
              encrypted_content: "enc_abc123",
            },
            { type: "message", content: [{ type: "output_text", text: "The answer is 42." }] },
          ],
          usage: {
            input_tokens: 200,
            output_tokens: 50,
            input_tokens_details: { cached_tokens: 100 },
          },
        },
      },
    ];

    let lastDelta = transformer.fromProviderDelta(events[0], state);
    for (let i = 1; i < events.length; i++) {
      lastDelta = transformer.fromProviderDelta(events[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(lastDelta.content.length, 2);

    // First block: thinking
    assert.equal(lastDelta.content[0].type, "thinking");
    if (lastDelta.content[0].type === "thinking") {
      assert.equal(lastDelta.content[0].thinking, "Let me think about this...");
      assert.equal(lastDelta.content[0].signature, "enc_abc123");
      assert.equal(lastDelta.content[0].provider, "openai");
    }

    // Second block: text
    assert.equal(lastDelta.content[1].type, "text");
    if (lastDelta.content[1].type === "text") {
      assert.equal(lastDelta.content[1].text, "The answer is 42.");
    }

    // Usage with cached tokens
    assert.ok(lastDelta.usage);
    assert.equal(lastDelta.usage!.cacheReadInputTokens, 100);
    assert.equal(lastDelta.usage!.cacheCreationInputTokens, 100); // 200 - 100
    assert.equal(lastDelta.usage!.totalInputTokens, 200);
  });
});

// ─── Tool transformer 测试 ────────────────────────────────

describe("OpenAIToolTransformer", () => {
  const toolTransformer = new OpenAIToolTransformer();

  it("should convert ToolDefinition to OpenAI function tool", () => {
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
    assert.equal(result[0].name, "bash");
    assert.equal(result[0].description, "Run a command");
    assert.equal(result[0].strict, false);
    assert.ok(result[0].parameters);
  });

  it("should return empty array for empty tools", () => {
    const result = toolTransformer.toProviderTools([]);
    assert.equal(result.length, 0);
  });

  it("should deduplicate tools by name", () => {
    const tools: ToolDefinition[] = [
      { name: "bash", description: "First", inputSchema: {} },
      { name: "bash", description: "Second", inputSchema: {} },
      { name: "read", description: "Read file", inputSchema: {} },
    ];
    const result = toolTransformer.toProviderTools(tools);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, "bash");
    assert.equal(result[0].description, "First");
    assert.equal(result[1].name, "read");
  });
});

// ─── Usage 计算测试 ──────────────────────────────────────

describe("OpenAITransformer — usage calculation", () => {
  it("should correctly calculate cacheCreationInputTokens", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );

    const delta = transformer.fromProviderDelta(
      {
        type: "response.completed",
        response: {
          id: "resp_001",
          model: "gpt-4o",
          status: "completed",
          output: [],
          usage: {
            input_tokens: 500,
            output_tokens: 100,
            input_tokens_details: { cached_tokens: 200 },
          },
        },
      },
      state,
    );

    assert.ok(delta.usage);
    assert.equal(delta.usage!.cacheReadInputTokens, 200);
    assert.equal(delta.usage!.cacheCreationInputTokens, 300); // 500 - 200
    assert.equal(delta.usage!.totalInputTokens, 500);
    assert.equal(delta.usage!.inputTokens, 0); // OpenAI doesn't have separate inputTokens
  });

  it("should handle usage without cached tokens", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );

    const delta = transformer.fromProviderDelta(
      {
        type: "response.completed",
        response: {
          id: "resp_001",
          model: "gpt-4o",
          status: "completed",
          output: [],
          usage: { input_tokens: 100, output_tokens: 50 },
        },
      },
      state,
    );

    assert.ok(delta.usage);
    assert.equal(delta.usage!.cacheReadInputTokens, null);
    assert.equal(delta.usage!.cacheCreationInputTokens, 100);
    assert.equal(delta.usage!.totalInputTokens, 100);
  });
});

// ─── 配置测试 ────────────────────────────────────────────

describe("OpenAITransformer — response.completed stop reason", () => {
  it("should set tool_use stop reason when function_call present", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );

    const delta = transformer.fromProviderDelta(
      {
        type: "response.completed",
        response: {
          id: "resp_001",
          model: "gpt-4o",
          status: "completed",
          output: [
            {
              type: "function_call",
              id: "fc_001",
              name: "bash",
              arguments: "{}",
              call_id: "call_001",
            },
          ],
          usage: { input_tokens: 50, output_tokens: 10 },
        },
      },
      state,
    );

    assert.deepEqual(delta.state, { type: "complete", stopReason: "tool_use" });
  });

  it("should set end_turn stop reason for text-only response", () => {
    const transformer = new OpenAITransformer();
    const state = new TransformState();

    transformer.fromProviderDelta(
      {
        type: "response.created",
        response: { id: "resp_001", model: "gpt-4o", status: "in_progress", output: [] },
      },
      state,
    );

    const delta = transformer.fromProviderDelta(
      {
        type: "response.completed",
        response: {
          id: "resp_001",
          model: "gpt-4o",
          status: "completed",
          output: [{ type: "message", content: [{ type: "output_text", text: "Hi" }] }],
          usage: { input_tokens: 50, output_tokens: 10 },
        },
      },
      state,
    );

    assert.deepEqual(delta.state, { type: "complete", stopReason: "end_turn" });
  });
});
