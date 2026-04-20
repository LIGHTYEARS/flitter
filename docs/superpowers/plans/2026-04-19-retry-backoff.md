> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# Rate-Limit Retry with Backoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement exponential backoff retry on 429/overloaded errors in ThreadWorker, matching amp's retry behavior: BASE_RETRY_SECONDS=5, MAX_RETRY_SECONDS=60, MAX_AUTO_RETRIES=5, countdown timer observable, and context-limit pre-flight detection.

**Architecture:** The retry system has three layers: (1) `RetryScheduler` class that encapsulates the exponential backoff algorithm and countdown timer, (2) error classification functions (`isRetryableError`, `isContextLimitError`) that detect 429, overloaded, network errors, and context-limit errors, (3) ThreadWorker integration that catches errors from `runInference`, classifies them, and either starts a retry countdown or surfaces the error as ephemeral. New `AgentEvent` types (`retry:start`, `retry:countdown`, `retry:end`) let the TUI display a countdown to the user.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/agent-core` (ThreadWorker, events), `@flitter/llm` (ProviderError), `@flitter/util` (BehaviorSubject)

**Amp reference:**
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1124-1165` — `BASE_RETRY_SECONDS=5`, `MAX_RETRY_SECONDS=60`, `MAX_AUTO_RETRIES=5`, `getRetryDelaySeconds()`, `retry()`, `clearRetryCountdown()`, `startRetryCountdown()`
- `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:977-1003` — error catch block: checks `dO()` (context limit) first, then `vUT()` (retryable) → `startRetryCountdown(getRetryDelaySeconds())`
- `amp-cli-reversed/modules/1081_unknown_ev.js` — `vUT()` (isRetryable): combines `fU` (overloaded), `IU` (stream stalled), `$UT` (network error), `G4R` (5xx), rate_limit_error type, 429 status, `K4R` (InvalidModelOutput), `V4R` (stream incomplete)
- `amp-cli-reversed/modules/1073_unknown_dO.js:7-15` — `dO()` (isContextLimit): checks message strings for "prompt is too long", "exceed context limit", etc.
- `amp-cli-reversed/modules/1076_unknown_fU.js` — `fU()` (isOverloaded): checks "overloaded"/"overload" in message/error
- `amp-cli-reversed/modules/1078_unknown_IU.js` — `IU()` (isStreamStalled): "stream stalled", "no data received for"
- `amp-cli-reversed/modules/1079_unknown_$UT.js` — `$UT()` (isNetworkError): "fetch failed", "econnrefused", "etimedout", etc.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/agent-core/src/worker/retry-scheduler.ts` | RetryScheduler class + error classifiers |
| Create | `packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts` | Unit tests for RetryScheduler |
| Modify | `packages/agent-core/src/worker/events.ts` | Add retry event types to AgentEvent union |
| Modify | `packages/agent-core/src/worker/thread-worker.ts` | Wire RetryScheduler into inference error catch |
| Modify | `packages/agent-core/src/index.ts` | Export RetryScheduler and error classifiers |
| Create | `packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts` | Integration test: ThreadWorker + retry |

---

### Task 1: Implement error classifiers

**Why first:** These pure functions have no dependencies and are the foundation for retry decisions. Amp splits error detection into 7 small functions; Flitter consolidates into a single module.

**Files:**
- Create: `packages/agent-core/src/worker/retry-scheduler.ts` (classifiers only, scheduler in Task 2)
- Test: `packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts`

**Amp reference:**
- `fU()` → `isOverloadedError`: checks "overloaded"/"overload" in message or error.message, or error.type === "overloaded_error"
- `IU()` → `isStreamStalledError`: checks "stream stalled", "no data received for"
- `$UT()` → `isNetworkError`: checks 14 patterns: "fetch failed", "failed to fetch", "enotfound", "econnrefused", "econnreset", "etimedout", "network request failed", "network error", "dns lookup failed", "getaddrinfo", "socket hang up", "connection refused", "unable to connect", "terminated", "other side closed"
- `G4R()` → `isServerError`: status >= 500
- `K4R()` → `isInvalidModelOutput`: message starts with "InvalidModelOutputError"
- `V4R()` → `isStreamIncomplete`: "response incomplete", "stream ended unexpectedly", "stream closed before"
- `vUT()` → `isRetryableError`: OR of all above + rate_limit_error type + 429 status
- `dO()` → `isContextLimitError`: "prompt is too long", "exceed context limit", "context limit reached", "token limit exceeded", "context window", "maximum context length"; checks both error.type === "invalid_request_error" and plain message

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts
import { describe, expect, it } from "bun:test";
import {
  isRetryableError,
  isContextLimitError,
  isOverloadedError,
  isNetworkError,
  isStreamStalledError,
} from "../retry-scheduler";
import { ProviderError } from "@flitter/llm";

describe("error classifiers", () => {
  describe("isOverloadedError", () => {
    it("detects 'overloaded' in message", () => {
      expect(isOverloadedError({ message: "API is overloaded" })).toBe(true);
    });
    it("detects overloaded_error type", () => {
      expect(
        isOverloadedError({ message: "err", error: { type: "overloaded_error" } }),
      ).toBe(true);
    });
    it("rejects unrelated error", () => {
      expect(isOverloadedError({ message: "not found" })).toBe(false);
    });
  });

  describe("isNetworkError", () => {
    for (const pattern of [
      "fetch failed",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "socket hang up",
      "connection refused",
    ]) {
      it(`detects "${pattern}"`, () => {
        expect(isNetworkError({ message: `Request failed: ${pattern}` })).toBe(true);
      });
    }
  });

  describe("isStreamStalledError", () => {
    it("detects 'stream stalled'", () => {
      expect(isStreamStalledError({ message: "stream stalled after 30s" })).toBe(true);
    });
    it("detects 'no data received for'", () => {
      expect(isStreamStalledError({ message: "no data received for 60 seconds" })).toBe(true);
    });
  });

  describe("isRetryableError", () => {
    it("matches 429 ProviderError", () => {
      const err = new ProviderError(429, "anthropic", true, "Rate limited");
      expect(isRetryableError(err)).toBe(true);
    });
    it("matches 500 ProviderError", () => {
      const err = new ProviderError(500, "anthropic", true, "Server error");
      expect(isRetryableError(err)).toBe(true);
    });
    it("matches overloaded error", () => {
      expect(isRetryableError(new Error("API is overloaded right now"))).toBe(true);
    });
    it("matches network error", () => {
      expect(isRetryableError(new Error("fetch failed"))).toBe(true);
    });
    it("matches InvalidModelOutputError", () => {
      expect(isRetryableError(new Error("InvalidModelOutputError: bad response"))).toBe(true);
    });
    it("rejects auth error", () => {
      const err = new ProviderError(401, "anthropic", false, "Unauthorized");
      expect(isRetryableError(err)).toBe(false);
    });
    it("rejects random error", () => {
      expect(isRetryableError(new Error("something else happened"))).toBe(false);
    });
  });

  describe("isContextLimitError", () => {
    for (const msg of [
      "prompt is too long",
      "exceed context limit",
      "context limit reached",
      "token limit exceeded",
      "maximum context length exceeded",
    ]) {
      it(`detects "${msg}"`, () => {
        expect(isContextLimitError(new Error(msg))).toBe(true);
      });
    }
    it("detects invalid_request_error with context window message", () => {
      const err = Object.assign(new Error("context window exceeded"), {
        error: { type: "invalid_request_error", message: "context window exceeded" },
      });
      expect(isContextLimitError(err)).toBe(true);
    });
    it("rejects unrelated error", () => {
      expect(isContextLimitError(new Error("tool not found"))).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts`
