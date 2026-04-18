import { describe, expect, test } from "bun:test";
import { ProviderError } from "@flitter/llm";
import {
  isContextLimitError,
  isNetworkError,
  isOverloadedError,
  isRetryableError,
  isStreamStalledError,
  RetryScheduler,
} from "../retry-scheduler";

describe("error classifiers", () => {
  describe("isOverloadedError", () => {
    test("detects 'overloaded' in message", () => {
      expect(isOverloadedError({ message: "API is overloaded" })).toBe(true);
    });
    test("detects overloaded_error type", () => {
      expect(isOverloadedError({ message: "err", error: { type: "overloaded_error" } })).toBe(true);
    });
    test("rejects unrelated error", () => {
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
      test(`detects "${pattern}"`, () => {
        expect(isNetworkError({ message: `Request failed: ${pattern}` })).toBe(true);
      });
    }
  });

  describe("isStreamStalledError", () => {
    test("detects 'stream stalled'", () => {
      expect(isStreamStalledError({ message: "stream stalled after 30s" })).toBe(true);
    });
    test("detects 'no data received for'", () => {
      expect(isStreamStalledError({ message: "no data received for 60 seconds" })).toBe(true);
    });
  });

  describe("isRetryableError", () => {
    test("matches 429 ProviderError", () => {
      const err = new ProviderError(429, "anthropic", true, "Rate limited");
      expect(isRetryableError(err)).toBe(true);
    });
    test("matches 500 ProviderError", () => {
      const err = new ProviderError(500, "anthropic", true, "Server error");
      expect(isRetryableError(err)).toBe(true);
    });
    test("matches overloaded error", () => {
      expect(isRetryableError(new Error("API is overloaded right now"))).toBe(true);
    });
    test("matches network error", () => {
      expect(isRetryableError(new Error("fetch failed"))).toBe(true);
    });
    test("matches InvalidModelOutputError", () => {
      expect(isRetryableError(new Error("InvalidModelOutputError: bad response"))).toBe(true);
    });
    test("rejects auth error", () => {
      const err = new ProviderError(401, "anthropic", false, "Unauthorized");
      expect(isRetryableError(err)).toBe(false);
    });
    test("rejects random error", () => {
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
      test(`detects "${msg}"`, () => {
        expect(isContextLimitError(new Error(msg))).toBe(true);
      });
    }
    test("detects invalid_request_error with context window message", () => {
      const err = Object.assign(new Error("context window exceeded"), {
        error: { type: "invalid_request_error", message: "context window exceeded" },
      });
      expect(isContextLimitError(err)).toBe(true);
    });
    test("rejects unrelated error", () => {
      expect(isContextLimitError(new Error("tool not found"))).toBe(false);
    });
  });
});

describe("RetryScheduler", () => {
  describe("getRetryDelaySeconds", () => {
    test("returns BASE_RETRY_SECONDS on first attempt", () => {
      const scheduler = new RetryScheduler();
      expect(scheduler.getRetryDelaySeconds()).toBe(5);
    });

    test("doubles delay on each attempt (exponential backoff)", () => {
      const scheduler = new RetryScheduler();
      scheduler.incrementAttempt(); // attempt = 1
      expect(scheduler.getRetryDelaySeconds()).toBe(10);
      scheduler.incrementAttempt(); // attempt = 2
      expect(scheduler.getRetryDelaySeconds()).toBe(20);
      scheduler.incrementAttempt(); // attempt = 3
      expect(scheduler.getRetryDelaySeconds()).toBe(40);
    });

    test("caps at MAX_RETRY_SECONDS (60)", () => {
      const scheduler = new RetryScheduler();
      for (let i = 0; i < 4; i++) scheduler.incrementAttempt();
      // attempt = 4, delay = 5 * 2^4 = 80, capped to 60
      expect(scheduler.getRetryDelaySeconds()).toBe(60);
    });

    test("returns undefined after MAX_AUTO_RETRIES (5)", () => {
      const scheduler = new RetryScheduler();
      for (let i = 0; i < 5; i++) scheduler.incrementAttempt();
      // attempt = 5 >= MAX_AUTO_RETRIES
      expect(scheduler.getRetryDelaySeconds()).toBeUndefined();
    });
  });

  describe("resetAttempts", () => {
    test("resets attempt counter to 0", () => {
      const scheduler = new RetryScheduler();
      scheduler.incrementAttempt();
      scheduler.incrementAttempt();
      scheduler.resetAttempts();
      expect(scheduler.getRetryDelaySeconds()).toBe(5);
    });
  });

  describe("countdown", () => {
    test("starts countdown and emits seconds via callback", async () => {
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

    test("clearCountdown stops the timer", () => {
      const scheduler = new RetryScheduler();
      const ticks: (number | undefined)[] = [];
      const onTick = (s: number | undefined) => ticks.push(s);

      scheduler.startCountdown(10, onTick, async () => {});
      scheduler.clearCountdown();

      // The last tick should be undefined (cleared)
      expect(ticks[ticks.length - 1]).toBeUndefined();
    });

    test("startCountdown clears previous countdown", () => {
      const scheduler = new RetryScheduler();
      const ticks1: (number | undefined)[] = [];
      const ticks2: (number | undefined)[] = [];

      scheduler.startCountdown(
        10,
        (s) => ticks1.push(s),
        async () => {},
      );
      scheduler.startCountdown(
        5,
        (s) => ticks2.push(s),
        async () => {},
      );

      // First countdown should have been cleared (last tick = undefined)
      expect(ticks1[ticks1.length - 1]).toBeUndefined();
      expect(ticks2[0]).toBe(5);

      scheduler.clearCountdown();
    });
  });

  describe("dispose", () => {
    test("clears countdown on dispose", () => {
      const scheduler = new RetryScheduler();
      scheduler.startCountdown(
        60,
        () => {},
        async () => {},
      );
      scheduler.dispose();
      // Should not throw or leak timers
    });
  });
});
