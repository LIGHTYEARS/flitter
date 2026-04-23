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
  /** Thread ID — used as prompt_cache_key for OpenAI and for telemetry */
  threadId?: string;
  /** Agent mode — "agent" enables flex service_tier for OpenAI background processing */
  agentMode?: string;
  /** Request correlation ID for telemetry / debug logging */
  requestId?: string;
  /** Session ID for request grouping */
  sessionId?: string;
  /**
   * Feature identifier for telemetry headers.
   *
   * Maps to x-amp-feature header sent to API providers.
   * Defaults to "amp.chat" when not specified, matching amp's default.
   *
   * 逆向: amp-cli-reversed/chunk-001.js:7088 — yc = "x-amp-feature"
   * 逆向: amp-cli-reversed/chunk-002.js:1902 — [yc]: "amp.chat" default
   */
  feature?: string;
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
  cost?: {
    input: number;
    output: number;
    /** Cost for reading cached tokens (per million tokens) */
    cached?: number;
    /** Cost for writing to cache (per million tokens) */
    cacheWrite?: number;
  };
  /**
   * Prompt cache time-to-live in seconds.
   * Anthropic models use 300 (5 minutes).
   *
   * 逆向: amp modules/2026_tail_anonymous.js:60429 — cacheTTL: 300
   */
  cacheTTL?: number;
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
  // 逆向: amp-cli-reversed/chunk-005.js:66585 CLAUDE_SONNET_4
  "claude-sonnet-4-20250514": {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 3, output: 15, cached: 0.3, cacheWrite: 3.75 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66604 CLAUDE_SONNET_4_5
  "claude-sonnet-4-5-20250929": {
    id: "claude-sonnet-4-5-20250929",
    provider: "anthropic",
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 3, output: 15, cached: 0.3, cacheWrite: 3.75 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66623 CLAUDE_SONNET_4_6
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 3, output: 15, cached: 0.3, cacheWrite: 3.75 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66642 CLAUDE_OPUS_4
  "claude-opus-4-20250514": {
    id: "claude-opus-4-20250514",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 15, output: 75, cached: 1.5, cacheWrite: 18.75 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66661 CLAUDE_OPUS_4_1
  "claude-opus-4-1-20250805": {
    id: "claude-opus-4-1-20250805",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 15, output: 75, cached: 1.5, cacheWrite: 18.75 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66680 CLAUDE_OPUS_4_5
  "claude-opus-4-5-20251101": {
    id: "claude-opus-4-5-20251101",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 5, output: 25, cached: 0.5, cacheWrite: 6.25 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66699 CLAUDE_OPUS_4_6
  "claude-opus-4-6": {
    id: "claude-opus-4-6",
    provider: "anthropic",
    contextWindow: 332_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 5, output: 25, cached: 0.5, cacheWrite: 6.25 },
    cacheTTL: 300,
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
    cost: { input: 0.8, output: 4, cached: 0.08, cacheWrite: 1 },
    cacheTTL: 300,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66720 CLAUDE_HAIKU_4_5
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: true,
    cost: { input: 1, output: 5, cached: 0.1, cacheWrite: 1.25 },
    cacheTTL: 300,
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
  // 逆向: amp-cli-reversed/chunk-005.js:66737 GPT_5
  "gpt-5": {
    id: "gpt-5",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 2, output: 8 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66754 GPT_5_1
  "gpt-5.1": {
    id: "gpt-5.1",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 2, output: 8 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66771 GPT_5_2
  "gpt-5.2": {
    id: "gpt-5.2",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 2, output: 8 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66788 GPT_5_4
  "gpt-5.4": {
    id: "gpt-5.4",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 2, output: 8 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66805 GPT_5_CODEX
  "gpt-5-codex": {
    id: "gpt-5-codex",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 1.25, output: 10 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66821 GPT_5_1_CODEX
  "gpt-5.1-codex": {
    id: "gpt-5.1-codex",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 1.25, output: 10 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66837 GPT_5_2_CODEX
  "gpt-5.2-codex": {
    id: "gpt-5.2-codex",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 1.75, output: 14 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66854 GPT_5_3_CODEX
  "gpt-5.3-codex": {
    id: "gpt-5.3-codex",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 1.75, output: 14 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66871 GPT_5_MINI
  "gpt-5-mini": {
    id: "gpt-5-mini",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.25, output: 2 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66888 GPT_5_NANO
  "gpt-5-nano": {
    id: "gpt-5-nano",
    provider: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.05, output: 0.4 },
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
  // 逆向: amp-cli-reversed/chunk-005.js:66937 GPT_OSS_120B
  "openai/gpt-oss-120b": {
    id: "openai/gpt-oss-120b",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
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
  // 逆向: amp-cli-reversed/chunk-005.js:66959 GEMINI_3_PRO_PREVIEW
  "gemini-3-pro-preview": {
    id: "gemini-3-pro-preview",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66971 GEMINI_3_1_PRO_PREVIEW
  "gemini-3.1-pro-preview": {
    id: "gemini-3.1-pro-preview",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js:66983 GEMINI3_FLASH_PREVIEW
  "gemini-3-flash-preview": {
    id: "gemini-3-flash-preview",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.15, output: 0.6 },
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
  // 逆向: amp-cli-reversed/chunk-005.js:66948 GROK_CODE_FAST_1
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

  // ── Cerebras (via openai-compat) ──────────────────
  // 逆向: amp-cli-reversed/chunk-005.js Z_AI_GLM_4_7
  "zai-glm-4.7": {
    id: "zai-glm-4.7",
    provider: "cerebras",
    contextWindow: 131_000,
    maxOutputTokens: 40_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },

  // ── Fireworks (via openai-compat) ─────────────────
  // 逆向: amp-cli-reversed/chunk-005.js FIREWORKS_QWEN3_CODER_480B
  "accounts/fireworks/models/qwen3-coder-480b-a35b-instruct": {
    id: "accounts/fireworks/models/qwen3-coder-480b-a35b-instruct",
    provider: "fireworks",
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js FIREWORKS_KIMI_K2_INSTRUCT
  "accounts/fireworks/models/kimi-k2-instruct-0905": {
    id: "accounts/fireworks/models/kimi-k2-instruct-0905",
    provider: "fireworks",
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js FIREWORKS_QWEN3_235B
  "accounts/fireworks/models/qwen3-235b-a22b-instruct-2507": {
    id: "accounts/fireworks/models/qwen3-235b-a22b-instruct-2507",
    provider: "fireworks",
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js FIREWORKS_GLM_4P6
  "accounts/fireworks/models/glm-4p6": {
    id: "accounts/fireworks/models/glm-4p6",
    provider: "fireworks",
    contextWindow: 162_752,
    maxOutputTokens: 40_000,
    supportsThinking: true,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js FIREWORKS_GLM_5
  "accounts/fireworks/models/glm-5": {
    id: "accounts/fireworks/models/glm-5",
    provider: "fireworks",
    contextWindow: 202_800,
    maxOutputTokens: 40_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 1, output: 3.2 },
  },
  // 逆向: amp-cli-reversed/chunk-005.js FIREWORKS_MINIMAX_M2P5
  "accounts/fireworks/models/minimax-m2p5": {
    id: "accounts/fireworks/models/minimax-m2p5",
    provider: "fireworks",
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
    cost: { input: 0.3, output: 1.2 },
  },

  // ── Baseten (via openai-compat) ───────────────────
  // 逆向: amp-cli-reversed/chunk-005.js BASETEN_KIMI_K2P5
  "moonshotai/Kimi-K2.5": {
    id: "moonshotai/Kimi-K2.5",
    provider: "baseten",
    contextWindow: 262_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: true,
    supportsCacheControl: false,
    cost: { input: 0.6, output: 3 },
  },

  // ── OpenRouter (via openai-compat) ────────────────
  // 逆向: amp-cli-reversed/chunk-005.js SONOMA_SKY_ALPHA
  "sonoma-sky-alpha": {
    id: "sonoma-sky-alpha",
    provider: "openrouter",
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js OPENROUTER_GLM_4_6
  "z-ai/glm-4.6": {
    id: "z-ai/glm-4.6",
    provider: "openrouter",
    contextWindow: 131_000,
    maxOutputTokens: 40_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js OPENROUTER_KIMI_K2_0905
  "moonshotai/kimi-k2-0905": {
    id: "moonshotai/kimi-k2-0905",
    provider: "openrouter",
    contextWindow: 262_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js OPENROUTER_QWEN3_CODER_480B
  "qwen/qwen3-coder": {
    id: "qwen/qwen3-coder",
    provider: "openrouter",
    contextWindow: 262_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },
  // 逆向: amp-cli-reversed/chunk-005.js OPENROUTER_QWEN3_235B
  "qwen/qwen3-235b-a22b-2507": {
    id: "qwen/qwen3-235b-a22b-2507",
    provider: "openrouter",
    contextWindow: 262_144,
    maxOutputTokens: 32_000,
    supportsThinking: false,
    supportsTools: true,
    supportsImages: false,
    supportsCacheControl: false,
  },

  // ── Gemini image generation (VertexAI) ────────────
  // 逆向: amp-cli-reversed/chunk-005.js GEMINI_3_PRO_IMAGE
  "gemini-3-pro-image-preview": {
    id: "gemini-3-pro-image-preview",
    provider: "gemini",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsThinking: false,
    supportsTools: false,
    supportsImages: true,
    supportsCacheControl: false,
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
