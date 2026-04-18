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
              type:
                typeof (e.error as Record<string, unknown>).type === "string"
                  ? ((e.error as Record<string, unknown>).type as string)
                  : undefined,
              message:
                typeof (e.error as Record<string, unknown>).message === "string"
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
 * 逆向: $UT — 15 network error patterns
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
  /** Last registered onTick callback — used by clearCountdown to emit undefined. */
  private currentOnTick: ((s: number | undefined) => void) | null = null;

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
    this.currentOnTick = onTick;
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
   * sets retryCountdownSeconds to undefined (emits undefined to last onTick).
   */
  clearCountdown(): void {
    this.retrySession++;
    if (this.retryTimer !== null) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    // 逆向: ov.clearRetryCountdown calls retryCountdownSeconds.next(undefined)
    if (this.currentOnTick !== null) {
      const cb = this.currentOnTick;
      this.currentOnTick = null;
      cb(undefined);
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
