/**
 * @flitter/llm — OpenAI-Compatible ChatCompletion API 消息转换器
 *
 * 将 Flitter 统一消息格式与 OpenAI ChatCompletion API 格式双向转换。
 * 支持任意 OpenAI-compatible 端点 (xAI, Groq, DeepSeek, OpenRouter, Cerebras 等)。
 * 支持 Text、Tool Calls、Reasoning (多种格式)。
 */
import type { AssistantContentBlock, Message, Usage } from "@flitter/schemas";
import { BaseMessageTransformer } from "../../transformers/message-transformer";
import { BaseToolTransformer } from "../../transformers/tool-transformer";
import type {
  OpenAICompatConfig,
  StreamDelta,
  SystemPromptBlock,
  ToolDefinition,
  TransformState,
} from "../../types";

// ─── ChatCompletion 原生类型 ────────────────────────────

export type CompatChatMessage =
  | { role: "system"; content: string }
  | { role: "developer"; content: string }
  | { role: "user"; content: string | CompatContentPart[] }
  | {
      role: "assistant";
      content: CompatContentPart[] | null;
      tool_calls?: CompatToolCall[];
      reasoning_content?: string;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type CompatContentPart = { type: "text"; text: string };

export interface CompatToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface CompatTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface CompatStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  model: string;
  choices: [
    {
      index: number;
      delta: {
        role?: "assistant";
        content?: string | null;
        reasoning_content?: string | null;
        reasoning?: string | null;
        reasoning_text?: string | null;
        tool_calls?: [
          {
            index: number;
            id?: string;
            type?: "function";
            function?: {
              name?: string;
              arguments?: string;
            };
          },
        ];
      };
      finish_reason: "stop" | "tool_calls" | "length" | null;
    },
  ];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

// ─── CompatToolTransformer ──────────────────────────────

export class CompatToolTransformer extends BaseToolTransformer<CompatTool> {
  toProviderTools(tools: ToolDefinition[]): CompatTool[] {
    const seen = new Set<string>();
    return tools
      .filter((t) => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      })
      .map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description || "",
          parameters: this.normalizeInputSchema(t.inputSchema),
        },
      }));
  }
}

// ─── CompatTransformer ──────────────────────────────────

/** Strip toolu_ prefix from tool call IDs (Anthropic → ChatCompletion format) */
function stripToolPrefix(id: string): string {
  return id.replace(/^toolu_/, "");
}

/**
 * OpenAI-Compatible ChatCompletion API 消息转换器
 *
 * 处理 Flitter ↔ ChatCompletion 格式的双向转换。
 * 支持多种 reasoning 字段格式 (reasoning_content, reasoning, reasoning_text)。
 */
export class CompatTransformer extends BaseMessageTransformer<
  CompatChatMessage,
  CompatStreamChunk