Expected: FAIL — module `../retry-scheduler` does not exist.

- [ ] **Step 3: Implement error classifiers**

```typescript
// packages/agent-core/src/worker/retry-scheduler.ts

/**
 * Error classification for retry decisions.
 * 逆向: fU, IU, $UT, G4R, K4R, V4R, vUT, dO
 * (amp-cli-reversed/modules/1076-1081, 1073)
 */

// ─── Error shape helpers ──────────────────────────────────

interface ErrorLike {
  message?: string;
  status?: number;
  error?: {
    type?: string;
    message?: string;
  };
}

function toErrorLike(err: unknown): ErrorLike {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      message: typeof e.message === "string" ? e.message : undefined,
      status: typeof e.status === "number" ? e.status : undefined,
      error:
        e.error && typeof e.error === "object"
          ? {
              type: typeof (e.error as Record<string, unknown>).type === "string"
                ? ((e.error as Record<string, unknown>).type as string)
                : undefined,
              message: typeof (e.error as Record<string, unknown>).message === "string"
                ? ((e.error as Record<string, unknown>).message as string)
                : undefined,
            }
          : undefined,
    };
  }
  return { message: String(err) };
}

function lowerIncludes(haystack: string | undefined, needle: string): boolean {
  return (haystack?.toLowerCase() ?? "").includes(needle);
}

// ─── Individual error classifiers ─────────────────────────

/**
 * 逆向: fU — checks "overloaded"/"overload" in message or error.message,
 * or error.type === "overloaded_error"
 */
export function isOverloadedError(err: unknown): boolean {
  const e = toErrorLike(err);
  const patterns = ["overloaded", "overload"];
  const msgMatch = patterns.some((p) => lowerIncludes(e.message, p));
  const errMsgMatch = Boolean(
    e.error?.message && patterns.some((p) => lowerIncludes(e.error!.message, p)),
  );
  const typeMatch = e.error?.type === "overloaded_error";
  return msgMatch || errMsgMatch || typeMatch;
}

/**
 * 逆向: IU — "stream stalled", "no data received for"
 */
export function isStreamStalledError(err: unknown): boolean {
  const e = toErrorLike(err);
  const patterns = ["stream stalled", "no data received for"];
  const msg = e.message?.toLowerCase() ?? "";
  const errMsg = e.error?.message?.toLowerCase() ?? "";
  return patterns.some((p) => msg.includes(p) || errMsg.includes(p));
}

/**
 * 逆向: $UT — 14 network error patterns
 */
export function isNetworkError(err: unknown): boolean {
  const e = toErrorLike(err);
  const patterns = [
    "fetch failed",
    "failed to fetch",
    "enotfound",
    "econnrefused",
    "econnreset",
    "etimedout",
    "network request failed",
    "network error",
    "dns lookup failed",
    "getaddrinfo",
    "socket hang up",
    "connection refused",
    "unable to connect",
    "terminated",
    "other side closed",
  ];
  const msg = e.message?.toLowerCase() ?? "";
  const errMsg = e.error?.message?.toLowerCase() ?? "";
  return patterns.some((p) => msg.includes(p) || errMsg.includes(p));
}

/**
 * 逆向: G4R — status >= 500
 */
function isServerError(err: unknown): boolean {
  const e = toErrorLike(err);
  return e.status !== undefined && e.status >= 500;
}

/**
 * 逆向: K4R — message starts with "InvalidModelOutputError"
 */
function isInvalidModelOutputError(err: unknown): boolean {
  const e = toErrorLike(err);
  return e.message?.startsWith("InvalidModelOutputError") ?? false;
}

/**
 * 逆向: V4R — "response incomplete", "stream ended unexpectedly", "stream closed before"
 */
function isStreamIncompleteError(err: unknown): boolean {
  const e = toErrorLike(err);
  const patterns = ["response incomplete", "stream ended unexpectedly", "stream closed before"];
  const msg = e.message?.toLowerCase() ?? "";
  const errMsg = e.error?.message?.toLowerCase() ?? "";
  return patterns.some((p) => msg.includes(p) || errMsg.includes(p));
}

/**
 * Master retryable-error check.
 * 逆向: vUT — OR of all individual checks + rate_limit_error type + 429 status
 */
export function isRetryableError(err: unknown): boolean {
  const e = toErrorLike(err);
  return (
    isOverloadedError(err) ||
    isStreamStalledError(err) ||
    isNetworkError(err) ||
    isServerError(err) ||
    e.error?.type === "rate_limit_error" ||
    e.status === 429 ||
    isInvalidModelOutputError(err) ||
    isStreamIncompleteError(err)
  );
}

/**
 * Detect context-limit errors (prompt too long).
 * 逆向: dO — checks message for 6 patterns, also checks error.type === "invalid_request_error"
 * These errors should NOT be retried — they need compaction instead.
 */
export function isContextLimitError(err: unknown): boolean {
  const e = toErrorLike(err);
  const patterns = [
    "prompt is too long",
    "exceed context limit",
    "context limit reached",
    "token limit exceeded",
    "context window",
    "maximum context length",
  ];
  const check = (s: string | undefined): boolean => {
    const lower = s?.toLowerCase() ?? "";
    return patterns.some((p) => lower.includes(p));
  };
  const fromType = e.error?.type === "invalid_request_error" && check(e.error.message);
  const fromMsg = check(e.message);
  return fromType || fromMsg;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts`
