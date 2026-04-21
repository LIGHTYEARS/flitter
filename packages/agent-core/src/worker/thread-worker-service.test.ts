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

/** Minimal mock worker that tracks resume/enqueueMessage calls */
function createMockWorker(id: string): ThreadWorker & {
  isDisposed: boolean;
  resumed: boolean;
  enqueuedMessages: unknown[];
} {
  let disposed = false;
  let resumed = false;
  const enqueuedMessages: unknown[] = [];
  return {
    id,
    dispose() {
      disposed = true;
    },
    async resume() {
      resumed = true;
    },
    enqueueMessage(msg: unknown) {
      enqueuedMessages.push(msg);
    },
    get isDisposed() {
      return disposed;
    },
    get resumed() {
      return resumed;
    },
    enqueuedMessages,
  } as unknown as ThreadWorker & {
    isDisposed: boolean;
    resumed: boolean;
    enqueuedMessages: unknown[];
  };
}

function createService(): {
  service: ThreadWorkerService;
  createdIds: string[];
  getWorker: (id: string) => ReturnType<typeof createMockWorker> | undefined;
} {
  const createdIds: string[] = [];
  const workerMap = new Map<string, ReturnType<typeof createMockWorker>>();
  const factory: ThreadWorkerFactory = (threadId) => {
    createdIds.push(threadId);
    const w = createMockWorker(threadId);
    workerMap.set(threadId, w);
    return w;
  };
  return {
    service: new ThreadWorkerService(factory),
    createdIds,
    getWorker: (id: string) => workerMap.get(id),
  };
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
//  createThreadWorker tests
// ──────────────────────────────────────────────────────

describe("createThreadWorker", () => {
  it("creates worker and calls resume()", async () => {
    const { service, getWorker } = createService();
    const worker = await service.createThreadWorker("t-1");
    assert.ok(worker);
    const mockWorker = getWorker("t-1")!;
    assert.equal(mockWorker.resumed, true);
  });

  it("returns existing worker if already created", async () => {
    const { service, createdIds } = createService();
    const w1 = await service.createThreadWorker("t-1");
    const w2 = await service.createThreadWorker("t-1");
    assert.strictEqual(w1, w2);
    assert.deepEqual(createdIds, ["t-1"]);
  });
});

// ──────────────────────────────────────────────────────
//  createThread tests
// ──────────────────────────────────────────────────────

describe("createThread", () => {
  it("generates a thread ID when none provided", async () => {
    const { service, getWorker } = createService();
    const store = createMockThreadStore();
    service.setThreadStore(store);

    const { threadID, worker } = await service.createThread();
    assert.ok(threadID.length > 0);
    assert.ok(worker);
    // Worker should be resumed
    const mockWorker = getWorker(threadID)!;
    assert.equal(mockWorker.resumed, true);
  });

  it("uses explicit thread ID when provided", async () => {
    const { service, createdIds } = createService();
    const store = createMockThreadStore({ id: "explicit-id", v: 0, messages: [] });
    service.setThreadStore(store);

    const { threadID } = await service.createThread({ newThreadID: "explicit-id" });
    assert.equal(threadID, "explicit-id");
    assert.deepEqual(createdIds, ["explicit-id"]);
  });

  it("seeds messages when seededMessages provided", async () => {
    const { service } = createService();
    const store = createMockThreadStore({ id: "t-seed", v: 1, messages: [] });
    service.setThreadStore(store);

    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "hello" }], messageId: 1 },
    ];
    await service.createThread({ newThreadID: "t-seed", seededMessages: messages });

    const snap = store.getThreadSnapshot("t-seed")!;
    assert.equal(snap.messages.length, 1);
  });

  it("applies parent relationship when parent provided", async () => {
    const { service } = createService();
    const store = createMockThreadStore(
      { id: "child-t", v: 1, messages: [] },
      { id: "parent-t", v: 1, messages: [] },
    );
    service.setThreadStore(store);

    await service.createThread({
      newThreadID: "child-t",
      parent: { threadID: "parent-t", type: "handoff" },
    });

    const childSnap = store.getThreadSnapshot("child-t")!;
    assert.equal(childSnap.relationships!.length, 1);
    assert.equal(childSnap.relationships![0].role, "child");
    assert.equal(childSnap.relationships![0].threadID, "parent-t");
  });

  it("sends initial user message via enqueueMessage", async () => {
    const { service, getWorker } = createService();
    const store = createMockThreadStore({ id: "t-msg", v: 1, messages: [], nextMessageId: 5 });
    service.setThreadStore(store);

    await service.createThread({
      newThreadID: "t-msg",
      initialUserMessage: "Hello there!",
    });

    const mockWorker = getWorker("t-msg")!;
    assert.equal(mockWorker.enqueuedMessages.length, 1);
    const msg = mockWorker.enqueuedMessages[0] as Record<string, unknown>;
    assert.equal(msg.role, "user");
    assert.equal(msg.messageId, 5);
    const content = msg.content as Array<{ type: string; text: string }>;
    assert.equal(content[0].text, "Hello there!");
  });

  it("throws when initialUserMessage and seededMessages are both provided", async () => {
    const { service } = createService();
    const store = createMockThreadStore({ id: "t-both", v: 1, messages: [] });
    service.setThreadStore(store);

    await assert.rejects(
      () =>
        service.createThread({
          newThreadID: "t-both",
          seededMessages: [
            {
              role: "user" as const,
              content: [{ type: "text" as const, text: "seeded" }],
              messageId: 1,
            },
          ],
          initialUserMessage: "also initial",
        }),
      { message: /initialUserMessage cannot be set when seededMessages is provided/ },
    );
  });

  it("returns existing worker for thread with messages (idempotency)", async () => {
    const { service, createdIds } = createService();
    const store = createMockThreadStore({
      id: "t-existing",
      v: 1,
      messages: [{ role: "user", content: [{ type: "text", text: "existing" }], messageId: 1 }],
    });
    service.setThreadStore(store);

    const result = await service.createThread({ newThreadID: "t-existing" });
    assert.equal(result.threadID, "t-existing");
    assert.ok(result.worker);
    // Factory was called once (for the create), but messages weren't re-seeded
    assert.deepEqual(createdIds, ["t-existing"]);
  });
});

// ──────────────────────────────────────────────────────
//  Mock ThreadStore for seedThreadMessages tests
// ──────────────────────────────────────────────────────

function createMockThreadStore(
  ...initialThreads: Array<{
    id: string;
    v: number;
    messages: unknown[];
    nextMessageId?: number;
  }>
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
      // For createThread, the thread might not exist yet — create an empty snapshot
      if (!threads.has(threadId)) {
        threads.set(threadId, {
          id: threadId,
          v: 0,
          messages: [],
          nextMessageId: 1,
        } as unknown as ThreadSnapshot);
      }
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
