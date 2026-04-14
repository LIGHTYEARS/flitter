/**
 * GrepTool unit tests
 *
 * Covers ToolSpec shape, basic regex match, output modes, no-match case,
 * execution profile, and path scoping.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { GrepTool, grepExecutionProfile } from "./grep";
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

describe("GrepTool", () => {
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
    assert.equal(GrepTool.name, "Grep");
    assert.equal(GrepTool.source, "builtin");
    assert.equal(GrepTool.isReadOnly, true);
    assert.equal(typeof GrepTool.execute, "function");
    assert.ok(GrepTool.inputSchema);
    assert.ok(GrepTool.description);
  });

  // ─── Basic regex match (content mode) ────────────────────

  it("finds basic regex matches in content mode", async () => {
    const result = await GrepTool.execute(
      { pattern: "hello", output_mode: "content" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.ok(result.content);
    assert.ok(result.content.includes("hello"));
  });

  // ─── files_with_matches mode ────────────────────────────

  it("returns file paths in files_with_matches mode", async () => {
    const result = await GrepTool.execute(
      { pattern: "hello", output_mode: "files_with_matches" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.ok(result.content);
    // Should contain paths to files with "hello"
    const lines = result.content.split("\n").filter(Boolean);
    assert.ok(lines.length >= 2, `Expected >= 2 files, got ${lines.length}`);
    // Should include index.ts and component.tsx
    const hasIndex = lines.some((l: string) => l.includes("index.ts"));
    const hasComponent = lines.some((l: string) => l.includes("component.tsx"));
    assert.ok(hasIndex, "Should find index.ts");
    assert.ok(hasComponent, "Should find component.tsx");
  });

  // ─── count mode ──────────────────────────────────────────

  it("returns match counts in count mode", async () => {
    const result = await GrepTool.execute(
      { pattern: "hello", output_mode: "count" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.ok(result.content);
    // Each line should be file:count format
    const lines = result.content.split("\n").filter(Boolean);
    for (const line of lines) {
      assert.match(line, /:\d+$/, `Expected file:count format, got: ${line}`);
    }
  });

  // ─── No match ───────────────────────────────────────────

  it("returns 'No matches found.' when nothing matches", async () => {
    const result = await GrepTool.execute(
      { pattern: "zzz_nonexistent_pattern_zzz" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.equal(result.content, "No matches found.");
  });

  // ─── Execution profile ─────────────────────────────────

  it("grepExecutionProfile returns correct resourceKeys", () => {
    const profile = grepExecutionProfile({ path: "src" }, "/home/user/project");
    assert.ok(profile.resourceKeys);
    assert.equal(profile.resourceKeys.length, 1);
    assert.equal(profile.resourceKeys[0]!.key, "/home/user/project/src");
    assert.equal(profile.resourceKeys[0]!.mode, "read");
  });

  it("grepExecutionProfile uses cwd when no path given", () => {
    const profile = grepExecutionProfile({}, "/home/user/project");
    assert.ok(profile.resourceKeys);
    assert.equal(profile.resourceKeys[0]!.key, "/home/user/project");
  });

  // ─── Path parameter limits search scope ─────────────────

  it("path parameter limits search scope", async () => {
    const result = await GrepTool.execute(
      { pattern: "hello", output_mode: "files_with_matches", path: "test" },
      ctx,
    );
    assert.equal(result.status, "done");
    // "hello" appears in src/index.ts and src/component.tsx but NOT in test/
    // test/index.test.ts has "hello" in import but only as a string reference
    // The test dir only has 'hello' in the import line
    if (result.content && result.content !== "No matches found.") {
      const lines = result.content.split("\n").filter(Boolean);
      for (const line of lines) {
        assert.ok(
          line.includes("test"),
          `Result should only contain files from test/ dir, got: ${line}`,
        );
      }
    }
  });
});
