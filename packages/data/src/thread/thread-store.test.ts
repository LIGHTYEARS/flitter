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
});
