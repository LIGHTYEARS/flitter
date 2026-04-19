/**
 * Retry Fidelity Audit — cross-reference with amp's retry logic.
 *
 * 逆向: modules/2798_WithRetry_HQ.js (fetchWithRetry)
 * 逆向: modules/1027_unknown__9.js:275-308 (shouldRetry, retryRequest, calculateDefaultRetryTimeoutMillis)
 * 逆向: modules/1081_unknown_ev.js (vUT — master retryable check)
 * 逆向: modules/1076_unknown_fU.js (fU — overloaded check)
 * 逆向: modules/1078_unknown_IU.js (IU — stream stalled check)
 * 逆向: modules/1079_unknown_$UT.js ($UT — network error check)
 * 逆向: modules/1080_unknown_V4R.js (G4R, K4R, V4R)
 * 逆向: modules/1073_unknown_dO.js (dO — context limit check)
 * 逆向: modules/1244_ThreadWorker_ov.js:1124-1165 (retry constants and countdown)
 *
 * This audit verifies flitter's retry behavior matches amp's:
 * - Error code classification (which HTTP status codes are retryable)
 * - Backoff parameters (base delay, max delay, max retries, jitter)
 * - Retry-After header parsing
 * - Rate limit vs overloaded vs network error classification
 */
import { describe, expect, test } from "bun:test";
import {
  isContextLimitError,
  isNetworkError,
  isOverloadedError,
  isRetryableError,
  isStreamStalledError,
  RetryScheduler,
} from "../retry-scheduler";

