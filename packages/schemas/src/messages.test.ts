import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
  UsageSchema,
  ToolRunSchema,
  ToolRunDoneSchema,
  ToolRunErrorSchema,
  ToolRunCancelledSchema,
  ToolRunRejectedSchema,
  ToolRunInProgressSchema,
  MessageStateSchema,
  MessageStateStreamingSchema,
  MessageStateCompleteSchema,
  MessageStateCancelledSchema,
  MessageStateErrorSchema,
  UserContentBlockSchema,
  TextBlockSchema,
  ImageBlockSchema,
  ToolResultBlockSchema,
  AssistantContentBlockSchema,
  TextContentBlockSchema,
  ToolUseBlockSchema,
  ThinkingBlockSchema,
  RedactedThinkingBlockSchema,
  ServerToolUseBlockSchema,
  InfoContentBlockSchema,
  ManualBashInvocationBlockSchema,
  SummaryBlockSchema,
  UserMessageSchema,
  AssistantMessageSchema,
  InfoMessageSchema,
  MessageSchema,
  FileMentionsSchema,
  CacheControlSchema,
  ImageSourceSchema,
} from "./messages";

// ─── Usage ──────────────────────────────────────────────

describe("UsageSchema", () => {
  it("should parse valid usage data with all required fields", () => {
    const data = {
      model: "claude-opus-4-5-20251101",
      maxInputTokens: 200000,
      inputTokens: 1500,
      outputTokens: 300,
      cacheCreationInputTokens: 100,
      cacheReadInputTokens: 50,
      totalInputTokens: 1650,
      timestamp: "2026-04-12T10:00:00Z",
    };
    const result = UsageSchema.parse(data);
    assert.equal(result.model, "claude-opus-4-5-20251101");
    assert.equal(result.inputTokens, 1500);
    assert.equal(result.totalInputTokens, 1650);
  });

  it("should parse usage with nullable cache fields set to null", () => {
    const data = {
      model: "claude-sonnet-4-20250514",
      maxInputTokens: 100000,
      inputTokens: 500,
      outputTokens: 100,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      totalInputTokens: 500,
      timestamp: "2026-04-12T10:00:00Z",
    };
    const result = UsageSchema.parse(data);
    assert.equal(result.cacheCreationInputTokens, null);
    assert.equal(result.cacheReadInputTokens, null);
  });

  it("should parse usage with optional thinkingBudget", () => {
    const data = {
      model: "claude-opus-4-5-20251101",
      maxInputTokens: 200000,
      inputTokens: 1500,
      outputTokens: 300,
      cacheCreationInputTokens: null,
      cacheReadInputTokens: null,
      totalInputTokens: 1500,
      thinkingBudget: 10000,
      timestamp: "2026-04-12T10:00:00Z",
    };
    const result = UsageSchema.parse(data);
    assert.equal(result.thinkingBudget, 10000);
  });
});

// ─── ToolRun discriminated union ────────────────────────

describe("ToolRunSchema", () => {
  it("should parse done status with result and trackFiles", () => {
    const data = {
      status: "done",
      result: { output: "hello world" },
      trackFiles: ["/tmp/a.txt", "/tmp/b.txt"],
    };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "done");
  });

  it("should parse done status with minimal fields", () => {
    const data = { status: "done" };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "done");
  });

  it("should parse error status with message and errorCode", () => {
    const data = {
      status: "error",
      error: { message: "something went wrong", errorCode: "E001" },
    };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "error");
    assert.equal(result.error.message, "something went wrong");
    assert.equal(result.error.errorCode, "E001");
  });

  it("should parse error status with only message", () => {
    const data = {
      status: "error",
      error: { message: "failed" },
    };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "error");
    assert.equal(result.error.errorCode, undefined);
  });

  it("should parse cancelled status with reason", () => {
    const data = { status: "cancelled", reason: "user requested" };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "cancelled");
    assert.equal(result.reason, "user requested");
  });

  it("should parse rejected-by-user status", () => {
    const data = { status: "rejected-by-user", reason: "not allowed" };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "rejected-by-user");
  });

  it("should parse in-progress status with progress", () => {
    const data = { status: "in-progress", progress: { percent: 50 } };
    const result = ToolRunSchema.parse(data);
    assert.equal(result.status, "in-progress");
  });
});

