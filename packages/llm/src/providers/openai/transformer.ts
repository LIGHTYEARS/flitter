/**
 * @flitter/llm — OpenAI Responses API 消息转换器
 *
 * 将 Flitter 统一消息格式与 OpenAI Responses API 原生格式双向转换。
 * 支持 Reasoning、Function Calls、Image Input、Prompt Caching。
 *
 * @example
 * ```ts
 * const transformer = new OpenAITransformer();
 * const input = transformer.toProviderMessages(flitterMessages, systemPrompt);
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

// ─── OpenAI 原生类型 ──────────────────────────────────

/** OpenAI Responses API input item */
export type OpenAIInputItem =
  | { role: "system"; content: string }
  | { role: "user"; content: string | OpenAIContentPart[] }
  | { role: "assistant"; content: string | OpenAIContentPart[] }
  | { role: "tool"; tool_call_id: string; content: string };

/** OpenAI content part */
export type OpenAIContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: { url: string } };

/** OpenAI tool definition */
export interface OpenAITool {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
}

/** OpenAI usage */
export interface OpenAIUsage {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens: number };
}

/** OpenAI response object */
export interface OpenAIResponse {
  id: string;
  model: string;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  output: OpenAIOutputItem[];
  usage?: OpenAIUsage;
}

/** OpenAI output item */
export type OpenAIOutputItem =
  | { type: "message"; content: OpenAIMessageContent[] }
  | { type: "reasoning"; id?: string; content?: OpenAIReasoningContent[]; summary?: OpenAIReasoningSummary[]; encrypted_content?: string }
  | { type: "function_call"; id: string; name: string; arguments: string; call_id: string };

/** OpenAI message content */
export interface OpenAIMessageContent {
  type: "output_text";
  text: string;
}

/** OpenAI reasoning content */
export interface OpenAIReasoningContent {
  type: "reasoning_text";
  text: string;
}

/** OpenAI reasoning summary */
export interface OpenAIReasoningSummary {
  type: "summary_text";
  text: string;
}

/** OpenAI SSE 事件 */
export type OpenAISSEEvent =
  | { type: "response.created"; response: OpenAIResponse }
  | { type: "response.in_progress" }
  | { type: "response.output_item.added"; output_index: number; item: OpenAIOutputItem }
  | { type: "response.content_part.added"; output_index: number; content_index: number; part: { type: string; text?: string } }
  | { type: "response.output_text.delta"; output_index: number; content_index: number; delta: string }
  | { type: "response.reasoning_text.delta"; output_index: number; content_index: number; delta: string }
  | { type: "response.function_call_arguments.delta"; output_index: number; delta: string }
  | { type: "response.function_call_arguments.done"; output_index: number; name: string; arguments: string }
  | { type: "response.output_item.done"; output_index: number; item: OpenAIOutputItem }
  | { type: "response.content_part.done"; output_index: number; content_index: number; part: { type: string; text?: string } }
  | { type: "response.completed"; response: OpenAIResponse }
  | { type: "response.failed"; response: OpenAIResponse; error?: { message: string } }
  | { type: "keepalive" };

// ─── OpenAIToolTransformer ────────────────────────────

export class OpenAIToolTransformer extends BaseToolTransformer<OpenAITool> {
  toProviderTools(tools: ToolDefinition[]): OpenAITool[] {
    const seen = new Set<string>();
    return tools
      .filter((t) => {
        if (seen.has(t.name)) return false;
        seen.add(t.name);
        return true;
      })
      .map((t) => ({
        type: "function" as const,
        name: t.name,
        description: t.description,
        parameters: this.normalizeInputSchema(t.inputSchema),
        strict: false,
      }));
  }
}

// ─── OpenAITransformer ────────────────────────────────

/**
 * OpenAI Responses API 消息转换器
 *
 * 处理 Flitter ↔ OpenAI Responses API 格式的双向转换
 */
