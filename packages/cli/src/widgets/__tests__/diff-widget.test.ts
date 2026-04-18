// packages/cli/src/widgets/__tests__/diff-widget.test.ts
/**
 * Tests for DiffWidget — parseDiffLines, generateSimpleDiff, buildDiffWidget.
 *
 * 逆向: cE0() (chunk-004.js:21105-21125),
 *        $A() (modules/1186_unknown_dWT.js:1-7)
 */
import { describe, expect, test } from "bun:test";
import { buildDiffWidget, generateSimpleDiff, parseDiffLines } from "../diff-widget.js";

describe("parseDiffLines", () => {
  test("parses unified diff into typed lines", () => {
    const diff = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 4;`;
    const lines = parseDiffLines(diff);
    // Should skip header lines (---/+++/@@) and parse content
    expect(lines.length).toBe(7);
    expect(lines[0]).toEqual({ type: "meta", text: "--- a/file.ts" });
    expect(lines[1]).toEqual({ type: "meta", text: "+++ b/file.ts" });
    expect(lines[2]).toEqual({ type: "meta", text: "@@ -1,3 +1,3 @@" });
    expect(lines[3]).toEqual({ type: "context", text: " const x = 1;" });
    expect(lines[4]).toEqual({ type: "removed", text: "-const y = 2;" });
    expect(lines[5]).toEqual({ type: "added", text: "+const y = 3;" });
    expect(lines[6]).toEqual({ type: "context", text: " const z = 4;" });
  });

  test("handles empty diff", () => {
    const lines = parseDiffLines("");
    expect(lines).toEqual([]);
  });

  test("handles diff with only additions", () => {
    const diff = `+line 1
+line 2`;
    const lines = parseDiffLines(diff);
    expect(lines).toEqual([
      { type: "added", text: "+line 1" },
      { type: "added", text: "+line 2" },
    ]);
  });

  test("handles diff with only deletions", () => {
    const diff = `-old line 1
-old line 2`;
    const lines = parseDiffLines(diff);
    expect(lines).toEqual([
      { type: "removed", text: "-old line 1" },
      { type: "removed", text: "-old line 2" },
    ]);
  });
});

describe("generateSimpleDiff", () => {
  test("generates unified diff for simple replacement", () => {
    const diff = generateSimpleDiff("hello\nworld\n", "hello\nearth\n", "test.txt");
    expect(diff).toContain("--- a/test.txt");
    expect(diff).toContain("+++ b/test.txt");
    expect(diff).toContain("-world");
    expect(diff).toContain("+earth");
  });

  test("generates diff for pure addition", () => {
    const diff = generateSimpleDiff("", "new content\n", "new.txt");
    expect(diff).toContain("+new content");
  });

  test("generates empty hunks for identical content", () => {
    const diff = generateSimpleDiff("same\n", "same\n", "file.txt");
    // Should have headers but no hunks
    expect(diff).toContain("--- a/file.txt");
    expect(diff).not.toContain("+same");
    expect(diff).not.toContain("-same");
  });
});

describe("buildDiffWidget", () => {
  test("renders added lines with correct structure", () => {
    const widget = buildDiffWidget("+added line\n-removed line\n context");
    // Widget should be a RichText (we just verify it doesn't throw)
    expect(widget).toBeDefined();
  });

  test("handles empty diff gracefully", () => {
    const widget = buildDiffWidget("");
    expect(widget).toBeDefined();
  });

  test("handles whitespace-only diff", () => {
    const widget = buildDiffWidget("   ");
    expect(widget).toBeDefined();
  });
});
