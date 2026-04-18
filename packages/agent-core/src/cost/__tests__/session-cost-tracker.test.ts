/**
 * SessionCostTracker tests
 *
 * 逆向: chunk-002.js:1331-1351 (mergeUsage accumulator)
 *        chunk-005.js:66584-66736 (pricing table)
 */
import { describe, expect, test } from "bun:test";
import { Subject } from "@flitter/util";
import type { AgentEvent, InferenceCompleteEvent } from "../../worker/events";
import { SessionCostTracker } from "../session-cost-tracker";

// ─── Helpers ────────────────────────────────────────────

function makeCompleteEvent(
  inputTokens: number,
  outputTokens: number,
  model?: string,
  cacheCreationInputTokens?: number,
  cacheReadInputTokens?: number,
): InferenceCompleteEvent {
  return {
    type: "inference:complete",
    usage: {
      inputTokens,
      outputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
    },
    model,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("InferenceCompleteEvent shape", () => {
  test("supports cache token fields and model", () => {
    const event: InferenceCompleteEvent = {
      type: "inference:complete",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationInputTokens: 20,
        cacheReadInputTokens: 10,
      },
      model: "claude-sonnet-4-20250514",
    };

    expect(event.type).toBe("inference:complete");
    expect(event.usage?.inputTokens).toBe(100);
    expect(event.usage?.outputTokens).toBe(50);
    expect(event.usage?.cacheCreationInputTokens).toBe(20);
    expect(event.usage?.cacheReadInputTokens).toBe(10);
    expect(event.model).toBe("claude-sonnet-4-20250514");
  });

  test("cache fields are optional", () => {
    const event: InferenceCompleteEvent = {
      type: "inference:complete",
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
    };

    expect(event.usage?.cacheCreationInputTokens).toBeUndefined();
    expect(event.usage?.cacheReadInputTokens).toBeUndefined();
    expect(event.model).toBeUndefined();
  });
});

describe("SessionCostTracker", () => {
  test("accumulates token totals from a single turn", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514"));

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(1000);
    expect(totals.outputTokens).toBe(500);

    tracker.dispose();
  });

  test("accumulates across multiple turns", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514"));
    events$.next(makeCompleteEvent(800, 300, "claude-sonnet-4-20250514"));

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(1800);
    expect(totals.outputTokens).toBe(800);

    tracker.dispose();
  });

  test("tracks cache token breakdown", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514", 200, 100));
    events$.next(makeCompleteEvent(800, 300, "claude-sonnet-4-20250514", 150, 50));

    const totals = tracker.getTotals();
    expect(totals.cacheCreationInputTokens).toBe(350);
    expect(totals.cacheReadInputTokens).toBe(150);

    tracker.dispose();
  });

  test("ignores inference:complete events without usage", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    const eventWithNoUsage: InferenceCompleteEvent = { type: "inference:complete" };
    events$.next(eventWithNoUsage);

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(0);
    expect(totals.outputTokens).toBe(0);
    expect(tracker.getTurnHistory()).toHaveLength(0);

    tracker.dispose();
  });

  test("ignores non-inference-complete events", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({ type: "inference:start" });
    events$.next({ type: "turn:complete" });
    events$.next({ type: "inference:delta", delta: { content: [], usage: null } });

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(0);
    expect(totals.outputTokens).toBe(0);
    expect(tracker.getTurnHistory()).toHaveLength(0);

    tracker.dispose();
  });

  test("computes estimated USD cost for known model", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    // 1M input tokens at $3/M = $3, 1M output tokens at $15/M = $15 → total $18
    events$.next(makeCompleteEvent(1_000_000, 1_000_000, "claude-sonnet-4-20250514"));

    const totals = tracker.getTotals();
    // Input: 3 + Output: 15 = 18 (no cache tokens)
    expect(totals.estimatedUSD).toBe(18);

    tracker.dispose();
  });

  test("estimatedUSD is null for unknown model", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "unknown-model-xyz"));

    const totals = tracker.getTotals();
    expect(totals.estimatedUSD).toBeNull();

    tracker.dispose();
  });

  test("estimatedUSD is null when model is not provided", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500));

    const totals = tracker.getTotals();
    expect(totals.estimatedUSD).toBeNull();

    tracker.dispose();
  });

  test("estimatedUSD becomes null if any turn has unknown model", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514"));
    events$.next(makeCompleteEvent(1000, 500, "unknown-model-xyz"));

    const totals = tracker.getTotals();
    expect(totals.estimatedUSD).toBeNull();

    tracker.dispose();
  });

  test("dispose() unsubscribes from event stream", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514"));
    tracker.dispose();

    // Events after dispose should not be counted
    events$.next(makeCompleteEvent(2000, 1000, "claude-sonnet-4-20250514"));

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(1000);
    expect(totals.outputTokens).toBe(500);
  });

  test("tracks per-turn history", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514", 100, 50));
    events$.next(makeCompleteEvent(800, 300, "claude-opus-4-20250514", 0, 200));

    const history = tracker.getTurnHistory();
    expect(history).toHaveLength(2);

    expect(history[0]!.inputTokens).toBe(1000);
    expect(history[0]!.outputTokens).toBe(500);
    expect(history[0]!.cacheCreationInputTokens).toBe(100);
    expect(history[0]!.cacheReadInputTokens).toBe(50);
    expect(history[0]!.model).toBe("claude-sonnet-4-20250514");
    expect(typeof history[0]!.timestamp).toBe("string");

    expect(history[1]!.inputTokens).toBe(800);
    expect(history[1]!.outputTokens).toBe(300);
    expect(history[1]!.model).toBe("claude-opus-4-20250514");

    tracker.dispose();
  });

  test("getTurnHistory returns a snapshot copy (not live reference)", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next(makeCompleteEvent(1000, 500, "claude-sonnet-4-20250514"));
    const snapshot = tracker.getTurnHistory();

    events$.next(makeCompleteEvent(800, 300, "claude-sonnet-4-20250514"));

    // Snapshot should not change after more events
    expect(snapshot).toHaveLength(1);
    expect(tracker.getTurnHistory()).toHaveLength(2);

    tracker.dispose();
  });

  test("computes cache cost correctly using pricing rates", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    // claude-sonnet-4-20250514: input=$3, output=$15, cached=$0.3, cacheWrite=$3.75 per million
    // 1M cache-write tokens: $3.75
    // 1M cache-read tokens: $0.3
    // No regular input or output
    events$.next(
      makeCompleteEvent(
        0, // no regular input
        0, // no output
        "claude-sonnet-4-20250514",
        1_000_000, // 1M cache write = $3.75
        1_000_000, // 1M cache read = $0.3
      ),
    );

    const totals = tracker.getTotals();
    expect(totals.estimatedUSD).toBeCloseTo(4.05, 5); // $3.75 + $0.30

    tracker.dispose();
  });
});
