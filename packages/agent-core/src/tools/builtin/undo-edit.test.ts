/**
 * UndoEditTool unit tests
 *
 * Covers: ToolSpec shape, successful undo, no history error,
 * relative path error, diff output format, filesystem write-back,
 * tracker revert after undo.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import { FileChangeTracker } from "../file-change-tracker";
import type { ToolContext } from "../types";
import { createUndoEditTool } from "./undo-edit";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as unknown as Config,
    ...overrides,
  };
}

describe("UndoEditTool", () => {
  let tmpDir: string;

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "undoedit-test-"));

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);
    assert.equal(tool.name, "undo_edit");
    assert.equal(tool.source, "builtin");
    assert.equal(tool.isReadOnly, false);
    assert.equal(typeof tool.execute, "function");
    assert.ok(tool.description.includes("Undo"));
    assert.ok(tool.inputSchema);
  });

  // ─── Successful undo ──────────────────────────────────────

  it("reverts a file to its previous content", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);
    const filePath = path.join(tmpDir, "undo-test.txt");

    // Simulate an edit: old content -> new content
    fs.writeFileSync(filePath, "new content", "utf-8");
    tracker.record(filePath, "old content", "new content");

    const result = await tool.execute({ path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    // File should be reverted
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, "old content");
    // Output should contain diff markers
    assert.ok(result.content);
    assert.ok(result.content!.includes("diff"));
  });

  it("returns diff showing undone changes", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);
    const filePath = path.join(tmpDir, "undo-diff.txt");

    fs.writeFileSync(filePath, "line1\nchanged\nline3\n", "utf-8");
    tracker.record(filePath, "line1\noriginal\nline3\n", "line1\nchanged\nline3\n");

    const result = await tool.execute({ path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    assert.ok(result.content);
    // Diff should show the change from "changed" back to "original"
    assert.ok(result.content!.includes("-changed") || result.content!.includes("+original"));
  });

  it("pops from tracker after undo", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);
    const filePath = path.join(tmpDir, "undo-pop.txt");

    fs.writeFileSync(filePath, "v2", "utf-8");
    tracker.record(filePath, "v0", "v1");
    tracker.record(filePath, "v1", "v2");

    // First undo: v2 -> v1
    await tool.execute({ path: filePath }, createMockContext());
    assert.equal(fs.readFileSync(filePath, "utf-8"), "v1");

    // Second undo: v1 -> v0
    await tool.execute({ path: filePath }, createMockContext());
    assert.equal(fs.readFileSync(filePath, "utf-8"), "v0");

    // No more history
    const result = await tool.execute({ path: filePath }, createMockContext());
    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("No edit history"));
  });

  it("includes outputFiles in result", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);
    const filePath = path.join(tmpDir, "undo-output.txt");

    fs.writeFileSync(filePath, "new", "utf-8");
    tracker.record(filePath, "old", "new");

    const result = await tool.execute({ path: filePath }, createMockContext());
    assert.deepEqual(result.outputFiles, [filePath]);
  });

  // ─── Error cases ──────────────────────────────────────────

  it("returns error for no edit history", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);

    const result = await tool.execute(
      { path: path.join(tmpDir, "no-history.txt") },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("No edit history"));
  });

  it("returns error for relative path", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);

    const result = await tool.execute({ path: "relative/path.txt" }, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("absolute"));
  });

  it("returns error for missing path", async () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);

    const result = await tool.execute({}, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error!.includes("path"));
  });

  // ─── executionProfile ────────────────────────────────────

  it("executionProfile is undefined (dynamic file path)", () => {
    const tracker = new FileChangeTracker();
    const tool = createUndoEditTool(tracker);
    assert.equal(tool.executionProfile, undefined);
  });
});
