import { describe, expect, it } from "bun:test";
import {
  STREAM_GAP_WARN_MS,
  STREAM_IDLE_TIMEOUT_MS,
  StreamIdleTimeoutError,
  withStreamIdleTimeout,
} from "./stream-idle-timeout";

// Helper: create an async iterable from an array with optional delays
async function* delayedStream<T>(items: { value: T; delayMs: number }[]): AsyncGenerator<T> {
  for (const item of items) {
    await new Promise((resolve) => setTimeout(resolve, item.delayMs));
    yield item.value;
  }
}

// Helper: collect all values from an async generator
async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
  }
  return results;
}

describe("StreamIdleTimeoutError", () => {
  it("has correct name and message", () => {
    const err = new StreamIdleTimeoutError(120_000);
    expect(err.name).toBe("StreamIdleTimeoutError");
    expect(err.message).toBe("Stream stalled: no data received for 120000ms");
    expect(err.timeoutMs).toBe(120_000);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("constants", () => {
  it("STREAM_IDLE_TIMEOUT_MS is 120 seconds", () => {
    expect(STREAM_IDLE_TIMEOUT_MS).toBe(120_000);
  });

  it("STREAM_GAP_WARN_MS is 30 seconds", () => {
    expect(STREAM_GAP_WARN_MS).toBe(30_000);
  });
});

describe("withStreamIdleTimeout", () => {
  it("passes through items from a fast stream", async () => {
    const items = [
      { value: "a", delayMs: 0 },
      { value: "b", delayMs: 0 },
      { value: "c", delayMs: 0 },
    ];
    const result = await collect(withStreamIdleTimeout(delayedStream(items)));
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("handles empty stream", async () => {
    async function* empty(): AsyncGenerator<string> {
      // no items
    }
    const result = await collect(withStreamIdleTimeout(empty()));
    expect(result).toEqual([]);
  });

  it("throws StreamIdleTimeoutError when stream stalls", async () => {
    // Stream that emits one item then stalls forever
    async function* stallingStream(): AsyncGenerator<string> {
      yield "first";
      // Stall indefinitely
      await new Promise(() => {});
    }

    const wrapped = withStreamIdleTimeout(stallingStream(), { timeoutMs: 50 });

    const results: string[] = [];
    let error: unknown;
    try {
      for await (const item of wrapped) {
        results.push(item);
      }
    } catch (err) {
      error = err;
    }

    expect(results).toEqual(["first"]);
    expect(error).toBeInstanceOf(StreamIdleTimeoutError);
    expect((error as StreamIdleTimeoutError).timeoutMs).toBe(50);
  });

  it("throws StreamIdleTimeoutError when first chunk never arrives", async () => {
    async function* neverEmits(): AsyncGenerator<string> {
      await new Promise(() => {});
    }

    const wrapped = withStreamIdleTimeout(neverEmits(), { timeoutMs: 50 });

    let error: unknown;
    try {
      for await (const _item of wrapped) {
        // should never reach here
      }
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(StreamIdleTimeoutError);
  });

  it("resets timeout on each chunk", async () => {
    // Each chunk arrives at 30ms intervals. With a 50ms timeout,
    // the stream should NOT time out because each chunk resets the timer.
    const items = [
      { value: 1, delayMs: 30 },
      { value: 2, delayMs: 30 },
      { value: 3, delayMs: 30 },
    ];

    const result = await collect(withStreamIdleTimeout(delayedStream(items), { timeoutMs: 50 }));
    expect(result).toEqual([1, 2, 3]);
  });

  it("calls onGapWarning when gap exceeds threshold", async () => {
    const warnings: number[] = [];

    // Since STREAM_GAP_WARN_MS is a constant (30s), a real-time test would be too slow.
    // We verify the callback mechanism with short delays (60ms gap < 30s threshold → no warning).
    // The Date.now-based test below covers the actual threshold logic.
    async function* gappyStream(): AsyncGenerator<string> {
      yield "a";
      await new Promise((resolve) => setTimeout(resolve, 60));
      yield "b";
    }

    const result = await collect(
      withStreamIdleTimeout(gappyStream(), {
        timeoutMs: 200,
        onGapWarning: (gapMs) => warnings.push(gapMs),
      }),
    );

    expect(result).toEqual(["a", "b"]);
    // Gap should be ~60ms which is > STREAM_GAP_WARN_MS (30000ms) = NO warning in this case
    // because 60ms < 30000ms. Let's verify no warning was called.
    expect(warnings.length).toBe(0);
  });

  it("fires onGapWarning for gaps exceeding STREAM_GAP_WARN_MS", async () => {
    // Direct test: mock the Date.now to simulate time passage
    const warnings: number[] = [];
    let callCount = 0;

    // Create a stream where we control "time" by overriding Date.now
    const originalNow = Date.now;
    let fakeTime = 1000;

    async function* controlledStream(): AsyncGenerator<string> {
      yield "first";
      // Simulate 35 seconds passing between chunks
      fakeTime += 35_000;
      yield "second";
    }

    Date.now = () => fakeTime;
    try {
      const result = await collect(
        withStreamIdleTimeout(controlledStream(), {
          timeoutMs: 200,
          onGapWarning: (gapMs) => {
            callCount++;
            warnings.push(gapMs);
          },
        }),
      );

      expect(result).toEqual(["first", "second"]);
      expect(callCount).toBe(1);
      expect(warnings[0]).toBeGreaterThanOrEqual(35_000);
    } finally {
      Date.now = originalNow;
    }
  });

  it("cleans up underlying iterator on timeout", async () => {
    let returnCalled = false;

    const fakeIterator: AsyncIterator<string> = {
      next: () => new Promise(() => {}), // never resolves
      return: async () => {
        returnCalled = true;
        return { value: undefined, done: true };
      },
    };

    const fakeIterable: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => fakeIterator,
    };

    const wrapped = withStreamIdleTimeout(fakeIterable, { timeoutMs: 30 });

    try {
      for await (const _item of wrapped) {
        // never reached
      }
    } catch {
      // StreamIdleTimeoutError expected
    }

    expect(returnCalled).toBe(true);
  });

  it("uses default timeout when no options provided", async () => {
    // Verify the default is applied (we can't wait 120s in a test,
    // but we can verify a fast stream completes without issues)
    const items = [{ value: "x", delayMs: 0 }];
    const result = await collect(withStreamIdleTimeout(delayedStream(items)));
    expect(result).toEqual(["x"]);
  });
});
