/**
 * @flitter/llm — LLM Provider 接口与 Transformer 接口
 *
 * 定义所有 Provider 必须实现的统一接口和消息/工具转换器泛型接口
 *
 * @example
 * ```ts
 * import type { LLMProvider, MessageTransformer } from '@flitter/llm';
 *
 * class MyProvider implements LLMProvider {
 *   readonly name = 'anthropic' as const;
 *   async *stream(params: StreamParams): AsyncGenerator<StreamDelta> { ... }
 * }
 * ```
 */
import type { Message } from "@flitter/schemas";
import type {
  ProviderName,
  StreamDelta,
  StreamParams,
  SystemPromptBlock,
  ToolDefinition,
  TransformState,
} from "./types";

// ─── LLMProvider 接口 ───────────────────────────────────

/**
 * LLM Provider 统一接口
 *
 * 所有 Provider (Anthropic/OpenAI/Gemini/xAI) 必须实现此接口。
 * stream() 返回 AsyncGenerator，逐块 yield StreamDelta。
 */
export interface LLMProvider {
  /** Provider 标识名 */
  readonly name: ProviderName;

  /**
   * 发起流式对话请求
   *
   * @param params - 统一参数
   * @yields StreamDelta - 增量内容块 + 状态 + usage
   * @throws ProviderError - 不可重试的 API 错误
   */
  stream(params: StreamParams): AsyncGenerator<StreamDelta>;
}

// ─── MessageTransformer 接口 ────────────────────────────

/**
 * 消息转换器接口
 *
 * 每个 Provider 实现各自的 Transformer，
 * 负责 Flitter 统一格式与 Provider 原生格式之间的双向转换。
 *
 * @typeParam TNativeMessage - Provider 原生消息类型
 * @typeParam TNativeDelta - Provider 原生 SSE 增量类型
 */
export interface MessageTransformer<TNativeMessage, TNativeDelta> {
  /** Flitter 消息 → Provider 原生消息格式 */
  toProviderMessages(messages: Message[], systemPrompt: SystemPromptBlock[]): TNativeMessage[];
  /** Provider 流事件 → Flitter StreamDelta */
  fromProviderDelta(chunk: TNativeDelta, state: TransformState): StreamDelta;
}

// ─── ToolTransformer 接口 ───────────────────────────────

/**
 * 工具转换器接口
 *
 * 将 Flitter 统一 ToolDefinition 转换为 Provider 原生工具格式
 *
 * @typeParam TNativeTool - Provider 原生工具类型
 */
export interface ToolTransformer<TNativeTool> {
  /** Flitter ToolDefinition → Provider 原生工具格式 */
  toProviderTools(tools: ToolDefinition[]): TNativeTool[];
}
