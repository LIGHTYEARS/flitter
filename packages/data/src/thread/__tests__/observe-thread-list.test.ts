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
