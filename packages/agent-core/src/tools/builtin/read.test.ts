/**
 * ReadTool unit tests
 *
 * Covers: ToolSpec shape, normal reads, offset/limit, default limit,
 * long line truncation, file not found, binary detection, empty files,
 * and readExecutionProfile.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import type { ToolContext } from "../types";
import { ReadTool, readExecutionProfile } from "./read";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: "/tmp",
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as unknown as Config,
    ...overrides,
  };
}

describe("ReadTool", () => {
  let tmpDir: string;

  // Create a fresh temp directory for each describe block
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "readtool-test-"));

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── ToolSpec shape ────────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    assert.equal(ReadTool.name, "Read");
    assert.equal(ReadTool.source, "builtin");
    assert.equal(ReadTool.isReadOnly, true);
    assert.equal(typeof ReadTool.execute, "function");
    assert.equal(typeof ReadTool.description, "string");
    assert.ok(ReadTool.inputSchema);
  });

  // ─── Normal text file read ─────────────────────────────────

  it("reads a normal text file with cat -n line numbers", async () => {
    const filePath = path.join(tmpDir, "normal.txt");
    fs.writeFileSync(filePath, "line one\nline two\nline three\n", "utf-8");

    const result = await ReadTool.execute({ file_path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    assert.ok(result.content);
    // Check line number formatting (right-aligned to 6 chars)
    const lines = result.content!.split("\n");
    assert.equal(lines.length, 4); // 3 lines + trailing empty from \n
    assert.match(lines[0], /^\s+1\tline one$/);
    assert.match(lines[1], /^\s+2\tline two$/);
    assert.match(lines[2], /^\s+3\tline three$/);
  });

  // ─── offset/limit slicing ──────────────────────────────────

  it("applies offset and limit correctly", async () => {
    const filePath = path.join(tmpDir, "offset.txt");
    const content = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\n");
    fs.writeFileSync(filePath, content, "utf-8");

    const result = await ReadTool.execute(
      { file_path: filePath, offset: 3, limit: 4 },
      createMockContext(),
    );

    assert.equal(result.status, "done");
    const lines = result.content!.split("\n");
    assert.equal(lines.length, 4);
    assert.match(lines[0], /^\s+3\tline 3$/);
    assert.match(lines[1], /^\s+4\tline 4$/);
    assert.match(lines[2], /^\s+5\tline 5$/);
    assert.match(lines[3], /^\s+6\tline 6$/);
  });

  // ─── Default limit of 2000 lines ──────────────────────────

  it("enforces default limit of 2000 lines", async () => {
    const filePath = path.join(tmpDir, "large.txt");
    const content = Array.from({ length: 2500 }, (_, i) => `line ${i + 1}`).join("\n");
    fs.writeFileSync(filePath, content, "utf-8");

    const result = await ReadTool.execute({ file_path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    const lines = result.content!.split("\n");
    assert.equal(lines.length, 2000);
    // First line should be line 1
    assert.match(lines[0], /^\s+1\tline 1$/);
    // Last line should be line 2000
    assert.match(lines[1999], /^\s+2000\tline 2000$/);
  });

  // ─── Long line truncation ─────────────────────────────────

  it("truncates lines exceeding 2000 characters", async () => {
    const filePath = path.join(tmpDir, "longline.txt");
    const longLine = "x".repeat(2500);
    fs.writeFileSync(filePath, longLine, "utf-8");

    const result = await ReadTool.execute({ file_path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    const lines = result.content!.split("\n");
    // The line content part (after tab) should be truncated to 2000 + " [truncated]"
    const lineContent = lines[0].split("\t")[1];
    assert.equal(lineContent.length, 2000 + " [truncated]".length);
    assert.ok(lineContent.endsWith(" [truncated]"));
  });

  // ─── File not found ────────────────────────────────────────

  it("returns error for non-existent file", async () => {
    const result = await ReadTool.execute(
      { file_path: path.join(tmpDir, "nonexistent.txt") },
      createMockContext(),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error);
    assert.match(result.error!, /File not found/);
  });

  // ─── Binary file detection ────────────────────────────────

  it("returns error for binary files", async () => {
    const filePath = path.join(tmpDir, "binary.bin");
    // Write a buffer with null bytes
    const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6f]);
    fs.writeFileSync(filePath, buffer);

    const result = await ReadTool.execute({ file_path: filePath }, createMockContext());

    assert.equal(result.status, "error");
    assert.ok(result.error);
    assert.match(result.error!, /binary file/i);
  });

  // ─── readExecutionProfile ─────────────────────────────────

  it("readExecutionProfile returns correct resourceKeys", () => {
    const profile = readExecutionProfile({ file_path: "/some/path.txt" });
    assert.deepEqual(profile, {
      resourceKeys: [{ key: "/some/path.txt", mode: "read" }],
    });
  });

  // ─── Empty file handling ──────────────────────────────────

  it("handles empty files gracefully", async () => {
    const filePath = path.join(tmpDir, "empty.txt");
    fs.writeFileSync(filePath, "", "utf-8");

    const result = await ReadTool.execute({ file_path: filePath }, createMockContext());

    assert.equal(result.status, "done");
    assert.ok(typeof result.content === "string");
    // An empty file has one empty-string element when split by \n
    const lines = result.content!.split("\n");
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^\s+1\t$/);
  });
});
