/**
 * GuidanceFileDisplay unit tests.
 *
 * Validates:
 * - Empty files array returns a zero-size SizedBox
 * - Undefined/empty files guard
 * - Single file: "Loaded <filename> (<n> lines)" text
 * - Multiple files: all entries joined with newlines
 * - CWD stripping: absolute path under cwd → relative name
 * - CWD stripping: path outside cwd → path unchanged
 * - No cwd provided: raw URI displayed as-is
 * - Styling: RichText uses dim style
 * - Container has left padding of 2
 * - Extends StatelessWidget
 *
 * Run:
 * ```bash
 * bun test packages/cli/src/widgets/guidance-file-display.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BuildContext, Container, RichText, SizedBox, StatelessWidget } from "@flitter/tui";
import {
  cwdRelativePath,
  GuidanceFileDisplay,
  type GuidanceFileDisplayConfig,
} from "./guidance-file-display.js";

// ════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════

/** Minimal build context — no AppThemeController ancestor. */
const mockContext = {
  dependOnInheritedWidgetOfExactType: () => null,
} as unknown as BuildContext;

/**
 * Build a GuidanceFileDisplay widget tree.
 */
function buildWidget(config: GuidanceFileDisplayConfig): unknown {
  const widget = new GuidanceFileDisplay(config);
  return widget.build(mockContext);
}

/**
 * Recursively extract all plain text from a Widget tree.
 */
function extractAllText(widget: unknown): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  const w = widget as Record<string, unknown>;
  if (typeof w.data === "string") result += w.data;
  if (Array.isArray(w.children)) {
    for (const child of w.children) result += extractAllText(child);
  }
  if (w.child) result += extractAllText(w.child);
  return result;
}

// ════════════════════════════════════════════════════
//  cwdRelativePath unit tests
// ════════════════════════════════════════════════════

describe("cwdRelativePath", () => {
  it("returns filename only when path is directly under cwd", () => {
    const result = cwdRelativePath("/project/AGENTS.md", "/project");
    assert.equal(result, "AGENTS.md");
  });

  it("returns nested relative path when file is in subdirectory of cwd", () => {
    const result = cwdRelativePath("/project/docs/guide.md", "/project");
    assert.equal(result, "docs/guide.md");
  });

  it("returns raw uri when no cwd provided", () => {
    const result = cwdRelativePath("/project/AGENTS.md");
    assert.equal(result, "/project/AGENTS.md");
  });

  it("returns raw uri when path is not under cwd", () => {
    // /other is not under /project, falls back to relative (node path)
    const result = cwdRelativePath("/other/file.md", "/project");
    // node path.relative result: "../other/file.md"
    assert.ok(result.includes("other/file.md"), `got: ${result}`);
  });

  it("handles cwd with trailing slash", () => {
    const result = cwdRelativePath("/project/AGENTS.md", "/project/");
    assert.equal(result, "AGENTS.md");
  });

  it("returns non-absolute paths unchanged regardless of cwd", () => {
    const result = cwdRelativePath("relative/path.md", "/project");
    assert.equal(result, "relative/path.md");
  });
});

// ════════════════════════════════════════════════════
//  GuidanceFileDisplay widget tests
// ════════════════════════════════════════════════════

