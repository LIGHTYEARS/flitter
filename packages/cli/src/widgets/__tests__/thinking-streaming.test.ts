import { describe, expect, it } from "bun:test";
import type { ThinkingItem } from "../display-items.js";
import { transformThreadToDisplayItems } from "../display-items.js";

describe("thinking block streaming/cancelled state", () => {
  it("marks last thinking block as streaming when message is streaming", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [{ type: "thinking", thinking: "Let me think..." }],
        state: { type: "streaming" },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinking = items.find((i) => i.type === "thinking") as ThinkingItem;
    expect(thinking).toBeDefined();
    expect(thinking.isStreaming).toBe(true);
    expect(thinking.isCancelled).toBeFalsy();
  });

  it("marks last thinking block as cancelled when message is cancelled", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [{ type: "thinking", thinking: "I was thinking..." }],
        state: { type: "cancelled" },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinking = items.find((i) => i.type === "thinking") as ThinkingItem;
    expect(thinking).toBeDefined();
    expect(thinking.isCancelled).toBe(true);
    expect(thinking.isStreaming).toBeFalsy();
  });

  it("only marks the last thinking block, not earlier ones", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "thinking", thinking: "First thought" },
          { type: "thinking", thinking: "Second thought" },
        ],
        state: { type: "streaming" },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinkingItems = items.filter((i) => i.type === "thinking") as ThinkingItem[];
    expect(thinkingItems).toHaveLength(2);
    expect(thinkingItems[0].isStreaming).toBeFalsy();
    expect(thinkingItems[1].isStreaming).toBe(true);
  });

  it("does not mark thinking as streaming for complete messages", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "thinking", thinking: "Done thinking" },
          { type: "text", text: "The answer is 4." },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinking = items.find((i) => i.type === "thinking") as ThinkingItem;
    expect(thinking.isStreaming).toBeFalsy();
    expect(thinking.isCancelled).toBeFalsy();
  });
});
