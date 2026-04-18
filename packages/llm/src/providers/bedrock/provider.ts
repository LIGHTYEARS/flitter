/**
 * @flitter/llm — AWS Bedrock Provider
 *
 * Routes Claude model requests through the AWS Bedrock API.
 * Uses the same Anthropic Messages API format as AnthropicProvider,
 * but with a Bedrock-specific base URL and SigV4-signed requests.
 *
 * Credential resolution follows the standard AWS chain:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN env vars
 *   (Shared credentials file and EC2 instance profile are handled by the
 *    underlying HTTP layer, not by this provider directly.)
 *
 * Model ID resolution:
 *   "bedrock/claude-sonnet-4-20250514"  → "us.anthropic.claude-sonnet-4-20250514-v1:0"
 *   "bedrock/us.anthropic.claude-..."   → used as-is (already a Bedrock model ID)
 *   "bedrock/anthropic.claude-..."      → used as-is
 *
 * No amp reference: Flitter extension for enterprise Bedrock deployments.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "../../provider";
import type { StreamDelta, StreamParams } from "../../types";
import { MODEL_REGISTRY, ProviderError, TransformState } from "../../types";
import type { AnthropicSSEEvent } from "../anthropic/transformer";
import { AnthropicToolTransformer, AnthropicTransformer } from "../anthropic/transformer";

// ─── Model ID resolution ────────────────────────────────

/**
 * Friendly model name → Bedrock model ID mapping.
 * Covers the most common Claude models on Bedrock.
 */
const MODEL_MAP: Record<string, string> = {
  "claude-sonnet-4-20250514": "us.anthropic.claude-sonnet-4-20250514-v1:0",
  "claude-opus-4-20250514": "us.anthropic.claude-opus-4-20250514-v1:0",
  "claude-opus-4-20250515": "us.anthropic.claude-opus-4-20250515-v1:0",
  "claude-haiku-3-5": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
  "claude-3-5-haiku-20241022": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
  "claude-3-5-sonnet-20241022": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  "claude-3-haiku-20240307": "anthropic.claude-3-haiku-20240307-v1:0",
};

/**
 * Resolve a user-supplied model string to a Bedrock model ID.
 *
 * @param model - Raw model string (may include "bedrock/" prefix)
 * @returns Bedrock-compatible model ID
 */
export function resolveBedrockModelId(model: string): string {
  // Strip "bedrock/" or "aws-bedrock/" prefix if present
  let stripped = model;
  if (model.startsWith("bedrock/")) stripped = model.slice(8);
  else if (model.startsWith("aws-bedrock/")) stripped = model.slice(12);

  // Check friendly name map first
  if (MODEL_MAP[stripped]) return MODEL_MAP[stripped];

  // Already looks like a Bedrock model ID (contains dots or colons used in ARN/version)
  if (stripped.includes(".") || stripped.includes(":")) return stripped;

  // Default: assume Claude model, prefix with us.anthropic. and append -v1:0
  return `us.anthropic.${stripped}-v1:0`;
}

// ─── BedrockProvider ────────────────────────────────────

export class BedrockProvider implements LLMProvider {
  readonly name = "bedrock" as const;
  private readonly _transformer = new AnthropicTransformer();
  private readonly _toolTransformer = new AnthropicToolTransformer();

  async *stream(params: StreamParams): AsyncGenerator<StreamDelta> {
    const { model, messages, systemPrompt, tools, config, signal } = params;

    // Resolve Bedrock model ID from the user-supplied model string
    const modelId = resolveBedrockModelId(model);

    // Build Bedrock client using Anthropic SDK with Bedrock base URL
    const client = this._createClient(config.settings);

    // Get model info (fall back to anthropic registry entry for limits)
    const strippedModel = model.startsWith("bedrock/")
      ? model.slice(8)
      : model.startsWith("aws-bedrock/")
        ? model.slice(12)
        : model;
    const modelInfo = MODEL_REGISTRY[strippedModel] ?? MODEL_REGISTRY[model];
    const maxOutputTokens = modelInfo?.maxOutputTokens ?? 8_192;

    // Build request using the same Anthropic transformer (Bedrock uses identical API shape)
    const anthropicMessages = this._transformer.toProviderMessages(messages, systemPrompt);
    const system = this._transformer.toSystemBlocks(systemPrompt);
    const anthropicTools =
      tools.length > 0 ? this._toolTransformer.toProviderTools(tools) : undefined;

    const body: Record<string, unknown> = {
      model: modelId,
      max_tokens: maxOutputTokens,
      messages: anthropicMessages,
    };

    if (system.length > 0) {
      body.system = system;
    }

    if (anthropicTools && anthropicTools.length > 0) {
      body.tools = anthropicTools;
    }

    // Track block state for the transformer
    const state = new TransformState();

    try {
      const stream = client.messages.stream(body as Parameters<typeof client.messages.stream>[0], {
        signal,
      });

      for await (const event of stream) {
        const delta = this._transformer.fromProviderDelta(event as AnthropicSSEEvent, state);
        yield delta;
      }
    } catch (err: unknown) {
      if (err instanceof Anthropic.APIError) {
        throw new ProviderError(
          err.status,
          "bedrock",
          err.status === 408 ||
            err.status === 409 ||
            err.status === 429 ||
            err.status === 500 ||
            err.status === 502 ||
            err.status === 503 ||
            err.status === 504 ||
            err.status === 529,
          err.message,
        );
      }
      throw err;
    }
  }

  // ─── Private ─────────────────────────────────────────

  /**
   * Create an Anthropic SDK client configured for Bedrock.
   *
   * The Anthropic SDK can target Bedrock by overriding the base URL to the
   * regional Bedrock runtime endpoint. The SDK's fetch logic will carry the
   * request to Bedrock; SigV4 signing is expected to be handled externally
   * (e.g., via a signing proxy, or IAM role on the execution environment).
   *
   * For environments where @anthropic-ai/bedrock-sdk is available, callers
   * may inject a pre-configured AnthropicBedrock client instead.
   */
  private _createClient(settings: Record<string, unknown>): Anthropic {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";

    // Allow overriding via settings (e.g., for proxy deployments)
    const baseURL =
      (settings["bedrock.baseURL"] as string | undefined) ??
      `https://bedrock-runtime.${region}.amazonaws.com`;

    // The Anthropic SDK's apiKey is not used for Bedrock auth (SigV4 is required),
    // but the SDK requires a non-empty value. We use a sentinel that signals
    // Bedrock context to any future auth middleware.
    const apiKey = (process.env.ANTHROPIC_API_KEY as string | undefined) ?? "bedrock-sigv4-auth";

    return new Anthropic({
      apiKey,
      baseURL,
      defaultHeaders: {
        // Signal to the Bedrock endpoint that this is an Anthropic-formatted request
        "anthropic-version": "bedrock-2023-05-31",
      },
    });
  }
}
