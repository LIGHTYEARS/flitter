/**
 * @flitter/llm — OpenAI-Compatible ChatCompletion API Provider
 *
 * 通用 OpenAI-compatible 端点 Provider，使用 openai SDK 的 ChatCompletion API。
 * 支持 xAI, Groq, DeepSeek, OpenRouter, Cerebras 等端点。
 *
 * @example
 * ```ts
 * const provider = new OpenAICompatProvider({ name: "xai" });
 * for await (const delta of provider.stream(params)) {
 *   console.log(delta.content, delta.state);
 * }
 * ```
 */
import OpenAI from "openai";
import type { LLMProvider } from "../../provider";
import { withStreamIdleTimeout } from "../../stream-idle-timeout";
import type { OpenAICompatConfig, ProviderName, StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import { buildTelemetryHeaders } from "../../utils/telemetry-headers";
import { KNOWN_COMPAT_CONFIGS, mergeWithDefaults } from "./compat";
import type { CompatStreamChunk } from "./transformer";
import { CompatToolTransformer, CompatTransformer } from "./transformer";

// ─── OpenAICompatProvider ───────────────────────────────

export class OpenAICompatProvider implements LLMProvider {
  readonly name: ProviderName;
  private readonly _config: OpenAICompatConfig;
  private readonly _transformer: CompatTransformer;
  private readonly _toolTransformer = new CompatToolTransformer();
  private readonly _injectedClient?: OpenAI;

  constructor(
    opts: {
      name?: string;
      client?: OpenAI;
      config?: Partial<OpenAICompatConfig>;
    } = {},
  ) {
    const knownName = opts.name ?? "openai-compat";
    this.name = knownName;

    // Merge: known preset → user override → defaults
    const knownConfig = KNOWN_COMPAT_CONFIGS[knownName] ?? {};
    const merged = mergeWithDefaults({ ...knownConfig, ...opts.config });
    this._config = merged;

    this._transformer = new CompatTransformer(this._config);
    this._injectedClient = opts.client;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamDelta> {
    const {
      model,
      messages,
      systemPrompt,
      tools,
      config,
      reasoningEffort,
      requestId,
      sessionId,
      threadId,
      agentMode,
      feature,
    } = params;

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, this.name, false, `${this.name} API key not configured`);
    }

    // Build SDK client (injected for tests, or create on-demand)
    const client =
      this._injectedClient ??
      new OpenAI({
        apiKey,
        baseURL: this._config.baseURL,
        defaultHeaders: this._config.headers,
        // 逆向: amp disables SDK-level retries — RetryScheduler + ModelFallbackChain handle retries
        maxRetries: 0,
      });

    // Get model info
    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 16_384;

    // Build messages
    const chatMessages = this._transformer.toProviderMessages(messages, systemPrompt);
    const chatTools = tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    // Build request body
    const body = this._buildRequestBody(
      model,
      maxOutputTokens,
      chatMessages,
      chatTools,
      config.settings,
      reasoningEffort,
      threadId,
    );

    // Build per-request telemetry headers
    // 逆向: amp-cli-reversed/chunk-002.js:11472,12133 — x-request-id captured from response for correlation
    // 逆向: amp-cli-reversed/chunk-001.js:7088-7091 — x-amp-feature, x-amp-thread-id, x-amp-mode constants
    // 逆向: amp-cli-reversed/chunk-001.js:5955-5960 (Vs) — thread meta → header assembly
    const requestHeaders: Record<string, string> = {
      ...buildTelemetryHeaders({ feature, threadId, agentMode }),
    };
    if (requestId) requestHeaders["x-request-id"] = requestId;
    if (sessionId) requestHeaders["x-session-id"] = sessionId;

    // Create state
    const state = new TransformState();

    // Stream via SDK
    try {
      const stream = await client.chat.completions.create(
        body as unknown as Parameters<typeof client.chat.completions.create>[0],
        Object.keys(requestHeaders).length > 0 ? { headers: requestHeaders } : undefined,
      );

      for await (const chunk of withStreamIdleTimeout(stream as AsyncIterable<unknown>)) {
        const delta = this._transformer.fromProviderDelta(chunk as CompatStreamChunk, state);
        yield delta;
      }
    } catch (err: unknown) {
      // Convert SDK errors to ProviderError
      if (err instanceof OpenAI.APIError) {
        const status = err.status ?? 500;
        throw new ProviderError(
          status,
          this.name,
          status === 408 ||
            status === 429 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504,
          err.message,
        );
      }
      throw err;
    }
  }

  // ─── Private ──────────────────────────────────────────

  private _buildRequestBody(
    model: string,
    maxOutputTokens: number,
    messages: ReturnType<CompatTransformer["toProviderMessages"]>,
    tools: ReturnType<CompatToolTransformer["toProviderTools"]> | undefined,
    settings: Record<string, unknown>,
    reasoningEffort?: string,
    threadId?: string,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
    };

    // Max tokens field name varies by provider
    body[this._config.maxTokensField ?? "max_completion_tokens"] = maxOutputTokens;

    // Stream options — include usage if supported
    if (this._config.supportsUsageInStreaming !== false) {
      body.stream_options = { include_usage: true };
    }

    // Store — only if supported
    if (this._config.supportsStore !== false) {
      body.store = false;
    }

    // Tools
    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    // Reasoning effort — only if supported
    if (this._config.supportsReasoningEffort !== false && reasoningEffort) {
      body.reasoning_effort = reasoningEffort;
    }

    // Temperature from settings
    const temperature =
      settings[`${this.name}.temperature`] ?? settings["openai-compat.temperature"];
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    // Prompt cache key — explicit setting takes priority, then threadId fallback
    // 逆向: amp sets prompt_cache_key: thread.id unconditionally on OpenAI requests
    // (chunk-002.js:12980). For compat providers, Flitter checks a provider-specific
    // setting first, then the generic openai-compat key, then falls back to threadId.
    const cacheKey =
      settings[`${this.name}.promptCacheKey`] ??
      settings["openai-compat.promptCacheKey"] ??
      threadId;
    if (cacheKey) {
      body.prompt_cache_key = cacheKey;
    }

    return body;
  }
}
