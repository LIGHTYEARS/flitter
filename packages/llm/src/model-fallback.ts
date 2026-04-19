/**
 * @flitter/llm — Model Fallback / Degradation Chain
 *
 * When a primary model is overloaded (529) or unavailable (503), the fallback
 * chain automatically tries the next model in the configured list.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:14538-14543 — fU() detects overloaded errors
 *        by checking for "overloaded"/"overload" in message or error.type === "overloaded_error".
 *        amp-cli-reversed/chunk-002.js:14111-14114 — p4R() detects rate-limit / overload
 *        by checking for 429, resource_exhausted, rate limit, overloaded.
 *        amp does not have an explicit fallback chain config — it retries the same model with
 *        exponential backoff. Flitter adds a fallback chain as an enhancement for self-hosted
 *        deployments where model availability varies.
 *
 * @module
 */

import type { LLMProvider } from "./provider";
import type { StreamDelta, StreamParams } from "./types";
import { ProviderError } from "./types";

// ─── Types ──────────────────────────────────────────────

/**
 * Configuration for a single model's fallback chain.
 */
export interface ModelFallbackConfig {
  /** The primary model ID to attempt first */
  primary: string;
  /** Ordered list of fallback model IDs to try if primary fails */
  fallbacks: string[];
}

/**
 * Full fallback chain configuration.
 * Keys are logical model names; values describe the chain.
 */
export interface FallbackChainConfig {
  chains: Record<string, ModelFallbackConfig>;
}

/**
 * Result of resolveModel — tracks which model was actually used.
 */
export interface FallbackResolution {
  /** The model that was originally requested */
  requested: string;
  /** The ordered list of models to try: [primary, ...fallbacks] */
  candidates: string[];
}

// ─── Error detection helpers ────────────────────────────

/**
 * Detect if an error indicates model overload / unavailability.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:14538-14543 — fU()
 *   checks "overloaded"/"overload" in message, error.type === "overloaded_error"
 * 逆向: amp-cli-reversed/chunk-002.js:14111-14114 — p4R()
 *   checks 429, resource_exhausted, rate limit, overloaded
 */
export function isOverloadedError(err: unknown): boolean {
  if (err instanceof ProviderError) {
    // HTTP 529 = model overloaded (Anthropic), 503 = service unavailable
    if (err.status === 529 || err.status === 503) return true;
    // Also treat 429 as overloaded for fallback purposes
    if (err.status === 429) return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("overloaded") ||
      msg.includes("overload") ||
      msg.includes("resource_exhausted") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests")
    );
  }
  return false;
}

// ─── ModelFallbackChain ─────────────────────────────────

/**
 * Manages model fallback chains for graceful degradation.
 *
 * When a model is overloaded or unavailable, this class provides an ordered
 * list of fallback models to try. It also provides a `streamWithFallback`
 * helper that wraps provider streaming with automatic fallback.
 *
 * @example
 * ```ts
 * const chain = new ModelFallbackChain({
 *   chains: {
 *     "claude-opus-4-6": {
 *       primary: "claude-opus-4-20250515",
 *       fallbacks: ["claude-sonnet-4-20250514"],
 *     },
 *   },
 * });
 *
 * const resolution = chain.resolveModel("claude-opus-4-6");
 * // → { requested: "claude-opus-4-6", candidates: ["claude-opus-4-20250515", "claude-sonnet-4-20250514"] }
 * ```
 */
export class ModelFallbackChain {
  private readonly _chains: Record<string, ModelFallbackConfig>;

  constructor(config: FallbackChainConfig) {
    this._chains = config.chains;
  }

  /**
   * Resolve a requested model into an ordered list of candidates.
   *
   * If the model has a configured chain, returns [primary, ...fallbacks].
   * If no chain is configured, returns [requestedModel] (single-element).
   */
  resolveModel(requestedModel: string): FallbackResolution {
    const chain = this._chains[requestedModel];
    if (chain) {
      return {
        requested: requestedModel,
        candidates: [chain.primary, ...chain.fallbacks],
      };
    }
    // No fallback configured — use the model as-is
    return {
      requested: requestedModel,
      candidates: [requestedModel],
    };
  }

  /**
   * Stream with automatic fallback on overload errors.
   *
   * Tries each candidate model in order. If a model throws an overloaded/unavailable
   * error, moves to the next candidate. Non-overload errors are thrown immediately.
   *
   * @param params - The original stream params
   * @param getProvider - Function to get a provider for a given model name
   * @yields StreamDelta from whichever model succeeds
   * @throws The last error if all candidates fail
   *
   * 逆向: amp-cli-reversed/chunk-002.js:14116-14121 — _4R() exponential backoff
   *   amp retries the same model; Flitter extends this with a multi-model chain.
   */
  async *streamWithFallback(
    params: StreamParams,
    getProvider: (model: string) => LLMProvider,
  ): AsyncGenerator<StreamDelta> {
    const resolution = this.resolveModel(params.model);
    let lastError: unknown = null;

    for (const candidateModel of resolution.candidates) {
      try {
        const provider = getProvider(candidateModel);
        const modifiedParams: StreamParams = { ...params, model: candidateModel };

        // If we're using a fallback, log which model we're trying
        if (candidateModel !== resolution.candidates[0]) {
          // Debug logging — visible when FLITTER_LOG_LEVEL=debug
          if (typeof process !== "undefined" && process.env?.FLITTER_LOG_LEVEL === "debug") {
            // eslint-disable-next-line no-console
            console.error(
              `[llm:fallback] Primary model unavailable, falling back to ${candidateModel}`,
            );
          }
        }

        yield* provider.stream(modifiedParams);
        return; // Success — exit
      } catch (err) {
        lastError = err;
        if (!isOverloadedError(err)) {
          // Not an overload error — rethrow immediately
          throw err;
        }
        // Overloaded — try next candidate
        if (typeof process !== "undefined" && process.env?.FLITTER_LOG_LEVEL === "debug") {
          // eslint-disable-next-line no-console
          console.error(
            `[llm:fallback] Model ${candidateModel} overloaded, trying next fallback...`,
          );
        }
      }
    }

    // All candidates exhausted — throw the last error
    throw lastError;
  }
}