export class OpenAITransformer extends BaseMessageTransformer<OpenAIInputItem, OpenAISSEEvent> {
  /** 内部状态: message-level tracking */
  private _model = "";
  private _responseId = "";
  private _inputTokens = 0;
  private _outputTokens = 0;
  private _cachedTokens: number | null = null;
  private _stopReason: "end_turn" | "tool_use" | "max_tokens" = "end_turn";

  /** Block index counter — OpenAI uses output_index per item, we map to sequential block indices */
  private _blockIndexMap: Map<string, number> = new Map();
  private _nextBlockIndex = 0;

  /**
   * Flitter Message[] → OpenAI Responses API input items
   */
  toProviderMessages(
    messages: Message[],
    systemPrompt: SystemPromptBlock[],
  ): OpenAIInputItem[] {
    const result: OpenAIInputItem[] = [];

    // System prompt
    if (systemPrompt.length > 0) {
      const text = systemPrompt.map((b) => b.text).join("\n\n");
      result.push({ role: "system", content: text });
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
          // Info messages: extract text from summary blocks
          for (const block of msg.content) {
            if (block.type === "summary" && block.summary.type === "message") {
              const text = block.summary.summary.trimEnd();
              if (text.length > 0) {
                result.push({ role: "assistant", content: text });
              }
            }
          }
          break;
      }
    }