// ─── MessageState discriminated union ───────────────────

describe("MessageStateSchema", () => {
  it("should parse streaming state", () => {
    const result = MessageStateSchema.parse({ type: "streaming" });
    assert.equal(result.type, "streaming");
  });

  it("should parse complete state with end_turn", () => {
    const result = MessageStateSchema.parse({
      type: "complete",
      stopReason: "end_turn",
    });
    assert.equal(result.type, "complete");
    assert.equal(result.stopReason, "end_turn");
  });

  it("should parse complete state with tool_use stopReason", () => {
    const result = MessageStateSchema.parse({
      type: "complete",
      stopReason: "tool_use",
    });
    assert.equal(result.stopReason, "tool_use");
  });

  it("should parse complete state with max_tokens stopReason", () => {
    const result = MessageStateSchema.parse({
      type: "complete",
      stopReason: "max_tokens",
    });
    assert.equal(result.stopReason, "max_tokens");
  });

  it("should parse cancelled state", () => {
    const result = MessageStateSchema.parse({ type: "cancelled" });
    assert.equal(result.type, "cancelled");
  });

  it("should parse error state", () => {
    const result = MessageStateSchema.parse({
      type: "error",
      error: { message: "internal error" },
    });
    assert.equal(result.type, "error");
    assert.equal(result.error.message, "internal error");
  });
});

// ─── UserContentBlock ───────────────────────────────────

describe("UserContentBlockSchema", () => {
  it("should parse a text block", () => {
    const data = { type: "text", text: "Hello, world!" };
    const result = UserContentBlockSchema.parse(data);
    assert.equal(result.type, "text");
    assert.equal(result.text, "Hello, world!");
  });

  it("should parse a text block with cache_control", () => {
    const data = {
      type: "text",
      text: "cached text",
      cache_control: { type: "ephemeral", ttl: "300s" },
    };
    const result = UserContentBlockSchema.parse(data);
    assert.equal(result.type, "text");
    assert.deepEqual(result.cache_control, { type: "ephemeral", ttl: "300s" });
  });

  it("should parse an image block with base64 source", () => {
    const data = {
      type: "image",
      source: {
        type: "base64",
        mediaType: "image/png",
        data: "iVBORw0KGgo=",
      },
    };
    const result = UserContentBlockSchema.parse(data);
    assert.equal(result.type, "image");
    assert.equal(result.source.type, "base64");
  });

  it("should parse an image block with url source", () => {
    const data = {
      type: "image",
      source: { type: "url", url: "https://example.com/image.png" },
      sourcePath: "/tmp/image.png",
    };
    const result = UserContentBlockSchema.parse(data);
    assert.equal(result.type, "image");
    assert.equal(result.source.type, "url");
  });

  it("should parse a tool_result block", () => {
    const data = {
      type: "tool_result",
      toolUseID: "tool_abc123",
      run: { status: "done", result: "output data" },
    };
    const result = UserContentBlockSchema.parse(data);
    assert.equal(result.type, "tool_result");
    assert.equal(result.toolUseID, "tool_abc123");
  });
});

// ─── AssistantContentBlock ──────────────────────────────