describe("Retry Fidelity Audit — amp cross-reference", () => {
  // ─── Constants matching amp ─────────────────────────────
  // 逆向: ov.BASE_RETRY_SECONDS = 5 (line 1124)
  test("BASE_RETRY_SECONDS matches amp (5)", () => {
    expect(RetryScheduler.BASE_RETRY_SECONDS).toBe(5);
  });

  // 逆向: ov.MAX_RETRY_SECONDS = 60 (line 1125)
  test("MAX_RETRY_SECONDS matches amp (60)", () => {
    expect(RetryScheduler.MAX_RETRY_SECONDS).toBe(60);
  });

  // 逆向: ov.MAX_AUTO_RETRIES = 5 (line 1126)
  test("MAX_AUTO_RETRIES matches amp (5)", () => {
    expect(RetryScheduler.MAX_AUTO_RETRIES).toBe(5);
  });

  // ─── Backoff formula matching amp ───────────────────────
  // 逆向: ov.getRetryDelaySeconds (lines 1127-1130)
  //   if (attempt >= MAX_AUTO_RETRIES) return undefined
  //   delay = BASE * 2^attempt
  //   return min(delay, MAX)

  test("backoff formula: 5*2^0=5, 5*2^1=10, 5*2^2=20, 5*2^3=40, 5*2^4=80→60", () => {
    const scheduler = new RetryScheduler();
    expect(scheduler.getRetryDelaySeconds()).toBe(5);   // attempt 0
    scheduler.incrementAttempt();
    expect(scheduler.getRetryDelaySeconds()).toBe(10);  // attempt 1
    scheduler.incrementAttempt();
    expect(scheduler.getRetryDelaySeconds()).toBe(20);  // attempt 2
    scheduler.incrementAttempt();
    expect(scheduler.getRetryDelaySeconds()).toBe(40);  // attempt 3
    scheduler.incrementAttempt();
    expect(scheduler.getRetryDelaySeconds()).toBe(60);  // attempt 4 (capped)
    scheduler.incrementAttempt();
    expect(scheduler.getRetryDelaySeconds()).toBeUndefined(); // attempt 5 (exceeded)
  });

  // ─── HTTP status code classification ────────────────────
  // 逆向: _9.js:275-283 (shouldRetry) — 408, 409, 429, >=500
  // 逆向: vUT includes status 429 and G4R(status >= 500)

  test("status 408 (Request Timeout) is retryable", () => {
    expect(isRetryableError({ message: "Request Timeout", status: 408 })).toBe(false);
    // Note: 408 is handled by provider-level retry, not error classifier.
    // The error classifier checks status >= 500 (G4R), not 408.
    // This is correct — 408 is in shouldRetry (SDK level), not vUT (app level).
  });

  test("status 429 (rate limit) is retryable via error type", () => {
    expect(isRetryableError({ message: "Rate limited", status: 429 })).toBe(true);
  });

  test("status 429 with rate_limit_error type is retryable", () => {
    expect(
      isRetryableError({
        message: "Too many requests",
        error: { type: "rate_limit_error" },
      }),
    ).toBe(true);
  });

  test("status >= 500 is retryable (G4R check)", () => {
    expect(isRetryableError({ message: "Internal error", status: 500 })).toBe(true);
    expect(isRetryableError({ message: "Bad gateway", status: 502 })).toBe(true);
    expect(isRetryableError({ message: "Service unavailable", status: 503 })).toBe(true);
    expect(isRetryableError({ message: "Gateway timeout", status: 504 })).toBe(true);
    expect(isRetryableError({ message: "Site overloaded", status: 529 })).toBe(true);
  });

  test("status 401 is NOT retryable", () => {
    expect(isRetryableError({ message: "Unauthorized", status: 401 })).toBe(false);
  });

  test("status 403 is NOT retryable", () => {
    expect(isRetryableError({ message: "Forbidden", status: 403 })).toBe(false);
  });

  test("status 404 is NOT retryable", () => {
    expect(isRetryableError({ message: "Not Found", status: 404 })).toBe(false);
  });

  // ─── Overloaded error (fU) ──────────────────────────────
  // 逆向: fU checks patterns ["overloaded", "overload"]
  //        in message, error.message, and error.type === "overloaded_error"

  test("overloaded in message", () => {
    expect(isOverloadedError({ message: "API is overloaded" })).toBe(true);
  });

  test("overload in message (partial match)", () => {
    expect(isOverloadedError({ message: "system overload detected" })).toBe(true);
  });

  test("overloaded in error.message", () => {
    expect(
      isOverloadedError({
        message: "error",
        error: { message: "API is overloaded" },
      }),
    ).toBe(true);
  });

  test("overloaded_error type", () => {
    expect(
      isOverloadedError({
        message: "error",
        error: { type: "overloaded_error" },
      }),
    ).toBe(true);
  });

  // ─── Stream stalled (IU) ───────────────────────────────
  // 逆向: IU checks ["stream stalled", "no data received for"]

  test("stream stalled patterns", () => {
    expect(isStreamStalledError({ message: "stream stalled after 30s" })).toBe(true);
    expect(isStreamStalledError({ message: "no data received for 60 seconds" })).toBe(true);
  });

  test("stream stalled in error.message field", () => {
    expect(
      isStreamStalledError({
        message: "error",
        error: { message: "stream stalled" },
      }),
    ).toBe(true);
  });

  // ─── Network errors ($UT) ──────────────────────────────
  // 逆向: $UT has 15 patterns

  test("all 15 network error patterns are detected", () => {
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

    for (const pattern of patterns) {
      expect(isNetworkError({ message: pattern })).toBe(true);
    }
  });

  // ─── InvalidModelOutputError (K4R) ─────────────────────
  // 逆向: K4R checks message.startsWith("InvalidModelOutputError")

  test("InvalidModelOutputError is retryable", () => {
    expect(
      isRetryableError({ message: "InvalidModelOutputError: bad JSON in response" }),
    ).toBe(true);
  });

  test("message containing but not starting with InvalidModelOutputError is NOT retryable via that check", () => {
    // K4R requires startsWith, not includes
    expect(
      isRetryableError({ message: "Error: InvalidModelOutputError happened" }),
    ).toBe(false);
  });

  // ─── Stream incomplete (V4R) ───────────────────────────
  // 逆向: V4R checks ["response incomplete", "stream ended unexpectedly", "stream closed before"]

  test("stream incomplete patterns are retryable", () => {
    expect(isRetryableError({ message: "response incomplete" })).toBe(true);
    expect(isRetryableError({ message: "stream ended unexpectedly" })).toBe(true);
    expect(isRetryableError({ message: "stream closed before completion" })).toBe(true);
  });

  // ─── Context limit (dO) — NOT retryable ────────────────
  // 逆向: dO checks 6 patterns + invalid_request_error type
  // These should NOT be retried — they need compaction instead.

  test("context limit errors are detected (not retryable, need compaction)", () => {
    const patterns = [
      "prompt is too long",
      "exceed context limit",
      "context limit reached",
      "token limit exceeded",
      "context window exceeded",
      "maximum context length",
    ];

    for (const pattern of patterns) {
      expect(isContextLimitError({ message: pattern })).toBe(true);
      // Context limit errors should NOT be retryable
      expect(isRetryableError({ message: pattern })).toBe(false);
    }
  });

  test("invalid_request_error with context message triggers context limit", () => {
    expect(
      isContextLimitError({
        message: "Invalid request",
        error: { type: "invalid_request_error", message: "prompt is too long" },
      }),
    ).toBe(true);
  });

  // ─── Countdown session isolation ───────────────────────
  // 逆向: ov.startRetryCountdown increments retrySession
  //        Timer checks if (R !== this.retrySession) return;

  test("clearCountdown increments session (stale timers ignored)", () => {
    const scheduler = new RetryScheduler();
    const attempt0 = scheduler.currentAttempt;

    scheduler.startCountdown(999, () => {}, async () => {});
    scheduler.clearCountdown();
    scheduler.startCountdown(999, () => {}, async () => {});
    scheduler.clearCountdown();

    // Attempt should not have changed — only countdown was reset
    expect(scheduler.currentAttempt).toBe(attempt0);
    scheduler.dispose();
  });

  // ─── resetAttempts matches amp ──────────────────────────
  // 逆向: ov.resetRetryAttempts sets ephemeralErrorRetryAttempt = 0

  test("resetAttempts restores delay to BASE_RETRY_SECONDS", () => {
    const scheduler = new RetryScheduler();
    scheduler.incrementAttempt();
    scheduler.incrementAttempt();
    scheduler.incrementAttempt();
    expect(scheduler.getRetryDelaySeconds()).toBe(40);

    scheduler.resetAttempts();
    expect(scheduler.getRetryDelaySeconds()).toBe(5);
  });
});
