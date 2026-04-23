/**
 * @flitter/llm — Gemini generateContent API Provider
 *
 * 实现 LLMProvider 接口，使用 @google/genai SDK 调用 Gemini generateContent API。
 * 支持 Public Gemini API 和 Vertex AI 双端点。
 *
 * @example
 * ```ts
 * const provider = new GeminiProvider();
 * for await (const delta of provider.stream(params)) {
 *   console.log(delta.content, delta.state);
 * }
 * ```
 */
import { ApiError, GoogleGenAI } from "@google/genai";
import type { CountTokensParams, CountTokensResult, LLMProvider } from "../../provider";
import { withStreamIdleTimeout } from "../../stream-idle-timeout";
import type { StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import { buildTelemetryHeaders } from "../../utils/telemetry-headers";
import type { GeminiStreamChunk } from "./transformer";
import { GeminiToolTransformer, GeminiTransformer } from "./transformer";

// ─── Vertex AI Config Resolution ────────────────────────

export interface VertexAIConfig {
  project: string;
  location: string;
  serviceAccountKeyFile?: string;
}

/**
 * Resolve Vertex AI configuration from settings.
 * Returns null if required fields (project + location) are missing.
 * 逆向: GoogleGenAI constructor reads project/location with env fallbacks
 */
export function resolveVertexAIConfig(settings: Record<string, unknown>): VertexAIConfig | null {
  const project =
    (settings["vertexai.project"] as string | undefined) ??
    (settings["google.project"] as string | undefined);
  const location =
    (settings["vertexai.location"] as string | undefined) ??
    (settings["google.location"] as string | undefined);
  const serviceAccountKeyFile = settings["vertexai.serviceAccountKeyFile"] as string | undefined;

  if (!project || !location) return null;

  return { project, location, serviceAccountKeyFile };
}

// ─── GeminiProvider ─────────────────────────────────────

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  private readonly _transformer = new GeminiTransformer();
  private readonly _toolTransformer = new GeminiToolTransformer();
  private readonly _injectedClient?: GoogleGenAI;

  constructor(client?: GoogleGenAI) {
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

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, "gemini", false, "Gemini API key not configured");
    }

    // Build SDK client (injected for tests, or create on-demand)
    // 逆向: amp-cli-reversed/modules/0973_GoogleGenAI_L6T.js:17-30
    const settings = config.settings as Record<string, unknown>;
    const client = this._buildClient(apiKey, settings);

    // Get model info
    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 8_192;
    const supportsThinking = modelInfo?.supportsThinking ?? false;

    // Build contents and system instruction
    const contents = this._transformer.toProviderMessages(messages, systemPrompt);
    const systemInstruction = this._transformer.toSystemInstruction(systemPrompt);

    // Build tools
    const geminiTools = tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    // Build per-request telemetry headers
    // 逆向: amp-cli-reversed/chunk-002.js:11472,12133 — x-request-id captured from response for correlation
    // 逆向: amp-cli-reversed/chunk-001.js:7088-7091 — x-amp-feature, x-amp-thread-id, x-amp-mode constants
    // 逆向: amp-cli-reversed/chunk-001.js:5955-5960 (Vs) — thread meta → header assembly
    // Injected into Gemini requests via httpOptions.headers
    const requestHeaders: Record<string, string> = {
      ...buildTelemetryHeaders({ feature, threadId, agentMode }),
    };
    if (requestId) requestHeaders["x-request-id"] = requestId;
    if (sessionId) requestHeaders["x-session-id"] = sessionId;

    // Build config
    const generateConfig = this._buildConfig(
      systemInstruction,
      geminiTools,
      maxOutputTokens,
      config.settings,
      reasoningEffort,
      supportsThinking,
      signal,
    );

    // Inject telemetry headers into httpOptions
    if (Object.keys(requestHeaders).length > 0) {
      generateConfig.httpOptions = {
        ...(generateConfig.httpOptions as Record<string, unknown> | undefined),
        headers: {
          ...((generateConfig.httpOptions as Record<string, unknown> | undefined)?.headers as
            | Record<string, string>
            | undefined),
          ...requestHeaders,
        },
      };
    }

    // Create state for tracking blocks
    const state = new TransformState();

    // Stream via SDK
    try {
      const stream = await client.models.generateContentStream({
        model,
        contents: contents as Parameters<typeof client.models.generateContentStream>[0]["contents"],
        config: generateConfig,
      });

      for await (const chunk of withStreamIdleTimeout(stream)) {
        const delta = this._transformer.fromProviderDelta(
          chunk as unknown as GeminiStreamChunk,
          state,
        );
        yield delta;
      }
    } catch (err: unknown) {
      // Convert SDK errors to ProviderError
      if (err instanceof ApiError) {
        const status = err.status ?? 500;
        throw new ProviderError(
          status,
          "gemini",
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

  /**
   * Count input tokens using Gemini's countTokens API.
   *
   * 逆向: amp-cli-reversed/chunk-005.js:101711 — Gemini SDK countTokens
   *   `client.models.countTokens({ model, contents })` returns `{ totalTokens }`
   *
   * Note: amp does not implement Gemini-specific provider-level countTokens
   * (amp-cli-reversed/chunk-003.js:3910 only dispatches to "anthropic" and "openai").
   * This uses the same SDK method and matches the fallback pattern from
   * amp's n1R(T) = Math.ceil(T.length / 4) (modules/0083_unknown_l1R.js:4-5).
   */
  async countTokens(params: CountTokensParams): Promise<CountTokensResult> {
    const { model, messages, systemPrompt, tools, config } = params;

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      // No key — use fallback
      return { inputTokens: this._countTokensFallback(messages, systemPrompt, tools) };
    }

    // Build SDK client
    const client = this._buildClient(apiKey, config.settings);

    // Build contents using the transformer (same as stream())
    const contents = this._transformer.toProviderMessages(
      messages && messages.length > 0
        ? messages
        : [{ role: "user", content: [{ type: "text", text: "x" }] } as never],
      systemPrompt ?? [],
    );

    try {
      const response = await client.models.countTokens({
        model,
        contents: contents as Parameters<typeof client.models.countTokens>[0]["contents"],
      });
      return { inputTokens: response.totalTokens ?? 0 };
    } catch {
      // Fallback: character-based approximation
      // 逆向: n1R(T) = Math.ceil(T.length / 4) (modules/0083_unknown_l1R.js:4-5)
      return { inputTokens: this._countTokensFallback(messages, systemPrompt, tools) };
    }
  }

  // ─── Private ──────────────────────────────────────────

  /**
   * Build a GoogleGenAI client from API key and settings.
   * Shared between stream() and countTokens().
   *
   * 逆向: amp-cli-reversed/modules/0973_GoogleGenAI_L6T.js:17-30
   */
  private _buildClient(apiKey: string, settings: Record<string, unknown>): GoogleGenAI {
    if (this._injectedClient) {
      return this._injectedClient;
    }

    const vertexProject =
      (settings["vertexai.project"] as string | undefined) ??
      (settings["google.project"] as string | undefined);
    const vertexLocation =
      (settings["vertexai.location"] as string | undefined) ??
      (settings["google.location"] as string | undefined);
    const serviceAccountKeyFile = settings["vertexai.serviceAccountKeyFile"] as string | undefined;

    if (vertexProject && vertexLocation) {
      const opts: Record<string, unknown> = {
        vertexai: true,
        project: vertexProject,
        location: vertexLocation,
      };
      if (serviceAccountKeyFile) {
        opts.googleAuthOptions = { keyFile: serviceAccountKeyFile };
      }
      if (!serviceAccountKeyFile && apiKey) {
        opts.apiKey = apiKey;
      }
      return new GoogleGenAI(opts as ConstructorParameters<typeof GoogleGenAI>[0]);
    }

    return new GoogleGenAI({ apiKey });
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

  private _buildConfig(
    systemInstruction: ReturnType<GeminiTransformer["toSystemInstruction"]>,
    tools: ReturnType<GeminiToolTransformer["toProviderTools"]> | undefined,
    maxOutputTokens: number,
    settings: Record<string, unknown>,
    reasoningEffort?: string,
    supportsThinking = false,
    signal?: AbortSignal,
  ): Record<string, unknown> {
    const cfg: Record<string, unknown> = {
      maxOutputTokens,
      abortSignal: signal,
    };

    if (systemInstruction) {
      cfg.systemInstruction = systemInstruction;
    }

    if (tools && tools.length > 0) {
      cfg.tools = tools;
    }

    // Temperature (non-thinking models)
    if (!supportsThinking) {
      const temperature = settings["gemini.temperature"];
      if (temperature !== undefined) {
        cfg.temperature = temperature;
      }
    }

    // Thinking config
    if (supportsThinking) {
      const level = this._mapThinkingLevel(reasoningEffort);
      cfg.thinkingConfig = {
        includeThoughts: true,
        thinkingLevel: level,
      };
    }

    // Safety settings — disable all to avoid filtering
    cfg.safetySettings = [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    return cfg;
  }

  /** Map reasoning effort to Gemini thinking level */
  private _mapThinkingLevel(effort?: string): string {
    switch (effort) {
      case "none":
      case "minimal":
        return "MINIMAL";
      case "low":
        return "LOW";
      case "medium":
        return "MEDIUM";
      case "high":
      case "xhigh":
        return "HIGH";
      default:
        return "MEDIUM";
    }
  }
}