Expected: PASS

- [ ] **Step 5: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/worker/retry-scheduler.ts packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts
git commit -m "feat(agent-core): add error classifiers for retry decisions

Implement isRetryableError, isContextLimitError, isOverloadedError,
isNetworkError, isStreamStalledError matching amp's 7-function error
detection: fU, IU, \$UT, G4R, K4R, V4R, vUT, dO.

逆向: amp modules 1073-1081 (error detection functions)"
```

---

### Task 2: Implement RetryScheduler class

**Why:** Encapsulates the exponential backoff algorithm and countdown timer. Separated from ThreadWorker for testability.

**Files:**
- Modify: `packages/agent-core/src/worker/retry-scheduler.ts` (append)
- Test: `packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts` (append)

**Amp reference:**
- `ov.BASE_RETRY_SECONDS = 5` — base delay
- `ov.MAX_RETRY_SECONDS = 60` — cap
- `ov.MAX_AUTO_RETRIES = 5` — stop auto-retrying after 5 attempts
- `getRetryDelaySeconds()`: `if (attempt >= MAX_AUTO_RETRIES) return undefined; delay = BASE * 2^attempt; return min(delay, MAX)`
- `startRetryCountdown(seconds)`: clears previous, stores session, sets interval that counts down, calls `retry()` at 0
- `clearRetryCountdown()`: increments session, clears interval, sets countdownSeconds to undefined
- `retry()`: clears countdown, increments attempt, clears ephemeral error, aborts current inference, truncates incomplete assistant messages, calls runInference
- `resetRetryAttempts()`: resets attempt counter to 0, clears countdown and ephemeral error

- [ ] **Step 1: Write the failing test**

Append to `packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts`:

```typescript
import { RetryScheduler } from "../retry-scheduler";

