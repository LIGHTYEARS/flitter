import { describe, expect, it } from "bun:test";
import { projectStreamingMessage } from "../display-items.js";

describe("projectStreamingMessage", () => {
  it("returns null when no streaming blocks", () => {
    expect(projectStreamingMessage([], null)).toBeNull();
  });

  it("returns null when streamingMessageId is null", () => {
    const blocks = [{ type: "text", text: "hello" }];
    expect(projectStreamingMessage(blocks, null)).toBeNull();
  });

  it("projects a synthetic assistant message from streaming blocks", () => {
    const blocks = [{ type: "text", text: "The answer is " }];
    const result = projectStreamingMessage(blocks, "msg-123");
    expect(result).not.toBeNull();
    expect(result!.role).toBe("assistant");
    expect(result!.content).toEqual(blocks);
    expect(result!.state).toEqual({ type: "streaming" });
  });

  it("projects thinking blocks alongside text", () => {
    const blocks = [
      { type: "thinking", thinking: "Let me reason..." },
      { type: "text", text: "The answer" },
    ];
    const result = projectStreamingMessage(blocks, "msg-456");
    expect(result).not.toBeNull();
    expect(result!.content).toHaveLength(2);
  });
});
