/**
 * @flitter/llm — Gemini generateContent API 消息转换器
 *
 * 将 Flitter 统一消息格式与 Gemini generateContent API 原生格式双向转换。
 * 支持 Thinking (thinkingConfig)、Function Calls、Image Input。
 * Gemini 使用 role:"user"/"model" 而非 "assistant"。
 */
import type { AssistantContentBlock, Message, Usage } from "@flitter/schemas";
import { BaseMessageTransformer } from "../../transformers/message-transformer";
import { BaseToolTransformer } from "../../transformers/tool-transformer";
import type { StreamDelta, SystemPromptBlock, ToolDefinition, TransformState } from "../../types";

// ─── Gemini 原生类型 ──────────────────────────────────

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export type GeminiPart =
  | { text: string; thought?: undefined }
  | { text: string; thought: true }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { content: string } } };

export interface GeminiSystemInstruction {
  parts: { text: string }[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GeminiToolConfig {
  functionDeclarations: GeminiFunctionDeclaration[];
}

export interface GeminiSafetySetting {
  category: string;
  threshold: string;
}

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
}

export interface GeminiStreamChunk {
  candidates?: [
    {
      content: {
        role: "model";
        parts: GeminiPart[];
      };
      finishReason?: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER";
    },
  ];
  usageMetadata?: GeminiUsageMetadata;
  modelVersion?: string;
}

/** Gemini 转换器返回的 system + contents 结构 */
export interface GeminiConvertResult {
  contents: GeminiContent[];
  systemInstruction?: GeminiSystemInstruction;
}

// ─── GeminiToolTransformer ────────────────────────────

export class GeminiToolTransformer extends BaseToolTransformer<GeminiToolConfig> {
  toProviderTools(tools: ToolDefinition[]): GeminiToolConfig[] {
    if (tools.length === 0) return [];
    const seen = new Set<string>();
    const declarations: GeminiFunctionDeclaration[] = [];
    for (const t of tools) {
      if (seen.has(t.name)) continue;
      seen.add(t.name);
      declarations.push({
        name: t.name,
        description: t.description || "",
        parameters: this.normalizeInputSchema(t.inputSchema),
      });
    }
    return [{ functionDeclarations: declarations }];
  }
}

// ─── GeminiTransformer ────────────────────────────────

/**
 * Gemini generateContent API 消息转换器
 *
 * 处理 Flitter ↔ Gemini 格式的双向转换。
 * Gemini 使用 role:"user"/"model"，要求交替角色，并支持 thought parts。
 */
export class GeminiTransformer extends BaseMessageTransformer<GeminiContent, GeminiStreamChunk> {
  /** Block index counter for streaming */
  private _nextBlockIndex = 0;

  /**
   * Flitter Message[] → Gemini contents + systemInstruction
   */
  toProviderMessages(messages: Message[], systemPrompt: SystemPromptBlock[]): GeminiContent[] {
    // Note: systemInstruction is returned via getSystemInstruction()
    // This method returns only the contents array
    const raw: GeminiContent[] = [];

    for (const msg of messages) {
      switch (msg.role) {
        case "user": {
          const parts = this._convertUserParts(msg);
          if (parts.length > 0) {
            raw.push({ role: "user", parts });
          }
          break;
        }
        case "assistant": {
          const parts = this._convertAssistantParts(msg);
          if (parts.length > 0) {
            raw.push({ role: "model", parts });
          }
          break;
        }
        case "info":
          // Extract text from summary blocks as model role
          for (const block of msg.content) {
            if (block.type === "summary" && block.summary.type === "message") {
              const text = block.summary.summary.trimEnd();
              if (text.length > 0) {
                raw.push({ role: "model", parts: [{ text }] });
              }
            }
          }
          break;
      }
    }

    // Merge adjacent same-role contents (Gemini requires alternation)
    return this._mergeAdjacentRoles(raw);
  }

  /** Build systemInstruction from system prompt blocks */
  toSystemInstruction(systemPrompt: SystemPromptBlock[]): GeminiSystemInstruction | undefined {
    if (systemPrompt.length === 0) return undefined;
    const text = systemPrompt.map((b) => b.text).join("\n\n");
    return { parts: [{ text }] };
  }

  /**
   * Gemini SSE chunk → Flitter StreamDelta
   *
   * Each chunk contains the incremental parts in candidates[0].content.parts.
   * Gemini sends function_call parts as complete objects (not incremental).
   */
  fromProviderDelta(chunk: GeminiStreamChunk, state: TransformState): StreamDelta {
    const candidate = chunk.candidates?.[0];

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        this._processPart(part, state);
      }
    }

    // Check for finish reason
    if (candidate?.finishReason) {
      const stopReason = this._mapFinishReason(candidate.finishReason);
      const content = state.getContent();
      const usage = chunk.usageMetadata ? this._buildUsage(chunk) : undefined;
      return this.createCompleteDelta(content, usage, stopReason);
    }

    // Check for usage in non-final chunks (Gemini sometimes sends usage in last chunk without finishReason)
    if (chunk.usageMetadata && !candidate) {
      const content = state.getContent();
      const usage = this._buildUsage(chunk);
      return this.createCompleteDelta(content, usage, "end_turn");
    }

