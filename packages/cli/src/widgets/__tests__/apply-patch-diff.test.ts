// packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts
/**
 * Tests for apply_patch multi-file diff rendering.
 *
 * 逆向: f50() (1928_unknown_g50.js) — parses result.files array from toolRun
 * 逆向: $9R (misc_utils.js:6962) — renders per-file blocks with path, +/- stats, colored diff
 */

import { describe, expect, it } from "bun:test";
import type { ToolItem } from "../display-items.js";
import { transformThreadToDisplayItems } from "../display-items.js";

/** Helper to build an assistant message with a tool_use block */
function applyPatchMessage(input: Record<string, unknown>, runResult?: unknown) {
  return {
    role: "assistant" as const,
    content: [
      {
        type: "tool_use",
        id: "tu-ap-1",
        name: "apply_patch",
        input,
        complete: true,
      },
      ...(runResult !== undefined
        ? [
            {
              type: "tool_result",
              toolUseID: "tu-ap-1",
              run: {
                status: "done" as const,
                result: runResult,
              },
            },
          ]
        : []),
    ],
  };
}

describe("apply_patch display-item rendering", () => {
  it("produces a ToolItem with kind=edit for apply_patch", () => {
    const messages = [
      applyPatchMessage(
        { patchText: "*** foo.ts\n--- foo.ts\n..." },
        {
          summary: "2 files changed",
          files: [
            {
              path: "src/foo.ts",
              uri: "file:///src/foo.ts",
              type: "update",
              additions: 3,
              deletions: 1,
              diff: "@@ -1,3 +1,3 @@\n context\n-removed\n+added\n context",
            },
          ],
        },
      ),
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.kind).toBe("edit");
    expect(tool.toolName).toBe("apply_patch");
  });

  it("populates files array when result.files is present", () => {
    const files = [
      {
        path: "src/a.ts",
        uri: "file:///src/a.ts",
        type: "update",
        additions: 5,
        deletions: 2,
        diff: "@@ -1,1 +1,1 @@\n-old\n+new",
      },
      {
        path: "src/b.ts",
        uri: "file:///src/b.ts",
        type: "add",
        additions: 10,
        deletions: 0,
        diff: "@@ -0,0 +1,10 @@\n+line1\n+line2",
      },
    ];
    const messages = [
      applyPatchMessage(
        { patchText: "..." },
        {
          summary: "Patched 2 files",
          files,
        },
      ),
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.files).toBeDefined();
    expect(tool.files).toHaveLength(2);
    expect(tool.files![0].path).toBe("src/a.ts");
    expect(tool.files![0].additions).toBe(5);
    expect(tool.files![0].deletions).toBe(2);
    expect(tool.files![0].type).toBe("update");
    expect(tool.files![0].diff).toBe("@@ -1,1 +1,1 @@\n-old\n+new");
    expect(tool.files![1].path).toBe("src/b.ts");
    expect(tool.files![1].additions).toBe(10);
    expect(tool.files![1].deletions).toBe(0);
  });

  it("uses summary as path when result has summary", () => {
    const messages = [
      applyPatchMessage(
        { patchText: "..." },
        {
          summary: "Updated 3 files",
          files: [
            { path: "x.ts", uri: "file:///x.ts", type: "update", additions: 1, deletions: 1 },
          ],
        },
      ),
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.path).toBe("Updated 3 files");
  });

  it("falls back to edit kind without files when result.files is absent", () => {
    // apply_patch with no result (still in-progress)
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-ap-2",
            name: "apply_patch",
            input: { patchText: "*** foo.ts\n..." },
            complete: false,
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.kind).toBe("edit");
    expect(tool.files).toBeUndefined();
  });

  it("applies to multiple files in result.files", () => {
    const files = [
      {
        path: "src/a.ts",
        uri: "file:///src/a.ts",
        type: "update",
        additions: 1,
        deletions: 0,
      },
      {
        path: "src/b.ts",
        uri: "file:///src/b.ts",
        type: "update",
        additions: 2,
        deletions: 1,
      },
      {
        path: "src/c.ts",
        uri: "file:///src/c.ts",
        type: "delete",
        additions: 0,
        deletions: 5,
      },
    ];
    const messages = [
      applyPatchMessage({ patchText: "..." }, { summary: "3 files changed", files }),
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.files).toHaveLength(3);
    expect(tool.files!.map((f) => f.path)).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
  });

  it("handles result without summary gracefully (no path set)", () => {
    const messages = [
      applyPatchMessage(
        { patchText: "..." },
        {
          files: [
            { path: "x.ts", uri: "file:///x.ts", type: "update", additions: 1, deletions: 1 },
          ],
        },
      ),
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    // no summary → path should be undefined
    expect(tool.path).toBeUndefined();
  });

  it("does NOT produce a diff field (apply_patch uses files, not old_string/new_string)", () => {
    const messages = [
      applyPatchMessage(
        { patchText: "..." },
        {
          summary: "1 file changed",
          files: [
            {
              path: "x.ts",
              uri: "file:///x.ts",
              type: "update",
              additions: 1,
              deletions: 1,
              diff: "-old\n+new",
            },
          ],
        },
      ),
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    // The per-file diff lives in tool.files[].diff, NOT tool.diff
    expect(tool.diff).toBeUndefined();
  });
});
