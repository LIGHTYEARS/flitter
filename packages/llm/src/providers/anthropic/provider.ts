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
import type { LLMProvider } from "../../provider";
import type { StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import type { AnthropicSSEEvent } from "./transformer";
import { AnthropicToolTransformer, AnthropicTransformer } from "./transformer";

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
    const { model, messages, systemPrompt, tools, config, signal, reasoningEffort } = params;

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

    const body = this._buildRequestBody(
      model,
      maxOutputTokens,
      anthropicMessages,
      system,
      anthropicTools,
      config.settings,
      reasoningEffort,
    );

    // Create state for tracking blocks
    const state = new TransformState();

    // Stream via SDK
    try {
      const stream = client.messages.stream(body as Parameters<typeof client.messages.stream>[0], {
        signal,
      });

      for await (const event of stream) {
        const delta = this._transformer.fromProviderDelta(event as AnthropicSSEEvent, state);
        yield delta;
      }
    } catch (err: unknown) {
      // Convert SDK errors to ProviderError
      if (err instanceof Anthropic.APIError) {
        // Extract retry-after from headers (seconds → ms)
        const retryAfterHeader = (err.headers as Record<string, string> | undefined)?.[
          "retry-after"
        ];
        const retryAfterMs = retryAfterHeader
          ? Number.parseFloat(retryAfterHeader) * 1000
          : undefined;

        throw new ProviderError(
          err.status,
          "anthropic",
          err.status === 408 ||
            err.status === 409 ||
            err.status === 429 ||
            err.status === 500 ||
            err.status === 502 ||
            err.status === 503 ||
            err.status === 504 ||
            err.status === 529,
          err.message,
          Number.isNaN(retryAfterMs) ? undefined : retryAfterMs,
        );
      }
      throw err;
    }
  }

  // ─── Private ──────────────────────────────────────────

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
