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
import type { LLMProvider } from "../../provider";
import type { StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import type { GeminiStreamChunk } from "./transformer";
import { GeminiToolTransformer, GeminiTransformer } from "./transformer";

// ─── Vertex AI Auth types ──────────────────────────────

/**
 * Cached Vertex AI OAuth2 access token.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:10446-10454 — Vertex AI auth
 *   amp uses `googleAuthOptions.credentials` for service account JSON key.
 *   The GoogleGenAI SDK handles token refresh internally when `vertexai: true`.
 *   We cache the resolved settings to avoid re-reading config on every call.
 */
export interface VertexAIConfig {
  project: string;
  location: string;
  /** Path to a service account JSON key file (optional) */
  serviceAccountKeyFile?: string;
}

/**
 * Resolve Vertex AI configuration from settings.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:10443-10454
 *   - `T.project` / env `GOOGLE_CLOUD_PROJECT`
 *   - `T.location` / env `GOOGLE_CLOUD_LOCATION`
 *   - `T.vertexai` / env `GOOGLE_GENAI_USE_VERTEXAI`
 *   - If project/location provided without API key, uses service account auth
 */
export function resolveVertexAIConfig(
  settings: Record<string, unknown>,
): VertexAIConfig | null {
  const project =
    (settings["vertexai.project"] as string | undefined) ??
    (settings["google.project"] as string | undefined);
  const location =
    (settings["vertexai.location"] as string | undefined) ??
    (settings["google.location"] as string | undefined);
  const serviceAccountKeyFile = settings["vertexai.serviceAccountKeyFile"] as
    | string
    | undefined;

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
    const { model, messages, systemPrompt, tools, config, signal, reasoningEffort } = params;

    // Get API key
    const apiKey = await config.secrets.getToken("apiKey");
    if (!apiKey) {
      throw new ProviderError(401, "gemini", false, "Gemini API key not configured");
    }

    // Build SDK client (injected for tests, or create on-demand)
    // 逆向: amp-cli-reversed/chunk-002.js:10443-10468
    //   GoogleGenAI constructor: checks project/location vs apiKey mutual exclusivity,
    //   reads GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GOOGLE_GENAI_USE_VERTEXAI env vars.
    //   If vertexai: true and credentials provided, apiKey is cleared.
    const vertexConfig = resolveVertexAIConfig(config.settings as Record<string, unknown>);
    const client =
      this._injectedClient ??
      (vertexConfig
        ? this._createVertexClient(apiKey, vertexConfig)
        : new GoogleGenAI({ apiKey }));

    // Get model info
    const modelInfo = MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 8_192;
    const supportsThinking = modelInfo?.supportsThinking ?? false;

    // Build contents and system instruction
    const contents = this._transformer.toProviderMessages(messages, systemPrompt);
    const systemInstruction = this._transformer.toSystemInstruction(systemPrompt);

    // Build tools
    const geminiTools = tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

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

    // Create state for tracking blocks
    const state = new TransformState();

    // Stream via SDK
    try {
      const stream = await client.models.generateContentStream({
        model,
        contents: contents as Parameters<typeof client.models.generateContentStream>[0]["contents"],
        config: generateConfig,
      });

      for await (const chunk of stream) {
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

  // ─── Private ──────────────────────────────────────────

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

  /**
   * Create a Vertex AI-authenticated GoogleGenAI client.
   *
   * 逆向: amp-cli-reversed/chunk-002.js:10446-10469
   *   - When vertexai: true and project/location provided, GoogleGenAI SDK uses
   *     `https://{location}-aiplatform.googleapis.com` as base URL.
   *   - `googleAuthOptions.credentials` accepts service account key JSON.
   *   - If serviceAccountKeyFile is provided, we read it and pass as credentials.
   *   - The SDK handles OAuth2 token generation and refresh internally.
   */
  private _createVertexClient(apiKey: string, vertexConfig: VertexAIConfig): GoogleGenAI {
    const options: Record<string, unknown> = {
      vertexai: true,
      project: vertexConfig.project,
      location: vertexConfig.location,
    };

    // If service account key file is configured, read and use it.
    // Otherwise, fall back to API key-based Vertex AI (which is also supported).
    if (vertexConfig.serviceAccountKeyFile) {
      try {
        // Dynamic import of fs is needed at runtime — for now, use require
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("node:fs");
        const keyContent = fs.readFileSync(vertexConfig.serviceAccountKeyFile, "utf8");
        const credentials = JSON.parse(keyContent);
        options.googleAuthOptions = { credentials };
      } catch (err) {
        // If we can't read the key file, fall back to API key
        if (typeof process !== "undefined" && process.env?.FLITTER_LOG_LEVEL === "debug") {
          // eslint-disable-next-line no-console
          console.error(`[llm:gemini] Failed to read service account key: ${err}`);
        }
        options.apiKey = apiKey;
      }
    } else {
      // API key with Vertex endpoint
      options.apiKey = apiKey;
    }

    return new GoogleGenAI(options as ConstructorParameters<typeof GoogleGenAI>[0]);
  }
}