    return result;
  }

  /**
   * OpenAI SSE 事件 → Flitter StreamDelta
   */
  fromProviderDelta(event: OpenAISSEEvent, state: TransformState): StreamDelta {
    switch (event.type) {
      case "response.created":
        return this._handleResponseCreated(event, state);
      case "response.in_progress":
        return this.createEmptyDelta(state.getContent());
      case "response.output_item.added":
        return this._handleOutputItemAdded(event, state);
      case "response.content_part.added":
        return this.createEmptyDelta(state.getContent());
      case "response.output_text.delta":
        return this._handleTextDelta(event, state);
      case "response.reasoning_text.delta":
        return this._handleReasoningDelta(event, state);
      case "response.function_call_arguments.delta":
        return this._handleFunctionCallArgsDelta(event, state);
      case "response.function_call_arguments.done":
        return this._handleFunctionCallArgsDone(event, state);
      case "response.output_item.done":
        return this._handleOutputItemDone(event, state);
      case "response.content_part.done":
        return this.createEmptyDelta(state.getContent());
      case "response.completed":
        return this._handleResponseCompleted(event, state);
      case "response.failed":
        return this._handleResponseFailed(event, state);
      case "keepalive":
        return this.createEmptyDelta(state.getContent());
      default:
        return this.createEmptyDelta(state.getContent());
    }
  }

  // ─── Private: Message conversion ──────────────────────

  private _convertUserContent(msg: { content: ReadonlyArray<{ type: string; [key: string]: unknown }> }): OpenAIInputItem[] {
    const items: OpenAIInputItem[] = [];
    const contentParts: OpenAIContentPart[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          if (typeof block.text === "string" && block.text.trim().length > 0) {
            contentParts.push({ type: "input_text", text: block.text });
          }
          break;
        case "image":
          if (block.source && typeof block.source === "object") {
            const source = block.source as { type: string; [key: string]: unknown };
            if (source.type === "base64" && typeof source.mediaType === "string" && typeof source.data === "string") {
              contentParts.push({
                type: "input_image",
                image_url: { url: `data:${source.mediaType};base64,${source.data}` },
              });
            } else if (source.type === "url" && typeof source.url === "string") {
              contentParts.push({
                type: "input_image",
                image_url: { url: source.url },
              });
            }
          }
          break;
        case "tool_result":
          // Flush pending content parts as a user message first
          if (contentParts.length > 0) {
            items.push({ role: "user", content: [...contentParts] });
            contentParts.length = 0;
          }
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
            items.push({
              role: "tool",
              tool_call_id: block.toolUseID as string,
              content,
            });
          }
          break;
      }
    }

    if (contentParts.length > 0) {
      // Single text → plain string, otherwise array
      if (contentParts.length === 1 && contentParts[0].type === "input_text") {
        items.push({ role: "user", content: contentParts[0].text });
      } else {
        items.push({ role: "user", content: contentParts });
      }
    }

    return items;
  }

  private _convertAssistantContent(msg: { content: ReadonlyArray<AssistantContentBlock> }): OpenAIInputItem[] {
    const items: OpenAIInputItem[] = [];
    const textParts: string[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          textParts.push(block.text);
          break;
        case "tool_use":
          // Flush text before function call
          if (textParts.length > 0) {
            items.push({ role: "assistant", content: textParts.join("\n") });
            textParts.length = 0;
          }
          // Function calls are represented in the output items,
          // but for history we just track them as assistant content
          if (block.complete) {
            items.push({
              role: "assistant",
              content: JSON.stringify({
                type: "function_call",
                name: block.name,
                call_id: block.id,
                arguments: JSON.stringify(block.input),
              }),
            });
          }
          break;
        case "thinking":
        case "redacted_thinking":
          // Skip thinking blocks in input (handled via reasoning config)
          break;
        case "server_tool_use":
          break;
      }
    }

    if (textParts.length > 0) {
      items.push({ role: "assistant", content: textParts.join("\n") });
    }

    return items;
  }

  // ─── Private: SSE event handlers ──────────────────────

  /** Get or create a block index for an output_index key */
  private _getBlockIndex(key: string): number {
    let idx = this._blockIndexMap.get(key);
    if (idx === undefined) {
      idx = this._nextBlockIndex++;
      this._blockIndexMap.set(key, idx);
    }
    return idx;
  }

  private _handleResponseCreated(
    event: { type: "response.created"; response: OpenAIResponse },
    state: TransformState,
  ): StreamDelta {
    this._model = event.response.model;
    this._responseId = event.response.id;
    this._blockIndexMap.clear();
    this._nextBlockIndex = 0;
    return this.createEmptyDelta(state.getContent());
  }

  private _handleOutputItemAdded(
    event: { type: "response.output_item.added"; output_index: number; item: OpenAIOutputItem },
    state: TransformState,
  ): StreamDelta {
    const item = event.item;
    const blockIdx = this._getBlockIndex(`item_${event.output_index}`);

    switch (item.type) {
      case "message":
        // Message items contain text content — add a text block
        state.addBlock(blockIdx, "text", { text: "" });
        break;
      case "reasoning":
        state.addBlock(blockIdx, "thinking", {
          thinking: "",
          signature: "",
          provider: "openai",
        });
        break;
      case "function_call":
        state.addBlock(blockIdx, "tool_use", {
          id: item.call_id,
          name: item.name,
          complete: false,
          input: {},
          _partialJSON: "",
        });
        break;
    }

    return this.createEmptyDelta(state.getContent());
  }

  private _handleTextDelta(
    event: { type: "response.output_text.delta"; output_index: number; delta: string },
    state: TransformState,
  ): StreamDelta {
    const blockIdx = this._blockIndexMap.get(`item_${event.output_index}`);
    if (blockIdx !== undefined) {
      state.updateBlock(blockIdx, { text: event.delta });
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleReasoningDelta(
    event: { type: "response.reasoning_text.delta"; output_index: number; delta: string },
    state: TransformState,
  ): StreamDelta {
    const blockIdx = this._blockIndexMap.get(`item_${event.output_index}`);
    if (blockIdx !== undefined) {
      state.updateBlock(blockIdx, { thinking: event.delta });
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleFunctionCallArgsDelta(
    event: { type: "response.function_call_arguments.delta"; output_index: number; delta: string },
    state: TransformState,
  ): StreamDelta {
    const blockIdx = this._blockIndexMap.get(`item_${event.output_index}`);
    if (blockIdx !== undefined) {
      state.updateBlock(blockIdx, { _partialJSON: event.delta });
      // Sync to inputPartialJSON
      const blockData = state.blocks.get(blockIdx);
      if (blockData) {
        blockData.data.inputPartialJSON = { json: blockData.data._partialJSON as string };
      }
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleFunctionCallArgsDone(
    event: { type: "response.function_call_arguments.done"; output_index: number; name: string; arguments: string },
    state: TransformState,
  ): StreamDelta {
    const blockIdx = this._blockIndexMap.get(`item_${event.output_index}`);
    if (blockIdx !== undefined) {
      // Set name directly to avoid string concatenation in updateBlock
      const blockData = state.blocks.get(blockIdx);
      if (blockData) {
        blockData.data.name = event.name;
      }
      try {
        const input = JSON.parse(event.arguments) as Record<string, unknown>;
        state.updateBlock(blockIdx, { input, complete: true });
      } catch {
        state.updateBlock(blockIdx, { complete: true });
      }
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleOutputItemDone(
    event: { type: "response.output_item.done"; output_index: number; item: OpenAIOutputItem },
    state: TransformState,
  ): StreamDelta {
    const blockIdx = this._blockIndexMap.get(`item_${event.output_index}`);
    if (blockIdx !== undefined) {
      const item = event.item;

      // For reasoning items, extract encrypted_content as signature
      if (item.type === "reasoning" && item.encrypted_content) {
        state.updateBlock(blockIdx, { signature: item.encrypted_content });
      }

      // For function_call, ensure final JSON is parsed
      if (item.type === "function_call") {
        try {
          const input = JSON.parse(item.arguments) as Record<string, unknown>;
          state.updateBlock(blockIdx, { input, complete: true });
        } catch {
          state.updateBlock(blockIdx, { complete: true });
        }
      }

      state.completeBlock(blockIdx);

      // Track if we have any function calls for stop reason
      if (item.type === "function_call") {
        this._stopReason = "tool_use";
      }
    }
    return this.createEmptyDelta(state.getContent());
  }

  private _handleResponseCompleted(
    event: { type: "response.completed"; response: OpenAIResponse },
    state: TransformState,
  ): StreamDelta {
    const content = state.getContent();
    const responseUsage = event.response.usage;

    // Determine stop reason from output items
    const hasToolUse = event.response.output.some((item) => item.type === "function_call");
    if (hasToolUse) {
      this._stopReason = "tool_use";
    } else {
      this._stopReason = "end_turn";
    }

    if (responseUsage) {
      this._inputTokens = responseUsage.input_tokens;
      this._outputTokens = responseUsage.output_tokens;
      this._cachedTokens = responseUsage.input_tokens_details?.cached_tokens ?? null;
    }

    const cachedTokens = this._cachedTokens ?? 0;
    const cacheCreationTokens = this._inputTokens - cachedTokens;

    const modelInfo = this._getModelMaxInput();

    const usage: Usage = {
      model: event.response.model || this._model,
      maxInputTokens: modelInfo,
      inputTokens: 0,
      outputTokens: this._outputTokens,
      cacheCreationInputTokens: cacheCreationTokens > 0 ? cacheCreationTokens : null,
      cacheReadInputTokens: this._cachedTokens,
      totalInputTokens: this._inputTokens,
      timestamp: new Date().toISOString(),
    };

    return this.createCompleteDelta(content, usage, this._stopReason);
  }

  private _handleResponseFailed(
    event: { type: "response.failed"; response: OpenAIResponse; error?: { message: string } },
    state: TransformState,
  ): StreamDelta {
    const message = event.error?.message ?? "OpenAI response failed";
    return this.createErrorDelta(message, state.getContent());
  }

  /** Estimate max input tokens from model (contextWindow - maxOutputTokens) */
  private _getModelMaxInput(): number {
    // Import would create circular dep, use a reasonable default
    return 128_000;
  }
}
