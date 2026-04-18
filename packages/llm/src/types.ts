/**
 * @flitter/llm — LLM Provider 核心类型
 *
 * 定义统一的 Provider 接口类型、流式输入输出、工具定义、模型注册表
 * 从 amp-cli-reversed/app/llm-sdk-providers.js 和 vendor/esm/model-registry.js 提取
 *
 * @example
 * ```ts
 * import { type StreamParams, type StreamDelta, MODEL_REGISTRY, ProviderError } from '@flitter/llm';
 * const model = MODEL_REGISTRY['claude-sonnet-4-20250514'];
 * if (!model) throw new ProviderError(404, 'anthropic', false, 'Unknown model');
 * ```
 */
import type {
  AssistantContentBlock,
  CacheControl,
  Config,
  Message,
  MessageState,
  Usage,
} from "@flitter/schemas";

// ─── SystemPromptBlock ────────────────────────────────────

/**
 * 系统提示词块
 *
 * 等价于 TextBlockSchema 推断类型，此处独立定义避免额外 zod 运行时依赖
 */
export interface SystemPromptBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

// ─── Provider 名称 ────────────────────────────────────────

/** 内置已知 Provider */
export type KnownProvider = "anthropic" | "openai" | "gemini" | "openai-compat" | "bedrock";

/** Provider 标识 — 已知 + 自定义字符串 (用于动态注册) */
export type ProviderName = KnownProvider | (string & {});

// ─── 推理深度 ─────────────────────────────────────────────

/** 推理深度控制等级 */
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

// ─── StreamParams (统一输入) ──────────────────────────────

/**
 * 流式对话请求参数
 *
 * 所有 Provider 统一接收此结构，内部由各自的 Transformer 转换为原生格式
 */
export interface StreamParams {
  /** 模型标识 (如 "claude-sonnet-4-20250514", "gpt-4o") */
  model: string;
  /** 对话消息历史 (Flitter 统一格式) */
  messages: Message[];
  /** 系统提示词 (支持多段，带 cache_control) */
  systemPrompt: SystemPromptBlock[];
  /** 可用工具列表 */
  tools: ToolDefinition[];
  /** 运行时配置 (含 Settings + SecretStore) */
  config: Config;
  /** 取消信号 */
  signal: AbortSignal;
  /** 推理深度控制 */
  reasoningEffort?: ReasoningEffort;
}

// ─── StreamDelta (统一输出) ──────────────────────────────

/**
 * 流式增量输出
 *
 * 每次 yield 包含完整的当前 content 数组 (累积模式)
 */
export interface StreamDelta {
  /** 增量内容块 (累积模式 — 每次 yield 包含完整的当前 content 数组) */
  content: AssistantContentBlock[];
  /** 流状态 */
  state: MessageState;
  /** token 用量 (仅在 complete 时填充) */
  usage?: Usage;
}

// ─── ToolDefinition ─────────────────────────────────────

/**
 * 工具定义 (跨 Provider 统一格式)
 *
 * 由各 Provider 的 ToolTransformer 转换为原生工具格式
 */
export interface ToolDefinition {
  /** 工具名 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 输入参数 JSON Schema */
  inputSchema: Record<string, unknown>;
}

// ─── ModelInfo ──────────────────────────────────────────

/**
 * 模型元数据
 *
 * 用于参数验证、token 限制检查、功能开关判断
 */
