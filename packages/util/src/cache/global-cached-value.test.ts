/**
 * Tests for GlobalCachedValue — cached async value with soft/hard TTL.
 * 逆向: amp-cli-reversed/modules/1271_GlobalCachedValue_d5T.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GlobalCachedValue } from "./global-cached-value";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("GlobalCachedValue", () => {
  it("should compute value on first get()", async () => {
    const cache = new GlobalCachedValue({
      compute: async () => 42,
      softTTL: 1000,
      hardTTL: 5000,
    });
    const result = await cache.get();
    assert.equal(result, 42);
  });

  it("should return cached value within softTTL", async () => {
    let computeCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        computeCount++;
        return computeCount;
      },
      softTTL: 500,
      hardTTL: 1000,
    });
    const first = await cache.get();
    assert.equal(first, 1);
    // Immediately get again — should return cached
    const second = await cache.get();
    assert.equal(second, 1);
    assert.equal(computeCount, 1);
  });

  it("should trigger background recompute past softTTL", async () => {
    let computeCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        computeCount++;
        return computeCount * 10;
      },
      softTTL: 50,
      hardTTL: 5000,
    });
    await cache.get(); // first compute
    assert.equal(computeCount, 1);

    await delay(80); // past softTTL

    // This get should return stale value but trigger background recompute
    const stale = await cache.get();
    assert.equal(stale, 10); // still old value

    // Wait for background recompute to finish
    await delay(50);
    const fresh = cache.getCached();
    assert.equal(fresh, 20); // new value from background
    assert.ok(computeCount >= 2);
  });

  it("should block on recompute past hardTTL", async () => {
    let computeCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        computeCount++;
        return computeCount * 100;
      },
      softTTL: 20,
      hardTTL: 50,
    });
    await cache.get();
    assert.equal(computeCount, 1);

    await delay(80); // past hardTTL

    const result = await cache.get();
    assert.equal(result, 200); // blocked on recompute
    assert.equal(computeCount, 2);
  });

  it("should recompute on error", async () => {
    let callCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        callCount++;
        if (callCount === 1) throw new Error("fail");
        return "ok";
      },
      softTTL: 1000,
      hardTTL: 5000,
    });

    const result1 = await cache.get().catch((e: Error) => e.message);
    assert.equal(result1, "fail");

    // After error, next get() should recompute
    const result = await cache.get();
    assert.equal(result, "ok");
    assert.equal(callCount, 2);
  });

  it("should deduplicate concurrent recomputations", async () => {
    let computeCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        computeCount++;
        await delay(50);
        return computeCount;
      },
      softTTL: 1000,
      hardTTL: 5000,
    });

    // Concurrent gets
    const [a, b, c] = await Promise.all([cache.get(), cache.get(), cache.get()]);
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(c, 1);
    assert.equal(computeCount, 1);
  });

  it("should return undefined from getCached() before first compute", () => {
    const cache = new GlobalCachedValue({
      compute: async () => 42,
      softTTL: 1000,
      hardTTL: 5000,
    });
    assert.equal(cache.getCached(), undefined);
  });

  it("should return value from getCached() after compute", async () => {
    const cache = new GlobalCachedValue({
      compute: async () => 42,
      softTTL: 1000,
      hardTTL: 5000,
    });
    await cache.get();
    assert.equal(cache.getCached(), 42);
  });

  it("should invalidate and recompute on next get", async () => {
    let computeCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        computeCount++;
        return computeCount;
      },
      softTTL: 10000,
      hardTTL: 50000,
    });
    await cache.get();
    assert.equal(computeCount, 1);

    cache.invalidate();

    const result = await cache.get();
    assert.equal(result, 2);
    assert.equal(computeCount, 2);
  });

  it("should emit change events", async () => {
    const events: unknown[] = [];
    const cache = new GlobalCachedValue({
      compute: async () => 42,
      softTTL: 1000,
      hardTTL: 5000,
      changes: (oldVal, newVal) => {
        return { old: oldVal, new: newVal };
      },
    });

    cache.onChange((e) => events.push(e));
    await cache.get();

    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { old: undefined, new: 42 });
  });

  it("should emit change event on error transition", async () => {
    const events: unknown[] = [];
    let shouldFail = false;
    const cache = new GlobalCachedValue({
      compute: async () => {
        if (shouldFail) throw new Error("boom");
        return 42;
      },
      softTTL: 1000,
      hardTTL: 5000,
      changes: (oldVal, newVal) => ({ old: oldVal, new: newVal }),
    });

    cache.onChange((e) => events.push(e));
    await cache.get(); // success
    assert.equal(events.length, 1);

    shouldFail = true;
    cache.invalidate();
    // invalidate() clears value, so old in performRecomputation will be undefined
    const errResult = await cache.get().catch((e: Error) => e.message);
    assert.equal(errResult, "boom");
    assert.equal(events.length, 2);
    // After invalidate, the stored value is already undefined, so old is undefined
    assert.deepEqual(events[1], { old: undefined, new: undefined });
  });

  it("should not emit if changes returns undefined", async () => {
    const events: unknown[] = [];
    const cache = new GlobalCachedValue({
      compute: async () => 42,
      softTTL: 1000,
      hardTTL: 5000,
      changes: () => undefined,
    });

    cache.onChange((e) => events.push(e));
    await cache.get();
    assert.equal(events.length, 0);
  });

  it("should throw after dispose", async () => {
    const cache = new GlobalCachedValue({
      compute: async () => 42,
      softTTL: 1000,
      hardTTL: 5000,
    });
    cache.dispose();
    const errResult = await cache.get().catch((e: Error) => e.message);
    assert.equal(errResult, "GlobalCachedValue is disposed");
  });

  it("refresh() should force recomputation", async () => {
    let computeCount = 0;
    const cache = new GlobalCachedValue({
      compute: async () => {
        computeCount++;
        return computeCount;
      },
      softTTL: 10000,
      hardTTL: 50000,
    });
    await cache.get();
    assert.equal(computeCount, 1);

    const result = await cache.refresh();
    assert.equal(result, 2);
    assert.equal(computeCount, 2);
  });
});