describe("RetryScheduler", () => {
  describe("getRetryDelaySeconds", () => {
    it("returns BASE_RETRY_SECONDS on first attempt", () => {
      const scheduler = new RetryScheduler();
      expect(scheduler.getRetryDelaySeconds()).toBe(5);
    });

    it("doubles delay on each attempt (exponential backoff)", () => {
      const scheduler = new RetryScheduler();
      scheduler.incrementAttempt(); // attempt = 1
      expect(scheduler.getRetryDelaySeconds()).toBe(10);
      scheduler.incrementAttempt(); // attempt = 2
      expect(scheduler.getRetryDelaySeconds()).toBe(20);
      scheduler.incrementAttempt(); // attempt = 3
      expect(scheduler.getRetryDelaySeconds()).toBe(40);
    });

    it("caps at MAX_RETRY_SECONDS (60)", () => {
      const scheduler = new RetryScheduler();
      for (let i = 0; i < 4; i++) scheduler.incrementAttempt();
      // attempt = 4, delay = 5 * 2^4 = 80, capped to 60
      expect(scheduler.getRetryDelaySeconds()).toBe(60);
    });

    it("returns undefined after MAX_AUTO_RETRIES (5)", () => {
      const scheduler = new RetryScheduler();
      for (let i = 0; i < 5; i++) scheduler.incrementAttempt();
      // attempt = 5 >= MAX_AUTO_RETRIES
      expect(scheduler.getRetryDelaySeconds()).toBeUndefined();
    });
  });

  describe("resetAttempts", () => {
    it("resets attempt counter to 0", () => {
      const scheduler = new RetryScheduler();
      scheduler.incrementAttempt();
      scheduler.incrementAttempt();
      scheduler.resetAttempts();
      expect(scheduler.getRetryDelaySeconds()).toBe(5);
    });
  });

  describe("countdown", () => {
    it("starts countdown and emits seconds via callback", async () => {
      const scheduler = new RetryScheduler();
      const ticks: (number | undefined)[] = [];
      const onTick = (s: number | undefined) => ticks.push(s);

      // Use very short duration for test
      scheduler.startCountdown(2, onTick, async () => {});

      // Wait for countdown to complete (2 seconds + buffer)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Should have ticked: 2, 1, then auto-retry fires, then undefined
      expect(ticks[0]).toBe(2);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
    });

    it("clearCountdown stops the timer", () => {
      const scheduler = new RetryScheduler();
      const ticks: (number | undefined)[] = [];
      const onTick = (s: number | undefined) => ticks.push(s);

      scheduler.startCountdown(10, onTick, async () => {});
      scheduler.clearCountdown();

      // The last tick should be undefined (cleared)
      expect(ticks[ticks.length - 1]).toBeUndefined();
    });

    it("startCountdown clears previous countdown", () => {
      const scheduler = new RetryScheduler();
      const ticks1: (number | undefined)[] = [];
      const ticks2: (number | undefined)[] = [];

      scheduler.startCountdown(10, (s) => ticks1.push(s), async () => {});
      scheduler.startCountdown(5, (s) => ticks2.push(s), async () => {});

      // First countdown should have been cleared (last tick = undefined)
      expect(ticks1[ticks1.length - 1]).toBeUndefined();
      expect(ticks2[0]).toBe(5);

      scheduler.clearCountdown();
    });
  });

  describe("dispose", () => {
    it("clears countdown on dispose", () => {
      const scheduler = new RetryScheduler();
      scheduler.startCountdown(60, () => {}, async () => {});
      scheduler.dispose();
      // Should not throw or leak timers
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts`
Expected: FAIL — `RetryScheduler` does not exist yet.

- [ ] **Step 3: Implement RetryScheduler**

Append to `packages/agent-core/src/worker/retry-scheduler.ts`:

```typescript
// ─── RetryScheduler ───────────────────────────────────────

/**
 * Exponential backoff retry scheduler with countdown timer.
 * 逆向: ov.BASE_RETRY_SECONDS, ov.MAX_RETRY_SECONDS, ov.MAX_AUTO_RETRIES,
 *        ov.getRetryDelaySeconds, ov.startRetryCountdown, ov.clearRetryCountdown
 *        (amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1124-1165)
 */
export class RetryScheduler {
  static readonly BASE_RETRY_SECONDS = 5;
  static readonly MAX_RETRY_SECONDS = 60;
  static readonly MAX_AUTO_RETRIES = 5;

  private attempt = 0;
  private retrySession = 0;
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Get delay in seconds for the current attempt, or undefined if max retries exceeded.
   * 逆向: ov.getRetryDelaySeconds
   */
  getRetryDelaySeconds(): number | undefined {
    if (this.attempt >= RetryScheduler.MAX_AUTO_RETRIES) return undefined;
    const delay = RetryScheduler.BASE_RETRY_SECONDS * 2 ** this.attempt;
    return Math.min(delay, RetryScheduler.MAX_RETRY_SECONDS);
  }

  /**
   * Increment the retry attempt counter.
   */
  incrementAttempt(): void {
    this.attempt++;
  }

  /**
   * Reset retry attempt counter to 0 and clear any active countdown.
   * 逆向: ov.resetRetryAttempts — called on successful inference or new user message.
   */
  resetAttempts(): void {
    this.attempt = 0;
    this.clearCountdown();
  }

  /**
   * Start a countdown timer. Calls onTick(remainingSeconds) every second.
   * When countdown reaches 0, calls onRetry() and clears the timer.
   *
   * 逆向: ov.startRetryCountdown(T) — clears previous, stores session,
   * sets interval that counts down, calls retry() at 0.
   */
  startCountdown(
    seconds: number,
    onTick: (remainingSeconds: number | undefined) => void,
    onRetry: () => Promise<void>,
  ): void {
    this.clearCountdown();
    const session = this.retrySession;
    const endTime = Date.now() + seconds * 1000;

    onTick(seconds);

    this.retryTimer = setInterval(() => {
      // Session changed — this timer is stale
      if (session !== this.retrySession) return;

      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      if (remaining <= 0) {
        this.clearCountdown();
        onRetry().catch(() => {
          // Error handled by caller (ThreadWorker.retry)
        });
      } else {
        onTick(remaining);
      }
    }, 1000);
  }

  /**
   * Clear the countdown timer.
   * 逆向: ov.clearRetryCountdown — increments session, clears interval,
   * sets retryCountdownSeconds to undefined.
   */
  clearCountdown(): void {
    this.retrySession++;
    if (this.retryTimer !== null) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /** Current attempt count (for testing/logging). */
  get currentAttempt(): number {
    return this.attempt;
  }

  /** Clean up resources. */
  dispose(): void {
    this.clearCountdown();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/worker/retry-scheduler.ts packages/agent-core/src/worker/__tests__/retry-scheduler.test.ts
git commit -m "feat(agent-core): add RetryScheduler with exponential backoff

RetryScheduler encapsulates BASE=5s, MAX=60s, MAX_RETRIES=5
exponential backoff. startCountdown/clearCountdown manage a
1-second interval timer that emits remaining seconds.

逆向: amp ov.getRetryDelaySeconds, ov.startRetryCountdown (1244:1124-1165)"
```

---

### Task 3: Add retry event types to AgentEvent

**Why:** The TUI needs to display countdown information. New event types: `retry:start` (error + countdown seconds), `retry:countdown` (remaining seconds), `retry:cleared` (retry cancelled).

**Files:**
- Modify: `packages/agent-core/src/worker/events.ts`
- Modify: `packages/agent-core/src/index.ts` (export new types)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:221-229` — amp exposes `retryCountdownSeconds` as a BehaviorSubject in the `status` observable. Flitter uses discrete events instead (matching existing AgentEvent pattern).

- [ ] **Step 1: Add retry event types**

In `packages/agent-core/src/worker/events.ts`, add to the `AgentEvent` union and define the interfaces:

```typescript
// Add to AgentEvent union (after CompactionCompleteEvent):
  | RetryStartEvent
  | RetryCountdownEvent
  | RetryClearedEvent;

/** Retry countdown started (error + initial delay) */
export interface RetryStartEvent {
  type: "retry:start";
  error: Error;
  delaySeconds: number;
  attempt: number;
}

/** Retry countdown tick (remaining seconds) */
export interface RetryCountdownEvent {
  type: "retry:countdown";
  remainingSeconds: number;
}

/** Retry countdown cleared (manual retry or new message) */
export interface RetryClearedEvent {
  type: "retry:cleared";
}
```

- [ ] **Step 2: Export new types from index.ts**

In `packages/agent-core/src/index.ts`, add to the event type exports:

```typescript
export type {
  // ... existing exports ...
  RetryClearedEvent,
  RetryCountdownEvent,
  RetryStartEvent,
} from "./worker/events";
```

- [ ] **Step 3: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/worker/events.ts packages/agent-core/src/index.ts
git commit -m "feat(agent-core): add retry:start, retry:countdown, retry:cleared event types

New AgentEvent variants for TUI countdown display:
- retry:start: error info + initial delay + attempt number
- retry:countdown: remaining seconds tick
- retry:cleared: countdown cancelled

逆向: amp exposes retryCountdownSeconds via status observable (1244:221-229)"
```

---

### Task 4: Wire RetryScheduler into ThreadWorker inference loop

**Why:** This is the core wiring: catch errors from `runInference`, classify them, and either start retry countdown (retryable), surface context-limit error, or surface generic error.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts`
- Test: `packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:977-1003`:
```js
// 1. Check context limit first (non-retryable, needs compaction)
if (dO({ message: _.message })) {
  this.ephemeralError.next(_);
  return;
}
// 2. Check retryable
let m = "status" in _ && typeof _.status === "number" ? _.status : void 0;
if (vUT({ message: _.message, status: m })) {
  let b = this.getRetryDelaySeconds();
  if (b !== void 0) this.startRetryCountdown(b);
}
// 3. Always set ephemeral error
this.ephemeralError.next(_);
```

Also amp's `retry()` method (1132-1140):
```js
retry() {
  this.clearRetryCountdown();
  if (ephemeralError !== undefined) this.ephemeralErrorRetryAttempt++, ephemeralError.next(undefined);
  if (this.ops.inference) this.ops.inference.abort(), this.ops.inference = null;
  let T = this.thread.messages.at(-1);
  if (T?.role === "assistant" && (T.state.type !== "complete" || T.state.stopReason === "refusal"))
    this.updateThread({ type: "thread:truncate", fromIndex: this.thread.messages.length - 1 });
  this._inferenceState.next("idle");
  await this.runInferenceAndUpdateThread();
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts
import { describe, expect, it, mock } from "bun:test";
import type { LLMProvider, StreamDelta, StreamParams, SystemPromptBlock } from "@flitter/llm";
import { ProviderError } from "@flitter/llm";
import type { Config, Message, ThreadSnapshot } from "@flitter/schemas";
import type { AgentEvent } from "../../worker/events";
import { ThreadWorker, type ThreadWorkerOptions } from "../thread-worker";
import { ToolOrchestrator, type OrchestratorCallbacks } from "../../tools/orchestrator";
import { ToolRegistry } from "../../tools/registry";
import { BehaviorSubject } from "@flitter/util";

function makeSnapshot(msgs: Message[] = []): ThreadSnapshot {
  return {
    id: "test-retry",
    v: 1,
    title: null,
    messages: msgs,
    env: "local",
    agentMode: "normal",
    relationships: [],
  } as unknown as ThreadSnapshot;
}

function makeErrorProvider(error: Error): LLMProvider {
  return {
    name: "anthropic",
    async *stream(_params: StreamParams): AsyncGenerator<StreamDelta> {
      throw error;
    },
  } as unknown as LLMProvider;
}

function makeToolOrchestrator(): ToolOrchestrator {
  const registry = new ToolRegistry();
  const callbacks: OrchestratorCallbacks = {
    getConfig: async () => ({ settings: {}, secrets: { getToken: async () => "test" } } as Config),
    updateThread: async () => {},
    getToolRunEnvironment: async (_id, signal) => ({
      workingDirectory: "/tmp",
      signal,
      threadId: "test-retry",
      config: { settings: {}, secrets: { getToken: async () => "test" } } as Config,
    }),
    applyHookResult: async () => ({ abortOp: false }),
    applyPostHookResult: async () => {},
    updateFileChanges: async () => {},
    getDisposed$: () => new BehaviorSubject(false),
  };
  return new ToolOrchestrator("test-retry", registry, callbacks);
}

function makeWorkerOpts(overrides: Partial<ThreadWorkerOptions> = {}): ThreadWorkerOptions {
  let snapshot = makeSnapshot([
    { role: "user", content: [{ type: "text", text: "hello" }] } as unknown as Message,
  ]);
  const registry = new ToolRegistry();
  return {
    getThreadSnapshot: () => snapshot,
    updateThreadSnapshot: (s) => { snapshot = s; },
    getMessages: () => snapshot.messages,
    provider: makeErrorProvider(new ProviderError(429, "anthropic", true, "Rate limited")),
    toolOrchestrator: makeToolOrchestrator(),
    buildSystemPrompt: async () => [] as SystemPromptBlock[],
    checkAndCompact: async () => null,
    getConfig: () => ({ settings: {}, secrets: { getToken: async () => "test" } } as Config),
    toolRegistry: registry,
    ...overrides,
  };
}

describe("ThreadWorker retry integration", () => {
  it("emits retry:start on 429 error", async () => {
    const opts = makeWorkerOpts();
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeDefined();
    expect(retryStart!.type).toBe("retry:start");
    if (retryStart!.type === "retry:start") {
      expect(retryStart!.delaySeconds).toBe(5);
      expect(retryStart!.attempt).toBe(0);
    }

    worker.dispose();
  });

  it("emits inference:error for context-limit errors (not retry:start)", async () => {
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(
        new ProviderError(400, "anthropic", false, "prompt is too long, context limit reached"),
      ),
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeUndefined();

    const errorEvent = events.find((e) => e.type === "inference:error");
    expect(errorEvent).toBeDefined();

    worker.dispose();
  });

  it("does not emit retry:start for non-retryable errors", async () => {
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(new ProviderError(401, "anthropic", false, "Unauthorized")),
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeUndefined();

    const errorEvent = events.find((e) => e.type === "inference:error");
    expect(errorEvent).toBeDefined();

    worker.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`
Expected: FAIL — `retry:start` event not emitted by current ThreadWorker.

- [ ] **Step 3: Add RetryScheduler to ThreadWorker**

In `packages/agent-core/src/worker/thread-worker.ts`, add import:

```typescript
import { RetryScheduler, isRetryableError, isContextLimitError } from "./retry-scheduler";
```

Add field to the class:

```typescript
/** Retry scheduler for exponential backoff on 429/overloaded errors.
 * 逆向: ov.ephemeralErrorRetryAttempt, ov.retryCountdownSeconds, ov.retryTimer, ov.retrySession */
private readonly retryScheduler = new RetryScheduler();
```

- [ ] **Step 4: Replace the catch block in runInference**

Replace the existing catch block in `runInference()`:

```typescript
    } catch (error) {
      // 逆向: amp 1244_ThreadWorker_ov.js:977-1003
      // 1. Check abort/cancelled (not an error to surface)
      if (error instanceof Error && error.name === "AbortError") {
        this.inferenceState$.next("cancelled");
        return;
      }

      const err = error instanceof Error ? error : new Error(String(error));

      // 2. Context-limit error — surface immediately, no retry
      // 逆向: dO() check before vUT() — context limit is not retryable
      if (isContextLimitError(err)) {
        this.inferenceState$.next("idle");
        this.events$.next({ type: "inference:error", error: err });
        return;
      }

      // 3. Retryable error — start countdown
      // 逆向: vUT() check → getRetryDelaySeconds() → startRetryCountdown()
      if (isRetryableError(err)) {
        const delay = this.retryScheduler.getRetryDelaySeconds();
        if (delay !== undefined) {
          this.events$.next({
            type: "retry:start",
            error: err,
            delaySeconds: delay,
            attempt: this.retryScheduler.currentAttempt,
          });
          this.retryScheduler.startCountdown(
            delay,
            (remaining) => {
              if (remaining === undefined) {
                this.events$.next({ type: "retry:cleared" });
              } else {
                this.events$.next({ type: "retry:countdown", remainingSeconds: remaining });
              }
            },
            () => this.retry(),
          );
          this.inferenceState$.next("idle");
          return;
        }
        // Max retries exceeded — fall through to error
      }

      // 4. Non-retryable or max-retries-exceeded — surface error
      this.inferenceState$.next("idle");
      this.events$.next({ type: "inference:error", error: err });
    }
```

- [ ] **Step 5: Update the retry() method**

Replace the existing `retry()` method:

```typescript
  /**
   * 重试上次失败/取消的推理
   * 逆向: ov.retry (~1132-1140)
   *
   * Flow:
   * 1. Clear retry countdown
   * 2. Increment retry attempt counter
   * 3. Abort any active inference
   * 4. Truncate incomplete assistant message
   * 5. Set state to idle, then runInference
   */
  async retry(): Promise<void> {
    // 逆向: ov.retry — clearRetryCountdown, increment attempt, clear error
    this.retryScheduler.clearCountdown();
    this.retryScheduler.incrementAttempt();
    this.events$.next({ type: "retry:cleared" });

    const currentState = this.inferenceState$.getValue();
    if (currentState === "cancelled") {
      this.inferenceState$.next("idle");
    }

    // 逆向: ov.retry truncates incomplete assistant message
    const snapshot = this.opts.getThreadSnapshot();
    const lastMsg = snapshot.messages[snapshot.messages.length - 1];
    if (
      lastMsg?.role === "assistant" &&
      ((lastMsg as Record<string, unknown>).state as Record<string, unknown>)?.type !== "complete"
    ) {
      // Truncate the incomplete assistant message
      this.opts.updateThreadSnapshot({
        ...snapshot,
        messages: snapshot.messages.slice(0, -1),
      });
    }

    await this.runInference();
  }
```

- [ ] **Step 6: Reset retry attempts on successful inference and user message**

After `this.events$.next({ type: "inference:complete", ... })` in `runInference()`, add:

```typescript
      // 逆向: ov.resetRetryAttempts on inference:completed
      this.retryScheduler.resetAttempts();
```

- [ ] **Step 7: Clean up RetryScheduler on dispose**

In the `dispose()` method, add before `this.opts.toolOrchestrator.dispose()`:

```typescript
    this.retryScheduler.dispose();
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`
Expected: PASS

- [ ] **Step 9: Run full type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No type errors

- [ ] **Step 10: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts
git commit -m "feat(agent-core): wire RetryScheduler into ThreadWorker inference loop

On 429/overloaded errors: classify with isRetryableError → compute
exponential backoff delay → start countdown → auto-retry at 0.
Context-limit errors bypass retry (surface immediately for compaction).
retry() truncates incomplete assistant messages before re-running.
retryScheduler.resetAttempts() called on successful inference.

逆向: amp 1244_ThreadWorker_ov.js:977-1003 (error catch),
      1132-1140 (retry), 1124-1165 (countdown)"
```

---

### Task 5: Extract retry-after from ProviderError

**Why:** When providers include a Retry-After header, the scheduler should use it instead of the computed backoff delay. The Anthropic SDK exposes this; we need to extract and propagate it.

**Files:**
- Modify: `packages/llm/src/providers/anthropic/provider.ts` (extract retry-after header)
- Modify: `packages/agent-core/src/worker/thread-worker.ts` (prefer retryAfterMs from ProviderError)
- Test: `packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts` (append)

**Amp reference:** Provider errors include retry-after in their HTTP headers. The Anthropic SDK's `APIError` has a `headers` property. Amp uses the computed delay but also checks `retryAfterMs` from the provider.

- [ ] **Step 1: Write the failing test**

Append to `packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`:

```typescript
describe("ThreadWorker retry-after from provider", () => {
  it("uses retryAfterMs from ProviderError when available", async () => {
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(
        new ProviderError(429, "anthropic", true, "Rate limited", 15000), // 15s retry-after
      ),
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    const retryStart = events.find((e) => e.type === "retry:start");
    expect(retryStart).toBeDefined();
    if (retryStart?.type === "retry:start") {
      // Should use provider's 15s instead of default 5s
      expect(retryStart.delaySeconds).toBe(15);
    }

    worker.dispose();
  });
});
```

- [ ] **Step 2: Update ThreadWorker to prefer retryAfterMs**

In the retry error handler in `runInference()`, update the delay calculation:

```typescript
      if (isRetryableError(err)) {
        const computedDelay = this.retryScheduler.getRetryDelaySeconds();
        if (computedDelay !== undefined) {
          // 逆向: prefer provider's retry-after if available
          const providerDelayMs =
            err instanceof ProviderError ? err.retryAfterMs : undefined;
          const delay = providerDelayMs !== undefined
            ? Math.ceil(providerDelayMs / 1000)
            : computedDelay;
```

Add import for ProviderError at the top of thread-worker.ts:

```typescript
import { ProviderError } from "@flitter/llm";
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`
Expected: PASS

- [ ] **Step 4: Extract retry-after header in Anthropic provider**

In `packages/llm/src/providers/anthropic/provider.ts`, update the error handler to extract retry-after:

```typescript
      if (err instanceof Anthropic.APIError) {
        // Extract retry-after from headers (seconds → ms)
        const retryAfterHeader = (err.headers as Record<string, string> | undefined)?.["retry-after"];
        const retryAfterMs = retryAfterHeader
          ? Number.parseFloat(retryAfterHeader) * 1000
          : undefined;

        throw new ProviderError(
          err.status,
          "anthropic",
          err.status === 408 ||
            err.status === 409 ||
            err.status === 429 ||
            err.status === 500 ||
            err.status === 502 ||
            err.status === 503 ||
            err.status === 504 ||
            err.status === 529,
          err.message,
          Number.isNaN(retryAfterMs) ? undefined : retryAfterMs,
        );
      }
```

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/llm && bun test packages/agent-core`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/llm/src/providers/anthropic/provider.ts packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts
git commit -m "feat(llm,agent-core): extract retry-after header from Anthropic errors

AnthropicProvider now extracts Retry-After header from APIError and
passes it as retryAfterMs in ProviderError. ThreadWorker prefers
provider's retry-after over computed exponential backoff delay.

逆向: amp retry-after extraction from provider responses"
```

---

### Task 6: Add context-limit pre-flight check (C4)

**Why:** Before sending an inference request, check if the message count or estimated token count is near the context limit. If so, trigger compaction proactively instead of waiting for a server error.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts` (add pre-flight check)
- Test: `packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts` (append)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:~880-920` — amp calls `checkAndCompact` before building system prompt. The compaction check already exists in Flitter's `checkCompaction()` method; this task adds error-path compaction when a context-limit error is received.

- [ ] **Step 1: Write the failing test**

Append to `packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`:

```typescript
describe("ThreadWorker context-limit auto-compaction", () => {
  it("triggers compaction when context-limit error is detected", async () => {
    let compactionCalled = false;
    const opts = makeWorkerOpts({
      provider: makeErrorProvider(
        new ProviderError(400, "anthropic", false, "prompt is too long"),
      ),
      checkAndCompact: async (snapshot) => {
        compactionCalled = true;
        // Return compacted snapshot (remove first message)
        return { ...snapshot, messages: snapshot.messages.slice(1) };
      },
    });
    const worker = new ThreadWorker(opts);
    const events: AgentEvent[] = [];
    worker.events$.subscribe((e) => events.push(e));

    await worker.runInference();

    expect(compactionCalled).toBe(true);
    // Should have compaction events
    const compactionStart = events.find((e) => e.type === "compaction:start");
    expect(compactionStart).toBeDefined();

    worker.dispose();
  });
});
```

- [ ] **Step 2: Update context-limit error handler**

In the `runInference()` catch block, replace the context-limit section:

```typescript
      // 2. Context-limit error — attempt compaction, then re-run once
      // 逆向: dO() check — context limit is not retryable, but compaction may help
      if (isContextLimitError(err)) {
        const snapshot = this.opts.getThreadSnapshot();
        const compacted = await this.opts.checkAndCompact(snapshot);
        if (compacted) {
          this.events$.next({ type: "compaction:start" });
          this.opts.updateThreadSnapshot(compacted);
          this.events$.next({ type: "compaction:complete" });
          // Re-try after compaction (once only — don't loop)
          this.inferenceState$.next("idle");
          return;
        }
        // Compaction didn't help — surface the error
        this.inferenceState$.next("idle");
        this.events$.next({ type: "inference:error", error: err });
        return;
      }
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts`
Expected: PASS

- [ ] **Step 4: Run full test suite and type check**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/agent-core && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-worker-retry.test.ts
git commit -m "feat(agent-core): auto-compact on context-limit error

When a context-limit error is detected (prompt too long, context
window exceeded), ThreadWorker triggers checkAndCompact before
surfacing the error. If compaction succeeds, the compacted snapshot
is saved and inference can be retried.

逆向: amp dO() context-limit detection (1073_unknown_dO.js)"
```

---

### Task 7: Export RetryScheduler and run full verification

**Files:**
- Modify: `packages/agent-core/src/index.ts`

- [ ] **Step 1: Add exports**

In `packages/agent-core/src/index.ts`, add:

```typescript
export {
  isContextLimitError,
  isNetworkError,
  isOverloadedError,
  isRetryableError,
  isStreamStalledError,
  RetryScheduler,
} from "./worker/retry-scheduler";
```

- [ ] **Step 2: Run full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 3: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/flitter/tsconfig.json && bunx tsc --noEmit -p packages/llm/tsconfig.json`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/index.ts
git commit -m "feat(agent-core): export RetryScheduler and error classifiers

Public API: RetryScheduler, isRetryableError, isContextLimitError,
isOverloadedError, isNetworkError, isStreamStalledError."
```
