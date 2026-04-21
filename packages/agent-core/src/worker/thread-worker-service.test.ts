/**
 * ThreadWorkerService unit tests
 *
 * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { ThreadWorker } from "./thread-worker";
import {
  type ThreadStoreForService,
  type ThreadWorkerFactory,
  ThreadWorkerService,
} from "./thread-worker-service";

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

  // ──────────────────────────────────────────────────────
  //  seedThreadMessages / applyParentRelationship tests
  // ──────────────────────────────────────────────────────

  describe("seedThreadMessages", () => {
    it("throws if threadStore not wired", async () => {
      const { service } = createService();
      await assert.rejects(() => service.seedThreadMessages("t-1", []), {
        message: /threadStore not wired/,
      });
    });

    it("seeds thread with messages and updates nextMessageId", async () => {
      const { service } = createService();
      const store = createMockThreadStore({
        id: "t-1",
        v: 1,
        messages: [],
      });
      service.setThreadStore(store);

      const messages = [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "hello" }],
          messageId: 3,
        },
        {
          role: "assistant" as const,
          content: [{ type: "text" as const, text: "hi" }],
          messageId: 4,
          state: { type: "complete" as const, stopReason: "end_turn" as const },
        },
      ];

      await service.seedThreadMessages("t-1", messages);

      const snapshot = store.getThreadSnapshot("t-1")!;
      assert.equal(snapshot.messages.length, 2);
      assert.equal(snapshot.nextMessageId, 5); // max(3,4) + 1
      assert.equal(snapshot.v, 2); // v incremented
    });

    it("stamps agentMode on user messages when provided", async () => {
      const { service } = createService();
      const store = createMockThreadStore({
        id: "t-1",
        v: 1,
        messages: [],
      });
      service.setThreadStore(store);

      const messages = [
        {
          role: "user" as const,
          content: [{ type: "text" as const, text: "hello" }],
          messageId: 1,
        },
        {
          role: "assistant" as const,
          content: [{ type: "text" as const, text: "hi" }],
          messageId: 2,
          state: { type: "complete" as const, stopReason: "end_turn" as const },
        },
      ];

      await service.seedThreadMessages("t-1", messages, "smart");

      const snapshot = store.getThreadSnapshot("t-1")!;
      // biome-ignore lint/suspicious/noExplicitAny: checking agentMode stamped on user messages
      assert.equal((snapshot.messages[0] as any).agentMode, "smart");
      // Assistant message should NOT have agentMode
      // biome-ignore lint/suspicious/noExplicitAny: checking agentMode NOT stamped on assistant messages
      assert.equal((snapshot.messages[1] as any).agentMode, undefined);
    });
  });

  describe("applyParentRelationship", () => {
    it("throws if threadStore not wired", async () => {
      const { service } = createService();
      await assert.rejects(() => service.applyParentRelationship("child-1", "parent-1"), {
        message: /threadStore not wired/,
      });
    });

    it("adds child relationship to child thread and parent to parent thread", async () => {
      const { service } = createService();
      const store = createMockThreadStore(
        { id: "child-1", v: 1, messages: [] },
        { id: "parent-1", v: 1, messages: [] },
      );
      service.setThreadStore(store);

      await service.applyParentRelationship("child-1", "parent-1");

      const childSnap = store.getThreadSnapshot("child-1")!;
      const parentSnap = store.getThreadSnapshot("parent-1")!;

      assert.equal(childSnap.relationships!.length, 1);
      assert.equal(childSnap.relationships![0].role, "child");
      assert.equal(childSnap.relationships![0].threadID, "parent-1");
      assert.equal(childSnap.relationships![0].type, "handoff");

      assert.equal(parentSnap.relationships!.length, 1);
      assert.equal(parentSnap.relationships![0].role, "parent");
      assert.equal(parentSnap.relationships![0].threadID, "child-1");
    });

    it("deduplicates relationships on (threadID, type, role)", async () => {
      const { service } = createService();
      const store = createMockThreadStore(
        { id: "child-1", v: 1, messages: [] },
        { id: "parent-1", v: 1, messages: [] },
      );
      service.setThreadStore(store);

      await service.applyParentRelationship("child-1", "parent-1");
      await service.applyParentRelationship("child-1", "parent-1");

      const childSnap = store.getThreadSnapshot("child-1")!;
      assert.equal(childSnap.relationships!.length, 1, "should deduplicate");
    });
  });
});

// ──────────────────────────────────────────────────────
//  Mock ThreadStore for seedThreadMessages tests
// ──────────────────────────────────────────────────────

function createMockThreadStore(
  ...initialThreads: Array<{ id: string; v: number; messages: unknown[] }>
): ThreadStoreForService {
  const threads = new Map<string, ThreadSnapshot>();
  for (const t of initialThreads) {
    threads.set(t.id, t as unknown as ThreadSnapshot);
  }

  const store: ThreadStoreForService = {
    getThreadSnapshot(id: string) {
      return threads.get(id);
    },
    setCachedThread(thread: ThreadSnapshot) {
      threads.set(thread.id, thread);
      return { getValue: () => thread };
    },
    exclusiveSyncReadWriter(threadId: string) {
      const snapshot = threads.get(threadId);
      if (!snapshot) throw new Error(`Thread ${threadId} not found`);
      let disposed = false;
      return {
        read: () => {
          if (disposed) throw new Error("disposed");
          return threads.get(threadId)!;
        },
        write: (thread: ThreadSnapshot) => {
          if (disposed) throw new Error("disposed");
          threads.set(threadId, thread);
        },
        update: (fn: (draft: ThreadSnapshot) => Partial<ThreadSnapshot> | void) => {
          if (disposed) throw new Error("disposed");
          const current = threads.get(threadId)!;
          const result = fn(current);
          const updated = result ? { ...current, ...result } : current;
          threads.set(threadId, updated);
          return updated;
        },
        asyncDispose: async () => {
          disposed = true;
        },
      };
    },
  };
  return store;
}
