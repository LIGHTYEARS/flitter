// packages/cli/src/widgets/__tests__/display-items.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items";

describe("transformThreadToDisplayItems", () => {
  it("transforms a simple user+assistant exchange into message items", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Hello" }] },
      {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: "Hi there!" }],
        state: { type: "complete" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ type: "message", role: "user", text: "Hello" });
    expect(items[1]).toEqual({ type: "message", role: "assistant", text: "Hi there!" });
  });

  it("transforms a tool_use + tool_result into an activity-group item", () => {
    // Read is an activity tool in amp's yx0 — even a single Read produces an activity-group
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Let me read that file." },
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Read",
            input: { file_path: "/tmp/a.txt" },
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
            run: { status: "done" as const, result: "file contents" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(2); // message text + activity group
    expect(items[0]).toEqual({
      type: "message",
      role: "assistant",
      text: "Let me read that file.",
    });
    expect(items[1]).toMatchObject({
      type: "activity-group",
      actions: [{ kind: "read", toolName: "Read", toolUseId: "tu_1", status: "done" }],
    });
  });

  it("groups lightweight read/search tools into activity-group items", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Read",
            input: { file_path: "/a.txt" },
            complete: true,
          },
          {
            type: "tool_use" as const,
            id: "tu_2",
            name: "Grep",
            input: { pattern: "foo" },
            complete: true,
          },
          {
            type: "tool_use" as const,
            id: "tu_3",
            name: "Glob",
            input: { pattern: "*.ts" },
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
            run: { status: "done" as const, result: "contents" },
          },
          {
            type: "tool_result" as const,
            toolUseID: "tu_2",
            run: { status: "done" as const, result: "matches" },
          },
          {
            type: "tool_result" as const,
            toolUseID: "tu_3",
            run: { status: "done" as const, result: "files" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "activity-group",
      actions: [
        { kind: "read", toolName: "Read", toolUseId: "tu_1" },
        { kind: "search", toolName: "Grep", toolUseId: "tu_2" },
        { kind: "search", toolName: "Glob", toolUseId: "tu_3" },
      ],
    });
  });

  it("renders Bash tool as a bash tool item", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Bash",
            input: { command: "ls -la" },
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
            run: { status: "done" as const, result: "total 42\n-rw-r--r-- 1 user" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "bash",
      toolName: "Bash",
      status: "done",
      command: "ls -la",
      output: "total 42\n-rw-r--r-- 1 user",
    });
  });

  it("renders Edit tool as an edit tool item", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Edit",
            input: { file_path: "/tmp/a.ts", old_string: "foo", new_string: "bar" },
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
            run: { status: "done" as const, result: "OK" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "edit",
      toolName: "Edit",
      status: "done",
      path: "/tmp/a.ts",
    });
  });

  it("suppresses hidden tools like thread_status", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
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
            toolUseID: "tu_1",
            run: { status: "done" as const, result: "ok" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(0);
  });

  it("skips edit tools that are not done (W4 guard)", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Edit",
            input: { file_path: "/tmp/a.ts", old_string: "x", new_string: "y" },
            complete: true,
          },
        ],
        state: { type: "streaming" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    // Edit with no result (in-progress) should be skipped per amp's W4 guard
    expect(items).toHaveLength(0);
  });

  it("handles in-progress tool uses without results", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Bash",
            input: { command: "sleep 10" },
            complete: true,
          },
        ],
        state: { type: "streaming" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "bash",
      status: "in-progress",
      command: "sleep 10",
    });
  });
});
