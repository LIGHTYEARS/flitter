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
import type { StreamParams, StreamDelta } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import type { ProviderName, OpenAICompatConfig } from "../../types";
import {
  CompatTransformer,
  CompatToolTransformer,
} from "./transformer";
import type { CompatStreamChunk } from "./transformer";
import { KNOWN_COMPAT_CONFIGS, mergeWithDefaults } from "./compat";

// ─── OpenAICompatProvider ───────────────────────────────

export class OpenAICompatProvider implements LLMProvider {
  readonly name: ProviderName;
  private readonly _config: OpenAICompatConfig;
  private readonly _transformer: CompatTransformer;
  private readonly _toolTransformer = new CompatToolTransformer();
  private readonly _injectedClient?: OpenAI;

  constructor(opts: {
    name?: string;
    client?: OpenAI;
    config?: Partial<OpenAICompatConfig>;
  } = {}) {
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
    const { model, messages, systemPrompt, tools, config, signal, reasoningEffort } = params;

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, this.name, false, `${this.name} API key not configured`);
    }

    // Build SDK client (injected for tests, or create on-demand)
    const client = this._injectedClient ?? new OpenAI({
      apiKey,
      baseURL: this._config.baseURL,
      defaultHeaders: this._config.headers,
    });

    // Get model info
    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 16_384;

    // Build messages
    const chatMessages = this._transformer.toProviderMessages(messages, systemPrompt);
    const chatTools = tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    // Build request body
    const body = this._buildRequestBody(
      model, maxOutputTokens, chatMessages, chatTools,
      config.settings, reasoningEffort,
    );

    // Create state
    const state = new TransformState();

    // Stream via SDK
    try {
      const stream = await client.chat.completions.create(
        body as unknown as Parameters<typeof client.chat.completions.create>[0],
      );

      for await (const chunk of stream as AsyncIterable<unknown>) {
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
          status === 408 || status === 429 ||
            status === 500 || status === 502 || status === 503 ||
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
    const temperature = settings[`${this.name}.temperature`] ?? settings["openai-compat.temperature"];
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    return body;
  }
}
