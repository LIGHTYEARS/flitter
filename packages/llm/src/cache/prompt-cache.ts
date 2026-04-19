/**
 * @flitter/llm — Prompt Cache Tracker
 *
 * Tracks cache hits/misses from Anthropic response headers and provides
 * cache policy configuration for optimizing prompt caching.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:2217-2219
 *   `cacheCreationInputTokens: b.usage.cache_creation_input_tokens`
 *   `cacheReadInputTokens: b.usage.cache_read_input_tokens`
 *   `totalInputTokens: b.usage.input_tokens + (cache_creation ?? 0) + (cache_read ?? 0)`
 *
 * 逆向: amp-cli-reversed/chunk-002.js:2167 — `t.cache_control = { type: "ephemeral" }`
 *   amp applies cache_control to system prompt blocks and the last user message turn.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:87650-87651
 *   `if (R.usage.cache_creation_input_tokens != null) a.usage.cache_creation_input_tokens = ...`
 *   `if (R.usage.cache_read_input_tokens != null) a.usage.cache_read_input_tokens = ...`
 *
 * @module
 */

// ─── Types ──────────────────────────────────────────────

/** Cache statistics snapshot. */
export interface CacheStats {
  /** Number of responses with cache reads (hits) */
  hits: number;
  /** Number of responses without cache reads (misses — first-time or expired) */
  misses: number;
  /** Hit rate: hits / (hits + misses), or 0 if no responses recorded */
  hitRate: number;
  /** Total tokens saved by cache reads */
  savedTokens: number;
  /** Total tokens spent on cache creation */
  creationTokens: number;
}

/**
 * Cache-related fields from a response's usage data.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:2217-2219
 *   These fields come from the Anthropic Messages API response.
 */
export interface CacheUsageFields {
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/**
 * Cache control configuration for prompt blocks.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:2167
 *   `t.cache_control = { type: "ephemeral" }`
 */
export interface CacheControlConfig {
  /** Strategy for applying cache_control markers */
  strategy: "none" | "auto" | "aggressive";
  /** TTL hint for ephemeral caching (seconds, default: 300 = 5min) */
  ttlSeconds: number;
}

// ─── PromptCacheTracker ─────────────────────────────────

/**
 * Tracks prompt cache statistics across responses.
 *
 * Usage:
 * - Call `recordResponse()` after each LLM response with the usage fields.
 * - Call `getStats()` to get aggregate cache performance.
 * - Call `getCachePolicy()` to determine the active cache configuration.
 *
 * @example
 * ```ts
 * const tracker = new PromptCacheTracker();
 * tracker.recordResponse({
 *   cache_read_input_tokens: 5000,
 *   cache_creation_input_tokens: 0,
 * });
 * const stats = tracker.getStats();
 * // → { hits: 1, misses: 0, hitRate: 1, savedTokens: 5000, creationTokens: 0 }
 * ```
 */
export class PromptCacheTracker {
  private _hits = 0;
  private _misses = 0;
  private _savedTokens = 0;
  private _creationTokens = 0;

  /**
   * Record cache usage from a response.
   *
   * A "hit" is when cache_read_input_tokens > 0.
   * A "miss" is when cache_read_input_tokens is 0 or absent,
   * AND cache_creation_input_tokens > 0 (meaning we wrote to cache).
   * If neither field is present, we don't count it (non-cached request).
   *
   * 逆向: amp-cli-reversed/chunk-005.js:87650-87651
   *   amp conditionally sets cache tokens if not null.
   *   amp-cli-reversed/chunk-005.js:87820 — total input calculation includes both.
   */
  recordResponse(usage: CacheUsageFields): void {
    const readTokens = usage.cache_read_input_tokens ?? 0;
    const createTokens = usage.cache_creation_input_tokens ?? 0;

    if (readTokens > 0) {
      this._hits++;
      this._savedTokens += readTokens;
    } else if (createTokens > 0) {
      this._misses++;
    }
    // If both are 0, this was a non-cached request — we don't count it.

    this._creationTokens += createTokens;

    // Debug logging
    if (typeof process !== "undefined" && process.env?.FLITTER_LOG_LEVEL === "debug") {
      const hitMiss = readTokens > 0 ? "HIT" : createTokens > 0 ? "MISS" : "N/A";
      // eslint-disable-next-line no-console
      console.error(
        `[llm:cache] ${hitMiss} — read: ${readTokens}, created: ${createTokens}, cumulative hit rate: ${this.getStats().hitRate.toFixed(2)}`,
      );
    }
  }

  /**
   * Get aggregate cache statistics.
   */
  getStats(): CacheStats {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
      savedTokens: this._savedTokens,
      creationTokens: this._creationTokens,
    };
  }

  /**
   * Reset all counters.
   */
  reset(): void {
    this._hits = 0;
    this._misses = 0;
    this._savedTokens = 0;
    this._creationTokens = 0;
  }

  /**
   * Determine cache policy from config settings.
   *
   * 逆向: amp-cli-reversed/chunk-002.js:2167
   *   amp always uses `{ type: "ephemeral" }` cache_control on applicable blocks.
   *   The strategy is effectively "auto" — it caches system prompts and recent context.
   *
   * @param config - Settings to read cache configuration from
   */
  getCachePolicy(config: Record<string, unknown>): CacheControlConfig {
    const strategy = (config["cache.strategy"] as string) ?? "auto";
    const ttl = (config["cache.ttl"] as number) ?? 300;

    // Validate strategy
    const validStrategies = ["none", "auto", "aggressive"];
    const resolvedStrategy = validStrategies.includes(strategy)
      ? (strategy as CacheControlConfig["strategy"])
      : "auto";

    return {
      strategy: resolvedStrategy,
      ttlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 300,
    };
  }
}