export interface ModelInfo {
  /** 模型 ID */
  id: string;
  /** 所属 Provider */
  provider: ProviderName;
  /** 上下文窗口大小 (tokens) */
  contextWindow: number;
  /** 最大输出 tokens */
  maxOutputTokens: number;
  /** 是否支持 thinking */
  supportsThinking: boolean;
  /** 是否支持工具调用 */
  supportsTools: boolean;
  /** 是否支持图片输入 */
  supportsImages: boolean;
  /** 是否支持缓存控制 */
  supportsCacheControl: boolean;
  /** 费用 (每百万 tokens，美元) */
  cost?: { input: number; output: number };
  /** 自定义端点 URL (用于 openai-compat 等) */
  baseUrl?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

// ─── OpenAICompatConfig ─────────────────────────────────

/**
 * OpenAI-compatible 端点兼容性配置
 *
 * 不同的 OpenAI-compatible provider (xAI, Groq, DeepSeek, OpenRouter 等)
 * 在 API 行为上存在微妙差异，此配置用于描述这些差异。
 *
 * @example
 * ```ts
 * const xaiConfig: OpenAICompatConfig = {
 *   baseURL: "https://api.x.ai/v1",
 *   supportsStore: false,
 *   supportsDeveloperRole: false,
 * };
 * ```
 */
export interface OpenAICompatConfig {
  /** 端点 URL */
  baseURL: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 是否支持 store 字段 (默认 true) */
  supportsStore?: boolean;
  /** 是否支持 developer role (默认 true，非标准端点用 system) */
  supportsDeveloperRole?: boolean;
  /** 是否支持 reasoning_effort (默认 true) */
  supportsReasoningEffort?: boolean;
  /** 是否支持 stream_options.include_usage (默认 true) */
  supportsUsageInStreaming?: boolean;
  /** max token 字段名 (默认 "max_completion_tokens") */
  maxTokensField?: "max_completion_tokens" | "max_tokens";
  /** 是否支持 strict mode (默认 true) */
  supportsStrictMode?: boolean;
  /** Thinking 格式 (默认 "openai") */
  thinkingFormat?: "openai" | "openrouter" | "zai" | "qwen";
}

// ─── ProviderError ──────────────────────────────────────

/**
 * Provider API 错误
 *
 * 包含 HTTP 状态码、重试信息，用于 RetryPolicy 决策
 *
 * @example
 * ```ts
 * throw new ProviderError(429, 'anthropic', true, 'Rate limited', 2000);
 * ```
 */
export class ProviderError extends Error {
  /** HTTP 状态码 */
  readonly status: number;
  /** 来源 Provider */
  readonly provider: ProviderName;
  /** 是否可重试 */
  readonly retryable: boolean;
  /** 重试等待时间 (ms)，来自 Retry-After header */
  readonly retryAfterMs?: number;

