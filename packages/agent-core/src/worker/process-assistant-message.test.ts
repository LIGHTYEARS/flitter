/**
 * processAssistantMessage unit tests
 *
 * 逆向: amp-cli-reversed/modules/1087_ProcessAssistantMessage_IbT.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantContentBlock } from "@flitter/schemas";
import { processAssistantMessage } from "./process-assistant-message";

describe("processAssistantMessage", () => {
  it("trims whitespace from text blocks", () => {
    const input = [
      { type: "text", text: "  hello world  " },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 1);
    assert.equal((result[0] as Record<string, unknown>).text, "hello world");
  });

  it("trims whitespace from thinking blocks", () => {
    const input = [
      { type: "thinking", thinking: "\n  deep thought  \n" },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 1);
    assert.equal((result[0] as Record<string, unknown>).thinking, "deep thought");
  });

  it("filters out empty text blocks after trimming", () => {
    const input = [
      { type: "text", text: "  " },
      { type: "text", text: "hello" },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 1);
    assert.equal((result[0] as Record<string, unknown>).text, "hello");
  });

  it("filters out empty thinking blocks after trimming", () => {
    const input = [
      { type: "thinking", thinking: "  " },
      { type: "text", text: "hello" },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 1);
    assert.equal((result[0] as Record<string, unknown>).type, "text");
  });

  it("preserves tool_use blocks unchanged", () => {
    const input = [
      { type: "tool_use", id: "tu-1", name: "Bash", input: { command: "ls" } },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 1);
    assert.equal((result[0] as Record<string, unknown>).type, "tool_use");
    assert.equal((result[0] as Record<string, unknown>).name, "Bash");
  });

  it("handles mixed content", () => {
    const input = [
      { type: "thinking", thinking: "" },
      { type: "text", text: "  answer  " },
      { type: "tool_use", id: "tu-1", name: "Read", input: {} },
      { type: "text", text: "" },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 2);
    assert.equal((result[0] as Record<string, unknown>).text, "answer");
    assert.equal((result[1] as Record<string, unknown>).type, "tool_use");
  });

  it("returns empty array for all-empty content", () => {
    const input = [
      { type: "text", text: "  " },
      { type: "thinking", thinking: "\n" },
    ] as AssistantContentBlock[];
    const result = processAssistantMessage(input);
    assert.equal(result.length, 0);
  });

  it("handles empty input array", () => {
    const result = processAssistantMessage([]);
    assert.deepEqual(result, []);
  });
});
