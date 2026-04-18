import { describe, expect, test } from "bun:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import { ThreadStore } from "../thread-store";

function makeThread(
  overrides: Partial<ThreadSnapshot> & { id: string; [key: string]: unknown },
): ThreadSnapshot {
  return {
    v: 1,
    messages: [],
    relationships: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

describe("ThreadStore.listRecentThreadIds", () => {
  test("returns empty array when no threads", () => {
    const store = new ThreadStore();
    expect(store.listRecentThreadIds(10)).toEqual([]);
  });

  test("returns cached thread IDs when entries not loaded", () => {
    const store = new ThreadStore();
    store.setCachedThread(
      makeThread({
        id: "a",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "a" }],
          } as unknown as ThreadSnapshot["messages"][0],
        ],
      }),
    );
    store.setCachedThread(
      makeThread({
        id: "b",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "b" }],
          } as unknown as ThreadSnapshot["messages"][0],
        ],
      }),
    );
    const ids = store.listRecentThreadIds(10);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
  });

  test("respects maxCount limit", () => {
    const store = new ThreadStore();
    for (let i = 0; i < 5; i++) {
      store.setCachedThread(
        makeThread({
          id: `t-${i}`,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: "x" }],
            } as unknown as ThreadSnapshot["messages"][0],
          ],
        }),
      );
    }
    expect(store.listRecentThreadIds(2)).toHaveLength(2);
  });

  test("sorts by message timestamp when entries not loaded", () => {
    const store = new ThreadStore();
    store.setCachedThread(
      makeThread({
        id: "old",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "old" }],
            createdAt: "2026-01-01T00:00:00Z",
          } as unknown as ThreadSnapshot["messages"][0],
        ],
      }),
    );
    store.setCachedThread(
      makeThread({
        id: "new",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "new" }],
            createdAt: "2026-04-18T00:00:00Z",
          } as unknown as ThreadSnapshot["messages"][0],
        ],
      }),
    );
    const ids = store.listRecentThreadIds(10);
    expect(ids[0]).toBe("new");
    expect(ids[1]).toBe("old");
  });
});
