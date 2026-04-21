/**
 * Tests for DATA-13: ensureThreadEntriesLoaded
 *
 * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js:60-83
 *   Lazy-load remote thread entries, three-phase merge with local cache.
 */
import { describe, expect, it, mock } from "bun:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import { ThreadStore } from "../thread-store";
import type { ThreadRemoteTransport } from "../thread-upload";
import type { ThreadEntry } from "../types";

// ─── Helpers ─────────────────────────────────────────────

function makeEntry(id: string, overrides: Partial<ThreadEntry> = {}): ThreadEntry {
  return {
    id,
    v: 1,
    created: 1000,
    title: `Thread ${id}`,
    userLastInteractedAt: 2000,
    messageCount: 1,
    env: undefined,
    originThreadID: undefined,
    mainThreadID: undefined,
    relationships: [],
    summaryStats: { messageCount: 1 },
    agentMode: undefined,
    usesDtw: false,
    archived: false,
    creatorUserID: undefined,
    meta: undefined,
    ...overrides,
  };
}

function makeSnapshot(id: string, messageCount = 1): ThreadSnapshot {
  return {
    id,
    v: 1,
    messages: Array.from({ length: messageCount }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `msg ${i}` }],
    })),
    systemPrompt: "",
    title: `Thread ${id}`,
  } as unknown as ThreadSnapshot;
}

function createMockRemote(entries: ThreadEntry[]): ThreadRemoteTransport {
  return {
    listThreads: mock(async () => entries),
    uploadThread: mock(async () => {}),
    getThread: mock(async () => null),
    deleteThread: mock(async () => {}),
    searchThreads: mock(async () => ({ threads: [], hasMore: false })),
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("ensureThreadEntriesLoaded", () => {
  it("fetches remote entries and merges into store", async () => {
    const store = new ThreadStore();
    const remoteEntries = [makeEntry("r1"), makeEntry("r2", { title: "Remote Two" })];
    const remote = createMockRemote(remoteEntries);
    store.setRemote(remote);

    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(2);
    expect(entries!.find((e) => e.id === "r1")).toBeDefined();
    expect(entries!.find((e) => e.id === "r2")?.title).toBe("Remote Two");
  });

  it("local cached threads overlay remote entries", async () => {
    const store = new ThreadStore();

    // Add a local cached thread with newer data
    const localSnapshot = makeSnapshot("shared", 3);
    (localSnapshot as ThreadSnapshot & { title: string }).title = "Local Title";
    store.setCachedThread(localSnapshot);

    // Remote has same thread but older version
    const remoteEntry = makeEntry("shared", { title: "Remote Title", messageCount: 1 });
    const remote = createMockRemote([remoteEntry]);
    store.setRemote(remote);

    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    const shared = entries!.find((e) => e.id === "shared");
    expect(shared).toBeDefined();
    // Local should win because it differs from remote
    expect(shared!.title).toBe("Local Title");
    expect(shared!.messageCount).toBe(3);
  });

  it("preserves remote entry identity when equal to local", async () => {
    const store = new ThreadStore();

    const entry = makeEntry("same");
    const remote = createMockRemote([entry]);
    store.setRemote(remote);

    // Pre-populate with identical entry
    store.upsertThreadEntry(entry);

    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(1);
    // Identity preservation — same object reference
    const found = entries!.find((e) => e.id === "same");
    expect(found).toBeDefined();
  });

  it("skips fetch when already loaded", async () => {
    const store = new ThreadStore();
    const remote = createMockRemote([makeEntry("r1")]);
    store.setRemote(remote);

    // Mark as loaded manually
    store.markEntriesLoaded();

    await store.ensureThreadEntriesLoaded();

    // listThreads should NOT have been called
    expect(remote.listThreads).not.toHaveBeenCalled();
  });

  it("coalesces concurrent calls (only one fetch)", async () => {
    const store = new ThreadStore();
    const remote = createMockRemote([makeEntry("r1")]);
    store.setRemote(remote);

    // Fire two concurrent calls
    const p1 = store.ensureThreadEntriesLoaded();
    const p2 = store.ensureThreadEntriesLoaded();

    await Promise.all([p1, p2]);

    // Should only have called listThreads once
    expect(remote.listThreads).toHaveBeenCalledTimes(1);
  });

  it("works without remote (local-only mode)", async () => {
    const store = new ThreadStore();
    // No remote set — should still complete without error

    // Add a local thread
    store.setCachedThread(makeSnapshot("local1", 2));

    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(1);
    expect(entries![0]!.id).toBe("local1");
  });

  it("handles remote fetch error gracefully (falls back to local)", async () => {
    const store = new ThreadStore();
    const remote: ThreadRemoteTransport = {
      listThreads: mock(async () => {
        throw new Error("Network error");
      }),
      uploadThread: mock(async () => {}),
      getThread: mock(async () => null),
      deleteThread: mock(async () => {}),
      searchThreads: mock(async () => ({ threads: [], hasMore: false })),
    };
    store.setRemote(remote);

    // Add a local thread
    store.setCachedThread(makeSnapshot("local1", 2));

    // Should not throw
    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(1);
    expect(entries![0]!.id).toBe("local1");
  });

  it("merges remote-only and local-only threads together", async () => {
    const store = new ThreadStore();

    // Local thread
    store.setCachedThread(makeSnapshot("local1", 2));

    // Remote-only thread
    const remote = createMockRemote([makeEntry("remote1", { title: "Remote Only" })]);
    store.setRemote(remote);

    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(2);
    expect(entries!.find((e) => e.id === "local1")).toBeDefined();
    expect(entries!.find((e) => e.id === "remote1")?.title).toBe("Remote Only");
  });

  it("excludes empty non-draft cached threads from local overlay", async () => {
    const store = new ThreadStore();

    // Cached thread with 0 messages (not draft) — should be excluded
    const emptySnapshot = {
      id: "empty",
      v: 1,
      messages: [],
      systemPrompt: "",
    } as unknown as ThreadSnapshot;
    store.setCachedThread(emptySnapshot);

    const remote = createMockRemote([]);
    store.setRemote(remote);

    await store.ensureThreadEntriesLoaded();

    const entries = store.observeThreadEntries().getValue();
    expect(entries).not.toBeNull();
    // Empty non-draft thread should be excluded
    expect(entries!.find((e) => e.id === "empty")).toBeUndefined();
  });
});