    return this.createEmptyDelta(state.getContent());
  }

  // ─── Private: Message conversion ──────────────────────

  private _convertUserParts(msg: {
    content: ReadonlyArray<{ type: string; [key: string]: unknown }>;
  }): GeminiPart[] {
    const parts: GeminiPart[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          if (typeof block.text === "string" && block.text.trim().length > 0) {
            parts.push({ text: block.text });
          }
          break;
        case "image":
          if (block.source && typeof block.source === "object") {
            const source = block.source as { type: string; [key: string]: unknown };
            if (
              source.type === "base64" &&
              typeof source.mediaType === "string" &&
              typeof source.data === "string"
            ) {
              parts.push({ inlineData: { mimeType: source.mediaType, data: source.data } });
            }
            // Note: Gemini does not support URL images directly in content parts for most models
          }
          break;
        case "tool_result": {
          if (typeof block.toolUseID === "string" && block.run && typeof block.run === "object") {
            const run = block.run as {
              status: string;
              result?: unknown;
              error?: { message: string };
            };
            // We need the tool name — find it from previous context or use a placeholder
            const toolName = (block as { toolName?: string }).toolName ?? "tool";
            let content: string;
            if (run.status === "done") {
              content =
                typeof run.result === "string" ? run.result : JSON.stringify(run.result ?? "");
            } else if (run.status === "error" && run.error) {
              content = `Error: ${run.error.message}`;
            } else {
              content = "";
            }
            parts.push({
              functionResponse: { name: toolName, response: { content } },
            });
          }
          break;
        }
      }
    }

    return parts;
  }

  private _convertAssistantParts(msg: {
    content: ReadonlyArray<AssistantContentBlock>;
  }): GeminiPart[] {
    const parts: GeminiPart[] = [];

    for (const block of msg.content) {
      switch (block.type) {
        case "text":
          if (block.text.trim().length > 0) {
            parts.push({ text: block.text });
          }
          break;
        case "tool_use":
          if (block.complete) {
            parts.push({
              functionCall: { name: block.name, args: block.input as Record<string, unknown> },
            });
          }
          break;
        case "thinking":
          parts.push({ text: block.thinking, thought: true });
          break;
        case "redacted_thinking":
        case "server_tool_use":
          break;
      }
    }

    return parts;
  }

  /** Merge adjacent same-role contents */
  private _mergeAdjacentRoles(contents: GeminiContent[]): GeminiContent[] {
    if (contents.length <= 1) return contents;
    const merged: GeminiContent[] = [contents[0]];
    for (let i = 1; i < contents.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = contents[i];
      if (prev.role === curr.role) {
        prev.parts.push(...curr.parts);
      } else {
        merged.push(curr);
      }
    }
    return merged;
  }

  // ─── Private: SSE event handlers ──────────────────────

  private _processPart(part: GeminiPart, state: TransformState): void {
    if ("functionCall" in part) {
      // Function calls come as complete objects
      const blockIdx = this._nextBlockIndex++;
      state.addBlock(blockIdx, "tool_use", {
        id: `gemini_fc_${blockIdx}`,
        name: part.functionCall.name,
        complete: true,
        input: part.functionCall.args,
      });
      state.completeBlock(blockIdx);
    } else if ("functionResponse" in part) {
      // Shouldn't appear in model responses, skip
    } else if ("inlineData" in part) {
      // Binary data in response, skip
    } else if ("thought" in part && part.thought === true) {
      // Thinking part
      const existingThinking = this._findActiveThinkingBlock(state);
      if (existingThinking !== null) {
        state.updateBlock(existingThinking, { thinking: part.text });
      } else {
        const blockIdx = this._nextBlockIndex++;
        state.addBlock(blockIdx, "thinking", {
          thinking: part.text,
          signature: "",
          provider: "gemini",
        });
      }
    } else if ("text" in part) {
      // Text part
      const existingText = this._findActiveTextBlock(state);
      if (existingText !== null) {
        state.updateBlock(existingText, { text: part.text });
      } else {
        const blockIdx = this._nextBlockIndex++;
        state.addBlock(blockIdx, "text", { text: part.text });
      }
    }
  }

  /** Find active (non-completed) thinking block */
  private _findActiveThinkingBlock(state: TransformState): number | null {
    for (const [idx, block] of state.blocks) {
      if (block.type === "thinking" && !block.finalTime) return idx;
    }
    return null;
  }

  /** Find active (non-completed) text block */
  private _findActiveTextBlock(state: TransformState): number | null {
    for (const [idx, block] of state.blocks) {
      if (block.type === "text" && !block.finalTime) return idx;
    }
    return null;
  }

  private _mapFinishReason(reason: string): "end_turn" | "tool_use" | "max_tokens" {
    switch (reason) {
      case "STOP":
        return "end_turn";
      case "MAX_TOKENS":
        return "max_tokens";
      default:
        return "end_turn";
    }
  }

  private _buildUsage(chunk: GeminiStreamChunk): Usage {
    const meta = chunk.usageMetadata!;
    const promptTokens = meta.promptTokenCount ?? 0;
    const candidatesTokens = meta.candidatesTokenCount ?? 0;
    const cachedTokens = meta.cachedContentTokenCount ?? 0;
    const cacheCreation = promptTokens - cachedTokens;

    return {
      model: chunk.modelVersion ?? "",
      maxInputTokens: 128_000,
      inputTokens: 0,
      outputTokens: candidatesTokens,
      cacheCreationInputTokens: cacheCreation > 0 ? cacheCreation : null,
      cacheReadInputTokens: cachedTokens > 0 ? cachedTokens : null,
      totalInputTokens: promptTokens,
      timestamp: new Date().toISOString(),
    };
  }
}
