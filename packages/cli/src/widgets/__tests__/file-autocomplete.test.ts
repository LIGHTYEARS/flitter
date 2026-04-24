import { describe, expect, it } from "bun:test";
import { detectAtMention, detectDoubleAtTrigger, insertThreadMention } from "../file-autocomplete";

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

// ════════════════════════════════════════════════════
//  detectDoubleAtTrigger
//  逆向: actions_intents.js:2326 — `if (e.query === "@" && this.props.onDoubleAtTrigger)`
// ════════════════════════════════════════════════════

describe("detectDoubleAtTrigger", () => {
  it("returns -1 when text is too short", () => {
    expect(detectDoubleAtTrigger("@", 1)).toBe(-1);
    expect(detectDoubleAtTrigger("", 0)).toBe(-1);
  });

  it("detects @@ at start of text", () => {
    // text="@@", cursor=2 → first @ is at index 0
    expect(detectDoubleAtTrigger("@@", 2)).toBe(0);
  });

  it("detects @@ after a space", () => {
    // "hello @@", cursor=8 → first @ is at index 6
    expect(detectDoubleAtTrigger("hello @@", 8)).toBe(6);
  });

  it("detects @@ after a newline", () => {
    expect(detectDoubleAtTrigger("line1\n@@", 8)).toBe(6);
  });

  it("returns -1 for single @ (not @@ trigger)", () => {
    expect(detectDoubleAtTrigger("hello @", 7)).toBe(-1);
  });

  it("returns -1 when @ is in middle of word (not at boundary)", () => {
    // "user@@" — first @ is not at a word boundary
    expect(detectDoubleAtTrigger("user@@", 6)).toBe(-1);
  });

  it("returns -1 when cursor is not right after @@", () => {
    // "@@file" cursor at 4 — query is "@f", not "@"
    expect(detectDoubleAtTrigger("@@file", 4)).toBe(-1);
  });

  it("returns -1 when cursor is before @@", () => {
    expect(detectDoubleAtTrigger("@@", 1)).toBe(-1);
  });

  it("detects @@ preceded by open bracket", () => {
    // Amp uses /[\s([{]/ as word boundary chars
    expect(detectDoubleAtTrigger("(@@", 3)).toBe(1);
  });
});

// ════════════════════════════════════════════════════
//  insertThreadMention
//  逆向: jetbrains_wizard.js:3188-3201 — insertThreadMention
// ════════════════════════════════════════════════════

describe("insertThreadMention", () => {
  it("replaces @@ with @threadId and trailing space when at end of text", () => {
    const result = insertThreadMention("@@", 2, "thread-123");
    expect(result.text).toBe("@thread-123 ");
    expect(result.cursorPosition).toBe(12);
  });

  it("replaces @@ in middle of text without trailing space", () => {
    // text="@@ more", cursor=2 — after==" more", atEnd=false
    const result = insertThreadMention("@@ more", 2, "thread-123");
    expect(result.text).toBe("@thread-123 more");
    expect(result.cursorPosition).toBe(11);
  });

  it("replaces last @@ before cursor when there are multiple @@", () => {
    // "some @@ text @@", cursor=15 (end)
    const result = insertThreadMention("some @@ text @@", 15, "abc");
    expect(result.text).toBe("some @@ text @abc ");
    expect(result.cursorPosition).toBe(18);
  });

  it("replaces @@ after other text", () => {
    const result = insertThreadMention("hello @@", 8, "my-thread");
    expect(result.text).toBe("hello @my-thread ");
    expect(result.cursorPosition).toBe(17);
  });

  it("fallback: inserts @threadId at cursor when no @@ exists", () => {
    // cursor=5 in "hello world" → insert "@tid " at position 5 (right after "hello")
    const result = insertThreadMention("hello world", 5, "tid");
    expect(result.text).toBe("hello@tid  world");
    // cursorPosition = 5 + "@tid ".length = 5 + 5 = 10
    expect(result.cursorPosition).toBe(10);
  });

  it("handles empty text fallback", () => {
    const result = insertThreadMention("", 0, "t1");
    expect(result.text).toBe("@t1 ");
    expect(result.cursorPosition).toBe(4);
  });
});
