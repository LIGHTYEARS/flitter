/**
 * @flitter/llm — OpenAI Responses API Provider
 *
 * 实现 LLMProvider 接口，使用 openai SDK 调用 OpenAI Responses API。
 * 支持 `openai.useChatCompletions` 配置项，当为 true 时回退到 Chat Completions API。
 *
 * @example
 * ```ts
 * const provider = new OpenAIProvider();
 * for await (const delta of provider.stream(params)) {
 *   console.log(delta.content, delta.state);
 * }
 * ```
 */
import OpenAI from "openai";
import type { LLMProvider } from "../../provider";
import { withStreamIdleTimeout } from "../../stream-idle-timeout";
import type { StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import { mergeWithDefaults } from "../openai-compat/compat";
import type { CompatStreamChunk } from "../openai-compat/transformer";
import { CompatToolTransformer, CompatTransformer } from "../openai-compat/transformer";
import type { OpenAISSEEvent } from "./transformer";
import { OpenAIToolTransformer, OpenAITransformer } from "./transformer";

// ─── OpenAIProvider ─────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  private readonly _transformer = new OpenAITransformer();
  private readonly _toolTransformer = new OpenAIToolTransformer();
  // 逆向: amp chunk-002.js:13633-13659 — openai-compat providers use CompatTransformer
  // Reuse CompatTransformer for chat completions fallback path
  private readonly _compatTransformer: CompatTransformer;
  private readonly _compatToolTransformer = new CompatToolTransformer();
  private readonly _injectedClient?: OpenAI;

  constructor(client?: OpenAI) {
    this._injectedClient = client;
    // Chat completions mode: use developer role (OpenAI supports it) + OpenAI thinking format
    this._compatTransformer = new CompatTransformer(
      mergeWithDefaults({
        supportsDeveloperRole: true,
        supportsStore: false,
        supportsReasoningEffort: false,
        supportsUsageInStreaming: true,
        maxTokensField: "max_completion_tokens",
        supportsStrictMode: true,
        thinkingFormat: "openai",
      }),
    );
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamDelta> {
    const {
      model,
      messages,
      systemPrompt,
      tools,
      config,
      reasoningEffort,
      threadId,
      agentMode,
      requestId,
      sessionId,
    } = params;

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, "openai", false, "OpenAI API key not configured");
    }

    // Build SDK client (injected for tests, or create on-demand)
    const client =
      this._injectedClient ??
      new OpenAI({
        apiKey,
        // 逆向: amp disables SDK-level retries — RetryScheduler + ModelFallbackChain handle retries
        maxRetries: 0,
      });

    // Check for chat completions fallback
    // 逆向: amp chunk-002.js:13633-13659 (r4R) — the xAI provider uses chat.completions
    // with { model, messages, tools, stream: true, stream_options: { include_usage: true } }
    // Flitter provides this same escape hatch for OpenAI via openai.useChatCompletions
    const useChatCompletions = config.settings["openai.useChatCompletions"] === true;

    if (useChatCompletions) {
      yield* this._streamChatCompletions(client, params);
      return;
    }

    // Get model info
    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 16_384;

    // Build request body
    const input = this._transformer.toProviderMessages(messages, systemPrompt);
    const openAITools = tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    const body = this._buildRequestBody(
      model,
      maxOutputTokens,
      input,
      openAITools,
      config.settings,
      reasoningEffort,
      modelInfo?.supportsThinking ?? false,
      threadId,
      agentMode,
    );

    // Build per-request telemetry headers
    // 逆向: amp-cli-reversed/chunk-002.js:11472,12133 — x-request-id captured from response for correlation
    // Flitter extension: also send x-request-id / x-session-id as outgoing headers
    const requestHeaders: Record<string, string> = {};
    if (requestId) requestHeaders["x-request-id"] = requestId;
    if (sessionId) requestHeaders["x-session-id"] = sessionId;

    // Create state for tracking blocks
    const state = new TransformState();

    // Stream via SDK
    try {
      const stream = (await client.responses.create(
        body as Parameters<typeof client.responses.create>[0],
        Object.keys(requestHeaders).length > 0 ? { headers: requestHeaders } : undefined,
      )) as AsyncIterable<unknown>;

      for await (const event of withStreamIdleTimeout(stream)) {
        const delta = this._transformer.fromProviderDelta(
          event as unknown as OpenAISSEEvent,
          state,
        );
        yield delta;
      }
    } catch (err: unknown) {
      // Convert SDK errors to ProviderError
      if (err instanceof OpenAI.APIError) {
        const status = err.status ?? 500;
        // 逆向: _9.js:275-283 (shouldRetry) — 408, 409, 429, >=500
        throw new ProviderError(
          status,
          "openai",
          status === 408 || status === 409 || status === 429 || status >= 500,
          err.message,
        );
      }
      throw err;
    }
  }

  // ─── Chat Completions fallback ─────────────────────────

  /**
   * Chat Completions streaming path for `openai.useChatCompletions: true`.
   *
   * 逆向: amp chunk-002.js:12560-12693 (SO + $k) — delta accumulation + output conversion.
   * amp chunk-002.js:13633-13659 (r4R) — xAI/compat provider uses identical request shape.
   *
   * Field mapping (Responses API → Chat Completions):
   *   input             → messages
   *   max_output_tokens → max_completion_tokens
   *   tools[].{type,name,description,parameters} → tools[].{type,function:{name,description,parameters}}
   *   stream_options    → { include_usage: true } (not { include_obfuscation: false })
   */
  private async *_streamChatCompletions(
    client: OpenAI,
    params: StreamParams,
  ): AsyncGenerator<StreamDelta> {
    const {
      model,
      messages,
      systemPrompt,
      tools,
      config,
      reasoningEffort,
      threadId,
      requestId,
      sessionId,
    } = params;

    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 16_384;

    // Convert messages using CompatTransformer (Chat Completions format)
    const chatMessages = this._compatTransformer.toProviderMessages(messages, systemPrompt);

    // Convert tools — Chat Completions wraps in { type:"function", function:{...} }
    // 逆向: amp chunk-002.js:12401-12413 (pUT) — { type:"function", function:{ name, description, parameters } }
    const chatTools =
      tools.length > 0 ? this._compatToolTransformer.toProviderTools(tools) : undefined;

    // Build Chat Completions request body
    // 逆向: amp chunk-002.js:13633-13659 (r4R):
    //   { model, messages, tools, stream: true, stream_options: { include_usage: true } }
    const body: Record<string, unknown> = {
      model,
      messages: chatMessages,
      stream: true,
      max_completion_tokens: maxOutputTokens,
      stream_options: { include_usage: true },
    };

    if (chatTools && chatTools.length > 0) {
      body.tools = chatTools;
    }

    // Temperature for non-reasoning models
    const temperature = config.settings["openai.temperature"];
    if (temperature !== undefined) {
      body.temperature = temperature;
    } else if (!(modelInfo?.supportsThinking ?? false)) {
      body.temperature = 0.1;
    }

    // Reasoning effort if supported
    if (reasoningEffort) {
      body.reasoning_effort = reasoningEffort;
    }

    // Prompt cache key
    const cacheKey = config.settings["openai.promptCacheKey"] ?? threadId;
    if (cacheKey) {
      body.prompt_cache_key = cacheKey;
    }

    // Per-request telemetry headers
    const requestHeaders: Record<string, string> = {};
    if (requestId) requestHeaders["x-request-id"] = requestId;
    if (sessionId) requestHeaders["x-session-id"] = sessionId;

    const state = new TransformState();

    try {
      const stream = await client.chat.completions.create(
        body as unknown as Parameters<typeof client.chat.completions.create>[0],
        Object.keys(requestHeaders).length > 0 ? { headers: requestHeaders } : undefined,
      );

      for await (const chunk of withStreamIdleTimeout(stream as AsyncIterable<unknown>)) {
        const delta = this._compatTransformer.fromProviderDelta(chunk as CompatStreamChunk, state);
        yield delta;
      }
    } catch (err: unknown) {
      if (err instanceof OpenAI.APIError) {
        const status = err.status ?? 500;
        throw new ProviderError(
          status,
          "openai",
          status === 408 || status === 409 || status === 429 || status >= 500,
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
    input: ReturnType<OpenAITransformer["toProviderMessages"]>,
    tools: ReturnType<OpenAIToolTransformer["toProviderTools"]> | undefined,
    settings: Record<string, unknown>,
    reasoningEffort?: string,
    supportsReasoning = false,
    threadId?: string,
    agentMode?: string,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      input,
      store: false,
      stream: true,
      max_output_tokens: maxOutputTokens,
      parallel_tool_calls: true,
      stream_options: { include_obfuscation: false },
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    // Reasoning configuration
    if (supportsReasoning) {
      const effort = this._mapEffort(reasoningEffort);
      body.reasoning = {
        effort,
        summary: "auto",
      };
      body.include = ["reasoning.encrypted_content"];
    } else {
      // Non-reasoning models use temperature
      const temperature = settings["openai.temperature"];
      if (temperature !== undefined) {
        body.temperature = temperature;
      } else {
        body.temperature = 0.1;
      }
    }

    // Service tier — 逆向: AUT() in chunk-002.js:12397-12399
    //   function AUT(T, R, a) {
    //     let e = u3T(R, a);  // resolves speed setting (with server feature override)
    //     return qo(T) && e === "fast" ? "priority" : void 0;
    //   }
    //   qo(T) = isDeepReasoningMode(T) — true for "deep" mode
    //
    // Flitter: no server feature flag, use openai.speed setting directly.
    // - explicit setting always takes priority (passthrough)
    // - auto: "priority" when deep mode + speed=fast; otherwise no service_tier
    const speedSetting = settings["openai.speed"] as string | undefined;
    if (speedSetting) {
      // Auto-compute: deep + fast → "priority" (matching amp's AUT)
      body.service_tier =
        agentMode === "deep" && speedSetting === "fast" ? "priority" : speedSetting;
    }

    // Prompt cache key — explicit setting takes priority, then threadId fallback
    const cacheKey = settings["openai.promptCacheKey"] ?? threadId;
    if (cacheKey) {
      body.prompt_cache_key = cacheKey;
    }

    return body;
  }

  /** Map reasoning effort to OpenAI effort levels */
  private _mapEffort(effort?: string): string {
    switch (effort) {
      case "none":
      case "minimal":
        return "low";
      case "low":
        return "low";
      case "medium":
        return "medium";
      case "high":
        return "high";
      case "xhigh":
        return "xhigh";
      default:
        return "medium";
    }
  }
}