describe("AssistantContentBlockSchema", () => {
  it("should parse a text block", () => {
    const data = { type: "text", text: "Here is my response." };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "text");
    assert.equal(result.text, "Here is my response.");
  });

  it("should parse a text block with timing fields", () => {
    const data = {
      type: "text",
      text: "timed",
      startTime: 1000,
      finalTime: 2000,
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "text");
    assert.equal(result.startTime, 1000);
    assert.equal(result.finalTime, 2000);
  });

  it("should parse a tool_use block with all fields", () => {
    const data = {
      type: "tool_use",
      id: "tu_001",
      name: "Bash",
      complete: true,
      input: { command: "ls -la" },
      inputPartialJSON: { json: '{"command":"ls' },
      inputIncomplete: { command: "ls" },
      startTime: 100,
      finalTime: 200,
      metadata: { thoughtSignature: "sig123" },
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "tool_use");
    assert.equal(result.name, "Bash");
    assert.equal(result.complete, true);
    assert.deepEqual(result.input, { command: "ls -la" });
  });

  it("should parse a tool_use block with minimal fields", () => {
    const data = {
      type: "tool_use",
      id: "tu_002",
      name: "Read",
      complete: false,
      input: {},
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "tool_use");
    assert.equal(result.complete, false);
  });

  it("should parse a thinking block", () => {
    const data = {
      type: "thinking",
      thinking: "Let me reason about this...",
      signature: "sig_abc",
      provider: "anthropic",
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "thinking");
    assert.equal(result.thinking, "Let me reason about this...");
    assert.equal(result.signature, "sig_abc");
  });

  it("should parse a thinking block with openAIReasoning", () => {
    const data = {
      type: "thinking",
      thinking: "reasoning content",
      signature: "sig_oai",
      provider: "openai",
      openAIReasoning: {
        id: "reasoning_001",
        encryptedContent: "enc_data_here",
      },
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "thinking");
    assert.deepEqual(result.openAIReasoning, {
      id: "reasoning_001",
      encryptedContent: "enc_data_here",
    });
  });

  it("should parse a redacted_thinking block", () => {
    const data = {
      type: "redacted_thinking",
      data: "redacted_payload",
      provider: "vertexai",
      startTime: 500,
      finalTime: 600,
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "redacted_thinking");
    assert.equal(result.data, "redacted_payload");
    assert.equal(result.provider, "vertexai");
  });

  it("should parse a server_tool_use block", () => {
    const data = {
      type: "server_tool_use",
      id: "stu_001",
      name: "web_search",
      input: { query: "zod v4 docs" },
    };
    const result = AssistantContentBlockSchema.parse(data);
    assert.equal(result.type, "server_tool_use");
    assert.equal(result.name, "web_search");
  });
});

// ─── InfoContentBlock ───────────────────────────────────

describe("InfoContentBlockSchema", () => {
  it("should parse a manual_bash_invocation block", () => {
    const data = {
      type: "manual_bash_invocation",
      args: { cmd: "npm test", cwd: "/home/user/project" },
      toolRun: { status: "done", result: "all tests passed" },
    };
    const result = InfoContentBlockSchema.parse(data);
    assert.equal(result.type, "manual_bash_invocation");
    assert.equal(result.args.cmd, "npm test");
    assert.equal(result.args.cwd, "/home/user/project");
  });

  it("should parse a manual_bash_invocation block with hidden flag", () => {
    const data = {
      type: "manual_bash_invocation",
      args: { cmd: "echo secret" },
      toolRun: { status: "done" },
      hidden: true,
    };
    const result = InfoContentBlockSchema.parse(data);
    assert.equal(result.type, "manual_bash_invocation");
    assert.equal(result.hidden, true);
  });

  it("should parse a summary block", () => {
    const data = {
      type: "summary",
      summary: {
        type: "message",
        summary: "The conversation was about testing Zod schemas.",
      },
    };
    const result = InfoContentBlockSchema.parse(data);
    assert.equal(result.type, "summary");
    assert.equal(result.summary.type, "message");
    assert.equal(
      result.summary.summary,
      "The conversation was about testing Zod schemas.",
    );
  });
});

// ─── UserMessage ────────────────────────────────────────

describe("UserMessageSchema", () => {
  it("should parse a full user message", () => {
    const data = {
      role: "user",
      messageId: 1,
      content: [{ type: "text", text: "Hello!" }],
      dtwMessageID: "dtw_001",
      interrupted: false,
      agentMode: "code",
      meta: { sentAt: 1712900000, fromAggman: true },
      readAt: 1712900001,
    };
    const result = UserMessageSchema.parse(data);
    assert.equal(result.role, "user");
    assert.equal(result.messageId, 1);
    assert.equal(result.content.length, 1);
    assert.equal(result.agentMode, "code");
  });

  it("should parse a minimal user message", () => {
    const data = {
      role: "user",
      messageId: 0,
      content: [],
    };
    const result = UserMessageSchema.parse(data);
    assert.equal(result.role, "user");
    assert.equal(result.content.length, 0);
  });
});

