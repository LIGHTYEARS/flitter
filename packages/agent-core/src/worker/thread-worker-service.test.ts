/**
 * ThreadWorkerService unit tests
 *
 * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ThreadWorkerService, type ThreadWorkerFactory } from "./thread-worker-service";
import type { ThreadWorker } from "./thread-worker";

/** Minimal mock worker that only has dispose() */
function createMockWorker(id: string): ThreadWorker {
  let disposed = false;
  return {
    id,
    dispose() {
      disposed = true;
    },
    get isDisposed() {
      return disposed;
    },
  } as unknown as ThreadWorker;
}

function createService(): {
  service: ThreadWorkerService;
  createdIds: string[];
} {
  const createdIds: string[] = [];
  const factory: ThreadWorkerFactory = (threadId) => {
    createdIds.push(threadId);
    return createMockWorker(threadId);
  };
  return { service: new ThreadWorkerService(factory), createdIds };
}

describe("ThreadWorkerService", () => {
  describe("getOrCreate", () => {
    it("creates a new worker when none exists", () => {
      const { service, createdIds } = createService();
      const worker = service.getOrCreate("t-1");
      assert.ok(worker);
      assert.deepEqual(createdIds, ["t-1"]);
    });

    it("returns existing worker on second call", () => {
      const { service, createdIds } = createService();
      const w1 = service.getOrCreate("t-1");
      const w2 = service.getOrCreate("t-1");
      assert.strictEqual(w1, w2);
      // Factory should only be called once
      assert.deepEqual(createdIds, ["t-1"]);
    });

    it("creates separate workers for different thread IDs", () => {
      const { service, createdIds } = createService();
      service.getOrCreate("t-1");
      service.getOrCreate("t-2");
      assert.deepEqual(createdIds, ["t-1", "t-2"]);
      assert.equal(service.size, 2);
    });
  });

  describe("get", () => {
    it("returns undefined for non-existent thread", () => {
      const { service } = createService();
      assert.equal(service.get("nonexistent"), undefined);
    });

    it("returns the worker after getOrCreate", () => {
      const { service } = createService();
      const w = service.getOrCreate("t-1");
      assert.strictEqual(service.get("t-1"), w);
    });
  });

  describe("has", () => {
    it("returns false for non-existent thread", () => {
      const { service } = createService();
      assert.equal(service.has("t-1"), false);
    });

    it("returns true after getOrCreate", () => {
      const { service } = createService();
      service.getOrCreate("t-1");
      assert.equal(service.has("t-1"), true);
    });
  });

  describe("dispose", () => {
    it("removes worker and calls dispose on it", () => {
      const { service } = createService();
      const worker = service.getOrCreate("t-1");
      service.dispose("t-1");
      assert.equal(service.has("t-1"), false);
      assert.equal((worker as unknown as { isDisposed: boolean }).isDisposed, true);
    });

    it("no-op for non-existent thread", () => {
      const { service } = createService();
      // Should not throw
      service.dispose("nonexistent");
      assert.equal(service.size, 0);
    });
  });

  describe("disposeAll", () => {
    it("disposes all workers and clears the map", () => {
      const { service } = createService();
      const w1 = service.getOrCreate("t-1");
      const w2 = service.getOrCreate("t-2");
      service.disposeAll();
      assert.equal(service.size, 0);
      assert.equal((w1 as unknown as { isDisposed: boolean }).isDisposed, true);
      assert.equal((w2 as unknown as { isDisposed: boolean }).isDisposed, true);
    });

    it("works on empty service", () => {
      const { service } = createService();
      service.disposeAll();
      assert.equal(service.size, 0);
    });
  });

  describe("size and threadIds", () => {
    it("size reflects current worker count", () => {
      const { service } = createService();
      assert.equal(service.size, 0);
      service.getOrCreate("t-1");
      assert.equal(service.size, 1);
      service.getOrCreate("t-2");
      assert.equal(service.size, 2);
      service.dispose("t-1");
      assert.equal(service.size, 1);
    });

    it("threadIds lists all active thread IDs", () => {
      const { service } = createService();
      service.getOrCreate("t-1");
      service.getOrCreate("t-2");
      const ids = service.threadIds.sort();
      assert.deepEqual(ids, ["t-1", "t-2"]);
    });
  });

  describe("memory pressure warning", () => {
    it("does not throw when exceeding 25 workers", () => {
      const { service } = createService();
      for (let i = 0; i < 30; i++) {
        service.getOrCreate(`t-${i}`);
      }
      assert.equal(service.size, 30);
    });
  });
});
