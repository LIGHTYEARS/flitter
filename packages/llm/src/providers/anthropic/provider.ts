/**
 * @flitter/llm — Anthropic Claude Provider
 *
 * 实现 LLMProvider 接口，使用 @anthropic-ai/sdk 调用 Anthropic Messages API。
 *
 * @example
 * ```ts
 * const provider = new AnthropicProvider();
 * for await (const delta of provider.stream(params)) {
 *   console.log(delta.content, delta.state);
 * }
 * ```
 */
import Anthropic from "@anthropic-ai/sdk";
import type { CountTokensParams, CountTokensResult, LLMProvider } from "../../provider";
import { withStreamIdleTimeout } from "../../stream-idle-timeout";
import type { StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import { buildTelemetryHeaders } from "../../utils/telemetry-headers";
import type { AnthropicSSEEvent } from "./transformer";
import {
  AnthropicToolTransformer,
  AnthropicTransformer,
  addCacheControlToMessages,
} from "./transformer";

// ─── Types for createMessage ────────────────────────────

/**
 * Response shape for non-streaming createMessage calls.
 * Matches the subset of Anthropic SDK response used by title generation.
 * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js uses messages.create({ stream: false })
 */
export interface CreateMessageResponse {
  content: Array<{
    type: string;
    id?: string;
    name?: string;
    input?: unknown;
    text?: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

// ─── AnthropicProvider ──────────────────────────────────

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  private readonly _transformer = new AnthropicTransformer();
  private readonly _toolTransformer = new AnthropicToolTransformer();
  private readonly _injectedClient?: Anthropic;

  constructor(client?: Anthropic) {
    this._injectedClient = client;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamDelta> {
    const {
      model,
      messages,
      systemPrompt,
      tools,
      config,
      signal,
      reasoningEffort,
      requestId,
      sessionId,
      threadId,
      agentMode,
      feature,
    } = params;

    // Get API key / auth token
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, "anthropic", false, "Anthropic API key not configured");
    }

    // Build SDK client (injected for tests, or create on-demand)
    const client = this._injectedClient ?? this._createClient(apiKey, config.settings, model);

    // Get model info
    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 16_384;

    // Build request params
    const anthropicMessages = this._transformer.toProviderMessages(messages, systemPrompt);
    const system = this._transformer.toSystemBlocks(systemPrompt);
    const anthropicTools =
      tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    // 逆向: amp-cli-reversed/chunk-002.js:2149-2158 (f8T)
    //   Apply cache_control to the last content block of the last message.
    //   This enables Anthropic's prompt caching for repeated system prompts
    //   and conversation history.
    const supportsCacheControl = modelInfo?.supportsCacheControl ?? false;
    const cachedMessages = supportsCacheControl
      ? addCacheControlToMessages(anthropicMessages)
      : anthropicMessages;

    const body = this._buildRequestBody(
      model,
      maxOutputTokens,
      cachedMessages,
      system,
      anthropicTools,
      config.settings,
      reasoningEffort,
    );

    // Build per-request telemetry headers
    // 逆向: amp-cli-reversed/chunk-002.js:11472,12133 — x-request-id captured from response for correlation
    // 逆向: amp-cli-reversed/chunk-001.js:7088-7091 — x-amp-feature, x-amp-thread-id, x-amp-mode constants
    // 逆向: amp-cli-reversed/chunk-001.js:5955-5960 (Vs) — thread meta → header assembly
    // 逆向: amp-cli-reversed/chunk-002.js:1902 — [yc]: "amp.chat" default feature
    const requestHeaders: Record<string, string> = {
      ...buildTelemetryHeaders({ feature, threadId, agentMode }),
    };
    if (requestId) requestHeaders["x-request-id"] = requestId;
    if (sessionId) requestHeaders["x-session-id"] = sessionId;

    // Create state for tracking blocks
    const state = new TransformState();

    // Stream via SDK
    // 逆向: amp-cli-reversed/chunk-LXZZ5T6B.js:1-40 (C4R)
    //   Amp wraps every stream with a 120s idle timeout. If no chunk
    //   arrives within the window, StreamIdleTimeoutError is thrown
    //   and the retry scheduler will attempt the request again.
    try {
      const stream = client.messages.stream(body as Parameters<typeof client.messages.stream>[0], {
        signal,
        ...(Object.keys(requestHeaders).length > 0 ? { headers: requestHeaders } : {}),
      });

      for await (const event of withStreamIdleTimeout(stream)) {
        const delta = this._transformer.fromProviderDelta(event as AnthropicSSEEvent, state);
        yield delta;
      }
    } catch (err: unknown) {
      // Convert SDK errors to ProviderError
      if (err instanceof Anthropic.APIError) {
        // Extract retry-after from headers
        // 逆向: _9.js:285-301 (retryRequest) — check retry-after-ms first, then retry-after
        const headers = err.headers as Record<string, string> | undefined;
        let retryAfterMs: number | undefined;

        // Priority 1: retry-after-ms header (milliseconds)
        const retryAfterMsHeader = headers?.["retry-after-ms"];
        if (retryAfterMsHeader) {
          const parsed = parseFloat(retryAfterMsHeader);
          if (!Number.isNaN(parsed)) retryAfterMs = parsed;
        }

        // Priority 2: retry-after header (seconds or HTTP date)
        if (retryAfterMs === undefined) {
          const retryAfterHeader = headers?.["retry-after"];
          if (retryAfterHeader) {
            const parsed = parseFloat(retryAfterHeader);
            if (!Number.isNaN(parsed)) {
              retryAfterMs = parsed * 1000;
            } else {
              // HTTP date format fallback
              retryAfterMs = Date.parse(retryAfterHeader) - Date.now();
            }
          }
        }

        // 逆向: _9.js:275-283 (shouldRetry) — 408, 409, 429, >=500
        throw new ProviderError(
          err.status,
          "anthropic",
          err.status === 408 || err.status === 409 || err.status === 429 || err.status >= 500,
          err.message,
          retryAfterMs !== undefined && !Number.isNaN(retryAfterMs) ? retryAfterMs : undefined,
        );
      }
      throw err;
    }
  }

  // ─── Private ──────────────────────────────────────────

  /**
   * Count input tokens via the Anthropic /v1/messages/count_tokens endpoint.
   *
   * 逆向: amp-cli-reversed/modules/0084_unknown_Qu.js:1-31
   *   ```
   *   async function Qu(T, R, a, e) {
   *     let r = JSON.stringify(e.messages ?? []), h = ..., i = ...;
   *     try {
   *       return (await T.messages.countTokens({
   *         model: R,
   *         messages: e.messages ?? [{ role: "user", content: "x" }],
   *         ...(e.tools?.length > 0 ? { tools: e.tools } : {}),
   *         ...(e.system?.length > 0 ? { system: e.system } : {}),
   *         thinking: { type: "enabled", budget_tokens: 1e4 }
   *       }, { headers: a })).input_tokens;
   *     } catch {
   *       return n1R(r + h + i);  // fallback: Math.ceil(length / 4)
   *     }
   *   }
   *   ```
   *
   * Passes `thinking: { type: "enabled", budget_tokens: 10000 }` to ensure
   * the token count matches a thinking-enabled request.
   *
   * Falls back to character-based approximation (`Math.ceil(length / 4)`)
   * on any error — matching amp's `n1R` fallback (modules/0083_unknown_l1R.js).
   */
  async countTokens(params: CountTokensParams): Promise<CountTokensResult> {
    const { model, messages, systemPrompt, tools, config } = params;

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      // No key — use fallback
      return { inputTokens: this._countTokensFallback(messages, systemPrompt, tools) };
    }

    const client = this._injectedClient ?? this._createClient(apiKey, config.settings, model);

    // Build messages and system blocks using the transformer
    const anthropicMessages =
      messages && messages.length > 0
        ? this._transformer.toProviderMessages(messages, systemPrompt ?? [])
        : [{ role: "user" as const, content: "x" }];
    const system =
      systemPrompt && systemPrompt.length > 0
        ? this._transformer.toSystemBlocks(systemPrompt)
        : undefined;
    const anthropicTools =
      tools && tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    try {
      const response = await client.messages.countTokens({
        model,
        messages: anthropicMessages as Anthropic.MessageCountTokensParams["messages"],
        ...(anthropicTools && anthropicTools.length > 0
          ? { tools: anthropicTools as Anthropic.MessageCountTokensParams["tools"] }
          : {}),
        ...(system && system.length > 0
          ? { system: system as Anthropic.MessageCountTokensParams["system"] }
          : {}),
        // 逆向: amp always passes thinking for accurate count
        thinking: { type: "enabled", budget_tokens: 10000 },
      });
      return { inputTokens: response.input_tokens };
    } catch {
      // Fallback: character-based approximation
      // 逆向: n1R(T) = Math.ceil(T.length / o1R), o1R = 4
      return { inputTokens: this._countTokensFallback(messages, systemPrompt, tools) };
    }
  }

  /**
   * Character-based token count fallback.
   * 逆向: amp's n1R(T) = Math.ceil(T.length / 4) (modules/0083_unknown_l1R.js:4-6)
   */
  private _countTokensFallback(
    messages?: Array<{ role: string; content: unknown }>,
    systemPrompt?: Array<{ type: string; text?: string }>,
    tools?: Array<{ name: string; inputSchema?: unknown }>,
  ): number {
    const messagesStr = messages ? JSON.stringify(messages) : "";
    const systemStr = systemPrompt ? JSON.stringify(systemPrompt) : "";
    const toolsStr = tools ? JSON.stringify(tools) : "";
    return Math.ceil((messagesStr.length + systemStr.length + toolsStr.length) / 4);
  }

  /**
   * Non-streaming message creation (for title generation, etc.).
   *
   * 逆向: amp-cli-reversed/modules/1344_unknown_tzT.js:11-49
   *   `await (...).messages.create({ model, max_tokens, ... }, { stream: !1, signal })`
   *
   * This method creates an Anthropic SDK client (or uses the injected one),
   * then calls messages.create with stream: false.
   */
  async createMessage(
    params: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: string; content: string }>;
      tools: Array<{
        name: string;
        input_schema: Record<string, unknown>;
      }>;
      tool_choice: { type: string; name: string; disable_parallel_tool_use: boolean };
    },
    opts?: { signal?: AbortSignal },
  ): Promise<CreateMessageResponse> {
    // For createMessage, we need an API key. Use a minimal config approach.
    // The caller (title generation) handles auth externally or relies on env var.
    const client =
      this._injectedClient ??
      new Anthropic({
        // Uses ANTHROPIC_API_KEY env var by default
      });

    const response = await client.messages.create(
      {
        model: params.model,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        system: params.system,
        messages: params.messages as Anthropic.MessageCreateParams["messages"],
        tools: params.tools as Anthropic.MessageCreateParams["tools"],
        tool_choice: params.tool_choice as Anthropic.MessageCreateParams["tool_choice"],
      },
      {
        signal: opts?.signal,
      },
    );

    return {
      content: response.content.map((block) => {
        if (block.type === "tool_use") {
          return {
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input,
          };
        }
        if (block.type === "text") {
          return { type: "text", text: block.text };
        }
        return { type: block.type };
      }),
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens: (response.usage as unknown as Record<string, unknown>)
          .cache_creation_input_tokens as number | undefined,
        cache_read_input_tokens: (response.usage as unknown as Record<string, unknown>)
          .cache_read_input_tokens as number | undefined,
      },
    };
  }

  // ─── Private helpers ─────────────────────────────────

  private _createClient(
    apiKey: string,
    settings: Record<string, unknown>,
    model: string,
  ): Anthropic {
    const isOAuthToken = apiKey.startsWith("sk-ant-oat-");

    const betaFeatures: string[] = [];
    const modelInfo = MODEL_REGISTRY[model];
    const supportsThinking = modelInfo?.supportsThinking ?? false;
    const thinkingEnabled = settings["anthropic.thinking.enabled"] ?? true;

    if (thinkingEnabled && supportsThinking && settings["anthropic.interleavedThinking.enabled"]) {
      betaFeatures.push("interleaved-thinking-2025-05-14");
    }
    if (settings["anthropic.speed"] === "fast") {
      betaFeatures.push("fast-mode-2026-02-01");
    }

    const defaultHeaders: Record<string, string> = {};
    if (betaFeatures.length > 0) {
      defaultHeaders["anthropic-beta"] = betaFeatures.join(",");
    }

    const baseURL = settings["anthropic.baseURL"] as string | undefined;

    return new Anthropic({
      ...(isOAuthToken ? { authToken: apiKey } : { apiKey }),
      ...(baseURL ? { baseURL } : {}),
      // 逆向: amp-cli-reversed/chunk-002.js:11420 — maxRetries: 0
      //   Amp disables SDK-level retries because RetryScheduler + ModelFallbackChain
      //   handle retries at a higher level. Without this, the SDK retries 2x internally
      //   PLUS the fallback chain retries — causing double-retry on transient errors.
      maxRetries: 0,
      defaultHeaders,
    });
  }

  private _buildRequestBody(
    model: string,
    maxOutputTokens: number,
    messages: ReturnType<AnthropicTransformer["toProviderMessages"]>,
    system: ReturnType<AnthropicTransformer["toSystemBlocks"]>,
    tools: ReturnType<AnthropicToolTransformer["toProviderTools"]> | undefined,
    settings: Record<string, unknown>,
    reasoningEffort?: string,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxOutputTokens,
      messages,
    };

    if (system.length > 0) {
      body.system = system;
    }

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    // Thinking configuration
    const thinkingEnabled = settings["anthropic.thinking.enabled"] ?? true;
    if (thinkingEnabled) {
      if (model.includes("eap")) {
        body.thinking = { type: "adaptive" };
        const effort = this._mapEffort(reasoningEffort);
        if (effort) {
          body.output_config = { effort };
        }
      } else {
        body.thinking = { type: "enabled", budget_tokens: maxOutputTokens };
      }
    }

    // Speed optimization
    if (settings["anthropic.speed"] === "fast") {
      body.speed = "fast";
    }

    // Temperature (only when thinking is disabled)
    const temperature = settings["anthropic.temperature"];
    if (temperature !== undefined && !thinkingEnabled) {
      body.temperature = temperature;
    }

    return body;
  }

  /** Map reasoning effort to Anthropic output_config.effort */
  private _mapEffort(effort?: string): string | undefined {
    switch (effort) {
      case "none":
      case "minimal":
      case "low":
        return "low";
      case "medium":
        return "medium";
      case "high":
        return "high";
      case "xhigh":
        return "max";
      default:
        return "high";
    }
  }
}
