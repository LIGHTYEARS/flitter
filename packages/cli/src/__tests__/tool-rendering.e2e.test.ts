// packages/cli/src/__tests__/tool-rendering.e2e.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../widgets/display-items";

/**
 * Integration test: verify the full display pipeline from
 * raw thread messages -> DisplayItems -> correct item types.
 *
 * A real tmux test should be added once the TUI can be launched
 * headlessly. For now, test the data pipeline end-to-end.
 */
describe("tool rendering e2e pipeline", () => {
  it("full conversation with mixed tools produces correct display items", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: "Fix the bug in app.ts" }],
      },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Let me look at the code." },
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Read",
            input: { file_path: "app.ts" },
            complete: true,
          },
          {
            type: "tool_use" as const,
            id: "tu_2",
            name: "Grep",
            input: { pattern: "bug" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_1",
            run: { status: "done" as const, result: "code" },
          },
          {
            type: "tool_result" as const,
            toolUseID: "tu_2",
            run: { status: "done" as const, result: "line 42" },
          },
        ],
      },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Found the bug. Fixing it." },
          {
            type: "tool_use" as const,
            id: "tu_3",
            name: "Edit",
            input: { file_path: "app.ts", old_string: "buggy", new_string: "fixed" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_3",
            run: { status: "done" as const, result: "OK" },
          },
        ],
      },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "I fixed the bug by changing `buggy` to `fixed`." },
        ],
        state: { type: "complete" as const },
      },
    ];

    const items = transformThreadToDisplayItems(messages);

    // Should have: user msg, assistant msg, activity-group (read+grep), assistant msg, edit tool, assistant msg
    const types = items.map((i) => i.type);
    expect(types).toContain("message");
    expect(types).toContain("activity-group");
    expect(types).toContain("tool");

    const editTool = items.find((i) => i.type === "tool" && i.kind === "edit");
    expect(editTool).toBeDefined();
    expect(editTool).toMatchObject({ kind: "edit", path: "app.ts", status: "done" });

    const actGroup = items.find((i) => i.type === "activity-group");
    expect(actGroup).toBeDefined();
    if (actGroup?.type === "activity-group") {
      expect(actGroup.actions).toHaveLength(2);
      expect(actGroup.summary).toContain("read");
      expect(actGroup.summary).toContain("search");
    }
  });

  it("handles a conversation with bash commands and errors", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Run the tests" }] },
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Bash",
            input: { command: "bun test" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_1",
            run: { status: "error" as const, error: { message: "Tests failed: 3 failures" } },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    const bashItem = items.find((i) => i.type === "tool" && i.kind === "bash");
    expect(bashItem).toBeDefined();
    expect(bashItem).toMatchObject({
      kind: "bash",
      status: "error",
      command: "bun test",
      error: "Tests failed: 3 failures",
    });
  });

  it("handles hidden tools (thread_status) gracefully", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Hello" }] },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Hi!" },
          {
            type: "tool_use" as const,
            id: "tu_hidden",
            name: "thread_status",
            input: {},
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_hidden",
            run: { status: "done" as const, result: "ok" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    // thread_status should be hidden — only message items should remain
    expect(items.every((i) => i.type === "message")).toBe(true);
    expect(items.some((i) => i.type === "tool")).toBe(false);
  });
});
