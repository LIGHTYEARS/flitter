import { describe, expect, it } from "bun:test";
import type { RawMessage } from "../display-items.js";
import {
  buildSubagentContentByParentID,
  hasTerminalMessage,
  isSubagentTool,
  type SubagentContent,
  type SubagentTool,
} from "../subagent-content.js";

// ─── Type structure tests ─────────────────────────────

describe("SubagentTool type", () => {
  it("conforms to expected shape", () => {
    const tool: SubagentTool = {
      toolUse: {
        type: "tool_use",
        id: "tool-1",
        name: "Bash",
        input: { command: "ls" },
        complete: true,
      },
      toolRun: {
        status: "done",
        result: "output",
      },
    };
    expect(tool.toolUse.type).toBe("tool_use");
    expect(tool.toolUse.id).toBe("tool-1");
    expect(tool.toolRun.status).toBe("done");
    expect(tool.toolProgress).toBeUndefined();
  });

  it("includes optional toolProgress", () => {
    const tool: SubagentTool = {
      toolUse: {
        type: "tool_use",
        id: "tool-2",
        name: "Read",
        input: { path: "/foo" },
        complete: true,
      },
      toolRun: {
        status: "in-progress",
      },
      toolProgress: { status: "reading file", content: "..." },
    };
    expect(tool.toolProgress?.status).toBe("reading file");
  });
});

describe("SubagentContent type", () => {
  it("conforms to expected shape", () => {
    const content: SubagentContent = {
      tools: [],
    };
    expect(content.tools).toEqual([]);
    expect(content.terminalAssistantMessage).toBeUndefined();
    expect(content.progressChunks).toBeUndefined();
  });
});

// ─── Helper function tests ─────────────────────────────

describe("isSubagentTool", () => {
  it("returns true for known subagent tool names", () => {
    expect(isSubagentTool("oracle")).toBe(true);
    expect(isSubagentTool("finder")).toBe(true);
    expect(isSubagentTool("librarian")).toBe(true);
    expect(isSubagentTool("Task")).toBe(true);
    expect(isSubagentTool("code_review")).toBe(true);
  });

  it("returns false for non-subagent tools", () => {
    expect(isSubagentTool("Bash")).toBe(false);
    expect(isSubagentTool("Read")).toBe(false);
    expect(isSubagentTool("Edit")).toBe(false);
    expect(isSubagentTool("unknown_tool")).toBe(false);
  });
});

describe("hasTerminalMessage", () => {
  it("returns true when terminalAssistantMessage is present", () => {
    const content: SubagentContent = {
      tools: [],
      terminalAssistantMessage: {
        content: [{ type: "text", text: "Done." }],
        state: { type: "complete" },
      },
    };
    expect(hasTerminalMessage(content)).toBe(true);
  });

  it("returns false when terminalAssistantMessage is undefined", () => {
    const content: SubagentContent = {
      tools: [],
    };
    expect(hasTerminalMessage(content)).toBe(false);
  });
});

// ─── buildSubagentContentByParentID ─────────────────────

