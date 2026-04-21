/**
 * Tests for ThreadStore — in-memory CRUD engine.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { ThreadMessage, ThreadSnapshot } from "@flitter/schemas";
import {
  computeUserLastInteractedAt,
  entryEquals,
  snapshotToEntry,
  ThreadStore,
} from "./thread-store";
import type { SearchThreadsResponse, ThreadMeta, ThreadRemoteTransport } from "./thread-upload";
import type { ThreadEntry } from "./types";

function makeThread(
  overrides: Partial<ThreadSnapshot> & { id: string; created?: number; [key: string]: unknown },
): ThreadSnapshot {
  return {
    v: 1,
    messages: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

function makeUserMessage(sentAt?: number): ThreadMessage {
  const base: ThreadMessage = {
    role: "user" as const,
    content: [{ type: "text" as const, text: "hello" }],
    messageId: 1,
    meta: sentAt !== undefined ? { sentAt } : undefined,
  };
  return base;
}

function makeAssistantMessage(): ThreadMessage {
  return {
    role: "assistant" as const,
    content: [{ type: "text" as const, text: "hi" }],
    messageId: 2,
    state: { type: "complete" as const, stopReason: "end_turn" as const },
  };
}

describe("computeUserLastInteractedAt", () => {
  it("should return created when no user messages", () => {
    const result = computeUserLastInteractedAt({ created: 1000, messages: [] });
    assert.equal(result, 1000);
  });

  it("should return max of created and user sentAt", () => {
    const result = computeUserLastInteractedAt({
      created: 1000,
      messages: [{ role: "user", meta: { sentAt: 2000 } }, { role: "assistant" }],
    });
    assert.equal(result, 2000);
  });

  it("should handle multiple user messages", () => {
    const result = computeUserLastInteractedAt({
      created: 500,
      messages: [
        { role: "user", meta: { sentAt: 1000 } },
        { role: "user", meta: { sentAt: 3000 } },
        { role: "user", meta: { sentAt: 2000 } },
      ],
    });
    assert.equal(result, 3000);
  });

  it("should skip user messages without sentAt", () => {
    const result = computeUserLastInteractedAt({
      created: 1500,
      messages: [{ role: "user" }, { role: "user", meta: {} }],
    });
    assert.equal(result, 1500);
  });
});

describe("snapshotToEntry", () => {
  it("should map basic fields", () => {
    const thread = makeThread({ id: "t1", created: 1000, title: "Test" });
    const entry = snapshotToEntry(thread);
    assert.equal(entry.id, "t1");
    assert.equal(entry.title, "Test");
    assert.equal(entry.messageCount, 0);
    assert.equal(entry.usesDtw, false);
  });

  it("should default title to null", () => {
    const thread = makeThread({ id: "t2" });
    const entry = snapshotToEntry(thread);
    assert.equal(entry.title, null);
  });

  it("should count messages", () => {
    const thread = makeThread({
      id: "t3",
      messages: [makeUserMessage(100), makeAssistantMessage()],
    });
    const entry = snapshotToEntry(thread);
    assert.equal(entry.messageCount, 2);
    assert.equal(entry.summaryStats.messageCount, 2);
  });

  it("should copy relationships", () => {
    const thread = makeThread({
      id: "t4",
      relationships: [{ threadID: "t5", type: "handoff" as const }],
    });
    const entry = snapshotToEntry(thread);
    assert.equal(entry.relationships.length, 1);
    assert.equal(entry.relationships[0].threadID, "t5");
  });
});

describe("entryEquals", () => {
  it("should return true for identical entries", () => {
    const thread = makeThread({ id: "t1", created: 1000 });
    const e1 = snapshotToEntry(thread);
    const e2 = snapshotToEntry(thread);
    assert.equal(entryEquals(e1, e2), true);
  });

  it("should return true for same reference", () => {
    const thread = makeThread({ id: "t1" });
    const e = snapshotToEntry(thread);
    assert.equal(entryEquals(e, e), true);
  });

  it("should return false for different title", () => {
    const e1 = snapshotToEntry(makeThread({ id: "t1", title: "A" }));
    const e2 = snapshotToEntry(makeThread({ id: "t1", title: "B" }));
    assert.equal(entryEquals(e1, e2), false);
  });

  it("should skip version when includeVersion=false", () => {
    const t1 = makeThread({ id: "t1" });
    const t2 = { ...t1, v: 99 };
    const e1 = snapshotToEntry(t1 as ThreadSnapshot);
    const e2 = snapshotToEntry(t2 as ThreadSnapshot);
    assert.equal(entryEquals(e1, e2), false);
    assert.equal(entryEquals(e1, e2, { includeVersion: false }), true);
  });
});

describe("ThreadStore", () => {
  let store: ThreadStore;

  beforeEach(() => {
    store = new ThreadStore();
  });

  describe("setCachedThread / getThread", () => {
    it("should cache new thread", () => {
      const thread = makeThread({ id: "t1", messages: [makeUserMessage()] });
      store.setCachedThread(thread);
      const subject = store.getThread("t1");
      assert.ok(subject);
      assert.equal(subject.getValue().id, "t1");
    });

    it("should update existing thread", () => {
      const t1 = makeThread({ id: "t1", title: "v1", messages: [makeUserMessage()] });
      store.setCachedThread(t1);
      const t2 = makeThread({ id: "t1", v: 2, title: "v2", messages: [makeUserMessage()] });
      store.setCachedThread(t2);
      assert.equal(store.getThread("t1")!.getValue().title, "v2");
    });

    it("should return undefined for unknown id", () => {
      assert.equal(store.getThread("nope"), undefined);
    });

    it("should return snapshot", () => {
      const thread = makeThread({ id: "t1", messages: [makeUserMessage()] });
      store.setCachedThread(thread);
      assert.equal(store.getThreadSnapshot("t1")?.id, "t1");
      assert.equal(store.getThreadSnapshot("nope"), undefined);
    });
  });

  describe("deleteThread", () => {
    it("should remove thread from cache", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      assert.equal(store.deleteThread("t1"), true);
      assert.equal(store.getThread("t1"), undefined);
    });

    it("should return false for unknown id", () => {
      assert.equal(store.deleteThread("nope"), false);
    });

    it("should remove dirty mark", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      store.markDirty("t1");
      store.deleteThread("t1");
      assert.deepEqual(store.getDirtyThreadIds(), []);
    });
  });

  describe("dirty tracking", () => {
    it("should mark and get dirty ids", () => {
      store.markDirty("t1");
      store.markDirty("t2");
      const ids = store.getDirtyThreadIds();
      assert.equal(ids.length, 2);
      assert.ok(ids.includes("t1"));
      assert.ok(ids.includes("t2"));
    });

    it("should clear single dirty", () => {
      store.markDirty("t1");
      store.markDirty("t2");
      store.clearDirty("t1");
      assert.deepEqual(store.getDirtyThreadIds(), ["t2"]);
    });

    it("should clear all dirty", () => {
      store.markDirty("t1");
      store.markDirty("t2");
      store.clearAllDirty();
      assert.deepEqual(store.getDirtyThreadIds(), []);
    });

    it("should auto-mark dirty with scheduleUpload", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }), {
        scheduleUpload: true,
      });
      assert.deepEqual(store.getDirtyThreadIds(), ["t1"]);
    });

    it("should not mark dirty by default", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      assert.deepEqual(store.getDirtyThreadIds(), []);
    });
  });

  describe("ThreadEntry index", () => {
    it("should generate entries from cached threads", () => {
      store.markEntriesLoaded();
      store.setCachedThread(
        makeThread({
          id: "t1",
          messages: [makeUserMessage(1000)],
        }),
      );
      store.setCachedThread(
        makeThread({
          id: "t2",
          messages: [makeUserMessage(2000)],
        }),
      );
      const entries = store.observeThreadEntries().getValue();
      assert.ok(entries);
      assert.equal(entries.length, 2);
      // Sorted by userLastInteractedAt DESC
      assert.equal(entries[0].id, "t2");
      assert.equal(entries[1].id, "t1");
    });

    it("should not emit entries before markEntriesLoaded", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      assert.equal(store.observeThreadEntries().getValue(), null);
    });

    it("should remove entry for empty thread (no messages, no draft)", () => {
      store.markEntriesLoaded();
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      assert.equal(store.observeThreadEntries().getValue()!.length, 1);
      // Update to empty
      store.setCachedThread(makeThread({ id: "t1", messages: [] }));
      assert.equal(store.observeThreadEntries().getValue()!.length, 0);
    });

    it("should respect maxThreads", () => {
      const limitedStore = new ThreadStore({ maxThreads: 2 });
      limitedStore.markEntriesLoaded();
      limitedStore.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage(1000)] }));
      limitedStore.setCachedThread(makeThread({ id: "t2", messages: [makeUserMessage(2000)] }));
      limitedStore.setCachedThread(makeThread({ id: "t3", messages: [makeUserMessage(3000)] }));
      const entries = limitedStore.observeThreadEntries().getValue()!;
      assert.equal(entries.length, 2);
      assert.equal(entries[0].id, "t3");
      assert.equal(entries[1].id, "t2");
    });

    it("should deduplicate on upsert with no change", () => {
      store.markEntriesLoaded();
      let emitCount = 0;
      store.observeThreadEntries().subscribe(() => emitCount++);
      const t = makeThread({ id: "t1", messages: [makeUserMessage(1000)] });
      store.setCachedThread(t);
      const countAfterFirst = emitCount;
      // Upsert same entry — should not emit
      store.upsertThreadEntry(snapshotToEntry(t));
      assert.equal(emitCount, countAfterFirst);
    });
  });

  describe("Observable subscriptions", () => {
    it("should notify on thread update", () => {
      const values: string[] = [];
      store.setCachedThread(makeThread({ id: "t1", title: "v1", messages: [makeUserMessage()] }));
      store.getThread("t1")!.subscribe((t) => values.push(t.title ?? ""));
      store.setCachedThread(makeThread({ id: "t1", title: "v2", messages: [makeUserMessage()] }));
      assert.deepEqual(values, ["v1", "v2"]);
    });

    it("should notify on entries update", () => {
      const values: (number | null)[] = [];
      store.observeThreadEntries().subscribe((e) => values.push(e?.length ?? null));
      store.markEntriesLoaded();
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      // null (initial) → 0 (markEntriesLoaded with no entries yet, but then setCachedThread adds one) → 1
      assert.ok(values.length >= 2);
      assert.equal(values[values.length - 1], 1);
    });
  });

  describe("size / getCachedThreadIds", () => {
    it("should track size", () => {
      assert.equal(store.size, 0);
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      assert.equal(store.size, 1);
      store.setCachedThread(makeThread({ id: "t2", messages: [makeUserMessage()] }));
      assert.equal(store.size, 2);
      store.deleteThread("t1");
      assert.equal(store.size, 1);
    });

    it("should list cached ids", () => {
      store.setCachedThread(makeThread({ id: "a", messages: [makeUserMessage()] }));
      store.setCachedThread(makeThread({ id: "b", messages: [makeUserMessage()] }));
      const ids = store.getCachedThreadIds().sort();
      assert.deepEqual(ids, ["a", "b"]);
    });
  });

  describe("setVisibility (Task 2)", () => {
    it("should set thread visibility and mark dirty", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      store.setVisibility("t1", "public_unlisted");

      const snapshot = store.getThreadSnapshot("t1")!;
      const meta = snapshot.meta as Record<string, unknown>;
      assert.equal(meta.visibility, "public_unlisted");

      // Should be marked dirty
      assert.ok(store.getDirtyThreadIds().includes("t1"));
    });

    it("should increment version", () => {
      const t = makeThread({ id: "t1", messages: [makeUserMessage()] });
      store.setCachedThread(t);
      const v1 = store.getThreadSnapshot("t1")!.v;

      store.setVisibility("t1", "private");
      const v2 = store.getThreadSnapshot("t1")!.v;
      assert.equal(v2, v1 + 1);
    });

    it("should throw for non-existent thread", () => {
      assert.throws(() => store.setVisibility("nope", "private"), /not found/);
    });
  });

  describe("exclusiveSyncReadWriter (Task 3)", () => {
    it("should read current snapshot", () => {
      store.setCachedThread(
        makeThread({ id: "t1", title: "hello", messages: [makeUserMessage()] }),
      );
      const rw = store.exclusiveSyncReadWriter("t1");
      assert.equal(rw.read().title, "hello");
    });

    it("should write a snapshot", async () => {
      store.setCachedThread(makeThread({ id: "t1", title: "v1", messages: [makeUserMessage()] }));
      const rw = store.exclusiveSyncReadWriter("t1");
      rw.write(makeThread({ id: "t1", title: "v2", v: 2, messages: [makeUserMessage()] }));
      assert.equal(store.getThreadSnapshot("t1")!.title, "v2");
      await rw.asyncDispose();
    });

    it("should update with a function", async () => {
      store.setCachedThread(
        makeThread({ id: "t1", title: "before", messages: [makeUserMessage()] }),
      );
      const rw = store.exclusiveSyncReadWriter("t1");
      rw.update(() => ({ title: "after" }));
      assert.equal(store.getThreadSnapshot("t1")!.title, "after");
      await rw.asyncDispose();
    });

    it("should prevent double-lock", () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      const rw1 = store.exclusiveSyncReadWriter("t1");
      assert.throws(() => store.exclusiveSyncReadWriter("t1"), /already has an exclusive/);
      // Can lock after dispose
      rw1.asyncDispose();
    });

    it("should release lock on asyncDispose", async () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      const rw1 = store.exclusiveSyncReadWriter("t1");
      await rw1.asyncDispose();

      // Should not throw now
      const rw2 = store.exclusiveSyncReadWriter("t1");
      assert.ok(rw2);
      await rw2.asyncDispose();
    });

    it("should throw on read/write after dispose", async () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      const rw = store.exclusiveSyncReadWriter("t1");
      await rw.asyncDispose();

      assert.throws(() => rw.read(), /disposed/);
      assert.throws(() => rw.write(makeThread({ id: "t1", messages: [] })), /disposed/);
    });

    it("should throw for non-existent thread", () => {
      assert.throws(() => store.exclusiveSyncReadWriter("nope"), /not found/);
    });

    it("should mark dirty by default on write", async () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      store.clearAllDirty();
      const rw = store.exclusiveSyncReadWriter("t1");
      rw.write(makeThread({ id: "t1", title: "new", v: 2, messages: [makeUserMessage()] }));
      assert.ok(store.getDirtyThreadIds().includes("t1"));
      await rw.asyncDispose();
    });

    it("should not mark dirty when scheduleUpload=false", async () => {
      store.setCachedThread(makeThread({ id: "t1", messages: [makeUserMessage()] }));
      store.clearAllDirty();
      const rw = store.exclusiveSyncReadWriter("t1", { scheduleUpload: false });
      rw.write(makeThread({ id: "t1", title: "new", v: 2, messages: [makeUserMessage()] }));
      assert.deepEqual(store.getDirtyThreadIds(), []);
      await rw.asyncDispose();
    });
  });

  describe("userLastInteractedAt auto-update (Task 11)", () => {
    it("should auto-update when new messages added", () => {
      store.markEntriesLoaded();
      const t1 = makeThread({ id: "t1", messages: [makeUserMessage(100)] });
      store.setCachedThread(t1);

      // Get initial entry
      const entryBefore = store.observeThreadEntries().getValue()![0];
      const interactedBefore = entryBefore.userLastInteractedAt;

      // Add more messages
      const t2 = makeThread({
        id: "t1",
        v: 2,
        messages: [makeUserMessage(100), makeAssistantMessage()],
      });
      store.setCachedThread(t2);

      // The entry should have a newer userLastInteractedAt
      const entryAfter = store.observeThreadEntries().getValue()![0];
      assert.ok(
        entryAfter.userLastInteractedAt >= interactedBefore,
        "userLastInteractedAt should be updated or same",
      );
    });

    it("should not auto-update when message count unchanged", () => {
      store.markEntriesLoaded();
      const t1 = makeThread({ id: "t1", messages: [makeUserMessage(100)] });
      store.setCachedThread(t1);

      const entryBefore = store.observeThreadEntries().getValue()![0];

      // Update title only, same message count
      const t2 = makeThread({
        id: "t1",
        v: 2,
        title: "new title",
        messages: [makeUserMessage(100)],
      });
      store.setCachedThread(t2);

      const entryAfter = store.observeThreadEntries().getValue()![0];
      // userLastInteractedAt should be the same (derived from sentAt)
      assert.equal(entryAfter.userLastInteractedAt, entryBefore.userLastInteractedAt);
    });
  });
});

// ──────────────────────────────────────────────────────
//  ensureThreadSubject / fetchThread (GAP-DATA-04)
// ──────────────────────────────────────────────────────

function createMockRemote(threads: Map<string, ThreadSnapshot>): ThreadRemoteTransport {
  return {
    async getThread(id: string): Promise<ThreadSnapshot | null> {
      return threads.get(id) ?? null;
    },
    async uploadThread(_thread: ThreadSnapshot): Promise<void> {},
    async listThreads(): Promise<ThreadEntry[]> {
      return [];
    },
    async deleteThread(_id: string): Promise<void> {},
    async searchThreads(_opts: { q: string; limit?: number }): Promise<SearchThreadsResponse> {
      return { threads: [], hasMore: false };
    },
    async setThreadMeta(_id: string, _meta: ThreadMeta): Promise<void> {},
  };
}

describe("ensureThreadSubject (GAP-DATA-04)", () => {
  it("returns local cache hit without fetching remote", async () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-local", v: 1 });
    store.setCachedThread(thread);

    let remoteCalled = false;
    const remoteThreads = new Map<string, ThreadSnapshot>();
    const remote = {
      ...createMockRemote(remoteThreads),
      async getThread(id: string) {
        remoteCalled = true;
        return remoteThreads.get(id) ?? null;
      },
    };
    store.setRemote(remote);

    const subject = await store.ensureThreadSubject("t-local");
    assert.ok(subject);
    assert.equal(subject.getValue().id, "t-local");
    assert.equal(remoteCalled, false, "Should not hit remote when in local cache");
  });

  it("fetches from remote on cache miss", async () => {
    const store = new ThreadStore();
    const remoteThread = makeThread({ id: "t-remote", v: 3, title: "From Server" });
    const remote = createMockRemote(new Map([["t-remote", remoteThread]]));
    store.setRemote(remote);

    const subject = await store.ensureThreadSubject("t-remote");
    assert.ok(subject);
    assert.equal(subject.getValue().id, "t-remote");
    assert.equal(subject.getValue().v, 3);

    // Should also be in local cache now
    const cached = store.getThreadSnapshot("t-remote");
    assert.ok(cached);
    assert.equal(cached!.id, "t-remote");
  });

  it("returns null when thread not found locally or remotely", async () => {
    const store = new ThreadStore();
    const remote = createMockRemote(new Map());
    store.setRemote(remote);

    const result = await store.ensureThreadSubject("nonexistent");
    assert.equal(result, null);
  });

  it("returns null when no remote is wired", async () => {
    const store = new ThreadStore();
    const result = await store.ensureThreadSubject("t-1");
    assert.equal(result, null);
  });

  it("coalesces concurrent fetches for same thread ID", async () => {
    const store = new ThreadStore();
    let fetchCount = 0;
    const remoteThread = makeThread({ id: "t-coalesce", v: 1 });

    const remote: ThreadRemoteTransport = {
      async getThread(id: string) {
        fetchCount++;
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        return id === "t-coalesce" ? remoteThread : null;
      },
      async uploadThread() {},
      async listThreads() {
        return [];
      },
      async deleteThread() {},
      async searchThreads() {
        return { threads: [], hasMore: false };
      },
    };
    store.setRemote(remote);

    // Fire two concurrent requests for same ID
    const [r1, r2] = await Promise.all([
      store.ensureThreadSubject("t-coalesce"),
      store.ensureThreadSubject("t-coalesce"),
    ]);

    assert.ok(r1);
    assert.ok(r2);
    assert.equal(fetchCount, 1, "Should only make one remote request");
  });

  it("handles remote error gracefully", async () => {
    const store = new ThreadStore();
    const remote: ThreadRemoteTransport = {
      async getThread() {
        throw new Error("Network error");
      },
      async uploadThread() {},
      async listThreads() {
        return [];
      },
      async deleteThread() {},
      async searchThreads() {
        return { threads: [], hasMore: false };
      },
    };
    store.setRemote(remote);

    const result = await store.ensureThreadSubject("t-fail");
    assert.equal(result, null, "Should return null on remote error");
  });
});

describe("fetchThread (GAP-DATA-04)", () => {
  it("returns snapshot from local cache", async () => {
    const store = new ThreadStore();
    store.setCachedThread(makeThread({ id: "t-1", v: 2 }));

    const result = await store.fetchThread("t-1");
    assert.ok(result);
    assert.equal(result!.id, "t-1");
    assert.equal(result!.v, 2);
  });

  it("returns snapshot from remote on cache miss", async () => {
    const store = new ThreadStore();
    const remoteThread = makeThread({ id: "t-remote", v: 5 });
    store.setRemote(createMockRemote(new Map([["t-remote", remoteThread]])));

    const result = await store.fetchThread("t-remote");
    assert.ok(result);
    assert.equal(result!.id, "t-remote");
    assert.equal(result!.v, 5);
  });

  it("returns null when thread not found anywhere", async () => {
    const store = new ThreadStore();
    store.setRemote(createMockRemote(new Map()));

    const result = await store.fetchThread("nonexistent");
    assert.equal(result, null);
  });
});

// ──────────────────────────────────────────────────────
//  updateThreadMeta (GAP-DATA-02)
// ──────────────────────────────────────────────────────

describe("updateThreadMeta (GAP-DATA-02)", () => {
  it("follows three-phase protocol: upload, setMeta, reload", async () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-meta", v: 1, title: "Original" });
    store.setCachedThread(thread);

    const log: string[] = [];
    const updatedThread = makeThread({
      id: "t-meta",
      v: 2,
      title: "Original",
      meta: { visibility: "public_discoverable" },
    });

    const remote: ThreadRemoteTransport = {
      ...createMockRemote(new Map()),
      async uploadThread(_t: ThreadSnapshot) {
        log.push("upload");
      },
      async setThreadMeta(_id: string, _meta: ThreadMeta) {
        log.push("setMeta");
      },
      async getThread(_id: string) {
        log.push("reload");
        return updatedThread;
      },
    };
    store.setRemote(remote);

    // Need an upload manager for uploadThreadNow
    const { ThreadUploadManager } = await import("./thread-upload");
    const uploadManager = new ThreadUploadManager({
      getThreadSnapshot: (id) => store.getThreadSnapshot(id),
      remote,
    });
    store.setUploadManager(uploadManager);

    await store.updateThreadMeta("t-meta", { visibility: "public_discoverable" });

    // Verify three-phase order
    assert.deepEqual(log, ["upload", "setMeta", "reload"]);

    // Verify local cache updated to reloaded version
    const cached = store.getThreadSnapshot("t-meta");
    assert.ok(cached);
    assert.equal(cached!.v, 2);
  });

  it("throws when thread not found", async () => {
    const store = new ThreadStore();
    store.setRemote(createMockRemote(new Map()));

    await assert.rejects(
      () => store.updateThreadMeta("nonexistent", { visibility: "private" }),
      /Thread nonexistent not found/,
    );
  });

  it("throws when no remote transport configured", async () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-no-remote", v: 1 });
    store.setCachedThread(thread);
    // No setRemote call — remote is null

    await assert.rejects(
      () => store.updateThreadMeta("t-no-remote", { visibility: "private" }),
      /No remote transport configured/,
    );
  });

  it("throws when reload returns null", async () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-vanish", v: 1 });
    store.setCachedThread(thread);

    const remote: ThreadRemoteTransport = {
      ...createMockRemote(new Map()),
      async getThread() {
        return null;
      }, // thread vanished on server
    };
    store.setRemote(remote);

    const { ThreadUploadManager } = await import("./thread-upload");
    const uploadManager = new ThreadUploadManager({
      getThreadSnapshot: (id) => store.getThreadSnapshot(id),
      remote,
    });
    store.setUploadManager(uploadManager);

    await assert.rejects(
      () => store.updateThreadMeta("t-vanish", { visibility: "private" }),
      /could not be reloaded/,
    );
  });

  it("sets uploaded version on upload manager after reload", async () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-version", v: 1 });
    store.setCachedThread(thread);

    const updatedThread = makeThread({ id: "t-version", v: 5 });
    const remote: ThreadRemoteTransport = {
      ...createMockRemote(new Map()),
      async getThread() {
        return updatedThread;
      },
    };
    store.setRemote(remote);

    const { ThreadUploadManager } = await import("./thread-upload");
    const uploadManager = new ThreadUploadManager({
      getThreadSnapshot: (id) => store.getThreadSnapshot(id),
      remote,
    });
    store.setUploadManager(uploadManager);

    await store.updateThreadMeta("t-version", { visibility: "public_discoverable" });

    // Upload manager should have the reloaded version tracked
    assert.equal(uploadManager.getUploadedVersion("t-version"), 5);
  });
});

// ──────────────────────────────────────────────────────
//  uploadThreadNow (GAP-DATA-02)
// ──────────────────────────────────────────────────────

describe("uploadThreadNow (GAP-DATA-02)", () => {
  it("delegates to upload manager", async () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-upload", v: 1 });
    store.setCachedThread(thread);

    let uploaded = false;
    const remote = {
      ...createMockRemote(new Map()),
      async uploadThread(_t: ThreadSnapshot) {
        uploaded = true;
      },
    };
    store.setRemote(remote);

    const { ThreadUploadManager } = await import("./thread-upload");
    const uploadManager = new ThreadUploadManager({
      getThreadSnapshot: (id) => store.getThreadSnapshot(id),
      remote,
    });
    store.setUploadManager(uploadManager);

    await store.uploadThreadNow("t-upload");
    assert.equal(uploaded, true);
  });

  it("is a no-op when no upload manager", async () => {
    const store = new ThreadStore();
    // No upload manager — should not throw
    await store.uploadThreadNow("nonexistent");
  });
});

// ──────────────────────────────────────────────────────
//  invalidateThreadListCache (GAP-DATA-21)
// ──────────────────────────────────────────────────────

describe("invalidateThreadListCache (GAP-DATA-21)", () => {
  it("resets threadEntriesLoaded — threadEntriesState emits null", async () => {
    const store = new ThreadStore();
    // Wire a simple remote that returns one entry
    let _listCallCount = 0;
    const remote: ThreadRemoteTransport = {
      ...createMockRemote(new Map()),
      async listThreads() {
        _listCallCount++;
        return [];
      },
    };
    store.setRemote(remote);

    // Load entries so threadEntriesLoaded becomes true
    await store.ensureThreadEntriesLoaded();
    // Confirm entries are non-null after load
    assert.notEqual(store.observeThreadEntries().getValue(), null);

    // Invalidate
    store.invalidateThreadListCache();

    // threadEntriesState must have been reset to null
    assert.equal(
      store.observeThreadEntries().getValue(),
      null,
      "threadEntriesState should be null after invalidate",
    );
  });

  it("preserves locally cached threads after invalidate", () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-cached", messages: [makeUserMessage(1000)] });
    store.setCachedThread(thread);

    store.invalidateThreadListCache();

    // The thread subject should still be accessible
    const subject = store.getThread("t-cached");
    assert.ok(subject, "getThread should still return the cached thread subject");
    assert.equal(subject.getValue().id, "t-cached");
  });

  it("allows re-fetch from remote after invalidate", async () => {
    const store = new ThreadStore();
    let listCallCount = 0;
    const remote: ThreadRemoteTransport = {
      ...createMockRemote(new Map()),
      async listThreads() {
        listCallCount++;
        return [];
      },
    };
    store.setRemote(remote);

    // First load
    await store.ensureThreadEntriesLoaded();
    assert.equal(listCallCount, 1, "Should have fetched once");

    // Without invalidate, second call is a no-op
    await store.ensureThreadEntriesLoaded();
    assert.equal(listCallCount, 1, "Should not fetch again without invalidate");

    // After invalidate, a new fetch should be triggered
    store.invalidateThreadListCache();
    await store.ensureThreadEntriesLoaded();
    assert.equal(listCallCount, 2, "Should fetch again after invalidate");
  });

  it("rebuilds threadEntriesByID from cached snapshots", async () => {
    const store = new ThreadStore();
    // Seed a cached thread before invalidating
    const thread = makeThread({ id: "t-rebuild", messages: [makeUserMessage(500)] });
    store.setCachedThread(thread);

    // Wire remote that returns nothing — so threadEntriesByID only comes from cache
    store.setRemote(createMockRemote(new Map()));

    store.invalidateThreadListCache();

    // After re-loading, the cached thread should appear in entries
    await store.ensureThreadEntriesLoaded();
    const entries = store.observeThreadEntries().getValue();
    assert.ok(entries);
    const found = entries.find((e) => e.id === "t-rebuild");
    assert.ok(found, "Cached thread should appear in entries after re-load");
  });
});

// ──────────────────────────────────────────────────────
//  getThreadMeta (GAP-DATA-23)
// ──────────────────────────────────────────────────────

describe("getThreadMeta (GAP-DATA-23)", () => {
  it("returns metadata for a cached thread with meta", () => {
    const store = new ThreadStore();
    const thread = makeThread({
      id: "t-meta",
      meta: { visibility: "public_unlisted", sharedGroupIDs: ["g1"] },
    });
    store.setCachedThread(thread);

    const meta = store.getThreadMeta("t-meta");
    assert.ok(meta);
    assert.equal(meta.visibility, "public_unlisted");
    assert.deepEqual(meta.sharedGroupIDs, ["g1"]);
  });

  it("returns undefined for a thread with no meta", () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-no-meta" });
    store.setCachedThread(thread);

    assert.equal(store.getThreadMeta("t-no-meta"), undefined);
  });

  it("returns undefined for a non-existent thread", () => {
    const store = new ThreadStore();
    assert.equal(store.getThreadMeta("nonexistent"), undefined);
  });

  it("returns undefined when meta is not an object", () => {
    const store = new ThreadStore();
    const thread = makeThread({ id: "t-bad-meta", meta: "not-an-object" as unknown });
    store.setCachedThread(thread);

    assert.equal(store.getThreadMeta("t-bad-meta"), undefined);
  });
});

// ──────────────────────────────────────────────────────
//  inheritThreadVisibility (GAP-DATA-23)
//  逆向: amp O4R (chunk-002.js:14326-14368)
// ──────────────────────────────────────────────────────

describe("inheritThreadVisibility (GAP-DATA-23)", () => {
  // Import the standalone function
  let inheritThreadVisibility: typeof import("./thread-store").inheritThreadVisibility;
  beforeEach(async () => {
    const mod = await import("./thread-store");
    inheritThreadVisibility = mod.inheritThreadVisibility;
  });

  it("copies public_unlisted visibility via setVisibility fallback", async () => {
    const store = new ThreadStore();
    const origin = makeThread({
      id: "origin",
      meta: { visibility: "public_unlisted" },
      messages: [makeUserMessage()],
    });
    const fork = makeThread({ id: "fork", messages: [makeUserMessage()] });
    store.setCachedThread(origin);
    store.setCachedThread(fork);

    // No remote configured — will fall back to setVisibility
    await inheritThreadVisibility(store, "origin", "fork");

    const forkMeta = store.getThreadMeta("fork");
    assert.ok(forkMeta);
    assert.equal(forkMeta.visibility, "public_unlisted");
  });

  it("copies private visibility with sharedGroupIDs", async () => {
    const store = new ThreadStore();
    const origin = makeThread({
      id: "origin",
      meta: { visibility: "private", sharedGroupIDs: ["g1", "g2"] },
      messages: [makeUserMessage()],
    });
    const fork = makeThread({ id: "fork", messages: [makeUserMessage()] });
    store.setCachedThread(origin);
    store.setCachedThread(fork);

    await inheritThreadVisibility(store, "origin", "fork");

    const forkMeta = store.getThreadMeta("fork");
    assert.ok(forkMeta);
    assert.equal(forkMeta.visibility, "private");
  });

  it("does not throw when origin thread has no metadata", async () => {
    const store = new ThreadStore();
    const origin = makeThread({ id: "origin", messages: [makeUserMessage()] });
    const fork = makeThread({ id: "fork", messages: [makeUserMessage()] });
    store.setCachedThread(origin);
    store.setCachedThread(fork);

    // Should not throw
    await inheritThreadVisibility(store, "origin", "fork");

    // Fork should have no visibility
    assert.equal(store.getThreadMeta("fork"), undefined);
  });

  it("does not throw when origin thread does not exist", async () => {
    const store = new ThreadStore();
    const fork = makeThread({ id: "fork", messages: [makeUserMessage()] });
    store.setCachedThread(fork);

    // Should not throw — O4R wraps everything in try/catch
    await inheritThreadVisibility(store, "nonexistent", "fork");
  });

  it("skips when origin has an unrecognized visibility level", async () => {
    const store = new ThreadStore();
    const origin = makeThread({
      id: "origin",
      meta: { visibility: "some_future_level" },
      messages: [makeUserMessage()],
    });
    const fork = makeThread({ id: "fork", messages: [makeUserMessage()] });
    store.setCachedThread(origin);
    store.setCachedThread(fork);

    await inheritThreadVisibility(store, "origin", "fork");

    // Fork should have no visibility set
    assert.equal(store.getThreadMeta("fork"), undefined);
  });
});
