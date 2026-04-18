/**
 * SessionCostTracker: Accumulates per-turn token usage from inference:complete events.
 *
 * 逆向: chunk-002.js:1331-1351 (_K / mergeUsage accumulator pattern)
 * 逆向: chunk-005.js:66584-66736 (pricing table: input/output per million tokens)
 */
import type { Subscription } from "@flitter/util";
import type { AgentEvent, InferenceCompleteEvent } from "../worker/events";

// ─── Pricing Table ──────────────────────────────────────
// 逆向: chunk-005.js:66584-66736 — pricing.input / pricing.output per million tokens

interface ModelPricing {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M cache-read tokens (cheaper than input) */
  cached?: number;
  /** USD per 1M cache-write tokens (slightly more than input) */
  cacheWrite?: number;
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  // 逆向: chunk-005.js:66585-66603
  "claude-sonnet-4-20250514": { input: 3, output: 15, cached: 0.3, cacheWrite: 3.75 },
  // 逆向: chunk-005.js:66604-66622
  "claude-sonnet-4-5-20250929": { input: 3, output: 15, cached: 0.3, cacheWrite: 3.75 },
  // 逆向: chunk-005.js:66623-66641
  "claude-sonnet-4-6": { input: 3, output: 15, cached: 0.3, cacheWrite: 3.75 },
  // 逆向: chunk-005.js:66642-66659
  "claude-opus-4-20250514": { input: 15, output: 75, cached: 1.5, cacheWrite: 18.75 },
  // 逆向: chunk-005.js:66661-66678
  "claude-opus-4-1-20250805": { input: 15, output: 75, cached: 1.5, cacheWrite: 18.75 },
  // 逆向: chunk-005.js:66680-66697
  "claude-opus-4-5-20251101": { input: 5, output: 25, cached: 0.5, cacheWrite: 6.25 },
  // 逆向: chunk-005.js:66699-66716
  "claude-opus-4-6": { input: 5, output: 25, cached: 0.5, cacheWrite: 6.25 },
  // 逆向: chunk-005.js:66718-66735
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cached: 0.1, cacheWrite: 1.25 },
  // Legacy aliases kept for compatibility with plan spec
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4 },
};

// ─── Public Types ───────────────────────────────────────

/** Accumulated totals for an entire session */
export interface SessionTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  /** Estimated USD cost (null if model pricing is unknown) */
  estimatedUSD: number | null;
}

/** Usage record for a single inference turn */
export interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  model?: string;
  timestamp: string;
  /** Estimated USD cost for this turn (null if model pricing is unknown) */
  estimatedUSD: number | null;
}

// ─── Cost Computation ───────────────────────────────────

/**
 * Estimate USD cost for a single inference turn.
 *
 * 逆向: chunk-005.js pricing table — cost = tokens * (price_per_million / 1_000_000)
 * Cache reads use the cheaper `cached` rate; cache writes use `cacheWrite` rate.
 * Regular input tokens use the `input` rate.
 */
function estimateTurnCost(turn: Omit<TurnUsage, "estimatedUSD">): number | null {
  if (!turn.model) return null;

  const pricing = PRICING_TABLE[turn.model];
  if (!pricing) return null;

  const inputCost = (turn.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (turn.outputTokens / 1_000_000) * pricing.output;
  // 逆向: cache reads billed at `cached` rate (cheaper)
  const cacheReadCost =
    pricing.cached !== undefined
      ? (turn.cacheReadInputTokens / 1_000_000) * pricing.cached
      : (turn.cacheReadInputTokens / 1_000_000) * pricing.input;
  // 逆向: cache writes billed at `cacheWrite` rate (slightly more than input)
  const cacheWriteCost =
    pricing.cacheWrite !== undefined
      ? (turn.cacheCreationInputTokens / 1_000_000) * pricing.cacheWrite
      : (turn.cacheCreationInputTokens / 1_000_000) * pricing.input;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

// ─── SessionCostTracker ─────────────────────────────────

export type AgentEventStream = { subscribe(observer: (value: AgentEvent) => void): Subscription };

/**
 * SessionCostTracker subscribes to an AgentEvent stream and accumulates
 * per-turn token usage from inference:complete events.
 *
 * 逆向: chunk-002.js:1331-1351 (_K mergeUsage accumulator)
 *        chunk-005.js:66584-66736 (per-model pricing table)
 */
export class SessionCostTracker {
  private readonly _turns: TurnUsage[] = [];
  private readonly _subscription: Subscription;

  constructor(events$: AgentEventStream) {
    this._subscription = events$.subscribe((event: AgentEvent) => {
      if (event.type !== "inference:complete") return;
      this._accumulate(event);
    });
  }

  /**
   * Accumulate one inference:complete event into turn history.
   * 逆向: chunk-002.js:1340-1350 — prefer latest non-null values (max strategy)
   */
  private _accumulate(event: InferenceCompleteEvent): void {
    if (!event.usage) return;

    const turn: Omit<TurnUsage, "estimatedUSD"> = {
      inputTokens: event.usage.inputTokens,
      outputTokens: event.usage.outputTokens,
      cacheCreationInputTokens: event.usage.cacheCreationInputTokens ?? 0,
      cacheReadInputTokens: event.usage.cacheReadInputTokens ?? 0,
      model: event.model,
      timestamp: new Date().toISOString(),
    };

    this._turns.push({
      ...turn,
      estimatedUSD: estimateTurnCost(turn),
    });
  }

  /**
   * Returns accumulated totals across all inference turns in the session.
   */
  getTotals(): SessionTotals {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreationInputTokens = 0;
    let cacheReadInputTokens = 0;
    let totalUSD: number | null = 0;

    for (const turn of this._turns) {
      inputTokens += turn.inputTokens;
      outputTokens += turn.outputTokens;
      cacheCreationInputTokens += turn.cacheCreationInputTokens;
      cacheReadInputTokens += turn.cacheReadInputTokens;
      if (totalUSD !== null && turn.estimatedUSD !== null) {
        totalUSD += turn.estimatedUSD;
      } else {
        totalUSD = null;
      }
    }

    return {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      estimatedUSD: totalUSD,
    };
  }

  /**
   * Returns per-turn usage history.
   */
  getTurnHistory(): TurnUsage[] {
    return [...this._turns];
  }

  /**
   * Unsubscribe from the event stream.
   */
  dispose(): void {
    this._subscription.unsubscribe();
  }
}
