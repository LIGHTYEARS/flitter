/**
 * DeleteFileTool unit tests
 *
 * Covers: ToolSpec shape, successful deletion, file-not-found error,
 * directory rejection, relative path error, tracker integration, undo support.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import { FileChangeTracker } from "../file-change-tracker";
import type { ToolContext } from "../types";
import { createDeleteFileTool } from "./delete-file";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as unknown as Config,
    ...overrides,
  };
}

describe("DeleteFileTool", () => {
  let tmpDir: string;

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "deletefile-test-"));

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);
    assert.equal(tool.name, "delete_file");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, false);
    assert.equal(typeof tool.execute, "function");
    assert.ok(tool.description.includes("Delete"));
    assert.ok(tool.inputSchema);
  });

  // ─── Successful deletion ──────────────────────────────────

  it("deletes a file and returns confirmation", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);
    const filePath = path.join(tmpDir, "delete-me.txt");
    fs.writeFileSync(filePath, "content to delete", "utf-8");

    const result = await tool.execute({ path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    assert.ok(result.content!.includes("Deleted"));
    assert.ok(result.content!.includes(filePath));
    // File should be gone
    assert.equal(fs.existsSync(filePath), false);
  });

  it("records deletion in tracker for undo", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);
    const filePath = path.join(tmpDir, "track-delete.txt");
    fs.writeFileSync(filePath, "tracked content", "utf-8");

    await tool.execute({ path: filePath }, createMockContext());

    const lastEdit = tracker.getLastEdit(filePath);
    assert.ok(lastEdit);
    assert.equal(lastEdit.oldContent, "tracked content");
    assert.equal(lastEdit.newContent, "");
  });

  it("includes outputFiles in result", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);
    const filePath = path.join(tmpDir, "output-delete.txt");
    fs.writeFileSync(filePath, "x", "utf-8");

    const result = await tool.execute({ path: filePath }, createMockContext());
    assert.deepEqual(result.outputFiles, [filePath]);
  });

  // ─── Error cases ──────────────────────────────────────────

  it("returns error for non-existent file", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);

    const result = await tool.execute(
      { path: path.join(tmpDir, "no-such-file.txt") },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("File not found"));
  });

  it("returns error for directory", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);
    const dirPath = path.join(tmpDir, "a-directory");
    fs.mkdirSync(dirPath, { recursive: true });

    const result = await tool.execute({ path: dirPath }, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("Cannot delete directory"));
  });

  it("returns error for relative path", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);

    const result = await tool.execute({ path: "relative.txt" }, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("absolute"));
  });

  it("returns error for missing path", async () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);

    const result = await tool.execute({}, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("path"));
  });

  // ─── executionProfile ────────────────────────────────────

  it("executionProfile is undefined (dynamic file path)", () => {
    const tracker = new FileChangeTracker();
    const tool = createDeleteFileTool(tracker);
    assert.equal(tool.executionProfile, undefined);
  });
});
