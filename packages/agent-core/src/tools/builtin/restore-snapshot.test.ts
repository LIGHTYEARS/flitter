/**
 * restore_snapshot tool — unit tests
 *
 * Tests the RestoreSnapshotTool spec: input validation, success path,
 * and error handling. The actual git operations are tested in
 * auto-snapshot.test.ts; here we verify the tool spec wrapper.
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ToolContext } from "../types";
import { RestoreSnapshotTool } from "./restore-snapshot";

// ─── Helpers ──────────────────────────────────────────────

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    workingDirectory: "/tmp/test-repo",
    readFileTimestamps: new Map(),
    ...overrides,
  } as ToolContext;
}

// ─── Tests ────────────────────────────────────────────────

describe("RestoreSnapshotTool", () => {
  it("has correct name and source", () => {
    assert.equal(RestoreSnapshotTool.name, "restore_snapshot");
    assert.equal(RestoreSnapshotTool.source, "builtin");
    assert.equal(RestoreSnapshotTool.isReadOnly, false);
  });

  it("has correct inputSchema with path and treeOID", () => {
    const schema = RestoreSnapshotTool.inputSchema;
    assert.equal(schema.type, "object");
    assert.ok(schema.properties?.path);
    assert.ok(schema.properties?.treeOID);
    assert.deepEqual(schema.required, ["path", "treeOID"]);
  });

  it("rejects missing path", async () => {
    const result = await RestoreSnapshotTool.execute({ treeOID: "abc123" }, makeContext());
    assert.equal(result.status, "error");
    assert.ok(typeof result.error === "string");
    assert.ok(result.error.includes("path"));
  });

  it("rejects missing treeOID", async () => {
    const result = await RestoreSnapshotTool.execute({ path: "." }, makeContext());
    assert.equal(result.status, "error");
    assert.ok(typeof result.error === "string");
    assert.ok(result.error.includes("treeOID"));
  });

  it("rejects empty workingDirectory", async () => {
    const result = await RestoreSnapshotTool.execute(
      { path: ".", treeOID: "abc123" },
      makeContext({ workingDirectory: "" }),
    );
    assert.equal(result.status, "error");
    assert.ok(typeof result.error === "string");
    assert.ok(result.error.includes("working directory"));
  });

  it("returns error on git failure (non-existent treeOID)", async () => {
    // This will fail because the treeOID doesn't exist in any repo
    const result = await RestoreSnapshotTool.execute(
      { path: ".", treeOID: "0000000000000000000000000000000000000000" },
      makeContext({ workingDirectory: "/tmp/nonexistent-repo" }),
    );
    assert.equal(result.status, "error");
    assert.ok(typeof result.error === "string");
    assert.ok(result.error.includes("Failed to restore snapshot"));
  });
});
