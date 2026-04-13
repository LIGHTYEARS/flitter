/**
 * @flitter/llm — Anthropic Claude 消息转换器
 *
 * 将 Flitter 统一消息格式与 Anthropic Messages API 原生格式双向转换。
 * 支持 Thinking Blocks、Cache Control、Tool Use、Image 等全特性。
 *
 * @example
 * ```ts
 * const transformer = new AnthropicTransformer();
 * const { system, messages } = transformer.toProviderMessages(flitterMessages, systemPrompt);
 * const delta = transformer.fromProviderDelta(sseEvent, state);
 * ```
 */
import type {
  Message,
  AssistantContentBlock,
  Usage,
} from "@flitter/schemas";
import { BaseMessageTransformer } from "../../transformers/message-transformer";
import { BaseToolTransformer } from "../../transformers/tool-transformer";
import type { StreamDelta, SystemPromptBlock, ToolDefinition } from "../../types";
import { TransformState } from "../../types";

// ─── Anthropic 原生类型 ─────────────────────────────────

/** Anthropic system block (支持 cache_control) */
export interface AnthropicSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/** Anthropic 消息 */
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: AnthropicContentBlock[];
}

/** Anthropic content block */
export type AnthropicContentBlock =
  | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } | { type: "url"; url: string } }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | AnthropicContentBlock[] }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "redacted_thinking"; data: string };

/** Anthropic 工具定义 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Anthropic usage */
export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/** Anthropic SSE 事件 */
export type AnthropicSSEEvent =
  | { type: "message_start"; message: { id: string; model: string; usage: AnthropicUsage } }
  | { type: "content_block_start"; index: number; content_block: AnthropicContentBlockStart }
  | { type: "content_block_delta"; index: number; delta: AnthropicDelta }
  | { type: "content_block_stop"; index: number }
  | { type: "message_delta"; delta: { stop_reason: string }; usage: { output_tokens: number } }
  | { type: "message_stop" }
  | { type: "ping" };

/** content_block_start 中的 block 类型 */
export type AnthropicContentBlockStart =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "redacted_thinking"; data: string };

/** content_block_delta 中的 delta */
export type AnthropicDelta =
  | { type: "text_delta"; text: string }
  | { type: "input_json_delta"; partial_json: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "signature_delta"; signature: string };

// ─── AnthropicToolTransformer ───────────────────────────

export class AnthropicToolTransformer extends BaseToolTransformer<AnthropicTool> {
  toProviderTools(tools: ToolDefinition[]): AnthropicTool[] {
    const seen = new Set<string>();
    return tools
      .filter((t) => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      })
      .map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: this.normalizeInputSchema(t.inputSchema),
      }));
  }
}

// ─── AnthropicTransformer ───────────────────────────────

/**
 * Anthropic Claude 消息转换器
 *
 * 处理 Flitter ↔ Anthropic Messages API 格式的双向转换
 */
export class AnthropicTransformer extends BaseMessageTransformer<AnthropicMessage, AnthropicSSEEvent> {
  /** 内部状态: message-level usage tracking */
  private _model = "";
  private _maxInputTokens = 200_000;
  private _inputTokens = 0;
  private _outputTokens = 0;
  private _cacheCreationInputTokens: number | null = null;
  private _cacheReadInputTokens: number | null = null;
  private _stopReason: "end_turn" | "tool_use" | "max_tokens" = "end_turn";

  /**
   * Flitter Message[] → Anthropic messages 格式
   *
   * 返回 system blocks 和 messages 分开的结构
   */
  toProviderMessages(
    messages: Message[],
    systemPrompt: SystemPromptBlock[],
  ): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    for (const msg of messages) {
      switch (msg.role) {
        case "user": {
          const content = this._convertUserContent(msg);
          if (content.length > 0) {
            result.push({ role: "user", content });
          }
          break;
        }
        case "assistant": {
          const content = this._convertAssistantContent(msg);
          if (content.length > 0) {
            result.push({ role: "assistant", content });
          }
          break;
        }
        case "info":
          // Info messages: extract text from summary blocks
          for (const block of msg.content) {
            if (block.type === "summary" && block.summary.type === "message") {
              const text = block.summary.summary.trimEnd();
              if (text.length > 0) {
                result.push({ role: "assistant", content: [{ type: "text", text }] });
              }
            }
          }
          break;
      }
    }

