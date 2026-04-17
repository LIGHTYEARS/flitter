import { describe, expect, it } from "bun:test";
import { detectAtMention } from "../file-autocomplete";

describe("detectAtMention", () => {
  it("returns null when there is no @ in text", () => {
    expect(detectAtMention("hello world", 5)).toBeNull();
  });

  it("detects @ at cursor position", () => {
    const result = detectAtMention("hello @", 7);
    expect(result).toEqual({ triggerIndex: 6, query: "" });
  });

  it("detects @ with partial query", () => {
    const result = detectAtMention("hello @src/ma", 13);
    expect(result).toEqual({ triggerIndex: 6, query: "src/ma" });
  });

  it("detects @ at the start of text", () => {
    const result = detectAtMention("@file.ts", 8);
    expect(result).toEqual({ triggerIndex: 0, query: "file.ts" });
  });

  it("ignores @ in the middle of a word", () => {
    expect(detectAtMention("user@example.com", 16)).toBeNull();
  });

  it("detects only the last @ trigger", () => {
    const result = detectAtMention("@first then @second", 19);
    expect(result).toEqual({ triggerIndex: 12, query: "second" });
  });
});