// ─── AssistantMessage ───────────────────────────────────

describe("AssistantMessageSchema", () => {
  it("should parse a full assistant message with state and usage", () => {
    const data = {
      role: "assistant",
      messageId: 2,
      content: [{ type: "text", text: "Here is the answer." }],
      state: { type: "complete", stopReason: "end_turn" },
      usage: {
        model: "claude-opus-4-5-20251101",
        maxInputTokens: 200000,
        inputTokens: 500,
        outputTokens: 100,
        cacheCreationInputTokens: null,
        cacheReadInputTokens: null,
        totalInputTokens: 500,
        timestamp: "2026-04-12T10:00:00Z",
      },
      dtwMessageID: "dtw_002",
      readAt: 1712900010,
      nativeMessage: { id: "msg_native", type: "message" },
      meta: { openAIResponsePhase: "final_answer" },
      parentToolUseId: "tu_parent",
    };
    const result = AssistantMessageSchema.parse(data);
    assert.equal(result.role, "assistant");
    assert.equal(result.state.type, "complete");
    assert.equal(result.usage?.model, "claude-opus-4-5-20251101");
    assert.equal(result.meta?.openAIResponsePhase, "final_answer");
    assert.equal(result.parentToolUseId, "tu_parent");
  });

  it("should parse an assistant message in streaming state without usage", () => {
    const data = {
      role: "assistant",
      messageId: 3,
      content: [
        {
          type: "thinking",
          thinking: "reasoning...",
          signature: "sig1",
        },
        { type: "text", text: "partial..." },
      ],
      state: { type: "streaming" },
    };
    const result = AssistantMessageSchema.parse(data);
    assert.equal(result.role, "assistant");
    assert.equal(result.state.type, "streaming");
    assert.equal(result.content.length, 2);
    assert.equal(result.usage, undefined);
  });
});

// ─── InfoMessage ────────────────────────────────────────

describe("InfoMessageSchema", () => {
  it("should parse a full info message", () => {
    const data = {
      role: "info",
      messageId: 10,
      content: [
        {
          type: "manual_bash_invocation",
          args: { cmd: "git status" },
          toolRun: { status: "done", result: "clean" },
        },
      ],
      dtwMessageID: "dtw_info_001",
    };
    const result = InfoMessageSchema.parse(data);
    assert.equal(result.role, "info");
    assert.equal(result.messageId, 10);
    assert.equal(result.content.length, 1);
    assert.equal(result.dtwMessageID, "dtw_info_001");
  });
});

// ─── MessageSchema discriminated union ──────────────────

describe("MessageSchema", () => {
  it("should parse a user message by role", () => {
    const data = {
      role: "user",
      messageId: 1,
      content: [{ type: "text", text: "hi" }],
    };
    const result = MessageSchema.parse(data);
    assert.equal(result.role, "user");
  });

  it("should parse an assistant message by role", () => {
    const data = {
      role: "assistant",
      messageId: 2,
      content: [{ type: "text", text: "hello" }],
      state: { type: "complete", stopReason: "end_turn" },
    };
    const result = MessageSchema.parse(data);
    assert.equal(result.role, "assistant");
  });

  it("should parse an info message by role", () => {
    const data = {
      role: "info",
      messageId: 3,
      content: [
        {
          type: "summary",
          summary: { type: "message", summary: "a summary" },
        },
      ],
    };
    const result = MessageSchema.parse(data);
    assert.equal(result.role, "info");
  });
});

// ─── FileMentions ───────────────────────────────────────

