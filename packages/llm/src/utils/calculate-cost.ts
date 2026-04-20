/**
 * Token cost calculator
 *
 * Uses MODEL_REGISTRY cost data to compute USD cost from token counts.
 * Supports Anthropic prompt caching pricing:
 *   cache_write = 125% of base input price
 *   cache_read  = 10% of base input price
 */
import { MODEL_REGISTRY } from "../types";

/** Cache write costs 125% of base input price (Anthropic prompt caching) */
const CACHE_WRITE_MULTIPLIER = 1.25;
/** Cache read costs 10% of base input price (Anthropic prompt caching) */
const CACHE_READ_MULTIPLIER = 0.1;

export interface CacheTokenCounts {
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

/**
 * Calculate cost in USD for a given model and token usage.
 *
 * Cost data is per 1M tokens. Returns 0 if model has no cost info.
 * When cache token counts are provided, applies cache pricing multipliers.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cache?: CacheTokenCounts,
): number {
  const info = MODEL_REGISTRY[model];
  if (!info?.cost) return 0;

  const inputCost = (inputTokens / 1_000_000) * info.cost.input;
  const outputCost = (outputTokens / 1_000_000) * info.cost.output;

  let cacheCost = 0;
  if (cache) {
    // Cache write: 125% of base input price
    if (cache.cacheCreationInputTokens) {
      cacheCost += (cache.cacheCreationInputTokens / 1_000_000) * info.cost.input * CACHE_WRITE_MULTIPLIER;
    }
    // Cache read: 10% of base input price
    if (cache.cacheReadInputTokens) {
      cacheCost += (cache.cacheReadInputTokens / 1_000_000) * info.cost.input * CACHE_READ_MULTIPLIER;
    }
  }

  return inputCost + outputCost + cacheCost;
}
