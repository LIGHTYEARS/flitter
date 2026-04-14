/**
 * FuzzyFindTool unit tests
 *
 * Covers ToolSpec shape, exact query, fuzzy query, limit parameter,
 * no-match case, and execution profile.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { FuzzyFindTool, fuzzyFindExecutionProfile } from "./fuzzy-find";
import type { ToolContext } from "../types";
import type { Config } from "@flitter/schemas";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createTestFixture(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-search-test-"));
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.mkdirSync(path.join(dir, "test"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "index.ts"),
    "export const hello = 'world';\nexport function greet() {}\n",
  );
  fs.writeFileSync(
    path.join(dir, "src", "utils.ts"),
    "export function add(a: number, b: number) { return a + b; }\n",
  );
  fs.writeFileSync(
    path.join(dir, "src", "component.tsx"),
    "import React from 'react';\nexport const App = () => <div>hello</div>;\n",
  );
  fs.writeFileSync(
    path.join(dir, "test", "index.test.ts"),
    "import { hello } from '../src';\nassert(hello === 'world');\n",
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# Test Project\n");
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}\n');
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

function createMockContext(cwd: string): ToolContext {
  return {
    workingDirectory: cwd,
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as Config,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FuzzyFindTool", () => {
  let fixture: ReturnType<typeof createTestFixture>;
  let ctx: ToolContext;

  beforeEach(() => {
    fixture = createTestFixture();
    ctx = createMockContext(fixture.dir);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  // ─── ToolSpec shape ──────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    assert.equal(FuzzyFindTool.name, "FuzzyFind");
    assert.equal(FuzzyFindTool.source, "builtin");
    assert.equal(FuzzyFindTool.isReadOnly, true);
    assert.equal(typeof FuzzyFindTool.execute, "function");
    assert.ok(FuzzyFindTool.inputSchema);
    assert.ok(FuzzyFindTool.description);
  });

  // ─── Exact query returns high-score match ────────────────

  it('exact query "index.ts" returns high-score match', async () => {
    const result = await FuzzyFindTool.execute({ query: "index.ts" }, ctx);
    assert.equal(result.status, "done");
    assert.ok(result.content);
    // Should find index.ts with a high score
    const lines = result.content.split("\n").filter(Boolean);
    assert.ok(lines.length >= 1, "Should find at least one match");
    // First result should be index.ts with exact match score
    const firstLine = lines[0]!;
    assert.ok(firstLine.includes("index.ts"), "First result should contain index.ts");
    // Extract score -- format is "path (score: N)"
    const scoreMatch = firstLine.match(/\(score: (\d+)\)/);
    assert.ok(scoreMatch, "Result should contain score");
    const score = parseInt(scoreMatch![1]!, 10);
    assert.ok(score >= 5000, `Expected high score for exact match, got ${score}`);
  });

  // ─── Fuzzy query returns index files ────────────────────

  it('fuzzy query "idx" returns index files', async () => {
    const result = await FuzzyFindTool.execute({ query: "idx" }, ctx);
    assert.equal(result.status, "done");
    assert.ok(result.content);
    const lines = result.content.split("\n").filter(Boolean);
    assert.ok(lines.length >= 1, "Should find at least one match for 'idx'");
    // At least one result should be an index file
    const hasIndex = lines.some((l: string) => l.includes("index"));
    assert.ok(hasIndex, "Should find an index file with fuzzy query 'idx'");
  });

  // ─── limit parameter limits results ─────────────────────

  it("limit parameter limits results", async () => {
    const result = await FuzzyFindTool.execute(
      { query: "t", limit: 2 },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.ok(result.content);
    const lines = result.content.split("\n").filter(Boolean);
    assert.ok(
      lines.length <= 2,
      `Expected at most 2 results, got ${lines.length}`,
    );
  });

  // ─── No match ───────────────────────────────────────────

  it("returns no-match message for unmatched query", async () => {
    const result = await FuzzyFindTool.execute(
      { query: "zzzzxxxxxyyyyywwwww" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.equal(result.content, "No matching files found.");
  });

  // ─── Execution profile ─────────────────────────────────

  it("fuzzyFindExecutionProfile returns correct resourceKeys", () => {
    const profile = fuzzyFindExecutionProfile(
      { path: "src" },
      "/home/user/project",
    );
    assert.ok(profile.resourceKeys);
    assert.equal(profile.resourceKeys.length, 1);
    assert.equal(profile.resourceKeys[0]!.key, "/home/user/project/src");
    assert.equal(profile.resourceKeys[0]!.mode, "read");
  });

  it("fuzzyFindExecutionProfile uses cwd when no path given", () => {
    const profile = fuzzyFindExecutionProfile({}, "/home/user/project");
    assert.ok(profile.resourceKeys);
    assert.equal(profile.resourceKeys[0]!.key, "/home/user/project");
  });
});
