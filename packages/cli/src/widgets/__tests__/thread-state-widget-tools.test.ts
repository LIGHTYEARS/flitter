// packages/cli/src/widgets/__tests__/thread-state-widget-tools.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items";

describe("ThreadStateWidget display item integration", () => {
  it("transforms a thread snapshot with tool_use blocks into DisplayItems", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Read /tmp/a.txt" }] },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Reading the file." },
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
            run: { status: "done" as const, result: "hello" },
          },
        ],
      },
      {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: "The file contains 'hello'." }],
        state: { type: "complete" as const },
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items.length).toBeGreaterThanOrEqual(3);
    // User message
    expect(items[0]).toMatchObject({ type: "message", role: "user" });
    // Assistant text + read activity
    const hasActivity = items.some((i) => i.type === "activity-group");
    const hasAssistantText = items.some((i) => i.type === "message" && i.role === "assistant");
    expect(hasActivity || hasAssistantText).toBe(true);
  });
});
