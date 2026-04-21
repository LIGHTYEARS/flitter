/**
 * Tests for DATA-17: observeThreadList with subagent/archived filtering
 *
 * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js:286-295
 */
import { describe, expect, it } from "bun:test";
import { ThreadStore } from "../thread-store";
import type { ThreadEntry } from "../types";

// ─── Helpers ────────────────────────────────────────────

function makeEntry(overrides: Partial<ThreadEntry> & { id: string }): ThreadEntry {
  return {
    v: 1,
    created: Date.now(),
    title: `Thread ${overrides.id}`,
    userLastInteractedAt: Date.now(),
    messageCount: 5,
    relationships: [],
    summaryStats: { messageCount: 5 },
    usesDtw: false,
    ...overrides,
  };
}

function createStoreWithEntries(entries: ThreadEntry[]): ThreadStore {
  const store = new ThreadStore();
  store.markEntriesLoaded();
  for (const entry of entries) {
    store.upsertThreadEntry(entry);
  }
  return store;
}

// ─── Tests ──────────────────────────────────────────────

describe("DATA-17: observeThreadList filtering", () => {
  it("returns all non-subagent, non-archived entries by default", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "t1" }),
      makeEntry({ id: "t2" }),
      makeEntry({ id: "t3" }),
    ]);

    const result = store.observeThreadList();
    expect(result).toHaveLength(3);
  });

  it("excludes subagent threads (those with mainThreadID)", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "parent" }),
      makeEntry({ id: "child1", mainThreadID: "parent" }),
      makeEntry({ id: "child2", mainThreadID: "parent" }),
    ]);

    const result = store.observeThreadList();
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("parent");
  });

  it("excludes archived threads by default", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "active" }),
      makeEntry({ id: "archived1", archived: true }),
      makeEntry({ id: "archived2", archived: true }),
    ]);

    const result = store.observeThreadList();
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("active");
  });

  it("includes archived when opts.includeArchived is true", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "active" }),
      makeEntry({ id: "archived1", archived: true }),
    ]);

    const result = store.observeThreadList({ includeArchived: true });
    expect(result).toHaveLength(2);
  });

  it("still excludes subagent threads even with includeArchived", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "parent" }),
      makeEntry({ id: "child", mainThreadID: "parent" }),
      makeEntry({ id: "archived", archived: true }),
    ]);

    const result = store.observeThreadList({ includeArchived: true });
    expect(result).toHaveLength(2);
    const ids = result.map((e) => e.id);
    expect(ids).toContain("parent");
    expect(ids).toContain("archived");
    expect(ids).not.toContain("child");
  });

  it("returns empty array when no entries loaded", () => {
    const store = new ThreadStore();
    const result = store.observeThreadList();
    expect(result).toEqual([]);
  });

  it("returns empty array when all entries are subagent or archived", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "child1", mainThreadID: "parent" }),
      makeEntry({ id: "archived1", archived: true }),
    ]);

    const result = store.observeThreadList();
    expect(result).toEqual([]);
  });

  it("combined: subagent + archived + active", () => {
    const store = createStoreWithEntries([
      makeEntry({ id: "t1" }),
      makeEntry({ id: "t2", archived: true }),
      makeEntry({ id: "t3", mainThreadID: "t1" }),
      makeEntry({ id: "t4" }),
      makeEntry({ id: "t5", mainThreadID: "t1", archived: true }),
    ]);

    // Default: only active non-subagent
    const defaultResult = store.observeThreadList();
    expect(defaultResult).toHaveLength(2);

    // includeArchived: non-subagent (active + archived)
    const withArchived = store.observeThreadList({ includeArchived: true });
    expect(withArchived).toHaveLength(3);
    const ids = withArchived.map((e) => e.id);
    expect(ids).toContain("t1");
    expect(ids).toContain("t2");
    expect(ids).toContain("t4");
  });
});

// ─── DATA-10: Reactive observeThreadList$ ─────────────────

describe("DATA-10: reactive observeThreadList$", () => {
  it("emits filtered entries when threadEntriesState changes", async () => {
    const store = new ThreadStore();
    store.markEntriesLoaded();

    const collected: ThreadEntry[][] = [];
    const sub = store.observeThreadList$().subscribe((entries) => {
      collected.push(entries);
    });

    // Add entries one at a time
    store.upsertThreadEntry(makeEntry({ id: "t1" }));
    store.upsertThreadEntry(makeEntry({ id: "child", mainThreadID: "t1" }));
    store.upsertThreadEntry(makeEntry({ id: "t2", archived: true }));

    // Wait for throttle to flush trailing
    await new Promise((r) => setTimeout(r, 300));

    // Should have received emissions that exclude child threads
    // and exclude archived by default
    const last = collected[collected.length - 1]!;
    const ids = last.map((e) => e.id);
    expect(ids).toContain("t1");
    expect(ids).not.toContain("child");
    expect(ids).not.toContain("t2");

    sub.unsubscribe();
  });

  it("observeThreadList$ with includeArchived emits archived entries", async () => {
    const store = new ThreadStore();
    store.markEntriesLoaded();

    const collected: ThreadEntry[][] = [];
    const sub = store.observeThreadList$({ includeArchived: true }).subscribe((entries) => {
      collected.push(entries);
    });

    store.upsertThreadEntry(makeEntry({ id: "active" }));
    store.upsertThreadEntry(makeEntry({ id: "archived", archived: true }));

    await new Promise((r) => setTimeout(r, 300));

    const last = collected[collected.length - 1]!;
    expect(last).toHaveLength(2);
    const ids = last.map((e) => e.id);
    expect(ids).toContain("active");
    expect(ids).toContain("archived");

    sub.unsubscribe();
  });

  it("observeThreadEntries$ filters null emissions", async () => {
    const store = new ThreadStore();
    // Don't mark entries loaded — state starts as null

    const collected: ThreadEntry[][] = [];
    const sub = store.observeThreadEntries$().subscribe((entries) => {
      collected.push(entries);
    });

    // No emissions yet since state is null
    await new Promise((r) => setTimeout(r, 50));
    expect(collected).toHaveLength(0);

    // Now load entries
    store.markEntriesLoaded();
    store.upsertThreadEntry(makeEntry({ id: "t1" }));

    await new Promise((r) => setTimeout(r, 300));

    expect(collected.length).toBeGreaterThan(0);
    expect(collected[collected.length - 1]![0]!.id).toBe("t1");

    sub.unsubscribe();
  });

  it("distinctUntilChanged suppresses version-only changes", async () => {
    const store = new ThreadStore();
    store.markEntriesLoaded();

    const collected: ThreadEntry[][] = [];
    const sub = store.observeThreadList$().subscribe((entries) => {
      collected.push([...entries]);
    });

    const fixedTime = 1000000;
    store.upsertThreadEntry(
      makeEntry({ id: "t1", v: 1, created: fixedTime, userLastInteractedAt: fixedTime }),
    );

    // Wait for leading emission + trailing
    await new Promise((r) => setTimeout(r, 300));
    const countAfterFirst = collected.length;

    // Update same entry with only version change (all other fields identical)
    store.upsertThreadEntry(
      makeEntry({ id: "t1", v: 2, created: fixedTime, userLastInteractedAt: fixedTime }),
    );

    // Wait for throttle
    await new Promise((r) => setTimeout(r, 300));

    // distinctUntilChanged with includeVersion:false should suppress this
    expect(collected.length).toBe(countAfterFirst);

    sub.unsubscribe();
  });
});
