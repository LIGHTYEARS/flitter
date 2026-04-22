import { describe, expect, it } from "bun:test";
import type { ToolItem } from "../display-items.js";
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
