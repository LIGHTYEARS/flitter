/**
 * WriteTool unit tests
 *
 * Covers: ToolSpec shape, new file write, overwrite, auto-create dirs,
 * empty content, writeExecutionProfile, outputFiles.
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { WriteTool, writeExecutionProfile } from "./write";
import type { ToolContext } from "../types";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as any,
    ...overrides,
  };
}

describe("WriteTool", () => {
  let tmpDir: string;

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writetool-test-"));

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    assert.equal(WriteTool.name, "Write");
    assert.equal(WriteTool.source, "builtin");
    assert.equal(WriteTool.isReadOnly, false);
    assert.equal(typeof WriteTool.execute, "function");
    assert.equal(typeof WriteTool.description, "string");
    assert.ok(WriteTool.inputSchema);
  });

  // ─── Write new file ───────────────────────────────────────

  it("writes a new file and returns confirmation message", async () => {
    const filePath = path.join(tmpDir, "new-file.txt");
    const content = "Hello, world!\nSecond line.\n";

    const result = await WriteTool.execute(
      { file_path: filePath, content },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content);
    assert.match(result.content!, /Successfully wrote/);
    assert.match(result.content!, /3 lines/); // "Hello, world!\nSecond line.\n" splits to 3
    // Verify actual file content
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, content);
  });

  // ─── Overwrite existing file ──────────────────────────────

  it("overwrites an existing file", async () => {
    const filePath = path.join(tmpDir, "overwrite.txt");
    fs.writeFileSync(filePath, "original content", "utf-8");

    const result = await WriteTool.execute(
      { file_path: filePath, content: "new content" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, "new content");
  });

  // ─── Auto-create intermediate directories ─────────────────

  it("creates intermediate directories automatically", async () => {
    const filePath = path.join(tmpDir, "deep", "nested", "dir", "file.txt");

    const result = await WriteTool.execute(
      { file_path: filePath, content: "nested content" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(fs.existsSync(filePath));
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, "nested content");
  });

  // ─── Empty content write ──────────────────────────────────

  it("handles empty content write", async () => {
    const filePath = path.join(tmpDir, "empty.txt");

    const result = await WriteTool.execute(
      { file_path: filePath, content: "" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, "");
  });

  // ─── writeExecutionProfile ────────────────────────────────

  it("writeExecutionProfile returns correct resourceKeys", () => {
    const profile = writeExecutionProfile({ file_path: "/some/path.txt" });
    assert.deepEqual(profile, {
      resourceKeys: [{ key: "/some/path.txt", mode: "write" }],
    });
  });

  // ─── outputFiles ──────────────────────────────────────────

  it("outputFiles contains the written file path", async () => {
    const filePath = path.join(tmpDir, "output-check.txt");

    const result = await WriteTool.execute(
      { file_path: filePath, content: "test" },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.outputFiles);
    assert.deepEqual(result.outputFiles, [filePath]);
  });
});
