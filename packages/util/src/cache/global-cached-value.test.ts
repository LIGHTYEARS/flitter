/**
 * Tests for GlobalCachedValue — soft/hard TTL cache with background recomputation
 *
 * Cross-references: amp-cli-reversed/modules/1271_GlobalCachedValue_d5T.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GlobalCachedValue } from "./global-cached-value";

describe("GlobalCachedValue", () => {
  describe("basic get/getCached", () => {
    it("should compute value on first get()", async () => {
      let computeCount = 0;
      const cache = new GlobalCachedValue({
        softTTL: 1000,
        hardTTL: 5000,
        compute: async () => {
          computeCount++;
          return 42;
        },
        changes: () => undefined,
      });

      const result = await cache.get();
      assert.equal(result, 42);
      assert.equal(computeCount, 1);
    });

    it("should return undefined from getCached() before first computation", () => {
      const cache = new GlobalCachedValue({
        softTTL: 1000,
        hardTTL: 5000,
        compute: async () => 42,
        changes: () => undefined,
      });

      assert.equal(cache.getCached(), undefined);
    });

    it("should return cached value from getCached() after computation", async () => {
      const cache = new GlobalCachedValue({
        softTTL: 1000,
        hardTTL: 5000,
        compute: async () => "hello",
        changes: () => undefined,
      });

      await cache.get();
      assert.equal(cache.getCached(), "hello");
    });
  });

  describe("TTL behavior", () => {
    it("should return cached value within soft TTL without recomputing", async () => {
      let computeCount = 0;
      const cache = new GlobalCachedValue({
        softTTL: 10_000,
        hardTTL: 50_000,
        compute: async () => {
          computeCount++;
          return computeCount;
        },
        changes: () => undefined,
      });

      const v1 = await cache.get();
      assert.equal(v1, 1);
      assert.equal(computeCount, 1);

      // Still within soft TTL — should return cached
      const v2 = await cache.get();
      assert.equal(v2, 1);
      assert.equal(computeCount, 1);
    });

    it("should trigger background recompute when soft TTL expired", async () => {
      let computeCount = 0;
      let resolveCompute: (() => void) | undefined;
      const cache = new GlobalCachedValue({
        softTTL: 0, // soft TTL already expired
        hardTTL: 999_999, // hard TTL not expired
        compute: async () => {
          computeCount++;
          if (computeCount > 1) {
            // Second compute blocks until we resolve
            await new Promise<void>((r) => {
              resolveCompute = r;
            });
          }
          return computeCount;
        },
        changes: () => undefined,
      });

      // First get - computes
      const v1 = await cache.get();
      assert.equal(v1, 1);

      // Second get - soft TTL expired, triggers background recompute, returns stale
      const v2 = await cache.get();
      assert.equal(v2, 1); // Still returns stale value
      assert.equal(computeCount, 2); // But compute was started

      // Let background compute finish
      resolveCompute?.();
      await new Promise((r) => setTimeout(r, 10));

      // Now should return the fresh value
      // Need another get to see the updated value
      const v3 = await cache.get();
      // computeCount should be 2 still (soft TTL = 0 would trigger another,
      // but there's a pending recompute dedup)
      assert.ok(v3 >= 2);
    });

    it("should block on get() when hard TTL expired", async () => {
      let computeCount = 0;
      const cache = new GlobalCachedValue({
        softTTL: 0,
        hardTTL: 0, // Hard TTL immediately expired
        compute: async () => {
          computeCount++;
          return computeCount * 10;
        },
        changes: () => undefined,
      });

      // First get computes
      const v1 = await cache.get();
      assert.equal(v1, 10);

      // Hard TTL expired → should recompute and block
      const v2 = await cache.get();
      assert.equal(v2, 20);
      assert.equal(computeCount, 2);
    });
  });

  describe("recompute deduplication", () => {
    it("should not start multiple concurrent computations", async () => {
      let computeCount = 0;
      let resolveCompute: (() => void) | undefined;

      const cache = new GlobalCachedValue({
        softTTL: 1000,
        hardTTL: 5000,
        compute: async () => {
          computeCount++;
          await new Promise<void>((r) => {
            resolveCompute = r;
          });
          return computeCount;
        },
        changes: () => undefined,
      });

      // Start two concurrent get() calls
      const p1 = cache.get();
      const p2 = cache.get();

      // Only one compute should have started
      assert.equal(computeCount, 1);

      resolveCompute?.();
      const [v1, v2] = await Promise.all([p1, p2]);
      assert.equal(v1, v2);
      assert.equal(computeCount, 1);
    });

    it("should deduplicate refresh() calls", async () => {
      let computeCount = 0;
      let resolveCompute: (() => void) | undefined;

      const cache = new GlobalCachedValue({
        softTTL: 999_999,
        hardTTL: 999_999,
        compute: async () => {
          computeCount++;
          await new Promise<void>((r) => {
            resolveCompute = r;
          });
          return computeCount;
        },
        changes: () => undefined,
      });

      const p1 = cache.refresh();
      const p2 = cache.refresh();

      assert.equal(computeCount, 1);
      resolveCompute?.();
      await Promise.all([p1, p2]);
      assert.equal(computeCount, 1);
    });
  });

  describe("error handling", () => {
    it("should set lastError and clear value on computation failure", async () => {
      let shouldFail = false;

      const cache = new GlobalCachedValue({
        softTTL: 999_999,
        hardTTL: 999_999,
        compute: async () => {
          if (shouldFail) throw new Error("compute failed");
          return "ok";
        },
        changes: () => undefined,
      });

      // First compute succeeds
      const v1 = await cache.get();
      assert.equal(v1, "ok");
      assert.equal(cache.getCached(), "ok");

      // Second compute fails
      shouldFail = true;
      try {
        await cache.refresh();
        assert.fail("should have thrown");
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.match(err.message, /compute failed/);
      }

      // Value should be cleared
      assert.equal(cache.getCached(), undefined);
    });

    it("should recompute on next get() after error (regardless of TTL)", async () => {
      let callCount = 0;

      const cache = new GlobalCachedValue({
        softTTL: 999_999,
        hardTTL: 999_999,
        compute: async () => {
          callCount++;
          if (callCount === 1) throw new Error("first fail");
          return "recovered";
        },
        changes: () => undefined,
      });

      // First compute fails
      try {
        await cache.get();
        assert.fail("should have thrown");
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.match(err.message, /first fail/);
      }

      // Even though TTLs are huge, the error forces a recompute
      const v2 = await cache.get();
      assert.equal(v2, "recovered");
      assert.equal(callCount, 2);
    });

    it("should convert non-Error throws to Error", async () => {
      const cache = new GlobalCachedValue({
        softTTL: 0,
        hardTTL: 0,
        compute: async () => {
          throw "string error";
        },
        changes: () => undefined,
      });

      try {
        await cache.get();
        assert.fail("should have thrown");
      } catch (err) {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("string error"));
      }
    });
  });

  describe("change events", () => {
    it("should emit change events via eventsSubject", async () => {
      const events: Array<{ old: number | undefined; new: number | undefined }> = [];

      const cache = new GlobalCachedValue<
        number,
        { old: number | undefined; new: number | undefined }
      >({
        softTTL: 0,
        hardTTL: 0,
        compute: async () => events.length + 1,
        changes: (oldVal, newVal) => ({ old: oldVal, new: newVal }),
      });

      cache.events.subscribe((evt) => events.push(evt));

      await cache.get();
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { old: undefined, new: 1 });

      await cache.get();
      assert.equal(events.length, 2);
      assert.deepEqual(events[1], { old: 1, new: 2 });
    });

    it("should suppress event when changes() returns undefined", async () => {
      const events: string[] = [];

      const cache = new GlobalCachedValue<number, string>({
        softTTL: 0,
        hardTTL: 0,
        compute: async () => 42,
        changes: () => undefined, // always suppress
      });

      cache.events.subscribe((evt) => events.push(evt));

      await cache.get();
      await cache.get();
      assert.equal(events.length, 0);
    });

    it("should emit change event on error (value becomes undefined)", async () => {
      const events: Array<{ old: number | undefined; new: number | undefined }> = [];
      let shouldFail = false;

      const cache = new GlobalCachedValue<
        number,
        { old: number | undefined; new: number | undefined }
      >({
        softTTL: 999_999,
        hardTTL: 999_999,
        compute: async () => {
          if (shouldFail) throw new Error("fail");
          return 42;
        },
        changes: (oldVal, newVal) => ({ old: oldVal, new: newVal }),
      });

      cache.events.subscribe((evt) => events.push(evt));

      await cache.get();
      assert.equal(events.length, 1);
      assert.deepEqual(events[0], { old: undefined, new: 42 });

      shouldFail = true;
      try {
        await cache.refresh();
      } catch {
        /* expected */
      }
      assert.equal(events.length, 2);
      assert.deepEqual(events[1], { old: 42, new: undefined });
    });

    it("should not throw if subscriber throws during event emission", async () => {
      const cache = new GlobalCachedValue<number, string>({
        softTTL: 0,
        hardTTL: 0,
        compute: async () => 42,
        changes: () => "change",
      });

      cache.events.subscribe(() => {
        throw new Error("subscriber error");
      });

      // Should not propagate subscriber error
      const val = await cache.get();
      assert.equal(val, 42);
    });
  });
});
