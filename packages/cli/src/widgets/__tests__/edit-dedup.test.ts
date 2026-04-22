import { describe, expect, it } from "bun:test";
import { type DisplayItem, deduplicateEdits, type ToolItem } from "../display-items.js";

describe("deduplicateEdits", () => {
  it("returns empty array for empty input", () => {
    expect(deduplicateEdits([])).toEqual([]);
  });

  it("passes through non-tool items unchanged", () => {
    const items: DisplayItem[] = [
      { type: "message", role: "user", text: "hello" },
      { type: "message", role: "assistant", text: "hi" },
    ];
    expect(deduplicateEdits(items)).toEqual(items);
  });

  it("merges consecutive edit items with same path", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "1",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/app.ts",
        diff: "--- a/src/app.ts\n+++ b/src/app.ts\n-old1\n+new1",
      },
      {
        type: "tool",
        toolUseId: "2",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/app.ts",
        diff: "--- a/src/app.ts\n+++ b/src/app.ts\n-old2\n+new2",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(1);
    expect((result[0] as ToolItem).diff).toContain("-old1");
    expect((result[0] as ToolItem).diff).toContain("-old2");
  });

  it("does not merge edit items with different paths", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "1",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/a.ts",
        diff: "diff-a",
      },
      {
        type: "tool",
        toolUseId: "2",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/b.ts",
        diff: "diff-b",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(2);
  });

  it("does not merge non-consecutive edit items", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "1",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/app.ts",
        diff: "diff-1",
      },
      { type: "message", role: "assistant", text: "Done editing" },
      {
        type: "tool",
        toolUseId: "2",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/app.ts",
        diff: "diff-2",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(3);
  });

  it("merges create-file + edit with same path", () => {
    const items: DisplayItem[] = [
      {
        type: "tool",
        toolUseId: "1",
        toolName: "Write",
        kind: "create-file",
        status: "done",
        path: "src/new.ts",
      },
      {
        type: "tool",
        toolUseId: "2",
        toolName: "Edit",
        kind: "edit",
        status: "done",
        path: "src/new.ts",
        diff: "--- a/src/new.ts\n+++ b/src/new.ts\n-old\n+new",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(1);
    expect((result[0] as ToolItem).kind).toBe("edit");
  });
});
