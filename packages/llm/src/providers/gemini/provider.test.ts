/**
 * @flitter/llm — Gemini generateContent API Provider 测试
 *
 * 测试: GeminiTransformer, GeminiToolTransformer, fromProviderDelta, 完整流模拟
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GeminiTransformer, GeminiToolTransformer } from "./transformer";
import type { GeminiStreamChunk, GeminiContent } from "./transformer";
import { TransformState } from "../../types";
import type { Message, AssistantContentBlock } from "@flitter/schemas";
import type { SystemPromptBlock, ToolDefinition } from "../../types";

// ─── Helper ──────────────────────────────────────────────

function createUserMessage(content: Message["content"]): Message {
  return { role: "user", content } as Message;
}

function createAssistantMessage(content: AssistantContentBlock[]): Message {
  return { role: "assistant", content } as Message;
}

// ─── toProviderMessages 测试 ─────────────────────────────

describe("GeminiTransformer.toProviderMessages", () => {
  const transformer = new GeminiTransformer();
  const emptySystem: SystemPromptBlock[] = [];

  it("should convert UserMessage text to { text } part", () => {
    const msg = createUserMessage([{ type: "text", text: "Hello" }]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.equal(result[0].parts.length, 1);
    assert.deepEqual(result[0].parts[0], { text: "Hello" });
  });

  it("should convert UserMessage image to inlineData part", () => {
    const msg = createUserMessage([
      { type: "image", source: { type: "base64", mediaType: "image/png", data: "abc123" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0].parts[0], {
      inlineData: { mimeType: "image/png", data: "abc123" },
    });
  });

  it("should build systemInstruction from system prompt", () => {
    const system: SystemPromptBlock[] = [
      { type: "text", text: "You are helpful." },
      { type: "text", text: "Be concise." },
    ];
    const sysInstr = transformer.toSystemInstruction(system);
    assert.ok(sysInstr);
    assert.deepEqual(sysInstr, {
      parts: [{ text: "You are helpful.\n\nBe concise." }],
    });
  });

  it("should return undefined for empty system prompt", () => {
    const sysInstr = transformer.toSystemInstruction([]);
    assert.equal(sysInstr, undefined);
  });

  it("should convert ToolResultBlock to functionResponse", () => {
    const msg = createUserMessage([
      { type: "tool_result", toolUseID: "call_123", toolName: "bash", run: { status: "done", result: "output" } },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    const part = result[0].parts[0];
    assert.ok("functionResponse" in part);
    if ("functionResponse" in part) {
      assert.equal(part.functionResponse.name, "bash");
      assert.equal(part.functionResponse.response.content, "output");
    }
  });

  it("should convert AssistantMessage tool_use to functionCall", () => {
    const msg = createAssistantMessage([
      { type: "tool_use", id: "call_001", name: "bash", complete: true, input: { cmd: "ls" }, startTime: Date.now() },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "model");
    const part = result[0].parts[0];
    assert.ok("functionCall" in part);
    if ("functionCall" in part) {
      assert.equal(part.functionCall.name, "bash");
      assert.deepEqual(part.functionCall.args, { cmd: "ls" });
    }
  });

  it("should convert AssistantMessage thinking to thought part", () => {
    const msg = createAssistantMessage([
      { type: "thinking", thinking: "Let me think...", signature: "", provider: "gemini", startTime: Date.now() },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "model");
    const part = result[0].parts[0];
    assert.ok("thought" in part && part.thought === true);
    if ("text" in part) {
      assert.equal(part.text, "Let me think...");
    }
  });

  it("should merge adjacent same-role contents", () => {
    const msgs: Message[] = [
      createUserMessage([{ type: "text", text: "Hello" }]),
      createUserMessage([{ type: "text", text: "World" }]),
    ];
    const result = transformer.toProviderMessages(msgs, emptySystem);
    assert.equal(result.length, 1);
    assert.equal(result[0].role, "user");
    assert.equal(result[0].parts.length, 2);
  });

  it("should use role model instead of assistant", () => {
    const msg = createAssistantMessage([
      { type: "text", text: "Hi", startTime: Date.now() },
    ]);
    const result = transformer.toProviderMessages([msg], emptySystem);
    assert.equal(result[0].role, "model");
  });
});

// ─── fromProviderDelta 测试 ─────────────────────────────

describe("GeminiTransformer.fromProviderDelta", () => {
  it("should handle text part → text block", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: {
          role: "model",
          parts: [{ text: "Hello world" }],
        },
      }],
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "text");
    if (delta.content[0].type === "text") {
      assert.equal(delta.content[0].text, "Hello world");
    }
  });

  it("should handle thought part → thinking block", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: {
          role: "model",
          parts: [{ text: "Let me reason...", thought: true }],
        },
      }],
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "thinking");
    if (delta.content[0].type === "thinking") {
      assert.equal(delta.content[0].thinking, "Let me reason...");
      assert.equal(delta.content[0].provider, "gemini");
    }
  });

  it("should handle functionCall part → complete tool_use block", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: {
          role: "model",
          parts: [{ functionCall: { name: "bash", args: { cmd: "ls" } } }],
        },
      }],
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "tool_use");
    if (delta.content[0].type === "tool_use") {
      assert.equal(delta.content[0].name, "bash");
      assert.deepEqual(delta.content[0].input, { cmd: "ls" });
      assert.equal(delta.content[0].complete, true);
    }
  });

  it("should append text across multiple chunks", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();

    transformer.fromProviderDelta({
      candidates: [{
        content: { role: "model", parts: [{ text: "Hello " }] },
      }],
    }, state);

    const delta = transformer.fromProviderDelta({
      candidates: [{
        content: { role: "model", parts: [{ text: "world!" }] },
      }],
    }, state);

    assert.equal(delta.content.length, 1);
    if (delta.content[0].type === "text") {
      assert.equal(delta.content[0].text, "Hello world!");
    }
  });

  it("should handle finishReason STOP → end_turn", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: { role: "model", parts: [{ text: "Done" }] },
        finishReason: "STOP",
      }],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 10,
        totalTokenCount: 110,
      },
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.deepEqual(delta.state, { type: "complete", stopReason: "end_turn" });
  });

  it("should handle finishReason MAX_TOKENS → max_tokens", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: { role: "model", parts: [{ text: "..." }] },
        finishReason: "MAX_TOKENS",
      }],
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.deepEqual(delta.state, { type: "complete", stopReason: "max_tokens" });
  });

  it("should map usageMetadata correctly", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: { role: "model", parts: [{ text: "Hi" }] },
        finishReason: "STOP",
      }],
      usageMetadata: {
        promptTokenCount: 200,
        candidatesTokenCount: 50,
        totalTokenCount: 250,
        cachedContentTokenCount: 80,
      },
      modelVersion: "gemini-2.0-flash",
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.ok(delta.usage);
    assert.equal(delta.usage!.model, "gemini-2.0-flash");
    assert.equal(delta.usage!.totalInputTokens, 200);
    assert.equal(delta.usage!.outputTokens, 50);
    assert.equal(delta.usage!.cacheReadInputTokens, 80);
    assert.equal(delta.usage!.cacheCreationInputTokens, 120); // 200 - 80
  });

  it("should handle usage without cached tokens", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();
    const chunk: GeminiStreamChunk = {
      candidates: [{
        content: { role: "model", parts: [{ text: "Hi" }] },
        finishReason: "STOP",
      }],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        totalTokenCount: 120,
      },
    };
    const delta = transformer.fromProviderDelta(chunk, state);
    assert.ok(delta.usage);
    assert.equal(delta.usage!.cacheReadInputTokens, null);
    assert.equal(delta.usage!.cacheCreationInputTokens, 100);
  });
});

// ─── Full stream simulation 测试 ─────────────────────────

describe("GeminiTransformer — full stream simulation", () => {
  it("should handle simple text response", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();

    const chunks: GeminiStreamChunk[] = [
      { candidates: [{ content: { role: "model", parts: [{ text: "Hello " }] } }] },
      { candidates: [{ content: { role: "model", parts: [{ text: "there!" }] } }] },
      {
        candidates: [{
          content: { role: "model", parts: [{ text: "" }] },
          finishReason: "STOP",
        }],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 5, totalTokenCount: 55 },
      },
    ];

    let lastDelta = transformer.fromProviderDelta(chunks[0], state);
    for (let i = 1; i < chunks.length; i++) {
      lastDelta = transformer.fromProviderDelta(chunks[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(lastDelta.content.length, 1);
    if (lastDelta.content[0].type === "text") {
      assert.equal(lastDelta.content[0].text, "Hello there!");
    }
  });

  it("should handle thinking + text interleaved", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();

    const chunks: GeminiStreamChunk[] = [
      { candidates: [{ content: { role: "model", parts: [{ text: "Let me think...", thought: true }] } }] },
      { candidates: [{ content: { role: "model", parts: [{ text: " more thinking", thought: true }] } }] },
      { candidates: [{ content: { role: "model", parts: [{ text: "The answer is 42." }] } }] },
      {
        candidates: [{
          content: { role: "model", parts: [] },
          finishReason: "STOP",
        }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 },
      },
    ];

    let lastDelta = transformer.fromProviderDelta(chunks[0], state);
    for (let i = 1; i < chunks.length; i++) {
      lastDelta = transformer.fromProviderDelta(chunks[i], state);
    }

    assert.deepEqual(lastDelta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(lastDelta.content.length, 2);

    assert.equal(lastDelta.content[0].type, "thinking");
    if (lastDelta.content[0].type === "thinking") {
      assert.equal(lastDelta.content[0].thinking, "Let me think... more thinking");
    }

    assert.equal(lastDelta.content[1].type, "text");
    if (lastDelta.content[1].type === "text") {
      assert.equal(lastDelta.content[1].text, "The answer is 42.");
    }
  });

  it("should handle function call response", () => {
    const transformer = new GeminiTransformer();
    const state = new TransformState();

    const chunks: GeminiStreamChunk[] = [
      {
        candidates: [{
          content: {
            role: "model",
            parts: [{ functionCall: { name: "bash", args: { command: "ls -la" } } }],
          },
          finishReason: "STOP",
        }],
        usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 15, totalTokenCount: 95 },
      },
    ];

    const delta = transformer.fromProviderDelta(chunks[0], state);

    assert.deepEqual(delta.state, { type: "complete", stopReason: "end_turn" });
    assert.equal(delta.content.length, 1);
    assert.equal(delta.content[0].type, "tool_use");
    if (delta.content[0].type === "tool_use") {
      assert.equal(delta.content[0].name, "bash");
      assert.deepEqual(delta.content[0].input, { command: "ls -la" });
      assert.equal(delta.content[0].complete, true);
    }
  });
});

// ─── Tool transformer 测试 ────────────────────────────────

describe("GeminiToolTransformer", () => {
  const toolTransformer = new GeminiToolTransformer();

  it("should convert ToolDefinition to GeminiFunctionDeclaration", () => {
    const tools: ToolDefinition[] = [{
      name: "bash",
      description: "Run a command",
      inputSchema: { type: "object", properties: { cmd: { type: "string" } }, required: ["cmd"] },
    }];
    const result = toolTransformer.toProviderTools(tools);
    assert.equal(result.length, 1);
    assert.equal(result[0].functionDeclarations.length, 1);
    assert.equal(result[0].functionDeclarations[0].name, "bash");
    assert.equal(result[0].functionDeclarations[0].description, "Run a command");
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
    assert.equal(result.length, 1);
    assert.equal(result[0].functionDeclarations.length, 2);
    assert.equal(result[0].functionDeclarations[0].name, "bash");
    assert.equal(result[0].functionDeclarations[0].description, "First");
    assert.equal(result[0].functionDeclarations[1].name, "read");
  });
});

// ─── Provider identity 测试 ────────────────────────────────

describe("GeminiProvider — identity", () => {
  it("should have name 'gemini'", async () => {
    const { GeminiProvider } = await import("./provider");
    const provider = new GeminiProvider();
    assert.equal(provider.name, "gemini");
  });
});
