/**
 * Stream idle timeout wrapper.
 *
 * 逆向: amp-cli-reversed/chunk-LXZZ5T6B.js:1-40 (C4R)
 *   Amp wraps every provider stream with a 120-second idle timeout.
 *   If no chunk arrives within the window, throws StreamIdleTimeoutError
 *   which is classified as retryable by the retry scheduler.
 *
 * Additionally, amp's consumer (EUT in chunk-002.js:11480) logs a warning
 * when the gap between chunks exceeds 30 seconds. We embed this warning
 * callback in the wrapper for simplicity.
 */

/** Default idle timeout: 120 seconds (matches amp's C4R default) */
export const STREAM_IDLE_TIMEOUT_MS = 120_000;

/** Threshold for logging a warning about inter-chunk gaps */
export const STREAM_GAP_WARN_MS = 30_000;

/**
 * Error thrown when a stream stalls (no data received for `timeoutMs`).
 * Classified as retryable by RetryScheduler — the model fallback chain
 * will attempt with the same or next provider.
 */
export class StreamIdleTimeoutError extends Error {
  override readonly name = "StreamIdleTimeoutError";
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Stream stalled: no data received for ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

export interface StreamIdleTimeoutOptions {
  /** Idle timeout in milliseconds. Default: 120000 */
  timeoutMs?: number;
  /** Called when inter-chunk gap exceeds STREAM_GAP_WARN_MS (30s) */
  onGapWarning?: (gapMs: number) => void;
}

/**
 * Wraps an async iterable with a per-chunk idle timeout.
 *
 * Each time a chunk arrives, the timeout resets. If the timeout fires
 * before the next chunk, the generator throws StreamIdleTimeoutError
 * and the underlying stream is returned (cleaned up).
 *
 * 逆向: C4R uses Promise.race([iterator.next(), new Promise((_, reject) => setTimeout(reject, R))])
 *
 * Implementation note: we must clear the setTimeout on each successful
 * chunk to prevent timer leaks, and use a sentinel approach so the race
 * loser doesn't hold the process alive.
 */
export async function* withStreamIdleTimeout<T>(
  stream: AsyncIterable<T>,
  options?: StreamIdleTimeoutOptions,
): AsyncGenerator<T> {
  const timeoutMs = options?.timeoutMs ?? STREAM_IDLE_TIMEOUT_MS;
  const onGapWarning = options?.onGapWarning;

  const iterator = stream[Symbol.asyncIterator]();
  let lastChunkTime = Date.now();
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    while (!done) {
      // Create a timeout promise that we can cancel
      let _rejectTimeout: ((err: Error) => void) | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        _rejectTimeout = reject;
        timer = setTimeout(() => {
          reject(new StreamIdleTimeoutError(timeoutMs));
        }, timeoutMs);
      });

      try {
        const result = await Promise.race([iterator.next(), timeoutPromise]);

        // Chunk arrived — clear the timeout so it doesn't leak
        clearTimeout(timer);
        timer = undefined;

        if (result.done) {
          done = true;
          break;
        }

        // Check for gap warning
        const now = Date.now();
        const gap = now - lastChunkTime;
        if (gap > STREAM_GAP_WARN_MS && onGapWarning) {
          onGapWarning(gap);
        }
        lastChunkTime = now;

        yield result.value;
      } catch (err) {
        // Clear the timer in case the error came from something else
        clearTimeout(timer);
        timer = undefined;
        throw err;
      }
    }
  } finally {
    // Clear any lingering timer
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    // Clean up the underlying iterator if we exit early (timeout or consumer break)
    if (!done && iterator.return) {
      // Don't await — the iterator may be stuck. Fire-and-forget cleanup.
      iterator.return(undefined).catch(() => {});
    }
  }
}
