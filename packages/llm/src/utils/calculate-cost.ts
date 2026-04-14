/**
 * Token cost calculator
 *
 * Uses MODEL_REGISTRY cost data to compute USD cost from token counts.
 */
import { MODEL_REGISTRY } from "../types";

/**
 * Calculate cost in USD for a given model and token usage.
 *
 * Cost data is per 1M tokens. Returns 0 if model has no cost info.
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const info = MODEL_REGISTRY[model];
  if (!info?.cost) return 0;

  const inputCost = (inputTokens / 1_000_000) * info.cost.input;
  const outputCost = (outputTokens / 1_000_000) * info.cost.output;
  return inputCost + outputCost;
}