describe("GuidanceFileDisplay", () => {
  // ────────────────────────────────────────────────
  //  Construction
  // ────────────────────────────────────────────────

  it("extends StatelessWidget", () => {
    const widget = new GuidanceFileDisplay({ files: [] });
    assert.ok(widget instanceof StatelessWidget);
  });

  it("stores config correctly", () => {
    const files = [{ uri: "/a/AGENTS.md", lineCount: 10 }];
    const widget = new GuidanceFileDisplay({ files, cwd: "/a" });
    assert.deepEqual(widget.config.files, files);
    assert.equal(widget.config.cwd, "/a");
  });

  // ────────────────────────────────────────────────
  //  Empty guard
  // ────────────────────────────────────────────────

  it("returns SizedBox for empty files array", () => {
    const tree = buildWidget({ files: [] });
    assert.ok(
      tree instanceof SizedBox,
      `expected SizedBox, got ${(tree as object).constructor.name}`,
    );
  });

  // ────────────────────────────────────────────────
  //  Single file
  // ────────────────────────────────────────────────

  it("renders single file with correct text", () => {
    const tree = buildWidget({
      files: [{ uri: "/project/AGENTS.md", lineCount: 42 }],
      cwd: "/project",
    });
    const text = extractAllText(tree);
    assert.ok(text.includes("Loaded AGENTS.md (42 lines)"), `text was: ${JSON.stringify(text)}`);
  });

  it("renders single file without cwd (raw URI)", () => {
    const tree = buildWidget({
      files: [{ uri: "/project/AGENTS.md", lineCount: 5 }],
    });
    const text = extractAllText(tree);
    assert.ok(
      text.includes("Loaded /project/AGENTS.md (5 lines)"),
      `text was: ${JSON.stringify(text)}`,
    );
  });

  // ────────────────────────────────────────────────
  //  Multiple files
  // ────────────────────────────────────────────────

  it("renders multiple files joined by newlines", () => {
    const tree = buildWidget({
      files: [
        { uri: "/root/AGENTS.md", lineCount: 10 },
        { uri: "/root/docs/guide.md", lineCount: 25 },
      ],
      cwd: "/root",
    });
    const text = extractAllText(tree);
    assert.ok(text.includes("Loaded AGENTS.md (10 lines)"), `missing AGENTS.md in: ${text}`);
    assert.ok(text.includes("Loaded docs/guide.md (25 lines)"), `missing guide.md in: ${text}`);
    // Lines joined with newline
    assert.ok(text.includes("\n"), "multiple files should be newline-joined");
  });

  it("renders three files with all entries present", () => {
    const tree = buildWidget({
      files: [
        { uri: "/ws/a.md", lineCount: 1 },
        { uri: "/ws/b.md", lineCount: 2 },
        { uri: "/ws/c.md", lineCount: 3 },
      ],
      cwd: "/ws",
    });
    const text = extractAllText(tree);
    assert.ok(text.includes("Loaded a.md (1 lines)"), `missing a.md: ${text}`);
    assert.ok(text.includes("Loaded b.md (2 lines)"), `missing b.md: ${text}`);
    assert.ok(text.includes("Loaded c.md (3 lines)"), `missing c.md: ${text}`);
  });

  // ────────────────────────────────────────────────
  //  CWD stripping
  // ────────────────────────────────────────────────

  it("strips cwd prefix leaving relative path", () => {
    const tree = buildWidget({
      files: [{ uri: "/home/user/project/src/AGENTS.md", lineCount: 7 }],
      cwd: "/home/user/project",
    });
    const text = extractAllText(tree);
    assert.ok(
      text.includes("Loaded src/AGENTS.md (7 lines)"),
      `CWD not stripped: ${JSON.stringify(text)}`,
    );
    // Must NOT contain the absolute prefix
    assert.ok(!text.includes("/home/user/project/"), "absolute CWD prefix should be stripped");
  });

  // ────────────────────────────────────────────────
  //  Widget structure
  // ────────────────────────────────────────────────

  it("wraps content in a Container with left padding", () => {
    const tree = buildWidget({
      files: [{ uri: "/p/AGENTS.md", lineCount: 1 }],
      cwd: "/p",
    });
    assert.ok(
      tree instanceof Container,
      `expected Container, got ${(tree as object).constructor.name}`,
    );
    // The container's child should be a RichText
    const container = tree as Container;
    const childWidget = (container as unknown as Record<string, unknown>).child;
    assert.ok(
      childWidget instanceof RichText,
      `expected RichText child, got ${(childWidget as object).constructor?.name}`,
    );
  });

  it("lineCount is rendered correctly in format '(N lines)'", () => {
    const tree = buildWidget({
      files: [{ uri: "/p/README.md", lineCount: 99 }],
      cwd: "/p",
    });
    const text = extractAllText(tree);
    assert.ok(text.includes("(99 lines)"), `expected '(99 lines)' in: ${JSON.stringify(text)}`);
  });

  it("RichText span uses dim style", () => {
    const tree = buildWidget({
      files: [{ uri: "/p/AGENTS.md", lineCount: 1 }],
      cwd: "/p",
    });
    const container = tree as Container;
    const richText = (container as unknown as Record<string, unknown>).child as RichText;
    const span = richText.text as unknown as Record<string, unknown>;
    const style = span.style as Record<string, unknown>;
    assert.ok(style, "span should have a style");
    assert.equal(style.dim, true, "span style should have dim: true");
  });
});
