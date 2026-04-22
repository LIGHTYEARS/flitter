import { describe, expect, it } from "bun:test";
import type { ToolItem } from "../display-items.js";
import { transformThreadToDisplayItems } from "../display-items.js";

describe("cancellation-requested status", () => {
  it("passes cancellation-requested status through to ToolItem", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "tool_use", id: "tu-cr", name: "Bash", input: { command: "ls" } },
          { type: "tool_result", toolUseID: "tu-cr", run: { status: "cancellation-requested" } },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.status).toBe("cancellation-requested");
  });
});
