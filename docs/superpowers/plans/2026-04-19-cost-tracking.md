# Session Cost Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `SessionCostTracker` that listens to `inference:complete` events, accumulates per-turn and per-session token totals (including cache token breakdown), computes USD cost via `calculateCost()`, and exposes the data for the status bar and `/cost` command.

**Architecture:** Amp tracks token usage per-inference in `Usage` objects containing `inputTokens`, `outputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`, `totalInputTokens`. These are accumulated across inference calls and displayed in the status bar popover (`chunk-006.js:23584-23590`) and the `/cost` display (`xrT` in `2575_unknown_xrT.js`). The `Usage` schema already exists in `@flitter/schemas`. The `InferenceCompleteEvent` already carries `usage?: { inputTokens, outputTokens }` but is missing cache fields. We need to: (1) extend `InferenceCompleteEvent` to include cache tokens, (2) create `SessionCostTracker` that accumulates, (3) expose to status bar.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/llm` (calculateCost, MODEL_REGISTRY), `@flitter/agent-core` (events), `@flitter/schemas` (Usage)

**Amp reference:**
- `amp-cli-reversed/chunk-002.js:1340-1350` -- mergeUsage function that accumulates `inputTokens`, `outputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`, `totalInputTokens`
- `amp-cli-reversed/chunk-006.js:23584-23590` -- status bar popover showing Used/Maximum/Cached tokens
- `amp-cli-reversed/modules/2575_unknown_xrT.js` -- cost rendering (totalCostUSD, freeUSD, paidUSD breakdown)
- `amp-cli-reversed/modules/2576_unknown_OL0.js` -- thread cost display via API

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/agent-core/src/cost/session-cost-tracker.ts` | SessionCostTracker class |
| Create | `packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts` | Unit tests |
| Modify | `packages/agent-core/src/worker/events.ts` | Extend InferenceCompleteEvent with cache tokens + model |
| Modify | `packages/agent-core/src/worker/thread-worker.ts` | Emit extended usage in inference:complete |
| Modify | `packages/agent-core/src/index.ts` | Export SessionCostTracker |
| Modify | `packages/cli/src/widgets/thread-state-widget.ts` | Wire SessionCostTracker, expose cost to status bar |
| Modify | `packages/cli/src/modes/interactive.ts` | Create and pass SessionCostTracker |

---

### Task 1: Extend InferenceCompleteEvent with cache tokens and model

**Why first:** The tracker needs cache token data from events. Without extending the event, the tracker can only track basic input/output.

**Files:**
- Modify: `packages/agent-core/src/worker/events.ts`
- Modify: `packages/agent-core/src/worker/thread-worker.ts`

**Amp reference:** `amp-cli-reversed/chunk-002.js:2217-2218` -- amp's inference complete carries `cacheCreationInputTokens: b.usage.cache_creation_input_tokens, cacheReadInputTokens: b.usage.cache_read_input_tokens`. The merged usage schema (`chunk-002.js:1340-1350`) includes `model`, `maxInputTokens`, `inputTokens`, `outputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`, `totalInputTokens`, `thinkingBudget`, `timestamp`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts
// (This test will be expanded in Task 2; for now, verify event shape)
import { describe, expect, it } from "bun:test";
import type { InferenceCompleteEvent } from "../../worker/events";

