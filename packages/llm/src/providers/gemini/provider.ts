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
    // 逆向: amp-cli-reversed/modules/0973_GoogleGenAI_L6T.js:17-30
    //   GoogleGenAI reads project/location from constructor args and env vars:
    //   T.project ?? GOOGLE_CLOUD_PROJECT, T.location ?? GOOGLE_CLOUD_LOCATION
    //   vertexai flag enables Vertex AI mode (project/location required, no apiKey)
    const settings = config.settings as Record<string, unknown>;
    const vertexProject =
      (settings["vertexai.project"] as string | undefined) ??
      (settings["google.project"] as string | undefined);
    const vertexLocation =
      (settings["vertexai.location"] as string | undefined) ??
      (settings["google.location"] as string | undefined);
    const serviceAccountKeyFile = settings["vertexai.serviceAccountKeyFile"] as
      | string
      | undefined;

    let client: GoogleGenAI;
    if (this._injectedClient) {
      client = this._injectedClient;
    } else if (vertexProject && vertexLocation) {
      // 逆向: Vertex AI mode — project + location, optionally with service account
      // amp-cli-reversed/modules/0973_GoogleGenAI_L6T.js:25-28
      const opts: Record<string, unknown> = {
        vertexai: true,
        project: vertexProject,
        location: vertexLocation,
      };
      // If service account key file is provided, pass as googleAuthOptions
      // 逆向: GoogleGenAI accepts googleAuthOptions.credentials for Vertex AI auth
      if (serviceAccountKeyFile) {
        opts.googleAuthOptions = { keyFile: serviceAccountKeyFile };
      }
      // Only include apiKey if no service account (they're mutually exclusive in GoogleGenAI)
      if (!serviceAccountKeyFile && apiKey) {
        opts.apiKey = apiKey;
      }
      client = new GoogleGenAI(opts as ConstructorParameters<typeof GoogleGenAI>[0]);
    } else {
      // Standard Gemini API mode with API key
      client = new GoogleGenAI({ apiKey });
    }

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
}
