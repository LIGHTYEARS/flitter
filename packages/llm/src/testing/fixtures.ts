/**
 * @flitter/llm — Test fixtures for integration testing
 *
 * SDK-typed event objects for all 4 provider types.
 * Each fixture is an array of objects matching the SDK's streaming response types.
 */
import type { CompatStreamChunk } from "../providers/openai-compat/transformer";

// ─── Anthropic Fixtures (MessageStreamEvent from @anthropic-ai/sdk) ──

/** Anthropic MessageStreamEvent objects */
export type AnthropicStreamEvent = Record<string, unknown>;

export const anthropicSimpleText: AnthropicStreamEvent[] = [
  {
    type: "message_start",
    message: {
      id: "msg_001",
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 50, output_tokens: 0 },
    },
  },
  {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  },
  {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: "Hello " },
  },
  {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: "world!" },
  },
  {
    type: "content_block_stop",
    index: 0,
  },
  {
    type: "message_delta",
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 5 },
  },
  { type: "message_stop" },
];

export const anthropicThinkingText: AnthropicStreamEvent[] = [
  {
    type: "message_start",
    message: {
      id: "msg_002",
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
    delta: { type: "thinking_delta", thinking: "Let me think..." },
  },
  {
    type: "content_block_delta",
    index: 0,
    delta: { type: "signature_delta", signature: "sig_abc" },
  },
  {
    type: "content_block_stop",
    index: 0,
  },
  {
    type: "content_block_start",
    index: 1,
    content_block: { type: "text", text: "" },
  },
  {
    type: "content_block_delta",
    index: 1,
    delta: { type: "text_delta", text: "The answer is 42." },
  },
  {
    type: "content_block_stop",
    index: 1,
  },
  {
    type: "message_delta",
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 30 },
  },
  { type: "message_stop" },
];

export const anthropicToolUse: AnthropicStreamEvent[] = [
  {
    type: "message_start",
    message: {
      id: "msg_003",
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 100, output_tokens: 0 },
    },
  },
  {
    type: "content_block_start",
    index: 0,
    content_block: { type: "tool_use", id: "toolu_001", name: "bash", input: {} },
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
  {
    type: "content_block_stop",
    index: 0,
  },
  {
    type: "message_delta",
    delta: { stop_reason: "tool_use" },
    usage: { output_tokens: 15 },
  },
  { type: "message_stop" },
];

// ─── OpenAI Fixtures (Response streaming events from openai SDK) ──

/** OpenAI Response API streaming event objects */
export type OpenAIStreamEvent = Record<string, unknown>;

export const openaiSimpleText: OpenAIStreamEvent[] = [
  {
    type: "response.created",
    response: {
      id: "resp_001",
      model: "gpt-4o",
      status: "in_progress",
      output: [],
    },
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

export const openaiReasoning: OpenAIStreamEvent[] = [
  {
    type: "response.created",
    response: { id: "resp_002", model: "o3", status: "in_progress", output: [] },
  },
  {
    type: "response.output_item.added",
    output_index: 0,
    item: { type: "reasoning", content: [] },
  },
  {
    type: "response.reasoning.delta",
    output_index: 0,
    content_index: 0,
    delta: "Thinking about this...",
  },
  {
    type: "response.output_item.done",
    output_index: 0,
    item: {
      type: "reasoning",
      content: [{ type: "reasoning_text", text: "Thinking about this..." }],
      encrypted_content: "enc_sig_123",
    },
  },
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
      id: "resp_002",
      model: "o3",
      status: "completed",
      output: [
        {
          type: "reasoning",
          content: [{ type: "reasoning_text", text: "Thinking about this..." }],
        },
        { type: "message", content: [{ type: "output_text", text: "The answer is 42." }] },
      ],
      usage: { input_tokens: 80, output_tokens: 30 },
    },
  },
];

export const openaiToolCall: OpenAIStreamEvent[] = [
  {
    type: "response.created",
    response: { id: "resp_003", model: "gpt-4o", status: "in_progress", output: [] },
  },
  {
    type: "response.output_item.added",
    output_index: 0,
    item: { type: "function_call", id: "fc_001", name: "bash", arguments: "", call_id: "call_001" },
  },
  {
    type: "response.function_call_arguments.delta",
    output_index: 0,
    delta: '{"command":"ls -la"}',
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
      id: "resp_003",
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
      usage: { input_tokens: 80, output_tokens: 15 },
    },
  },
];

// ─── Gemini Fixtures (GenerateContentResponse from @google/genai) ──

/** Gemini GenerateContentResponse chunks */
export type GeminiStreamChunk = Record<string, unknown>;

export const geminiSimpleText: GeminiStreamChunk[] = [
  {
    candidates: [
      {
        content: { parts: [{ text: "Hello " }], role: "model" },
        index: 0,
      },
    ],
  },
  {
    candidates: [
      {
        content: { parts: [{ text: "world!" }], role: "model" },
        index: 0,
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 50,
      candidatesTokenCount: 5,
      totalTokenCount: 55,
    },
  },
];

export const geminiThinking: GeminiStreamChunk[] = [
  {
    candidates: [
      {
        content: { parts: [{ text: "Let me think...", thought: true }], role: "model" },
        index: 0,
      },
    ],
  },
  {
    candidates: [
      {
        content: { parts: [{ text: "The answer is 42." }], role: "model" },
        index: 0,
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 80,
      candidatesTokenCount: 30,
      totalTokenCount: 110,
    },
  },
];

export const geminiToolCall: GeminiStreamChunk[] = [
  {
    candidates: [
      {
        content: {
          parts: [
            {
              functionCall: { name: "bash", args: { command: "ls -la" } },
            },
          ],
          role: "model",
        },
        index: 0,
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 15,
      totalTokenCount: 115,
    },
  },
];

// ─── OpenAI-Compat Fixtures (ChatCompletionChunk) ──

export const compatSimpleText: CompatStreamChunk[] = [
  {
    id: "chatcmpl-001",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
  },
  {
    id: "chatcmpl-001",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [{ index: 0, delta: { content: "Hello " }, finish_reason: null }],
  },
  {
    id: "chatcmpl-001",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [{ index: 0, delta: { content: "world!" }, finish_reason: null }],
  },
  {
    id: "chatcmpl-001",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 },
  },
];

export const compatToolCall: CompatStreamChunk[] = [
  {
    id: "chatcmpl-002",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [
      {
        index: 0,
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
        finish_reason: null,
      },
    ],
  },
  {
    id: "chatcmpl-002",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              function: { arguments: '{"command":"ls -la"}' },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  },
  {
    id: "chatcmpl-002",
    object: "chat.completion.chunk",
    model: "grok-3",
    choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
    usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 },
  },
];

// ─── Shared test data ───────────────────────────────────

export const testConfig = {
  settings: {} as Record<string, unknown>,
  secrets: {
    getToken: async (_key: string) => "test-api-key-12345",
    isSet: (_key: string) => true,
  },
};

export const testTools = [
  {
    name: "bash",
    description: "Run a shell command",
    inputSchema: {
      type: "object",
      properties: { command: { type: "string", description: "The command to run" } },
      required: ["command"],
    },
  },
  {
    name: "read",
    description: "Read a file",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "File path" } },
      required: ["path"],
    },
  },
];
