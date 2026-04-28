// packages/cli/src/widgets/__tests__/display-items.test.ts

import { describe, expect, it } from "bun:test";
import { type MessageItem, type ToolItem, transformThreadToDisplayItems } from "../display-items";

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

  it("transforms a tool_use + tool_result into a standalone Read tool item", () => {
    // 逆向: Bs.buildReadTool → B9R → x3 — Read renders as standalone tool in main chat view
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
    expect(items).toHaveLength(2); // message text + tool
    expect(items[0]).toEqual({
      type: "message",
      role: "assistant",
      text: "Let me read that file.",
    });
    expect(items[1]).toMatchObject({
      type: "tool",
      kind: "read",
      toolName: "Read",
      toolUseId: "tu_1",
      status: "done",
      path: "/tmp/a.txt",
    });
  });

  it("renders Read/Grep/Glob as standalone tool items", () => {
    // 逆向: Bs.buildToolWidget — Read/Grep/Glob each get their own x3 row in main chat view
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
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "read",
      toolName: "Read",
      toolUseId: "tu_1",
    });
    expect(items[1]).toMatchObject({
      type: "tool",
      kind: "search",
      toolName: "Grep",
      toolUseId: "tu_2",
    });
    expect(items[2]).toMatchObject({
      type: "tool",
      kind: "generic",
      toolName: "Glob",
      toolUseId: "tu_3",
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

  it("shows in-progress edit tools without diff (W4 guard removed)", () => {
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
    // Edit with no result (in-progress) should now be visible (no longer silently dropped)
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "edit",
      status: "in-progress",
      path: "/tmp/a.ts",
    });
    expect((items[0] as ToolItem).diff).toBeUndefined();
  });

  it("emits edit tool items with in-progress status (no diff)", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu-1",
            name: "Edit",
            input: { file_path: "src/app.ts", old_string: "a", new_string: "b" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const toolItem = items.find((i) => i.type === "tool");
    expect(toolItem).toBeDefined();
    expect((toolItem as ToolItem).status).toBe("in-progress");
    expect((toolItem as ToolItem).kind).toBe("edit");
    expect((toolItem as ToolItem).diff).toBeUndefined();
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

  it("Read tool with read_range populates ToolItem.readRange", () => {
    // 逆向: B9R.build reads R.input.read_range and renders @start-end (misc_utils.js:7800-7809)
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Read",
            input: { file_path: "/tmp/a.ts", read_range: [10, 50] },
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
    expect(items).toHaveLength(1);
    const toolItem = items[0] as ToolItem;
    expect(toolItem.type).toBe("tool");
    expect(toolItem.kind).toBe("read");
    expect(toolItem.readRange).toEqual([10, 50]);
  });

  it("Read tool with discoveredGuidanceFiles populates ToolItem.guidanceFiles", () => {
    // 逆向: B9R.build reads a.result.discoveredGuidanceFiles (misc_utils.js:7811-7816)
    // 逆向: $b() in chunk-004.js:37537-37542 extracts discoveredGuidanceFiles from run result
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Read",
            input: { file_path: "/tmp/a.ts" },
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
            run: {
              status: "done" as const,
              result: {
                discoveredGuidanceFiles: [{ uri: "/tmp/AGENTS.md", lineCount: 42 }],
              },
            },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const toolItem = items[0] as ToolItem;
    expect(toolItem.type).toBe("tool");
    expect(toolItem.kind).toBe("read");
    expect(toolItem.guidanceFiles).toEqual([{ uri: "/tmp/AGENTS.md", lineCount: 42 }]);
  });
});

describe("transformThreadToDisplayItems — image blocks", () => {
  it("extracts image blocks into MessageItem.images array", () => {
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "image", source: { type: "base64", data: "abc123" } },
          { type: "text", text: "What is this?" },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
    const msg = items[0] as { type: "message"; images?: number };
    expect(msg.images).toBe(1);
  });

  it("counts multiple image blocks", () => {
    const messages = [
      {
        role: "user" as const,
        content: [
          { type: "image", source: { type: "base64", data: "a" } },
          { type: "image", source: { type: "base64", data: "b" } },
          { type: "text", text: "Compare these" },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const msg = items[0] as { type: "message"; images?: number };
    expect(msg.images).toBe(2);
  });
});

describe("transformThreadToDisplayItems — info role", () => {
  it("extracts manual_bash_invocation from info messages", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "git status" },
            hidden: false,
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
    const msg = items[0] as MessageItem;
    expect(msg.role).toBe("system");
    expect(msg.text).toContain("git status");
  });
});

describe("transformThreadToDisplayItems — interrupted messages", () => {
  it("passes interrupted flag from raw user message", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text", text: "Hello" }],
        interrupted: true,
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
    expect((items[0] as any).interrupted).toBe(true);
  });

  it("does not set interrupted when false or missing", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text", text: "Hello" }],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect((items[0] as any).interrupted).toBeUndefined();
  });
});

describe("transformThreadToDisplayItems — discoveredGuidanceFiles", () => {
  it("passes discoveredGuidanceFiles from raw user message", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text", text: "Hello" }],
        discoveredGuidanceFiles: [
          { uri: "/project/CLAUDE.md", lineCount: 42 },
          { uri: "/project/.claude/settings.json", lineCount: 15 },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    expect(items).toHaveLength(1);
    const msg = items[0] as any;
    expect(msg.discoveredGuidanceFiles).toHaveLength(2);
    expect(msg.discoveredGuidanceFiles[0].uri).toBe("/project/CLAUDE.md");
    expect(msg.discoveredGuidanceFiles[0].lineCount).toBe(42);
  });
});
