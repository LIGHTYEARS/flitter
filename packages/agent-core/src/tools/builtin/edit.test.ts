/**
 * EditTool unit tests
 *
 * Covers: ToolSpec shape, unique match, not found, multiple matches,
 * replace_all, same string error, file not found, editExecutionProfile,
 * and post-edit file content verification.
 */
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { EditTool, editExecutionProfile } from "./edit";
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

describe("EditTool", () => {
  let tmpDir: string;

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "edittool-test-"));

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    assert.equal(EditTool.name, "Edit");
    assert.equal(EditTool.source, "builtin");
    assert.equal(EditTool.isReadOnly, false);
    assert.equal(typeof EditTool.execute, "function");
    assert.equal(typeof EditTool.description, "string");
    assert.ok(EditTool.inputSchema);
  });

  // ─── Unique match replacement ─────────────────────────────

  it("replaces a unique match successfully", async () => {
    const filePath = path.join(tmpDir, "unique.txt");
    fs.writeFileSync(filePath, "hello world\nfoo bar\n", "utf-8");

    const result = await EditTool.execute(
      {
        file_path: filePath,
        old_string: "hello world",
        new_string: "goodbye world",
      },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content);
    assert.match(result.content!, /Successfully edited/);
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, "goodbye world\nfoo bar\n");
  });

  // ─── old_string not found ─────────────────────────────────

  it("returns error when old_string not found", async () => {
    const filePath = path.join(tmpDir, "notfound.txt");
    fs.writeFileSync(filePath, "hello world\n", "utf-8");

    const result = await EditTool.execute(
      {
        file_path: filePath,
        old_string: "nonexistent",
        new_string: "replacement",
      },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error);
    assert.match(result.error!, /not found/);
  });

  // ─── Multiple matches without replace_all ─────────────────

  it("returns error with count when multiple matches found without replace_all", async () => {
    const filePath = path.join(tmpDir, "multi.txt");
    fs.writeFileSync(filePath, "aaa bbb aaa ccc aaa\n", "utf-8");

    const result = await EditTool.execute(
      {
        file_path: filePath,
        old_string: "aaa",
        new_string: "zzz",
      },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error);
    assert.match(result.error!, /3 occurrences/);
    assert.match(result.error!, /replace_all/);
  });

  // ─── replace_all=true replaces all ────────────────────────

  it("replaces all occurrences when replace_all=true", async () => {
    const filePath = path.join(tmpDir, "replaceall.txt");
    fs.writeFileSync(filePath, "aaa bbb aaa ccc aaa\n", "utf-8");

    const result = await EditTool.execute(
      {
        file_path: filePath,
        old_string: "aaa",
        new_string: "zzz",
        replace_all: true,
      },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    assert.ok(result.content);
    assert.match(result.content!, /3 occurrences/);
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(actual, "zzz bbb zzz ccc zzz\n");
  });

  // ─── old_string === new_string ────────────────────────────

  it("returns error when old_string equals new_string", async () => {
    const filePath = path.join(tmpDir, "samestring.txt");
    fs.writeFileSync(filePath, "hello\n", "utf-8");

    const result = await EditTool.execute(
      {
        file_path: filePath,
        old_string: "hello",
        new_string: "hello",
      },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error);
    assert.match(result.error!, /must be different/);
  });

  // ─── File not found ────────────────────────────────────────

  it("returns error for non-existent file", async () => {
    const result = await EditTool.execute(
      {
        file_path: path.join(tmpDir, "nonexistent.txt"),
        old_string: "foo",
        new_string: "bar",
      },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error);
    assert.match(result.error!, /File not found/);
  });

  // ─── editExecutionProfile ─────────────────────────────────

  it("editExecutionProfile returns correct resourceKeys", () => {
    const profile = editExecutionProfile({ file_path: "/some/path.txt" });
    assert.deepEqual(profile, {
      resourceKeys: [{ key: "/some/path.txt", mode: "write" }],
    });
  });

  // ─── Verify file content after edit ───────────────────────

  it("preserves unchanged content after a targeted edit", async () => {
    const filePath = path.join(tmpDir, "preserve.txt");
    const original =
      "line 1\nline 2 target\nline 3\nline 4\nline 5\n";
    fs.writeFileSync(filePath, original, "utf-8");

    const result = await EditTool.execute(
      {
        file_path: filePath,
        old_string: "line 2 target",
        new_string: "line 2 replaced",
      },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    const actual = fs.readFileSync(filePath, "utf-8");
    assert.equal(
      actual,
      "line 1\nline 2 replaced\nline 3\nline 4\nline 5\n",
    );
  });
});