describe("InferenceCompleteEvent shape", () => {
  it("supports cache token fields", () => {
    const event: InferenceCompleteEvent = {
      type: "inference:complete",
      usage: {
        inputTokens: 1000,
        outputTokens: 200,
        cacheCreationInputTokens: 50,
        cacheReadInputTokens: 800,
      },
      model: "claude-sonnet-4-20250514",
    };
    expect(event.usage?.cacheCreationInputTokens).toBe(50);
    expect(event.usage?.cacheReadInputTokens).toBe(800);
    expect(event.model).toBe("claude-sonnet-4-20250514");
  });

  it("cache tokens are optional (backwards compatible)", () => {
    const event: InferenceCompleteEvent = {
      type: "inference:complete",
      usage: { inputTokens: 500, outputTokens: 100 },
    };
    expect(event.usage?.cacheCreationInputTokens).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts`
Expected: FAIL -- `cacheCreationInputTokens` not in type, `model` not in type.

- [ ] **Step 3: Extend InferenceCompleteEvent**

In `packages/agent-core/src/worker/events.ts`, modify the `InferenceCompleteEvent` interface:

```typescript
// OLD:
/** LLM 推理完成 (单轮流式结束) */
export interface InferenceCompleteEvent {
  type: "inference:complete";
  usage?: { inputTokens: number; outputTokens: number };
}

// NEW:
/** LLM 推理完成 (单轮流式结束) */
export interface InferenceCompleteEvent {
  type: "inference:complete";
  /** Token usage for this inference turn */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    /** Tokens used to create new cache entries (optional, Anthropic-specific) */
    cacheCreationInputTokens?: number;
    /** Tokens read from cache (optional, Anthropic-specific) */
    cacheReadInputTokens?: number;
  };
  /** Model used for this inference (for cost calculation) */
  model?: string;
}
```

- [ ] **Step 4: Update ThreadWorker to emit extended usage**

In `packages/agent-core/src/worker/thread-worker.ts`, update the `inference:complete` emission (around line 195):

```typescript
// OLD (lines 195-203):
      this.events$.next({
        type: "inference:complete",
        usage: lastDelta?.usage
          ? {
              inputTokens: (lastDelta.usage as unknown as Record<string, number>).inputTokens ?? 0,
              outputTokens: (lastDelta.usage as unknown as Record<string, number>).outputTokens ?? 0,
            }
          : undefined,
      });

// NEW:
      this.events$.next({
        type: "inference:complete",
        usage: lastDelta?.usage
          ? {
              inputTokens: (lastDelta.usage as unknown as Record<string, number>).inputTokens ?? 0,
              outputTokens: (lastDelta.usage as unknown as Record<string, number>).outputTokens ?? 0,
              cacheCreationInputTokens:
                (lastDelta.usage as unknown as Record<string, number>).cacheCreationInputTokens ?? undefined,
              cacheReadInputTokens:
                (lastDelta.usage as unknown as Record<string, number>).cacheReadInputTokens ?? undefined,
            }
          : undefined,
        model: streamParams.model,
      });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/worker/events.ts packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts
git commit -m "feat(agent-core): extend InferenceCompleteEvent with cache tokens and model

Add cacheCreationInputTokens, cacheReadInputTokens (optional) and
model field to InferenceCompleteEvent. ThreadWorker now emits these
from the StreamDelta usage.

逆向: amp chunk-002.js:2217-2218 (cache_creation_input_tokens,
cache_read_input_tokens in inference usage)"
```

---

### Task 2: Create SessionCostTracker class

**Why:** Core accumulation logic that listens to events and computes running totals.

**Files:**
- Create: `packages/agent-core/src/cost/session-cost-tracker.ts`
- Extend: `packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts`

**Amp reference:** `amp-cli-reversed/chunk-002.js:1333-1351` -- mergeUsage accumulates with `(t, r) => t + r` for token counts and `Math.max` for nullable fields. Amp tracks per-inference Usage objects and merges them. Flitter uses a simpler accumulator pattern since we only need session totals, not per-message.

- [ ] **Step 1: Write tests**

```typescript
// packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts
// (append to existing file)
import { SessionCostTracker } from "../session-cost-tracker";
import type { AgentEvent } from "../../worker/events";
import { Subject } from "@flitter/util";

describe("SessionCostTracker", () => {
  it("accumulates token totals from inference:complete events", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 1000, outputTokens: 200 },
      model: "claude-sonnet-4-20250514",
    });

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(1000);
    expect(totals.outputTokens).toBe(200);
    expect(totals.totalTokens).toBe(1200);
    expect(totals.turnCount).toBe(1);
  });

  it("accumulates across multiple turns", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 1000, outputTokens: 200 },
      model: "claude-sonnet-4-20250514",
    });
    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 2000, outputTokens: 300 },
      model: "claude-sonnet-4-20250514",
    });

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(3000);
    expect(totals.outputTokens).toBe(500);
    expect(totals.turnCount).toBe(2);
  });

  it("tracks cache token breakdown", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({
      type: "inference:complete",
      usage: {
        inputTokens: 1000,
        outputTokens: 200,
        cacheCreationInputTokens: 50,
        cacheReadInputTokens: 800,
      },
      model: "claude-sonnet-4-20250514",
    });

    const totals = tracker.getTotals();
    expect(totals.cacheCreationInputTokens).toBe(50);
    expect(totals.cacheReadInputTokens).toBe(800);
  });

  it("ignores events without usage", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({ type: "inference:complete" });

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(0);
    expect(totals.turnCount).toBe(0);
  });

  it("ignores non-inference-complete events", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({ type: "inference:start" });
    events$.next({ type: "turn:complete" });

    const totals = tracker.getTotals();
    expect(totals.turnCount).toBe(0);
  });

  it("computes estimated USD cost", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    // claude-sonnet-4-20250514 cost: input $3/1M, output $15/1M
    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 1_000_000, outputTokens: 100_000 },
      model: "claude-sonnet-4-20250514",
    });

    const totals = tracker.getTotals();
    // Cost = (1M * 3/1M) + (100K * 15/1M) = 3 + 1.5 = 4.5
    expect(totals.estimatedCostUSD).toBeGreaterThan(0);
  });

  it("dispose unsubscribes from events", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    tracker.dispose();

    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 1000, outputTokens: 200 },
      model: "claude-sonnet-4-20250514",
    });

    // After dispose, events should not accumulate
    expect(tracker.getTotals().turnCount).toBe(0);
  });

  it("tracks per-turn history", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 1000, outputTokens: 200 },
      model: "claude-sonnet-4-20250514",
    });
    events$.next({
      type: "inference:complete",
      usage: { inputTokens: 2000, outputTokens: 300 },
      model: "claude-sonnet-4-20250514",
    });

    const history = tracker.getTurnHistory();
    expect(history).toHaveLength(2);
    expect(history[0].inputTokens).toBe(1000);
    expect(history[1].inputTokens).toBe(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement SessionCostTracker**

```typescript
// packages/agent-core/src/cost/session-cost-tracker.ts
/**
 * SessionCostTracker -- accumulates token usage and cost across inference turns.
 *
 * Listens to AgentEvent stream for inference:complete events, extracts usage
 * data, and maintains running totals including cache token breakdown.
 *
 * 逆向: amp chunk-002.js:1333-1351 (mergeUsage accumulator pattern)
 *        amp chunk-006.js:23584-23590 (status bar token display)
 *        amp 2575_unknown_xrT.js (cost rendering: totalCostUSD, freeUSD, paidUSD)
 */

import type { Subscription } from "@flitter/util";
import type { AgentEvent, InferenceCompleteEvent } from "../worker/events";

/**
 * Per-turn usage record.
 */
export interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  model: string;
  timestamp: number;
}

/**
 * Session-level accumulated totals.
 */
export interface SessionTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  turnCount: number;
  estimatedCostUSD: number;
}

/** Simple cost lookup -- mirrors MODEL_REGISTRY cost data */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = COST_PER_MILLION[model];
  if (!costs) return 0;
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
}

/**
 * SessionCostTracker -- subscribes to AgentEvent stream, accumulates usage.
 *
 * 逆向: amp mergeUsage (chunk-002.js:1333-1351) -- accumulates per-inference
 * usage into a running total. Flitter stores per-turn history and computes
 * totals on demand.
 */
export class SessionCostTracker {
  private _turns: TurnUsage[] = [];
  private _subscription: Subscription | null = null;

  constructor(events$: { subscribe(observer: (event: AgentEvent) => void): Subscription }) {
    this._subscription = events$.subscribe((event) => {
      if (event.type === "inference:complete") {
        this._handleInferenceComplete(event);
      }
    });
  }

  private _handleInferenceComplete(event: InferenceCompleteEvent): void {
    if (!event.usage) return;

    this._turns.push({
      inputTokens: event.usage.inputTokens,
      outputTokens: event.usage.outputTokens,
      cacheCreationInputTokens: event.usage.cacheCreationInputTokens ?? 0,
      cacheReadInputTokens: event.usage.cacheReadInputTokens ?? 0,
      model: event.model ?? "unknown",
      timestamp: Date.now(),
    });
  }

  /**
   * Get accumulated session totals.
   */
  getTotals(): SessionTotals {
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreation = 0;
    let cacheRead = 0;
    let cost = 0;

    for (const turn of this._turns) {
      inputTokens += turn.inputTokens;
      outputTokens += turn.outputTokens;
      cacheCreation += turn.cacheCreationInputTokens;
      cacheRead += turn.cacheReadInputTokens;
      cost += estimateCost(turn.model, turn.inputTokens, turn.outputTokens);
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cacheCreationInputTokens: cacheCreation,
      cacheReadInputTokens: cacheRead,
      turnCount: this._turns.length,
      estimatedCostUSD: cost,
    };
  }

  /**
   * Get per-turn usage history.
   */
  getTurnHistory(): TurnUsage[] {
    return [...this._turns];
  }

  /**
   * Clean up subscription.
   */
  dispose(): void {
    this._subscription?.unsubscribe();
    this._subscription = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts`
Expected: PASS

- [ ] **Step 5: Export from agent-core index**

In `packages/agent-core/src/index.ts`, add:

```typescript
export { SessionCostTracker } from "./cost/session-cost-tracker";
export type { SessionTotals, TurnUsage } from "./cost/session-cost-tracker";
```

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/cost/session-cost-tracker.ts packages/agent-core/src/cost/__tests__/session-cost-tracker.test.ts packages/agent-core/src/index.ts
git commit -m "feat(agent-core): add SessionCostTracker for token usage accumulation

Subscribes to inference:complete events, accumulates per-turn usage
including cache token breakdown (cacheCreationInputTokens,
cacheReadInputTokens). Exposes getTotals() with estimated USD cost
and getTurnHistory() for per-turn breakdown.

逆向: amp mergeUsage (chunk-002.js:1333-1351) accumulates token counts.
amp xrT (2575_unknown_xrT.js) renders cost with free/paid breakdown."
```

---

### Task 3: Wire SessionCostTracker to status bar and /cost command

**Why:** The tracker accumulates data but nothing reads it yet.

**Files:**
- Modify: `packages/cli/src/modes/interactive.ts` -- create tracker, pass to widget
- Modify: `packages/cli/src/widgets/thread-state-widget.ts` -- read from tracker for status bar

**Amp reference:** `amp-cli-reversed/chunk-006.js:23584-23590` -- status bar popover shows `Used: N tokens (X%)`, `Maximum: M tokens`, `Cached: C tokens`. The token counts come from the thread's accumulated usage.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/widgets/__tests__/cost-tracking-integration.test.ts
import { describe, expect, it } from "bun:test";
import { Subject } from "@flitter/util";
import type { AgentEvent } from "@flitter/agent-core";
import { SessionCostTracker } from "@flitter/agent-core";

describe("SessionCostTracker integration with ThreadStateWidget", () => {
  it("tracker accumulates from events$ and provides totals", () => {
    const events$ = new Subject<AgentEvent>();
    const tracker = new SessionCostTracker(events$);

    // Simulate two inference turns
    events$.next({
      type: "inference:complete",
      usage: {
        inputTokens: 5000,
        outputTokens: 1000,
        cacheCreationInputTokens: 200,
        cacheReadInputTokens: 3000,
      },
      model: "claude-sonnet-4-20250514",
    });
    events$.next({
      type: "inference:complete",
      usage: {
        inputTokens: 6000,
        outputTokens: 1500,
        cacheReadInputTokens: 4000,
      },
      model: "claude-sonnet-4-20250514",
    });

    const totals = tracker.getTotals();
    expect(totals.inputTokens).toBe(11000);
    expect(totals.outputTokens).toBe(2500);
    expect(totals.cacheCreationInputTokens).toBe(200);
    expect(totals.cacheReadInputTokens).toBe(7000);
    expect(totals.turnCount).toBe(2);
    expect(totals.estimatedCostUSD).toBeGreaterThan(0);

    tracker.dispose();
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/cost-tracking-integration.test.ts`
Expected: PASS (after Task 2 is done)

- [ ] **Step 3: Add SessionCostTracker to interactive mode**

In `packages/cli/src/modes/interactive.ts`, add import:

```typescript
import { SessionCostTracker } from "@flitter/agent-core";
```

After creating the worker (line 150: `const worker = container.createThreadWorker(threadId);`):

```typescript
  // Create cost tracker attached to worker events
  // 逆向: amp accumulates usage per-inference (chunk-002.js:1333-1351)
  const costTracker = new SessionCostTracker(worker.events$);
```

In the finally block (line 201), add cleanup:

```typescript
    costTracker.dispose();
```

Pass `costTracker` to ThreadStateWidget config (requires extending ThreadStateWidgetConfig):

```typescript
        child: new ThreadStateWidget({
          // ... existing props ...
          costTracker,
        }),
```

- [ ] **Step 4: Extend ThreadStateWidgetConfig and wire to status bar**

In `packages/cli/src/widgets/thread-state-widget.ts`, add to `ThreadStateWidgetConfig`:

```typescript
  /** Session cost tracker for accumulated token usage */
  costTracker?: {
    getTotals(): { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUSD: number };
  };
```

In `ThreadStateWidgetState.build()`, update the StatusBar tokenUsage to prefer costTracker data:

```typescript
        // Use costTracker totals if available, otherwise fall back to event-accumulated values
        const costTotals = this.widget.config.costTracker?.getTotals();
        const inputTokens = costTotals?.inputTokens ?? this._totalInputTokens;
        const outputTokens = costTotals?.outputTokens ?? this._totalOutputTokens;

        // ... in the StatusBar config:
        tokenUsage: {
          inputTokens,
          outputTokens,
          maxInputTokens: 200000, // TODO: derive from model config
        },
```

- [ ] **Step 5: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No new type errors

- [ ] **Step 6: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/modes/interactive.ts packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/cost-tracking-integration.test.ts
git commit -m "feat(cli): wire SessionCostTracker to status bar for live cost display

SessionCostTracker is created in interactive mode, subscribes to worker
events, and provides accumulated totals to the status bar widget.
Includes cache token breakdown (cacheCreationInputTokens,
cacheReadInputTokens).

逆向: amp chunk-006.js:23584-23590 (Used/Maximum/Cached token display)"
```

---

### Task 4: Run full test suite and verify

- [ ] **Step 1: Type check all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All pass

- [ ] **Step 3: Fix any regressions**

The most likely regression is existing tests that assert on `InferenceCompleteEvent.usage` shape (the type was extended, not changed). Verify no existing code assumes `usage` has exactly 2 fields.