describe("FileMentionsSchema", () => {
  it("should parse file mentions with files and mentions", () => {
    const data = {
      files: [
        {
          uri: "file:///home/user/code.ts",
          content: "export const x = 1;",
          isImage: false,
        },
      ],
      mentions: [{ uri: "file:///home/user/code.ts" }],
    };
    const result = FileMentionsSchema.parse(data);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].uri, "file:///home/user/code.ts");
    assert.equal(result.files[0].isImage, false);
    assert.equal(result.mentions.length, 1);
  });

  it("should parse file mentions with image file and imageInfo", () => {
    const data = {
      files: [
        {
          uri: "file:///tmp/photo.png",
          content: "",
          isImage: true,
          imageInfo: { mimeType: "image/png", size: 204800 },
        },
      ],
      mentions: [{ uri: "file:///tmp/photo.png" }],
      imageBlocks: [
        {
          type: "image",
          source: {
            type: "base64",
            mediaType: "image/png",
            data: "iVBORw0KGgo=",
          },
        },
      ],
    };
    const result = FileMentionsSchema.parse(data);
    assert.equal(result.files[0].isImage, true);
    assert.equal(result.files[0].imageInfo?.mimeType, "image/png");
    assert.equal(result.imageBlocks?.length, 1);
  });
});

// ─── Reject invalid data ────────────────────────────────

describe("Reject invalid data", () => {
  it("should reject a message with an unknown role", () => {
    const data = {
      role: "system",
      messageId: 1,
      content: [],
    };
    assert.throws(() => MessageSchema.parse(data));
  });

  it("should reject a user message missing required content field", () => {
    const data = {
      role: "user",
      messageId: 1,
    };
    assert.throws(() => UserMessageSchema.parse(data));
  });

  it("should reject a user message missing required messageId", () => {
    const data = {
      role: "user",
      content: [],
    };
    assert.throws(() => UserMessageSchema.parse(data));
  });

  it("should reject an assistant message missing state", () => {
    const data = {
      role: "assistant",
      messageId: 2,
      content: [{ type: "text", text: "hi" }],
    };
    assert.throws(() => AssistantMessageSchema.parse(data));
  });

  it("should reject a MessageState with invalid stopReason", () => {
    const data = {
      type: "complete",
      stopReason: "unknown_reason",
    };
    assert.throws(() => MessageStateSchema.parse(data));
  });

  it("should reject a UserContentBlock with invalid type", () => {
    const data = {
      type: "audio",
      data: "some audio data",
    };
    assert.throws(() => UserContentBlockSchema.parse(data));
  });

  it("should reject a ToolRun with invalid status", () => {
    const data = { status: "pending" };
    assert.throws(() => ToolRunSchema.parse(data));
  });

  it("should reject an ImageSource with invalid type", () => {
    const data = { type: "file", path: "/tmp/img.png" };
    assert.throws(() => ImageSourceSchema.parse(data));
  });

  it("should reject a CacheControl with wrong type literal", () => {
    const data = { type: "permanent", ttl: "600s" };
    assert.throws(() => CacheControlSchema.parse(data));
  });
});

// ─── JSON Schema conversion ────────────────────────────

describe("JSON Schema conversion", () => {
  it("should convert MessageSchema to JSON Schema with expected structure", () => {
    const jsonSchema = z.toJSONSchema(MessageSchema);
    assert.ok(jsonSchema, "JSON Schema should be generated");
    assert.equal(typeof jsonSchema, "object");
    // A discriminatedUnion on "role" should produce a schema with
    // anyOf/oneOf containing the three role variants
    const hasComposition =
      "anyOf" in jsonSchema ||
      "oneOf" in jsonSchema ||
      ("$defs" in jsonSchema && typeof jsonSchema.$defs === "object");
    assert.ok(
      hasComposition,
      "JSON Schema should contain anyOf, oneOf, or $defs for the discriminated union",
    );
  });

  it("should convert UsageSchema to JSON Schema with correct required fields", () => {
    const jsonSchema = z.toJSONSchema(UsageSchema);
    assert.ok(jsonSchema);
    assert.equal(jsonSchema.type, "object");
    assert.ok(
      Array.isArray(jsonSchema.required),
      "should have required array",
    );
    const required = jsonSchema.required as string[];
    assert.ok(required.includes("model"), "model should be required");
    assert.ok(required.includes("inputTokens"), "inputTokens should be required");
    assert.ok(required.includes("timestamp"), "timestamp should be required");
  });

  it("should convert ToolRunSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(ToolRunSchema);
    assert.ok(jsonSchema, "ToolRun JSON Schema should be generated");
    assert.equal(typeof jsonSchema, "object");
  });
});