describe("buildSubagentContentByParentID", () => {
  it("returns empty object for empty messages", () => {
    const result = buildSubagentContentByParentID([]);
    expect(result).toEqual({});
  });

  it("returns empty object for messages without subagent content", () => {
    const messages: RawMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hi there" }],
        state: { type: "complete" },
      },
    ];
    const result = buildSubagentContentByParentID(messages);
    expect(result).toEqual({});
  });

  it("extracts tools and terminalAssistantMessage from parentToolUseId messages (Path 1)", () => {
    const parentId = "parent-tool-1";
    const messages: RawMessage[] = [
      // Parent assistant message with the subagent tool_use
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: parentId,
            name: "Task",
            input: { description: "do something" },
            complete: true,
          },
        ],
        state: { type: "complete" },
      },
      // Tool result for the parent (marks it as a subagent tool_result)
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: parentId,
            run: { status: "done", progress: [] },
          },
        ],
      },
      // Child assistant message with a nested tool_use (belongs to subagent)
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "child-tool-1",
            name: "Bash",
            input: { command: "echo hello" },
            complete: true,
          },
        ],
        state: { type: "complete" },
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
      // Tool result for the child tool
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: "child-tool-1",
            run: { status: "done", result: "hello" },
          },
        ],
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
      // Final subagent assistant message (terminal message)
      {
        role: "assistant",
        content: [{ type: "text", text: "I ran the command successfully." }],
        state: { type: "complete" },
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result[parentId]).toBeDefined();
    expect(result[parentId].tools.length).toBe(1);
    expect(result[parentId].tools[0].toolUse.name).toBe("Bash");
    expect(result[parentId].tools[0].toolUse.id).toBe("child-tool-1");
    expect(result[parentId].tools[0].toolRun.status).toBe("done");
    expect(result[parentId].tools[0].toolRun.result).toBe("hello");
    expect(result[parentId].terminalAssistantMessage).toBeDefined();
    expect(result[parentId].terminalAssistantMessage!.content[0]).toEqual({
      type: "text",
      text: "I ran the command successfully.",
    });
    expect(result[parentId].terminalAssistantMessage!.state.type).toBe("complete");
  });

  it("extracts tools from run.progress (Path 2)", () => {
    const parentId = "parent-progress-1";
    const messages: RawMessage[] = [
      // Assistant message with subagent tool_use
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: parentId,
            name: "oracle",
            input: { query: "what is X?" },
            complete: true,
          },
        ],
        state: { type: "complete" },
      },
      // Tool result with run.progress containing tool_uses
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: parentId,
            run: {
              status: "done",
              progress: [
                {
                  tool_uses: [
                    {
                      id: "prog-tool-1",
                      tool_name: "Read",
                      normalized_name: "Read",
                      input: { path: "/foo.ts" },
                      status: "done",
                      result: "file contents",
                    },
                    {
                      id: "prog-tool-2",
                      tool_name: "Grep",
                      normalized_name: "Grep",
                      input: { pattern: "foo" },
                      status: "done",
                      result: "match found",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result[parentId]).toBeDefined();
    expect(result[parentId].tools.length).toBe(2);
    expect(result[parentId].tools[0].toolUse.name).toBe("Read");
    expect(result[parentId].tools[0].toolUse.id).toBe("prog-tool-1");
    expect(result[parentId].tools[0].toolRun.status).toBe("done");
    expect(result[parentId].tools[0].toolRun.result).toBe("file contents");
    expect(result[parentId].tools[1].toolUse.name).toBe("Grep");
    expect(result[parentId].tools[1].toolUse.id).toBe("prog-tool-2");
    expect(result[parentId].tools[1].toolRun.status).toBe("done");
    expect(result[parentId].tools[1].toolRun.result).toBe("match found");
  });

  it("Path 1 data takes priority over Path 2", () => {
    const parentId = "parent-both-paths";
    const messages: RawMessage[] = [
      // Assistant with subagent tool_use
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: parentId,
            name: "Task",
            input: { description: "analyze" },
            complete: true,
          },
        ],
        state: { type: "complete" },
      },
      // Tool result with progress (Path 2 data)
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: parentId,
            run: {
              status: "done",
              progress: [
                {
                  tool_uses: [
                    {
                      id: "progress-tool",
                      tool_name: "Read",
                      normalized_name: "Read",
                      input: { path: "/stale.ts" },
                      status: "done",
                      result: "stale data",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      // Child tool_use in subagent (Path 1 data)
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "fresh-tool",
            name: "Bash",
            input: { command: "cat /fresh.ts" },
            complete: true,
          },
        ],
        state: { type: "complete" },
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
      // Tool result for child
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: "fresh-tool",
            run: { status: "done", result: "fresh data" },
          },
        ],
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result[parentId]).toBeDefined();
    // Path 1 data should win — the tool from parentToolUseId messages
    expect(result[parentId].tools.length).toBe(1);
    expect(result[parentId].tools[0].toolUse.id).toBe("fresh-tool");
    expect(result[parentId].tools[0].toolUse.name).toBe("Bash");
    expect(result[parentId].tools[0].toolRun.result).toBe("fresh data");
  });

  it("preserves original status for cancelled parentToolUseId messages", () => {
    const parentId = "parent-cancelled";
    const messages: RawMessage[] = [
      // Assistant with subagent tool_use
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: parentId,
            name: "Task",
            input: { description: "work" },
            complete: true,
          },
        ],
        state: { type: "complete" },
      },
      // Tool result marking the parent as cancelled
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: parentId,
            run: { status: "cancelled", progress: [] },
          },
        ],
      },
      // Child tool that was "done" before parent was cancelled
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "child-done-tool",
            name: "Read",
            input: { path: "/file.ts" },
            complete: true,
          },
        ],
        state: { type: "complete" },
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: "child-done-tool",
            run: { status: "done", result: "content" },
          },
        ],
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
      // Child tool that was still in-progress when cancelled
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "child-in-progress-tool",
            name: "Bash",
            input: { command: "sleep 10" },
            complete: true,
          },
        ],
        state: { type: "complete" },
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: "child-in-progress-tool",
            run: { status: "in-progress" },
          },
        ],
        parentToolUseId: parentId,
      } as RawMessage & { parentToolUseId: string },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result[parentId]).toBeDefined();
    // The done tool stays done (wt() check — terminal statuses are not overwritten)
    expect(result[parentId].tools[0].toolRun.status).toBe("done");
    // The in-progress tool gets cancelled (parent was cancelled, child was not terminal)
    expect(result[parentId].tools[1].toolRun.status).toBe("cancelled");
    expect(result[parentId].tools[1].toolRun.reason).toBe("Parent subagent was cancelled");
  });

  it("generates synthetic IDs for progress tools without IDs", () => {
    const parentId = "parent-no-ids";
    const messages: RawMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: parentId,
            name: "finder",
            input: { query: "test" },
            complete: true,
          },
        ],
        state: { type: "complete" },
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: parentId,
            run: {
              status: "done",
              progress: [
                {
                  tool_uses: [
                    {
                      // No ID
                      tool_name: "Read",
                      normalized_name: "Read",
                      input: { path: "/a.ts" },
                      status: "done",
                      result: "a",
                    },
                    {
                      // No ID
                      tool_name: "Grep",
                      normalized_name: "Grep",
                      input: { pattern: "x" },
                      status: "done",
                      result: "x found",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result[parentId]).toBeDefined();
    expect(result[parentId].tools.length).toBe(2);
    // Synthetic IDs should be generated in the format `${parentId}:progress:${index}`
    expect(result[parentId].tools[0].toolUse.id).toBe(`${parentId}:progress:0`);
    expect(result[parentId].tools[1].toolUse.id).toBe(`${parentId}:progress:1`);
  });

  it("handles error status in progress tools", () => {
    const parentId = "parent-error-progress";
    const messages: RawMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: parentId,
            name: "oracle",
            input: { query: "test" },
            complete: true,
          },
        ],
        state: { type: "complete" },
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            toolUseID: parentId,
            run: {
              status: "done",
              progress: [
                {
                  tool_uses: [
                    {
                      id: "err-tool",
                      tool_name: "Bash",
                      normalized_name: "Bash",
                      input: { command: "bad" },
                      status: "error",
                      error: "command not found",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ];

    const result = buildSubagentContentByParentID(messages);
    expect(result[parentId].tools[0].toolRun.status).toBe("error");
    expect(result[parentId].tools[0].toolRun.error).toEqual({
      message: "command not found",
    });
  });
});
