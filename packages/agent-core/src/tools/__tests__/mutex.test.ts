/**
 * Mutex tests (GAP-CORE-10)
 *
 * Tests for the FIFO async mutex used by ToolOrchestrator.
 *
 * 逆向: amp's Cm class (modules/1184_unknown_Cm.js)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Mutex } from "../mutex";

describe("Mutex", () => {
  it("acquires immediately when unlocked", async () => {
    const m = new Mutex();
    assert.equal(m.isLocked, false);
    await m.acquire();
    assert.equal(m.isLocked, true);
    m.release();
    assert.equal(m.isLocked, false);
  });

  it("queues when already locked", async () => {
    const m = new Mutex();
    await m.acquire();

    let secondAcquired = false;
    const p = m.acquire().then(() => {
      secondAcquired = true;
    });

    // Second acquire should be queued, not resolved yet
    await Promise.resolve(); // flush microtasks
    assert.equal(secondAcquired, false);
    assert.equal(m.queueLength, 1);

    m.release();
    await p;
    assert.equal(secondAcquired, true);
    assert.equal(m.isLocked, true); // second holder now has it
    m.release();
  });

  it("releases in FIFO order", async () => {
    const m = new Mutex();
    await m.acquire();

    const order: number[] = [];
    const p1 = m.acquire().then(() => order.push(1));
    const p2 = m.acquire().then(() => order.push(2));
    const p3 = m.acquire().then(() => order.push(3));

    assert.equal(m.queueLength, 3);

    m.release(); // wakes p1
    await p1;
    m.release(); // wakes p2
    await p2;
    m.release(); // wakes p3
    await p3;

    assert.deepEqual(order, [1, 2, 3]);
    m.release();
  });

  it("handles acquire-release-acquire cycle", async () => {
    const m = new Mutex();
    await m.acquire();
    assert.equal(m.isLocked, true);
    m.release();
    assert.equal(m.isLocked, false);
    await m.acquire();
    assert.equal(m.isLocked, true);
    m.release();
    assert.equal(m.isLocked, false);
  });

  it("concurrent acquire/release with try/finally pattern", async () => {
    const m = new Mutex();
    const results: string[] = [];

    async function worker(name: string, delay: number) {
      await m.acquire();
      try {
        results.push(`${name}:start`);
        await new Promise((r) => setTimeout(r, delay));
        results.push(`${name}:end`);
      } finally {
        m.release();
      }
    }

    await Promise.all([worker("a", 10), worker("b", 5), worker("c", 1)]);

    // Workers should have serialized: a starts first (acquired immediately),
    // then b, then c — each starts only after the previous ends.
    assert.equal(results[0], "a:start");
    assert.equal(results[1], "a:end");
    assert.equal(results[2], "b:start");
    assert.equal(results[3], "b:end");
    assert.equal(results[4], "c:start");
    assert.equal(results[5], "c:end");
  });

  it("queueLength reports correct count", async () => {
    const m = new Mutex();
    assert.equal(m.queueLength, 0);
    await m.acquire();
    assert.equal(m.queueLength, 0);

    const p1 = m.acquire();
    const p2 = m.acquire();
    assert.equal(m.queueLength, 2);

    m.release();
    await p1;
    assert.equal(m.queueLength, 1);

    m.release();
    await p2;
    assert.equal(m.queueLength, 0);
    m.release();
  });
});