    // Merge adjacent same-role messages (Anthropic requires alternating user/assistant)
    return this._mergeAdjacentMessages(result);
  }

  /** 转换系统提示词 */
  toSystemBlocks(systemPrompt: SystemPromptBlock[]): AnthropicSystemBlock[] {
    return systemPrompt.map((block) => {
      const result: AnthropicSystemBlock = { type: "text", text: block.text };
      if (block.cache_control) {
        result.cache_control = { type: "ephemeral" };
      }
      return result;
    });
  }

  /**
   * Anthropic SSE 事件 → Flitter StreamDelta
   */
  fromProviderDelta(event: AnthropicSSEEvent, state: TransformState): StreamDelta {
    switch (event.type) {
      case "message_start":
        return this._handleMessageStart(event, state);
      case "content_block_start":
        return this._handleContentBlockStart(event, state);
      case "content_block_delta":
        return this._handleContentBlockDelta(event, state);
      case "content_block_stop":
        return this._handleContentBlockStop(event, state);
      case "message_delta":
        return this._handleMessageDelta(event, state);
      case "message_stop":
        return this._handleMessageStop(state);
      case "ping":
        return this.createEmptyDelta(state.getContent());
      default:
        return this.createEmptyDelta(state.getContent());
    }
  }

  // ─── Private: Message conversion ──────────────────────

  private _convertUserContent(msg: { content: ReadonlyArray<{ type: string; [key: string]: unknown }> }): AnthropicContentBlock[] {
    const result: AnthropicContentBlock[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          if (typeof block.text === "string" && block.text.trim().length > 0) {
            const b: AnthropicContentBlock = { type: "text", text: block.text };
            if (block.cache_control) {
              (b as { cache_control?: { type: "ephemeral" } }).cache_control = { type: "ephemeral" };
            }
            result.push(b);
          }
          break;
        case "image":
          if (block.source && typeof block.source === "object") {
            const source = block.source as { type: string; [key: string]: unknown };
            if (source.type === "base64" && typeof source.mediaType === "string" && typeof source.data === "string") {
              result.push({
                type: "image",
                source: { type: "base64", media_type: source.mediaType, data: source.data },
              });
            } else if (source.type === "url" && typeof source.url === "string") {
              result.push({
                type: "image",
                source: { type: "url", url: source.url },
              });
            }
          }
          break;
        case "tool_result":
          if (typeof block.toolUseID === "string" && block.run && typeof block.run === "object") {
            const run = block.run as { status: string; result?: unknown; error?: { message: string } };
            let content: string;
            if (run.status === "done") {
              content = typeof run.result === "string" ? run.result : JSON.stringify(run.result ?? "");
            } else if (run.status === "error" && run.error) {
              content = `Error: ${run.error.message}`;
            } else {
              content = "";
            }
            result.push({
              type: "tool_result",
              tool_use_id: block.toolUseID as string,
              content,
            });
          }
          break;
      }
    }

    return result;
  }

  private _convertAssistantContent(msg: { content: ReadonlyArray<AssistantContentBlock> }): AnthropicContentBlock[] {
    const blocks: AnthropicContentBlock[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          blocks.push({ type: "text", text: block.text });
          break;
        case "tool_use":
          if (block.complete) {
            blocks.push({
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: block.input,
            });
          }
          break;
        case "thinking": {
          // Only include thinking blocks from Anthropic provider (or unspecified)
          const provider = "provider" in block ? block.provider : undefined;
          if (!provider || provider === "anthropic") {
            blocks.push({
              type: "thinking",
              thinking: block.thinking,
              signature: block.signature,
            });
          }
          break;
        }
        case "redacted_thinking": {
          const provider = "provider" in block ? block.provider : undefined;
          if (!provider || provider === "anthropic") {
            blocks.push({
              type: "redacted_thinking",
              data: block.data,
            });
          }
          break;
        }
        case "server_tool_use":
          // Skip server_tool_use blocks (not sent to Anthropic API)
          break;
      }
    }

    // Remove trailing thinking/redacted_thinking blocks (Anthropic requirement)
    let lastNonThinking = blocks.length - 1;
    while (lastNonThinking >= 0) {
      const b = blocks[lastNonThinking];
      if (b.type !== "thinking" && b.type !== "redacted_thinking") break;
      lastNonThinking--;
    }
    if (lastNonThinking < blocks.length - 1) {
      return blocks.slice(0, lastNonThinking + 1);
    }

    return blocks;
  }

  /** 合并相邻同角色消息 */
  private _mergeAdjacentMessages(messages: AnthropicMessage[]): AnthropicMessage[] {
    if (messages.length <= 1) return messages;
    const merged: AnthropicMessage[] = [messages[0]];

    for (let i = 1; i < messages.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = messages[i];
      if (prev.role === curr.role) {
        prev.content = [...prev.content, ...curr.content];
      } else {
        merged.push(curr);
      }
    }

    return merged;
  }

  // ─── Private: SSE event handlers ──────────────────────

  private _handleMessageStart(
    event: { type: "message_start"; message: { id: string; model: string; usage: AnthropicUsage } },
    state: TransformState,
  ): StreamDelta {
    this._model = event.message.model;
    this._inputTokens = event.message.usage.input_tokens;
    this._outputTokens = event.message.usage.output_tokens;
    this._cacheCreationInputTokens = event.message.usage.cache_creation_input_tokens ?? null;
    this._cacheReadInputTokens = event.message.usage.cache_read_input_tokens ?? null;
    return this.createEmptyDelta(state.getContent());
  }

  private _handleContentBlockStart(
    event: { type: "content_block_start"; index: number; content_block: AnthropicContentBlockStart },
    state: TransformState,
  ): StreamDelta {
    const block = event.content_block;
    switch (block.type) {
      case "text":
        state.addBlock(event.index, "text", { text: block.text || "" });
        break;
      case "tool_use":
        state.addBlock(event.index, "tool_use", {
          id: block.id,
          name: block.name,
          complete: false,
          input: {},
          _partialJSON: "",
        });
        break;
      case "thinking":
        state.addBlock(event.index, "thinking", {
          thinking: block.thinking || "",
          signature: block.signature || "",
          provider: "anthropic",
        });
        break;
      case "redacted_thinking":
        state.addBlock(event.index, "redacted_thinking", {
          data: block.data || "",
          provider: "anthropic",
        });
        break;
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleContentBlockDelta(
    event: { type: "content_block_delta"; index: number; delta: AnthropicDelta },
    state: TransformState,
  ): StreamDelta {
    const delta = event.delta;
    switch (delta.type) {
      case "text_delta":
        state.updateBlock(event.index, { text: delta.text });
        break;
      case "input_json_delta":
        // Accumulate using string concatenation via _partialJSON
        state.updateBlock(event.index, { _partialJSON: delta.partial_json });
        // Also update inputPartialJSON for content snapshots
        {
          const blockData = state.blocks.get(event.index);
          if (blockData) {
            blockData.data.inputPartialJSON = { json: blockData.data._partialJSON as string };
          }
        }
        break;
      case "thinking_delta":
        state.updateBlock(event.index, { thinking: delta.thinking });
        break;
      case "signature_delta":
        state.updateBlock(event.index, { signature: delta.signature });
        break;
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleContentBlockStop(
    event: { type: "content_block_stop"; index: number },
    state: TransformState,
  ): StreamDelta {
    // Try to parse complete JSON for tool_use blocks
    const blockState = state.blocks.get(event.index);
    if (blockState && blockState.type === "tool_use") {
      const partialJSON = blockState.data._partialJSON as string | undefined;
      if (partialJSON) {
        try {
          const input = JSON.parse(partialJSON) as Record<string, unknown>;
          state.updateBlock(event.index, { input, complete: true });
        } catch {
          // JSON parse failed, mark as complete with empty input
          state.updateBlock(event.index, { complete: true });
        }
      } else {
        state.updateBlock(event.index, { complete: true });
      }
    }
    state.completeBlock(event.index);
    return this.createEmptyDelta(state.getContent());
  }

  private _handleMessageDelta(
    event: { type: "message_delta"; delta: { stop_reason: string }; usage: { output_tokens: number } },
    state: TransformState,
  ): StreamDelta {
    this._outputTokens = event.usage.output_tokens;
    const reason = event.delta.stop_reason;
    if (reason === "end_turn" || reason === "stop_sequence") {
      this._stopReason = "end_turn";
    } else if (reason === "tool_use") {
      this._stopReason = "tool_use";
    } else if (reason === "max_tokens" || reason === "model_context_window_exceeded") {
      this._stopReason = "max_tokens";
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleMessageStop(state: TransformState): StreamDelta {
    const content = state.getContent();
    const usage: Usage = {
      model: this._model,
      maxInputTokens: this._maxInputTokens,
      inputTokens: this._inputTokens,
      outputTokens: this._outputTokens,
      cacheCreationInputTokens: this._cacheCreationInputTokens,
      cacheReadInputTokens: this._cacheReadInputTokens,
      totalInputTokens: this._inputTokens +
        (this._cacheCreationInputTokens ?? 0) +
        (this._cacheReadInputTokens ?? 0),
      timestamp: new Date().toISOString(),
    };
    return this.createCompleteDelta(content, usage, this._stopReason);
  }
}
