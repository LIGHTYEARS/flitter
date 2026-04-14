/**
 * @flitter/llm — 消息转换器基类
 *
 * 提供 BaseMessageTransformer 抽象类和辅助方法，
 * 各 Provider 的具体 Transformer 继承此基类。
 *
 * @example
 * ```ts
 * class AnthropicTransformer extends BaseMessageTransformer<AnthropicMessage, AnthropicDelta> {
 *   toProviderMessages(messages, systemPrompt) { ... }
 *   fromProviderDelta(chunk, state) { ... }
 * }
 * ```
 */
import type { AssistantContentBlock, Message, Usage } from "@flitter/schemas";
import type { MessageTransformer } from "../provider";
import type { StreamDelta, SystemPromptBlock } from "../types";
import { TransformState } from "../types";

// ─── BaseMessageTransformer ─────────────────────────────

/**
 * 消息转换器抽象基类
 *
 * 提供创建 StreamDelta、过滤工具结果等公共辅助方法
 */
export abstract class BaseMessageTransformer<TNativeMessage, TNativeDelta>
  implements MessageTransformer<TNativeMessage, TNativeDelta>
{
  abstract toProviderMessages(
    messages: Message[],
    systemPrompt: SystemPromptBlock[],
  ): TNativeMessage[];
  abstract fromProviderDelta(chunk: TNativeDelta, state: TransformState): StreamDelta;

  /**
   * 过滤未完成的 tool_use 块
   *
   * tool_result 引用的 tool_use 如果 complete=false 则跳过
   */
  filterToolResults(content: AssistantContentBlock[]): AssistantContentBlock[] {
    return content.filter((block) => {
      if (block.type !== "tool_use") return true;
      return block.complete;
    });
  }

  /** 从 content block 提取纯文本 */
  extractTextContent(block: AssistantContentBlock): string {
    switch (block.type) {
      case "text":
        return block.text;
      case "thinking":
        return block.thinking;
      default:
        return "";
    }
  }

  /** 构建缓存控制头 */
  buildCacheControl(cacheControl?: {
    type: "ephemeral";
    ttl: string;
  }): Record<string, unknown> | undefined {
    if (!cacheControl) return undefined;
    return { type: cacheControl.type, ttl: cacheControl.ttl };
  }

  /** 创建空 StreamDelta (streaming 状态) */
  createEmptyDelta(content: AssistantContentBlock[] = []): StreamDelta {
    return {
      content,
      state: { type: "streaming" },
    };
  }

  /** 创建完成 StreamDelta */
  createCompleteDelta(
    content: AssistantContentBlock[],
    usage: Usage | undefined,
    stopReason: "end_turn" | "tool_use" | "max_tokens",
  ): StreamDelta {
    return {
      content,
      state: { type: "complete", stopReason },
      usage,
    };
  }

  /** 创建错误 StreamDelta */
  createErrorDelta(error: string, content: AssistantContentBlock[] = []): StreamDelta {
    return {
      content,
      state: { type: "error", error: { message: error } },
    };
  }

  /** 创建新的 TransformState */
  createState(): TransformState {
    return new TransformState();
  }
}

export { TransformState };