> {
  private _toolCallBlockMap: Map<number, number> = new Map();
  private _nextBlockIndex = 0;
  private _hasTextBlock = false;
  private _hasThinkingBlock = false;
  private _config: OpenAICompatConfig;

  constructor(config: OpenAICompatConfig) {
    super();
    this._config = config;
  }

  /**
   * Flitter Message[] → ChatCompletion messages
   */
  toProviderMessages(messages: Message[], systemPrompt: SystemPromptBlock[]): CompatChatMessage[] {
    const result: CompatChatMessage[] = [];

    // System prompt — use developer role if supported, else system
    if (systemPrompt.length > 0) {
      const text = systemPrompt.map((b) => b.text).join("\n\n");
      if (this._config.supportsDeveloperRole) {
        result.push({ role: "developer", content: text });
      } else {
        result.push({ role: "system", content: text });
      }
    }

    for (const msg of messages) {
      switch (msg.role) {
        case "user": {
          const items = this._convertUserContent(msg);
          result.push(...items);
          break;
        }
        case "assistant": {
          const items = this._convertAssistantContent(msg);
          result.push(...items);
          break;
        }
        case "info":
          for (const block of msg.content) {
            if (block.type === "summary" && block.summary.type === "message") {
              const text = block.summary.summary.trimEnd();
              if (text.length > 0) {
                result.push({
                  role: "assistant",
                  content: [{ type: "text", text }],
                });
              }
            }
          }
          break;
      }
    }

    // Merge adjacent same-role messages
    return this._mergeAdjacentRoles(result);
  }

  /**
   * ChatCompletion SSE chunk → Flitter StreamDelta
   */
  fromProviderDelta(chunk: CompatStreamChunk, state: TransformState): StreamDelta {
    const choice = chunk.choices[0];
    if (!choice) return this.createEmptyDelta(state.getContent());

    const delta = choice.delta;

    // Handle reasoning content (check multiple field names)
    const reasoning = delta.reasoning_content ?? delta.reasoning ?? delta.reasoning_text;
    if (reasoning !== undefined && reasoning !== null) {
      this._handleReasoningDelta(reasoning, state);
    }

    // Handle text content
    if (delta.content !== undefined && delta.content !== null) {
      this._handleTextDelta(delta.content, state);
    }

    // Handle tool calls
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        this._handleToolCallDelta(tc, state);
      }
    }

    // Handle finish reason
    if (choice.finish_reason) {
      const content = state.getContent();
      const stopReason = this._mapFinishReason(choice.finish_reason);
      const usage = chunk.usage ? this._buildUsage(chunk) : undefined;
      return this.createCompleteDelta(content, usage, stopReason);
    }

    return this.createEmptyDelta(state.getContent());
  }

  // ─── Private: Message conversion ──────────────────────

  private _convertUserContent(msg: {
    content: ReadonlyArray<{ type: string; [key: string]: unknown }>;
  }): CompatChatMessage[] {
    const items: CompatChatMessage[] = [];
    const textParts: CompatContentPart[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          if (typeof block.text === "string" && block.text.trim().length > 0) {
            textParts.push({ type: "text", text: block.text });
          }
          break;
        case "image":
          // Most compat providers don't support images — skip
          break;
        case "tool_result":
          // Flush text first
          if (textParts.length > 0) {
            if (textParts.length === 1) {
              items.push({ role: "user", content: textParts[0].text });
            } else {
              items.push({ role: "user", content: [...textParts] });
            }
            textParts.length = 0;
          }
          if (typeof block.toolUseID === "string" && block.run && typeof block.run === "object") {
            const run = block.run as {
              status: string;
              result?: unknown;
              error?: { message: string };
            };
            let content: string;
            if (run.status === "done") {
              content =
                typeof run.result === "string" ? run.result : JSON.stringify(run.result ?? "");
            } else if (run.status === "error" && run.error) {
              content = `Error: ${run.error.message}`;
            } else {
              content = "";
            }
            items.push({
              role: "tool",
              tool_call_id: stripToolPrefix(block.toolUseID as string),
              content,
            });
          }
          break;
      }
    }

    if (textParts.length > 0) {
      if (textParts.length === 1) {
        items.push({ role: "user", content: textParts[0].text });
      } else {
        items.push({ role: "user", content: textParts });
      }
    }

    return items;
  }

  private _convertAssistantContent(msg: {
    content: ReadonlyArray<AssistantContentBlock>;
  }): CompatChatMessage[] {
    const textParts: CompatContentPart[] = [];
    const toolCalls: CompatToolCall[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          textParts.push({ type: "text", text: block.text });
          break;
        case "tool_use":
          if (block.complete) {
            toolCalls.push({
              id: stripToolPrefix(block.id),
              type: "function",
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input),
              },
            });
          }
          break;
        case "thinking":
        case "redacted_thinking":
        case "server_tool_use":
          // Skip — thinking is handled via reasoning fields, not input messages
          break;
      }
    }

    const result: CompatChatMessage = {
      role: "assistant",
      content: textParts.length > 0 ? textParts : null,
    };
    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls;
    }

    return [result];
  }

  /** Merge adjacent same-role messages */
  private _mergeAdjacentRoles(messages: CompatChatMessage[]): CompatChatMessage[] {
    if (messages.length <= 1) return messages;
    const merged: CompatChatMessage[] = [messages[0]];
    for (let i = 1; i < messages.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = messages[i];
      if (prev.role === curr.role && prev.role === "user" && curr.role === "user") {
        const prevText =
          typeof prev.content === "string"
            ? prev.content
            : (prev.content as CompatContentPart[]).map((p) => p.text).join("\n");
        const currText =
          typeof curr.content === "string"
            ? curr.content
            : (curr.content as CompatContentPart[]).map((p) => p.text).join("\n");
        (prev as { role: "user"; content: string }).content = `${prevText}\n${currText}`;
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  // ─── Private: SSE handlers ────────────────────────────

  private _handleTextDelta(text: string, state: TransformState): void {
    if (!this._hasTextBlock) {
      const blockIdx = this._nextBlockIndex++;
      state.addBlock(blockIdx, "text", { text });
      this._hasTextBlock = true;
    } else {
      for (const [idx, block] of state.blocks) {
        if (block.type === "text" && !block.finalTime) {
          state.updateBlock(idx, { text });
          break;
        }
      }
    }
  }

  private _handleReasoningDelta(text: string, state: TransformState): void {
    if (!this._hasThinkingBlock) {
      const blockIdx = this._nextBlockIndex++;
      state.addBlock(blockIdx, "thinking", {
        thinking: text,
        signature: "",
        provider: "openai-compat",
      });
      this._hasThinkingBlock = true;
    } else {
      for (const [idx, block] of state.blocks) {
        if (block.type === "thinking" && !block.finalTime) {
          state.updateBlock(idx, { thinking: text });
          break;
        }
      }
    }
  }

  private _handleToolCallDelta(
    tc: {
      index: number;
      id?: string;
      type?: "function";
      function?: { name?: string; arguments?: string };
    },
    state: TransformState,
  ): void {
    let blockIdx = this._toolCallBlockMap.get(tc.index);

    if (blockIdx === undefined && tc.id) {
      blockIdx = this._nextBlockIndex++;
      this._toolCallBlockMap.set(tc.index, blockIdx);
      state.addBlock(blockIdx, "tool_use", {
        id: tc.id,
        name: tc.function?.name ?? "",
        complete: false,
        input: {},
        _partialJSON: "",
      });
    }

    if (blockIdx !== undefined && tc.function?.arguments) {
      state.updateBlock(blockIdx, { _partialJSON: tc.function.arguments });
      const blockData = state.blocks.get(blockIdx);
      if (blockData) {
        blockData.data.inputPartialJSON = { json: blockData.data._partialJSON as string };
      }
    }

    if (blockIdx !== undefined && tc.function?.name) {
      const blockData = state.blocks.get(blockIdx);
      if (blockData) {
        blockData.data.name = tc.function.name;
      }
    }
  }

  private _mapFinishReason(reason: string): "end_turn" | "tool_use" | "max_tokens" {
    switch (reason) {
      case "stop":
        return "end_turn";
      case "tool_calls":
        return "tool_use";
      case "length":
        return "max_tokens";
      default:
        return "end_turn";
    }
  }

  private _buildUsage(chunk: CompatStreamChunk): Usage {
    const u = chunk.usage!;
    const cachedTokens = u.prompt_tokens_details?.cached_tokens ?? 0;
    const cacheCreation = u.prompt_tokens - cachedTokens;

    return {
      model: chunk.model,
      maxInputTokens: 128_000,
      inputTokens: 0,
      outputTokens: u.completion_tokens,
      cacheCreationInputTokens: cacheCreation > 0 ? cacheCreation : null,
      cacheReadInputTokens: cachedTokens > 0 ? cachedTokens : null,
      totalInputTokens: u.prompt_tokens,
      timestamp: new Date().toISOString(),
    };
  }
}
