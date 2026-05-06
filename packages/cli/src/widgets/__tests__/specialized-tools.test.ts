import { describe, expect, it } from "bun:test";
import type { SubagentToolItem, ToolItem } from "../display-items.js";
import { transformThreadToDisplayItems } from "../display-items.js";

describe("specialized tool rendering", () => {
  it("renders web_search with query as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-ws",
            name: "web_search",
            input: { query: "TypeScript generics tutorial" },
          },
          { type: "tool_result", toolUseID: "tu-ws", run: { status: "done" } },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("Web Search");
    expect(tool.args).toEqual({ detail: "TypeScript generics tutorial" });
  });

  it("renders task_list with action and title as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-tl",
            name: "task_list",
            input: { action: "add", title: "Fix login bug" },
          },
          { type: "tool_result", toolUseID: "tu-tl", run: { status: "done" } },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.toolName).toBe("task_list");
    expect(tool.args).toHaveProperty("detail");
    const detail = (tool.args as Record<string, unknown>).detail as string;
    expect(detail).toContain("add");
    expect(detail).toContain("Fix login bug");
  });

  it("renders read_web_page with URL as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-rwp",
            name: "read_web_page",
            input: { url: "https://example.com/docs" },
          },
          { type: "tool_result", toolUseID: "tu-rwp", run: { status: "done" } },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("read_web_page");
    expect(tool.args).toEqual({ detail: "https://example.com/docs" });
  });

  it("renders mermaid with code as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "tool_use", id: "tu-m", name: "mermaid", input: { code: "graph TD; A-->B;" } },
          { type: "tool_result", toolUseID: "tu-m", run: { status: "done" } },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("Mermaid");
    expect(tool.args).toHaveProperty("detail");
  });
});

describe("Task tool rendering", () => {
  it("Task without mode produces SubagentToolItem", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-task",
            name: "Task",
            input: { description: "Search for login bugs" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-task",
            run: { status: "done", result: "Found 3 bugs" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "subagent-tool") as SubagentToolItem;
    expect(tool).toBeDefined();
    expect(tool.type).toBe("subagent-tool");
    expect(tool.toolName).toBe("Subagent");
    expect(tool.description).toBe("Search for login bugs");
    expect(tool.status).toBe("done");
  });

  it("oracle tool produces SubagentToolItem with toolName Oracle", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-oracle",
            name: "oracle",
            input: { task: "Explain how caching works" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-oracle",
            run: { status: "done", result: "Caching stores..." },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "subagent-tool") as SubagentToolItem;
    expect(tool).toBeDefined();
    expect(tool.type).toBe("subagent-tool");
    expect(tool.toolName).toBe("Oracle");
    expect(tool.description).toBe("Explain how caching works");
    expect(tool.status).toBe("done");
  });

  it("librarian tool produces SubagentToolItem with toolName Librarian", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-lib",
            name: "librarian",
            input: { query: "Find all auth modules" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-lib",
            run: { status: "done", result: "Found auth/" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "subagent-tool") as SubagentToolItem;
    expect(tool).toBeDefined();
    expect(tool.type).toBe("subagent-tool");
    expect(tool.toolName).toBe("Librarian");
    expect(tool.description).toBe("Find all auth modules");
    expect(tool.status).toBe("done");
  });

  it("sa__code_writer produces SubagentToolItem with toolName Code Writer", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-sa",
            name: "sa__code_writer",
            input: { prompt: "Write a utility function" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-sa",
            run: { status: "done", result: "function util() {}" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "subagent-tool") as SubagentToolItem;
    expect(tool).toBeDefined();
    expect(tool.type).toBe("subagent-tool");
    expect(tool.toolName).toBe("Code Writer");
    expect(tool.description).toBe("Write a utility function");
    expect(tool.status).toBe("done");
  });

  it("sa__ with hyphenated name title-cases each segment", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-sa2",
            name: "sa__file-system-helper",
            input: { prompt: "Create a temp dir" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-sa2",
            run: { status: "in-progress" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "subagent-tool") as SubagentToolItem;
    expect(tool).toBeDefined();
    expect(tool.toolName).toBe("File System Helper");
    expect(tool.status).toBe("in-progress");
  });

  it("SubagentToolItem captures error from failed run", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-err",
            name: "Task",
            input: { description: "Do something" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-err",
            run: { status: "error", error: { message: "Timeout exceeded" } },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "subagent-tool") as SubagentToolItem;
    expect(tool).toBeDefined();
    expect(tool.status).toBe("error");
    expect(tool.error).toBe("Timeout exceeded");
  });
});