  constructor(
    status: number,
    provider: ProviderName,
    retryable: boolean,
    message: string,
    retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.provider = provider;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

// ─── TransformState ─────────────────────────────────────

/** Block 级状态，追踪每个 content block 的构建过程 */
export interface BlockState {
  type: AssistantContentBlock["type"];
  startTime: number;
  finalTime?: number;
  data: Record<string, unknown>;
}

/**
 * 消息转换器内部状态
 *
 * 追踪 SSE 事件到 AssistantContentBlock 的累积映射
 */
export class TransformState {
  /** 按 index 追踪每个 content block */
  readonly blocks: Map<number, BlockState> = new Map();
  /** 当前累积的 content 数组 */
  private _content: AssistantContentBlock[] = [];

  /** 添加新 block */
  addBlock(
    index: number,
    type: AssistantContentBlock["type"],
    initialData?: Record<string, unknown>,
  ): void {
    const state: BlockState = {
      type,
      startTime: Date.now(),
      data: initialData ?? {},
    };
    this.blocks.set(index, state);
    this._syncContent();
  }

  /** 更新 block 数据 (追加文本/JSON) */
  updateBlock(index: number, update: Record<string, unknown>): void {
    const block = this.blocks.get(index);
    if (!block) return;

    for (const [key, value] of Object.entries(update)) {
      if (typeof value === "string" && typeof block.data[key] === "string") {
        // 字符串追加模式
        block.data[key] = (block.data[key] as string) + value;
      } else {
        block.data[key] = value;
      }
    }
    this._syncContent();
  }

  /** 标记 block 完成 */
  completeBlock(index: number): void {
    const block = this.blocks.get(index);
    if (!block) return;
    block.finalTime = Date.now();
    this._syncContent();
  }

  /** 返回当前 content 快照 */
  getContent(): AssistantContentBlock[] {
    return [...this._content];
  }

  /** 从 BlockState 同步到 AssistantContentBlock 数组 */
  private _syncContent(): void {
    const content: AssistantContentBlock[] = [];
    const indices = [...this.blocks.keys()].sort((a, b) => a - b);

    for (const idx of indices) {
      const block = this.blocks.get(idx)!;
      const base = {
        startTime: block.startTime,
        ...(block.finalTime !== undefined ? { finalTime: block.finalTime } : {}),
      };

      switch (block.type) {
        case "text":
          content.push({
            type: "text",
            text: (block.data.text as string) ?? "",
            ...base,
          });
          break;
        case "tool_use":
          content.push({
            type: "tool_use",
            id: (block.data.id as string) ?? "",
            name: (block.data.name as string) ?? "",
            complete: (block.data.complete as boolean) ?? false,
            input: (block.data.input as Record<string, unknown>) ?? {},
            ...(block.data.inputPartialJSON !== undefined
              ? { inputPartialJSON: block.data.inputPartialJSON as { json: string } }
              : {}),
            ...base,
          });
          break;
        case "thinking":
          content.push({
            type: "thinking",
            thinking: (block.data.thinking as string) ?? "",
            signature: (block.data.signature as string) ?? "",
            ...(block.data.provider !== undefined
              ? { provider: block.data.provider as "anthropic" | "vertexai" | "openai" }
              : {}),
            ...base,
          });
          break;
        case "redacted_thinking":
          content.push({
            type: "redacted_thinking",
            data: (block.data.data as string) ?? "",
            ...(block.data.provider !== undefined
              ? { provider: block.data.provider as "anthropic" | "vertexai" | "openai" }
              : {}),
            ...base,
          });
          break;
        case "server_tool_use":
          content.push({
            type: "server_tool_use",
            id: (block.data.id as string) ?? "",
            name: (block.data.name as string) ?? "",
            input: block.data.input ?? {},
            ...base,
          });
          break;
      }
    }

    this._content = content;
  }
}

// ─── MODEL_REGISTRY ─────────────────────────────────────

/**
 * 已知模型注册表
 *
 * 从 amp-cli-reversed/vendor/esm/model-registry.js 提取
 */
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  // ── Anthropic ──────────────────────────────────────
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 16_384,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 3, output: 15 },
  },
  "claude-opus-4-20250515": {
    id: "claude-opus-4-20250515",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 15, output: 75 },
  },
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 0.8, output: 4 },
  },

  // ── OpenAI ─────────────────────────────────────────
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 2.5, output: 10 },
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.15, output: 0.6 },
  },
  o3: {
    id: "o3",
    provider: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 2, output: 8 },
  },
  "o3-mini": {
    id: "o3-mini",
    provider: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 1.1, output: 4.4 },
  },
  "o4-mini": {
    id: "o4-mini",
    provider: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 1.1, output: 4.4 },
  },
  "codex-mini": {
    id: "codex-mini",
    provider: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 1.5, output: 6 },
  },

  // ── Gemini ─────────────────────────────────────────
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 1.25, output: 10 },
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.15, output: 0.6 },
  },
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 8_192,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.1, output: 0.4 },
  },

  // ── xAI (via openai-compat) ────────────────────────
  "grok-3": {
    id: "grok-3",
    provider: "openai-compat",
    contextWindow: 131_072,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 3, output: 15 },
    baseUrl: "https://api.x.ai/v1",
  },
  "grok-3-mini": {
    id: "grok-3-mini",
    provider: "openai-compat",
    contextWindow: 131_072,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 0.3, output: 0.5 },
    baseUrl: "https://api.x.ai/v1",
  },
  "grok-code-fast-1": {
    id: "grok-code-fast-1",
    provider: "openai-compat",
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    baseUrl: "https://api.x.ai/v1",
  },
};

/**
 * 动态注册模型到 MODEL_REGISTRY
 *
 * 用于运行时添加自定义模型 (如 Volcengine ARK 端点的 ep-* 模型)。
 * 如果模型 ID 已存在，覆盖之。
 *
 * @param info - 模型元数据
 *
 * @example
 * ```ts
 * import { registerModel } from "@flitter/llm";
 *
 * registerModel({
 *   id: "ep-20260331120931-5lxqv",
 *   provider: "anthropic",
 *   contextWindow: 200_000,
 *   maxOutputTokens: 16_384,
 *   supportsThinking: false,
 *   supportsTools: true,
 *   supportsImages: false,
 *   supportsCacheControl: false,
 * });
 * ```
 */
export function registerModel(info: ModelInfo): void {
  MODEL_REGISTRY[info.id] = info;
}
