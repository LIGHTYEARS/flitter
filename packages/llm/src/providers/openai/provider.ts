/**
 * @flitter/llm — OpenAI Responses API Provider
 *
 * 实现 LLMProvider 接口，使用 openai SDK 调用 OpenAI Responses API。
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
import type { OpenAISSEEvent } from "./transformer";
import { OpenAIToolTransformer, OpenAITransformer } from "./transformer";

// ─── OpenAIProvider ─────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  private readonly _transformer = new OpenAITransformer();
  private readonly _toolTransformer = new OpenAIToolTransformer();
  private readonly _injectedClient?: OpenAI;

  constructor(client?: OpenAI) {
    this._injectedClient = client;
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

    // Service tier — explicit setting takes priority, then auto-compute from agent mode
    const serviceTier = settings["openai.speed"] ?? (agentMode === "agent" ? "flex" : undefined);
    if (serviceTier) {
      body.service_tier = serviceTier;
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
